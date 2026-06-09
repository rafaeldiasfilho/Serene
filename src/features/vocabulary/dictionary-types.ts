export type DictionaryDefinition = {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
};

export type DictionaryEntry = {
  word: string;
  language: string;
  phonetic: string | null;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
  source: {
    name: string;
    url: string | null;
  } | null;
  definitions: DictionaryDefinition[];
};

export type DictionarySearchResponse =
  | {
      status: "found";
      entry: DictionaryEntry;
    }
  | {
      status: "not_found";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export function getPrimaryDictionaryDefinition(entry: DictionaryEntry | null) {
  return entry?.definition ?? null;
}
