import { NextResponse } from "next/server";

import type {
  DictionaryDefinition,
  DictionaryEntry,
  DictionarySearchResponse,
} from "@/features/vocabulary/dictionary-types";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_DEFINITIONS = 5;

type DicionarioAbertoEntry = {
  word?: string;
  normalized?: string;
  xml?: string;
};

type FreeDictionaryApiEntry = {
  word?: string;
  phonetic?: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
    }>;
  }>;
};

function normalizeWord(value: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeLanguage(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "pt";
  }

  if (normalized.startsWith("pt") || normalized.includes("portugu")) {
    return "pt";
  }

  if (normalized.startsWith("en") || normalized.includes("english") || normalized.includes("ingles")) {
    return "en";
  }

  return normalized.split(/[-_]/)[0] || "pt";
}

function decodeXmlText(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/g, (match, entity) => {
    if (entity === "amp") {
      return "&";
    }
    if (entity === "lt") {
      return "<";
    }
    if (entity === "gt") {
      return ">";
    }
    if (entity === "quot") {
      return "\"";
    }
    if (entity === "apos") {
      return "'";
    }
    if (entity === "nbsp") {
      return " ";
    }

    const isHex = entity.toLowerCase().startsWith("#x");
    const numberText = isHex ? entity.slice(2) : entity.slice(1);
    const codePoint = Number.parseInt(numberText, isHex ? 16 : 10);

    if (!Number.isFinite(codePoint)) {
      return match;
    }

    return String.fromCodePoint(codePoint);
  });
}

function cleanDictionaryText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = decodeXmlText(value)
    .replace(/\[\[([^\]|:]+)(?::\d+)?(?:\|([^\]]+))?\]\]/g, (_match, word, label) => label ?? word)
    .replace(/<[^>]+>/g, " ")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function extractTagContent(xml: string, tag: string) {
  const matches: string[] = [];
  const expression = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match = expression.exec(xml);

  while (match) {
    matches.push(match[1]);
    match = expression.exec(xml);
  }

  return matches;
}

function shortenDefinition(value: string) {
  return value.length > 360 ? `${value.slice(0, 357).trimEnd()}...` : value;
}

function dedupeDefinitions(definitions: DictionaryDefinition[]) {
  const seen = new Set<string>();

  return definitions.filter((item) => {
    const key = item.definition.toLocaleLowerCase("pt-BR");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseDicionarioAbertoXml(xml: string) {
  const word = cleanDictionaryText(extractTagContent(xml, "orth")[0]);
  const senses = extractTagContent(xml, "sense");
  const definitions: DictionaryDefinition[] = [];

  for (const sense of senses) {
    const partOfSpeech = cleanDictionaryText(extractTagContent(sense, "gramGrp")[0]);
    const example = cleanDictionaryText(extractTagContent(sense, "quote")[0]);
    const definitionTexts = extractTagContent(sense, "def");

    for (const definitionText of definitionTexts) {
      const definition = cleanDictionaryText(definitionText);

      if (definition) {
        definitions.push({
          partOfSpeech,
          definition: shortenDefinition(definition),
          example,
        });
      }
    }
  }

  return {
    word,
    definitions,
  };
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("dictionary_provider_failed");
    }

    const payload = await response.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(payload);

    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchDicionarioAberto(word: string): Promise<DictionaryEntry | null> {
  const url = `https://api.dicionario-aberto.net/word/${encodeURIComponent(word)}`;
  const payload = await fetchJson(url);

  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const parsedEntries = (payload as DicionarioAbertoEntry[])
    .map((item) => (item.xml ? parseDicionarioAbertoXml(item.xml) : null))
    .filter((item): item is { word: string | null; definitions: DictionaryDefinition[] } =>
      Boolean(item && item.definitions.length > 0),
    );

  const definitions = dedupeDefinitions(parsedEntries.flatMap((item) => item.definitions)).slice(
    0,
    MAX_DEFINITIONS,
  );

  if (definitions.length === 0) {
    return null;
  }

  return {
    word: parsedEntries[0]?.word ?? (payload[0] as DicionarioAbertoEntry).word ?? word,
    language: "pt",
    phonetic: null,
    source: {
      name: "Dicionario Aberto",
      url: "https://api.dicionario-aberto.net/",
    },
    definitions,
  };
}

async function searchFreeDictionaryApi(
  word: string,
  language: string,
): Promise<DictionaryEntry | null> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(language)}/${encodeURIComponent(word)}`;
  const payload = await fetchJson(url);

  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const entries = payload as FreeDictionaryApiEntry[];
  const definitions = dedupeDefinitions(
    entries.flatMap((entry) =>
      (entry.meanings ?? []).flatMap((meaning) =>
        (meaning.definitions ?? []).map((item) => ({
          partOfSpeech: meaning.partOfSpeech?.trim() || null,
          definition: item.definition?.trim() ?? "",
          example: item.example?.trim() || null,
        })),
      ),
    ),
  )
    .filter((item) => item.definition.length > 0)
    .slice(0, MAX_DEFINITIONS);

  if (definitions.length === 0) {
    return null;
  }

  return {
    word: entries[0]?.word?.trim() || word,
    language,
    phonetic: entries.find((entry) => entry.phonetic)?.phonetic?.trim() ?? null,
    source: {
      name: "Free Dictionary API",
      url: "https://dictionaryapi.dev/",
    },
    definitions,
  };
}

async function lookupDictionary(word: string, language: string) {
  if (language === "pt") {
    return searchDicionarioAberto(word);
  }

  return searchFreeDictionaryApi(word, language);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const word = normalizeWord(url.searchParams.get("word"));
  const language = normalizeLanguage(url.searchParams.get("language"));

  if (!word) {
    return NextResponse.json(
      {
        status: "error",
        message: "Digite uma palavra para buscar.",
      } satisfies DictionarySearchResponse,
      { status: 400 },
    );
  }

  if (word.length > 80) {
    return NextResponse.json(
      {
        status: "error",
        message: "Busque uma palavra por vez.",
      } satisfies DictionarySearchResponse,
      { status: 400 },
    );
  }

  try {
    const entry = await lookupDictionary(word, language);

    if (!entry) {
      return NextResponse.json({
        status: "not_found",
        message: "Nao encontramos essa palavra agora.",
      } satisfies DictionarySearchResponse);
    }

    return NextResponse.json({
      status: "found",
      entry,
    } satisfies DictionarySearchResponse);
  } catch {
    return NextResponse.json({
      status: "error",
      message: "Nao foi possivel consultar o dicionario agora.",
    } satisfies DictionarySearchResponse);
  }
}
