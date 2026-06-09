import type { DictionarySearchResponse } from "@/features/vocabulary/dictionary-types";

type SearchDictionaryInput = {
  word: string;
  language?: string | null;
};

export async function searchDictionaryWord({
  word,
  language,
}: SearchDictionaryInput): Promise<DictionarySearchResponse> {
  const normalizedWord = word.trim();

  if (!normalizedWord) {
    return {
      status: "error",
      message: "Digite uma palavra para buscar.",
    };
  }

  const params = new URLSearchParams({ word: normalizedWord });

  if (language?.trim()) {
    params.set("language", language.trim());
  }

  try {
    const response = await fetch(`/api/dictionary?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "error",
        message: "Nao foi possivel consultar o dicionario agora.",
      };
    }

    return (await response.json()) as DictionarySearchResponse;
  } catch {
    return {
      status: "error",
      message: "Nao foi possivel consultar o dicionario agora.",
    };
  }
}
