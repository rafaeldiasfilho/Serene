import type { BookInsert } from "@/features/books/book-services";

export type BookDiscoveryResult = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  publicationYear: number | null;
  totalPages: number | null;
  publisher: string | null;
  description: string | null;
  language: string | null;
  isbn: string | null;
  subjects: string[];
  source: string;
  sourceLabel: string;
};

type OpenLibraryDoc = {
  key?: unknown;
  title?: unknown;
  author_name?: unknown;
  first_publish_year?: unknown;
  cover_i?: unknown;
  publisher?: unknown;
  number_of_pages_median?: unknown;
  isbn?: unknown;
  language?: unknown;
  subject?: unknown;
};

type OpenLibraryResponse = {
  docs?: unknown;
};

const OPEN_LIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "publisher",
  "number_of_pages_median",
  "isbn",
  "language",
  "subject",
].join(",");

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstString(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const first = value.find((item): item is string => typeof item === "string" && item.trim().length > 0);
  return first ? first.trim() : null;
}

function stringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  ).slice(0, limit);
}

function bestIsbn(value: unknown) {
  const identifiers = stringList(value, 20).map((item) => item.replace(/[^0-9Xx]/g, ""));
  return (
    identifiers.find((item) => item.length === 13) ??
    identifiers.find((item) => item.length === 10) ??
    identifiers[0] ??
    null
  );
}

function coverUrl(coverId: unknown) {
  const id = optionalNumber(coverId);
  return id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : null;
}

function mapOpenLibraryDoc(doc: OpenLibraryDoc): BookDiscoveryResult | null {
  const title = optionalString(doc.title);
  if (!title) {
    return null;
  }

  const key = optionalString(doc.key) ?? title;
  const subjects = stringList(doc.subject, 8);

  return {
    id: `open-library:${key}`,
    title,
    author: stringList(doc.author_name, 4).join(", ") || null,
    coverUrl: coverUrl(doc.cover_i),
    publicationYear: optionalNumber(doc.first_publish_year),
    totalPages: optionalNumber(doc.number_of_pages_median),
    publisher: firstString(doc.publisher),
    description: null,
    language: firstString(doc.language),
    isbn: bestIsbn(doc.isbn),
    subjects,
    source: "open_library",
    sourceLabel: "Open Library",
  };
}

export function bookResultToInsert(result: BookDiscoveryResult): Omit<BookInsert, "user_id"> {
  return {
    title: result.title,
    author: result.author,
    cover_url: result.coverUrl,
    description: result.description,
    publisher: result.publisher,
    edition: null,
    publication_year: result.publicationYear,
    language: result.language,
    isbn: result.isbn,
    subjects: result.subjects.length > 0 ? result.subjects : null,
    total_pages: result.totalPages,
    current_page: 0,
    status: "quero_ler",
    source: result.source,
    reading_origin: "serene",
    is_current: false,
    is_private: false,
    show_in_home: true,
    show_in_notifications: true,
    show_in_mente: true,
    include_in_quick_exports: true,
    read_before_serene: false,
    completed_inside_serene: false,
  };
}

export function manualBookInsert(title: string): Omit<BookInsert, "user_id"> {
  return {
    title: title.trim(),
    author: null,
    cover_url: null,
    description: null,
    publisher: null,
    edition: null,
    publication_year: null,
    language: null,
    isbn: null,
    subjects: null,
    total_pages: null,
    current_page: 0,
    status: "quero_ler",
    source: "manual",
    reading_origin: "serene",
    is_current: false,
    is_private: false,
    show_in_home: true,
    show_in_notifications: true,
    show_in_mente: true,
    include_in_quick_exports: true,
    read_before_serene: false,
    completed_inside_serene: false,
  };
}

export async function searchBookSuggestions(query: string): Promise<{
  data: BookDiscoveryResult[];
  error: string | null;
}> {
  const title = query.trim();
  if (!title) {
    return { data: [], error: "Informe o nome do livro." };
  }

  const params = new URLSearchParams({
    title,
    fields: OPEN_LIBRARY_FIELDS,
    limit: "8",
    lang: "pt",
  });

  try {
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        data: [],
        error: "Nao foi possivel buscar sugestoes agora. Voce ainda pode cadastrar manualmente.",
      };
    }

    const payload = (await response.json()) as OpenLibraryResponse;
    const docs = Array.isArray(payload.docs) ? payload.docs : [];
    const data = docs
      .map((doc) => mapOpenLibraryDoc(doc as OpenLibraryDoc))
      .filter((item): item is BookDiscoveryResult => Boolean(item));

    return { data, error: null };
  } catch {
    return {
      data: [],
      error: "A busca externa nao respondeu agora. Voce ainda pode cadastrar manualmente.",
    };
  }
}
