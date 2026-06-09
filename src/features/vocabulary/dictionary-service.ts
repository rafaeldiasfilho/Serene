import type { DictionarySearchResponse } from "@/features/vocabulary/dictionary-types";

type SearchDictionaryInput = {
  word: string;
};

export async function searchDictionaryWord({ word }: SearchDictionaryInput): Promise<DictionarySearchResponse> {
  const normalizedWord = word.trim().replace(/\s+/g, " ");

  if (!normalizedWord) {
    return {
      status: "error",
      message: "Digite uma palavra para buscar.",
    };
  }

  const params = new URLSearchParams({ word: normalizedWord });

  try {
    const response = await fetch(`/api/dictionary?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "error",
        message: "Não foi possível consultar o dicionário agora.",
      };
    }

    return (await response.json()) as DictionarySearchResponse;
  } catch {
    return {
      status: "error",
      message: "Não foi possível consultar o dicionário agora.",
    };
  }
}
