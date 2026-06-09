import { NextResponse } from "next/server";

import type {
  DictionaryDefinition,
  DictionaryEntry,
  DictionarySearchResponse,
} from "@/features/vocabulary/dictionary-types";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_DEFINITIONS = 5;
const PORTUGUESE_LANGUAGE = "pt-BR";
const DICIONARIO_ABERTO_SOURCE = {
  name: "Dicionário Aberto",
  url: "https://api.dicionario-aberto.net/",
};

type DicionarioAbertoEntry = {
  word?: string;
  normalized?: string;
  xml?: string;
};

function normalizeWord(value: string | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase(PORTUGUESE_LANGUAGE) ?? "";
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
  const primaryDefinition = definitions[0];

  if (!primaryDefinition) {
    return null;
  }

  return {
    word: parsedEntries[0]?.word ?? (payload[0] as DicionarioAbertoEntry).word ?? word,
    language: PORTUGUESE_LANGUAGE,
    phonetic: null,
    definition: primaryDefinition.definition,
    partOfSpeech: primaryDefinition.partOfSpeech,
    example: primaryDefinition.example,
    source: DICIONARIO_ABERTO_SOURCE,
    definitions,
  };
}

async function lookupPortugueseDictionary(word: string) {
  return searchDicionarioAberto(word);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const word = normalizeWord(url.searchParams.get("word"));

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
    const entry = await lookupPortugueseDictionary(word);

    if (!entry) {
      return NextResponse.json({
        status: "not_found",
        message: "Não encontramos essa palavra no dicionário em português.",
      } satisfies DictionarySearchResponse);
    }

    return NextResponse.json({
      status: "found",
      entry,
    } satisfies DictionarySearchResponse);
  } catch {
    return NextResponse.json({
      status: "error",
      message: "Não foi possível consultar o dicionário agora.",
    } satisfies DictionarySearchResponse);
  }
}
