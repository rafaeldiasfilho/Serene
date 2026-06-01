import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AnnotationType,
  BookStatus,
  Database,
  Json,
  ReadingOrigin,
  ReadingSessionStatus,
} from "@/lib/supabase/database.types";

export type ExportBookRow = Database["public"]["Tables"]["books"]["Row"];
export type ExportAnnotationRow = Database["public"]["Tables"]["annotations"]["Row"];
export type ExportSessionRow = Database["public"]["Tables"]["reading_sessions"]["Row"];
export type ExportMuralPositionRow =
  Database["public"]["Tables"]["annotation_mural_positions"]["Row"];
export type ExportRecordRow = Database["public"]["Tables"]["exports"]["Row"];
export type ExportAutomaticCategoryRow =
  Database["public"]["Tables"]["automatic_mente_categories"]["Row"];
export type ExportBookAutomaticCategoryRow =
  Database["public"]["Tables"]["book_automatic_mente_categories"]["Row"];

export type ExportFormat = "markdown" | "txt" | "pdf" | "docx";
export type ExportIntent =
  | "all"
  | "book"
  | "period"
  | "reflections"
  | "highlights"
  | "post_its"
  | "favorites"
  | "to_review"
  | "session"
  | "mural"
  | "study"
  | "beautiful_notebook";

export type ExportFilters = {
  intent: ExportIntent;
  bookId: string | null;
  sessionId: string | null;
  periodStart: string;
  periodEnd: string;
  includePrivateContent: boolean;
};

export type ExportSourceData = {
  books: ExportBookRow[];
  annotations: ExportAnnotationRow[];
  sessions: ExportSessionRow[];
  muralPositions: ExportMuralPositionRow[];
  automaticCategories: ExportAutomaticCategoryRow[];
  automaticRelations: ExportBookAutomaticCategoryRow[];
  recentExports: ExportRecordRow[];
};

export type ExportOmittedCounts = {
  privateBooks: number;
  privateAnnotations: number;
  privateSessions: number;
  quickExcludedBooks: number;
  quickExcludedAnnotations: number;
  quickExcludedSessions: number;
};

export type ExportTimeTotals = {
  realSeconds: number;
  estimatedHistoricalSeconds: number;
  approximateTotalSeconds: number;
};

export type ExportCategorySummary = {
  id: string;
  name: string;
  bookCount: number;
};

export type ExportBundle = {
  title: string;
  description: string;
  books: ExportBookRow[];
  annotations: ExportAnnotationRow[];
  sessions: ExportSessionRow[];
  muralPositions: ExportMuralPositionRow[];
  strongestCategories: ExportCategorySummary[];
  omitted: ExportOmittedCounts;
  totals: ExportTimeTotals;
  warnings: string[];
};

type ServiceResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export const exportIntentLabel: Record<ExportIntent, string> = {
  all: "Tudo",
  book: "Por livro",
  period: "Por periodo",
  reflections: "Reflexoes",
  highlights: "Marca-textos",
  post_its: "Post-its",
  favorites: "Favoritos",
  to_review: "Para revisar",
  session: "Sessao",
  mural: "Anotacoes do Mural",
  study: "Para estudar",
  beautiful_notebook: "Caderno bonito",
};

export const exportFormatLabel: Record<ExportFormat, string> = {
  markdown: "Markdown",
  txt: "TXT",
  pdf: "PDF",
  docx: "DOCX",
};

const statusLabels: Record<BookStatus, string> = {
  quero_ler: "Quero ler",
  lendo: "Lendo",
  pausado: "Pausado",
  lido: "Lido",
};

const originLabels: Record<ReadingOrigin, string> = {
  historico: "Historico de leitura",
  serene: "Lido no SERENE",
};

const sessionStatusLabels: Record<ReadingSessionStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

function byCreatedAsc<T extends { created_at: string }>(a: T, b: T) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function byStartedDesc(a: ExportSessionRow, b: ExportSessionRow) {
  return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
}

function buildBookMap(books: ExportBookRow[]) {
  return new Map(books.map((book) => [book.id, book]));
}

function uniqueRows<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function uniqueBookRows(books: ExportBookRow[]) {
  return uniqueRows(books).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

function compactText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function formatDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data preservada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: string | null) {
  if (!value) {
    return "sem data final";
  }

  return formatDateTime(value);
}

export function formatExportDuration(seconds: number) {
  if (seconds <= 0) {
    return "0min";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes}min`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function parsePeriodBoundary(value: string, boundary: "start" | "end") {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinPeriod(value: string | null, filters: ExportFilters) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const start = parsePeriodBoundary(filters.periodStart, "start");
  const end = parsePeriodBoundary(filters.periodEnd, "end");

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (start && date < start) {
    return false;
  }

  if (end && date > end) {
    return false;
  }

  return true;
}

function isPrivateBook(book: ExportBookRow | null | undefined) {
  return Boolean(book?.is_private);
}

function isPrivateAnnotation(annotation: ExportAnnotationRow, bookMap: Map<string, ExportBookRow>) {
  const book = annotation.book_id ? bookMap.get(annotation.book_id) : null;
  return annotation.is_private || isPrivateBook(book);
}

function isPrivateSession(session: ExportSessionRow, bookMap: Map<string, ExportBookRow>) {
  return isPrivateBook(bookMap.get(session.book_id));
}

function isQuickExcludedBook(book: ExportBookRow | null | undefined) {
  return Boolean(book && !book.is_private && !book.include_in_quick_exports);
}

function isQuickExcludedAnnotation(
  annotation: ExportAnnotationRow,
  bookMap: Map<string, ExportBookRow>,
) {
  const book = annotation.book_id ? bookMap.get(annotation.book_id) : null;
  return Boolean(!annotation.is_private && isQuickExcludedBook(book));
}

function isQuickExcludedSession(session: ExportSessionRow, bookMap: Map<string, ExportBookRow>) {
  return isQuickExcludedBook(bookMap.get(session.book_id));
}

function applyPrivacy(sourceData: ExportSourceData, includePrivateContent: boolean) {
  if (includePrivateContent) {
    return {
      books: sourceData.books,
      annotations: sourceData.annotations,
      sessions: sourceData.sessions,
      muralPositions: sourceData.muralPositions,
      omitted: {
        privateBooks: 0,
        privateAnnotations: 0,
        privateSessions: 0,
        quickExcludedBooks: 0,
        quickExcludedAnnotations: 0,
        quickExcludedSessions: 0,
      },
    };
  }

  const fullBookMap = buildBookMap(sourceData.books);
  const books = sourceData.books.filter((book) => !book.is_private && book.include_in_quick_exports);
  const annotations = sourceData.annotations.filter(
    (annotation) =>
      !isPrivateAnnotation(annotation, fullBookMap) &&
      !isQuickExcludedAnnotation(annotation, fullBookMap),
  );
  const sessions = sourceData.sessions.filter(
    (session) =>
      !isPrivateSession(session, fullBookMap) && !isQuickExcludedSession(session, fullBookMap),
  );
  const allowedAnnotationIds = new Set(annotations.map((annotation) => annotation.id));
  const allowedSessionIds = new Set(sessions.map((session) => session.id));
  const muralPositions = sourceData.muralPositions.filter(
    (position) =>
      allowedAnnotationIds.has(position.annotation_id) &&
      (!position.session_id || allowedSessionIds.has(position.session_id)),
  );

  return {
    books,
    annotations,
    sessions,
    muralPositions,
    omitted: {
      privateBooks: sourceData.books.filter((book) => book.is_private).length,
      privateAnnotations: sourceData.annotations.filter((annotation) =>
        isPrivateAnnotation(annotation, fullBookMap),
      ).length,
      privateSessions: sourceData.sessions.filter((session) => isPrivateSession(session, fullBookMap))
        .length,
      quickExcludedBooks: sourceData.books.filter((book) => isQuickExcludedBook(book)).length,
      quickExcludedAnnotations: sourceData.annotations.filter((annotation) =>
        isQuickExcludedAnnotation(annotation, fullBookMap),
      ).length,
      quickExcludedSessions: sourceData.sessions.filter((session) =>
        isQuickExcludedSession(session, fullBookMap),
      ).length,
    },
  };
}

function includeRelatedBooks({
  allBooks,
  annotations,
  books,
  sessions,
}: {
  allBooks: ExportBookRow[];
  annotations: ExportAnnotationRow[];
  books: ExportBookRow[];
  sessions: ExportSessionRow[];
}) {
  const bookMap = buildBookMap(allBooks);
  const relatedBookIds = new Set<string>(books.map((book) => book.id));

  for (const annotation of annotations) {
    if (annotation.book_id) {
      relatedBookIds.add(annotation.book_id);
    }
  }

  for (const session of sessions) {
    relatedBookIds.add(session.book_id);
  }

  return uniqueBookRows(
    Array.from(relatedBookIds)
      .map((bookId) => bookMap.get(bookId))
      .filter((book): book is ExportBookRow => Boolean(book)),
  );
}

function filterMuralAnnotations(
  annotations: ExportAnnotationRow[],
  muralPositions: ExportMuralPositionRow[],
  bookId: string | null,
) {
  const positionedAnnotationIds = new Set(muralPositions.map((position) => position.annotation_id));
  const seen = new Set<string>();

  return annotations.filter((annotation) => {
    if (seen.has(annotation.id)) {
      return false;
    }

    const belongsToSelectedBook = Boolean(bookId && annotation.book_id === bookId);
    const belongsToMural =
      annotation.origin === "mural" || positionedAnnotationIds.has(annotation.id);

    if (belongsToSelectedBook || (!bookId && belongsToMural)) {
      seen.add(annotation.id);
      return true;
    }

    return false;
  });
}

function buildBundleTitle(filters: ExportFilters) {
  if (filters.intent === "period") {
    const start = filters.periodStart || "inicio";
    const end = filters.periodEnd || "hoje";
    return `Caderno por periodo (${start} a ${end})`;
  }

  if (filters.intent === "study") {
    return "Caderno SERENE - Para estudar";
  }

  if (filters.intent === "beautiful_notebook") {
    return "Caderno bonito de leitura";
  }

  return `Caderno SERENE - ${exportIntentLabel[filters.intent]}`;
}

function buildBundleDescription(filters: ExportFilters) {
  if (filters.intent === "mural") {
    return "O Mural aparece aqui como uma vista das anotacoes canonicas, sem duplicar conteudo.";
  }

  if (filters.intent === "session") {
    return "Resumo de uma sessao com tempo real, pausas e anotacoes vinculadas.";
  }

  if (filters.intent === "study") {
    return "Trechos, perguntas, acoes e favoritos reunidos para estudar sem ruido.";
  }

  if (filters.intent === "beautiful_notebook") {
    return "Essas paginas guardam parte da sua vida em livros em formato calmo de caderno.";
  }

  return "Memoria de leitura organizada como caderno, com privacidade e tempos separados.";
}

function buildTotals(books: ExportBookRow[], sessions: ExportSessionRow[]): ExportTimeTotals {
  const uniqueBooks = uniqueRows(books);
  const realSeconds = sessions.reduce((total, session) => total + session.active_seconds, 0);
  const estimatedHistoricalSeconds = uniqueBooks.reduce((total, book) => {
    const isHistorical = book.reading_origin === "historico" || book.read_before_serene;
    return total + (isHistorical ? book.estimated_reading_seconds ?? 0 : 0);
  }, 0);

  return {
    realSeconds,
    estimatedHistoricalSeconds,
    approximateTotalSeconds: realSeconds + estimatedHistoricalSeconds,
  };
}

function buildStrongestCategories(sourceData: ExportSourceData, books: ExportBookRow[]) {
  const visibleBookIds = new Set(books.map((book) => book.id));
  const categoryMap = new Map(sourceData.automaticCategories.map((category) => [category.id, category]));
  const counts = new Map<string, Set<string>>();

  for (const relation of sourceData.automaticRelations) {
    if (!visibleBookIds.has(relation.book_id)) {
      continue;
    }

    const bookIds = counts.get(relation.automatic_category_id) ?? new Set<string>();
    bookIds.add(relation.book_id);
    counts.set(relation.automatic_category_id, bookIds);
  }

  return Array.from(counts.entries())
    .map(([categoryId, bookIds]) => ({
      id: categoryId,
      name: categoryMap.get(categoryId)?.name ?? "Area automatica",
      bookCount: bookIds.size,
    }))
    .filter((category) => category.bookCount > 0)
    .sort((a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 5);
}

function buildWarnings(filters: ExportFilters, bundle: Omit<ExportBundle, "warnings">) {
  const warnings: string[] = [];

  if (!filters.includePrivateContent) {
    const omittedTotal =
      bundle.omitted.privateBooks + bundle.omitted.privateAnnotations + bundle.omitted.privateSessions;
    const quickExcludedTotal =
      bundle.omitted.quickExcludedBooks +
      bundle.omitted.quickExcludedAnnotations +
      bundle.omitted.quickExcludedSessions;
    if (omittedTotal > 0) {
      warnings.push("Conteudo privado foi excluido por padrao.");
    }
    if (quickExcludedTotal > 0) {
      warnings.push("Itens fora de exportacoes rapidas tambem ficaram fora deste arquivo.");
    }
  } else {
    warnings.push("Conteudo privado foi incluido por escolha explicita nesta exportacao.");
  }

  if (filters.intent === "mural") {
    warnings.push("Anotacoes do Mural usam registros canonicos; posicoes visuais nao duplicam texto.");
  }

  if (bundle.totals.estimatedHistoricalSeconds > 0) {
    warnings.push("Tempo historico aparece sempre como estimado e aproximado.");
  }

  return warnings;
}

export async function loadExportSourceData(
  userId: string,
): Promise<ServiceResult<ExportSourceData>> {
  const supabase = getSupabaseBrowserClient();

  const [
    booksResult,
    annotationsResult,
    sessionsResult,
    muralPositionsResult,
    automaticCategoriesResult,
    automaticRelationsResult,
    exportsResult,
  ] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("title", { ascending: true }),
      supabase
        .from("annotations")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("reading_sessions")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("started_at", { ascending: false }),
      supabase
        .from("annotation_mural_positions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_visible", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("automatic_mente_categories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("book_automatic_mente_categories")
        .select("*")
        .eq("user_id", userId),
      supabase
        .from("exports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const firstError =
    booksResult.error ??
    annotationsResult.error ??
    sessionsResult.error ??
    muralPositionsResult.error ??
    automaticCategoriesResult.error ??
    automaticRelationsResult.error ??
    exportsResult.error;

  if (firstError) {
    return { data: null, error: { message: firstError.message } };
  }

  return {
    data: {
      books: booksResult.data ?? [],
      annotations: annotationsResult.data ?? [],
      sessions: sessionsResult.data ?? [],
      muralPositions: muralPositionsResult.data ?? [],
      automaticCategories: automaticCategoriesResult.data ?? [],
      automaticRelations: automaticRelationsResult.data ?? [],
      recentExports: exportsResult.data ?? [],
    },
    error: null,
  };
}

export function buildExportBundle(sourceData: ExportSourceData, filters: ExportFilters): ExportBundle {
  const privacyData = applyPrivacy(sourceData, filters.includePrivateContent);
  let books = privacyData.books;
  let annotations = privacyData.annotations;
  let sessions = privacyData.sessions;
  let muralPositions = privacyData.muralPositions;

  if (filters.intent === "book" && filters.bookId) {
    books = books.filter((book) => book.id === filters.bookId);
    annotations = annotations.filter((annotation) => annotation.book_id === filters.bookId);
    sessions = sessions.filter((session) => session.book_id === filters.bookId);
    muralPositions = muralPositions.filter((position) => position.book_id === filters.bookId);
  }

  if (filters.intent === "period") {
    const periodBooks = books.filter((book) => isWithinPeriod(book.created_at, filters));
    annotations = annotations.filter((annotation) => isWithinPeriod(annotation.created_at, filters));
    sessions = sessions.filter(
      (session) =>
        isWithinPeriod(session.started_at, filters) ||
        isWithinPeriod(session.ended_at, filters) ||
        isWithinPeriod(session.created_at, filters),
    );
    books = includeRelatedBooks({
      allBooks: books,
      annotations,
      books: periodBooks,
      sessions,
    });
    const annotationIds = new Set(annotations.map((annotation) => annotation.id));
    muralPositions = muralPositions.filter((position) => annotationIds.has(position.annotation_id));
  }

  if (filters.intent === "reflections") {
    annotations = annotations.filter((annotation) => annotation.type === "reflection");
  }

  if (filters.intent === "highlights") {
    annotations = annotations.filter((annotation) => annotation.type === "highlight");
  }

  if (filters.intent === "post_its") {
    annotations = annotations.filter((annotation) => annotation.type === "post_it");
  }

  if (filters.intent === "favorites") {
    annotations = annotations.filter((annotation) => annotation.is_favorite);
  }

  if (filters.intent === "to_review") {
    annotations = annotations.filter((annotation) => annotation.review_status === "to_review");
  }

  if (filters.intent === "study") {
    const studyTypes = new Set<AnnotationType>([
      "reflection",
      "highlight",
      "doubt",
      "idea",
      "action",
    ]);
    annotations = annotations.filter(
      (annotation) =>
        annotation.is_favorite ||
        annotation.review_status === "to_review" ||
        studyTypes.has(annotation.type),
    );
  }

  if (
    filters.intent === "reflections" ||
    filters.intent === "highlights" ||
    filters.intent === "post_its" ||
    filters.intent === "favorites" ||
    filters.intent === "to_review" ||
    filters.intent === "study"
  ) {
    const annotationSessionIds = new Set(
      annotations
        .map((annotation) => annotation.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    );
    sessions = sessions.filter((session) => annotationSessionIds.has(session.id));
    books = includeRelatedBooks({ allBooks: privacyData.books, annotations, books: [], sessions });
    const annotationIds = new Set(annotations.map((annotation) => annotation.id));
    muralPositions = muralPositions.filter((position) => annotationIds.has(position.annotation_id));
  }

  if (filters.intent === "session" && filters.sessionId) {
    sessions = sessions.filter((session) => session.id === filters.sessionId);
    const session = sessions[0] ?? null;
    annotations = annotations.filter((annotation) => annotation.session_id === filters.sessionId);
    books = session ? includeRelatedBooks({ allBooks: privacyData.books, annotations, books: [], sessions }) : [];
    muralPositions = muralPositions.filter((position) => position.session_id === filters.sessionId);
  }

  if (filters.intent === "mural") {
    annotations = filterMuralAnnotations(annotations, muralPositions, filters.bookId);
    const annotationIds = new Set(annotations.map((annotation) => annotation.id));
    muralPositions = muralPositions.filter((position) => annotationIds.has(position.annotation_id));
    const positionSessionIds = new Set(
      muralPositions
        .map((position) => position.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    );
    const annotationSessionIds = new Set(
      annotations
        .map((annotation) => annotation.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    );
    sessions = sessions.filter(
      (session) => positionSessionIds.has(session.id) || annotationSessionIds.has(session.id),
    );
    books = includeRelatedBooks({ allBooks: privacyData.books, annotations, books: [], sessions });
  }

  books = uniqueBookRows(books);
  annotations = uniqueRows(annotations).sort(byCreatedAsc);
  sessions = uniqueRows(sessions).sort(byStartedDesc);
  muralPositions = uniqueRows(muralPositions);

  const partialBundle = {
    title: buildBundleTitle(filters),
    description: buildBundleDescription(filters),
    books,
    annotations,
    sessions,
    muralPositions,
    strongestCategories: buildStrongestCategories(sourceData, books),
    omitted: privacyData.omitted,
    totals: buildTotals(books, sessions),
  };

  return {
    ...partialBundle,
    warnings: buildWarnings(filters, partialBundle),
  };
}

function bookRealSeconds(book: ExportBookRow, sessions: ExportSessionRow[]) {
  return sessions
    .filter((session) => session.book_id === book.id)
    .reduce((total, session) => total + session.active_seconds, 0);
}

function bookTitle(bookId: string | null, bookMap: Map<string, ExportBookRow>) {
  if (!bookId) {
    return "Sem livro vinculado";
  }

  return bookMap.get(bookId)?.title ?? "Livro preservado";
}

function sessionLabel(session: ExportSessionRow, bookMap: Map<string, ExportBookRow>) {
  return `${bookTitle(session.book_id, bookMap)} - ${formatDateTime(session.started_at)}`;
}

const annotationSections: Array<{ title: string; types: AnnotationType[] }> = [
  { title: "Reflexoes", types: ["reflection"] },
  { title: "Post-its", types: ["post_it"] },
  { title: "Marca-textos", types: ["highlight"] },
  { title: "Anotacoes rapidas", types: ["quick_note"] },
  { title: "Flags", types: ["flag"] },
  { title: "Ideias", types: ["idea"] },
  { title: "Duvidas", types: ["doubt"] },
  { title: "Pensamentos", types: ["thought"] },
  { title: "Acoes", types: ["action"] },
  { title: "OCR", types: ["ocr_page"] },
];

function buildMuralAnnotationIds(muralPositions: ExportMuralPositionRow[]) {
  return new Set(muralPositions.map((position) => position.annotation_id));
}

function annotationTags(annotation: ExportAnnotationRow, muralAnnotationIds: Set<string>) {
  const tags: string[] = [];

  if (annotation.is_favorite) {
    tags.push("favorita");
  }

  if (annotation.review_status === "to_review") {
    tags.push("para revisar");
  }

  if (annotation.origin === "retroactive") {
    tags.push("retroativa");
  }

  if (annotation.origin === "mural" || muralAnnotationIds.has(annotation.id)) {
    tags.push("Mural");
  }

  if (annotation.is_private) {
    tags.push("privada");
  }

  return tags;
}

function annotationMeta(annotation: ExportAnnotationRow, muralAnnotationIds: Set<string>) {
  const parts = [`criada em ${formatDateTime(annotation.created_at)}`];

  if (annotation.page_number !== null) {
    parts.unshift(`pag. ${annotation.page_number}`);
  }

  const tags = annotationTags(annotation, muralAnnotationIds);
  if (tags.length > 0) {
    parts.push(tags.join(", "));
  }

  return parts.join(" | ");
}

function formatMarkdownAnnotationItem(
  annotation: ExportAnnotationRow,
  muralAnnotationIds: Set<string>,
) {
  const content = compactText(annotation.content) ?? "Anotacao sem texto.";
  return [`- **${annotationMeta(annotation, muralAnnotationIds)}**`, `  > ${content}`].join("\n");
}

function formatTextAnnotationItem(annotation: ExportAnnotationRow, muralAnnotationIds: Set<string>) {
  const content = compactText(annotation.content) ?? "Anotacao sem texto.";
  return [`- ${annotationMeta(annotation, muralAnnotationIds)}`, `  ${content}`].join("\n");
}

function appendMarkdownAnnotationSections(
  lines: string[],
  annotations: ExportAnnotationRow[],
  muralAnnotationIds: Set<string>,
  heading: "###" | "####",
) {
  for (const section of annotationSections) {
    const sectionAnnotations = annotations.filter((annotation) => section.types.includes(annotation.type));

    if (sectionAnnotations.length === 0) {
      continue;
    }

    lines.push("", `${heading} ${section.title}`, "");
    for (const annotation of sectionAnnotations) {
      lines.push(formatMarkdownAnnotationItem(annotation, muralAnnotationIds));
    }
  }
}

function appendTextAnnotationSections(
  lines: string[],
  annotations: ExportAnnotationRow[],
  muralAnnotationIds: Set<string>,
) {
  for (const section of annotationSections) {
    const sectionAnnotations = annotations.filter((annotation) => section.types.includes(annotation.type));

    if (sectionAnnotations.length === 0) {
      continue;
    }

    lines.push("", section.title.toUpperCase());
    for (const annotation of sectionAnnotations) {
      lines.push(formatTextAnnotationItem(annotation, muralAnnotationIds));
    }
  }
}

function appendMarkdownSessions(
  lines: string[],
  sessions: ExportSessionRow[],
  bookMap: Map<string, ExportBookRow>,
  heading: "###" | "####",
) {
  if (sessions.length === 0) {
    return;
  }

  lines.push("", `${heading} Sessoes`, "");
  for (const session of sessions) {
    lines.push(
      `- **${sessionLabel(session, bookMap)}**`,
      `  - Status: ${sessionStatusLabels[session.status]}`,
      `  - Tempo real ativo: ${formatExportDuration(session.active_seconds)}`,
      `  - Pausas registradas: ${formatExportDuration(session.paused_seconds)}`,
      `  - Paginas: ${session.start_page ?? "?"} a ${session.end_page ?? "?"}`,
      `  - Fim: ${formatDateOnly(session.ended_at)}`,
    );
  }
}

function appendTextSessions(
  lines: string[],
  sessions: ExportSessionRow[],
  bookMap: Map<string, ExportBookRow>,
) {
  if (sessions.length === 0) {
    return;
  }

  lines.push("", "SESSOES");
  for (const session of sessions) {
    lines.push(
      sessionLabel(session, bookMap),
      `Status: ${sessionStatusLabels[session.status]}`,
      `Tempo real ativo: ${formatExportDuration(session.active_seconds)}`,
      `Pausas registradas: ${formatExportDuration(session.paused_seconds)}`,
      `Paginas: ${session.start_page ?? "?"} a ${session.end_page ?? "?"}`,
      `Fim: ${formatDateOnly(session.ended_at)}`,
      "",
    );
  }
}

function markdownTimeSection(bundle: ExportBundle) {
  return [
    "## Tempo de leitura",
    "",
    `- Tempo real registrado no SERENE: ${formatExportDuration(bundle.totals.realSeconds)}.`,
    `- Tempo historico estimado: ${formatExportDuration(
      bundle.totals.estimatedHistoricalSeconds,
    )} (estimado).`,
    `- Total aproximado dedicado a leitura: ${formatExportDuration(
      bundle.totals.approximateTotalSeconds,
    )} (aproximado).`,
  ].join("\n");
}

function textTimeSection(bundle: ExportBundle) {
  return [
    "TEMPO DE LEITURA",
    `Tempo real registrado no SERENE: ${formatExportDuration(bundle.totals.realSeconds)}.`,
    `Tempo historico estimado: ${formatExportDuration(
      bundle.totals.estimatedHistoricalSeconds,
    )} (estimado).`,
    `Total aproximado dedicado a leitura: ${formatExportDuration(
      bundle.totals.approximateTotalSeconds,
    )} (aproximado).`,
  ].join("\n");
}

export function buildMarkdownExport(bundle: ExportBundle, filters: ExportFilters, generatedAt: Date) {
  const bookMap = buildBookMap(bundle.books);
  const muralAnnotationIds = buildMuralAnnotationIds(bundle.muralPositions);
  const lines = [
    "# SERENE - Caderno de leitura",
    "",
    bundle.title,
    "",
    bundle.description,
    "",
    `Gerado em: ${formatDateTime(generatedAt)}`,
    `Intencao: ${exportIntentLabel[filters.intent]}`,
    `Privacidade: ${
      filters.includePrivateContent
        ? "conteudo privado incluido por escolha explicita"
        : "conteudo privado excluido por padrao"
    }`,
    "",
    markdownTimeSection(bundle),
    "",
    "## Visao geral",
    "",
    `- Livros: ${bundle.books.length}`,
    `- Sessoes: ${bundle.sessions.length}`,
    `- Anotacoes: ${bundle.annotations.length}`,
    `- Tempo real registrado no SERENE: ${formatExportDuration(bundle.totals.realSeconds)} registradas no SERENE`,
    `- Tempo historico estimado: ${formatExportDuration(
      bundle.totals.estimatedHistoricalSeconds,
    )} estimadas do seu historico`,
    `- Total aproximado: ${formatExportDuration(
      bundle.totals.approximateTotalSeconds,
    )} aproximadas dedicadas aos livros`,
  ];

  if (bundle.strongestCategories.length > 0) {
    lines.push(
      `- Areas mais fortes: ${bundle.strongestCategories
        .map((category) => `${category.name} (${category.bookCount})`)
        .join(", ")}`,
    );
  }

  if (bundle.warnings.length > 0) {
    lines.push("", "## Cuidados", "", ...bundle.warnings.map((warning) => `- ${warning}`));
  }

  if (bundle.books.length > 0) {
    lines.push("", "## Livros", "");
    for (const book of bundle.books) {
      const realSeconds = bookRealSeconds(book, bundle.sessions);
      const historicalSeconds = book.estimated_reading_seconds ?? 0;
      const bookSessions = bundle.sessions.filter((session) => session.book_id === book.id);
      const bookAnnotations = bundle.annotations.filter((annotation) => annotation.book_id === book.id);
      lines.push(
        `### ${book.title}`,
        "",
        `- Autor: ${book.author ?? "Nao informado"}`,
        `- Status: ${statusLabels[book.status]}`,
        `- Origem: ${originLabels[book.reading_origin]}`,
        `- Pagina atual: ${book.current_page}${book.total_pages ? ` de ${book.total_pages}` : ""}`,
        `- Tempo real registrado no SERENE: ${formatExportDuration(realSeconds)}`,
      );

      if (book.reading_origin === "historico" || book.read_before_serene) {
        lines.push(
          `- Tempo historico estimado: ${formatExportDuration(historicalSeconds)} (estimado)`,
        );
      }

      if (book.description) {
        lines.push("", compactText(book.description) ?? "");
      }

      appendMarkdownSessions(lines, bookSessions, bookMap, "####");
      appendMarkdownAnnotationSections(lines, bookAnnotations, muralAnnotationIds, "####");
    }
  }

  if (filters.intent === "mural") {
    lines.push(
      "",
      "## Nota sobre o Mural",
      "",
      "O Mural e uma visualizacao das mesmas anotacoes. Este arquivo usa cada anotacao uma unica vez e nao duplica conteudo por posicao visual.",
    );
  }

  const orphanSessions = bundle.sessions.filter((session) => !bookMap.has(session.book_id));
  if (orphanSessions.length > 0) {
    lines.push("", "## Sessoes sem livro disponivel");
    appendMarkdownSessions(lines, orphanSessions, bookMap, "###");
  }

  const orphanAnnotations = bundle.annotations.filter((annotation) => !annotation.book_id);
  if (orphanAnnotations.length > 0) {
    lines.push("", "## Anotacoes sem livro", "");
    appendMarkdownAnnotationSections(lines, orphanAnnotations, muralAnnotationIds, "###");
  }

  if (bundle.books.length === 0 && bundle.sessions.length === 0 && bundle.annotations.length === 0) {
    lines.push("", "Nenhum conteudo encontrado para estes filtros.");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function buildTxtExport(bundle: ExportBundle, filters: ExportFilters, generatedAt: Date) {
  const bookMap = buildBookMap(bundle.books);
  const muralAnnotationIds = buildMuralAnnotationIds(bundle.muralPositions);
  const lines = [
    "SERENE - Caderno de leitura",
    bundle.title,
    "",
    bundle.description,
    "",
    `Gerado em: ${formatDateTime(generatedAt)}`,
    `Intencao: ${exportIntentLabel[filters.intent]}`,
    `Privacidade: ${
      filters.includePrivateContent
        ? "conteudo privado incluido por escolha explicita"
        : "conteudo privado excluido por padrao"
    }`,
    "",
    textTimeSection(bundle),
    "",
    "VISAO GERAL",
    `Livros: ${bundle.books.length}`,
    `Sessoes: ${bundle.sessions.length}`,
    `Anotacoes: ${bundle.annotations.length}`,
    `Tempo real registrado no SERENE: ${formatExportDuration(bundle.totals.realSeconds)} registradas no SERENE`,
    `Tempo historico estimado: ${formatExportDuration(
      bundle.totals.estimatedHistoricalSeconds,
    )} estimadas do seu historico`,
    `Total aproximado: ${formatExportDuration(
      bundle.totals.approximateTotalSeconds,
    )} aproximadas dedicadas aos livros`,
  ];

  if (bundle.strongestCategories.length > 0) {
    lines.push(
      `Areas mais fortes: ${bundle.strongestCategories
        .map((category) => `${category.name} (${category.bookCount})`)
        .join(", ")}`,
    );
  }

  if (bundle.warnings.length > 0) {
    lines.push("", "CUIDADOS", ...bundle.warnings.map((warning) => `- ${warning}`));
  }

  if (bundle.books.length > 0) {
    lines.push("", "LIVROS");
    for (const book of bundle.books) {
      const realSeconds = bookRealSeconds(book, bundle.sessions);
      const bookSessions = bundle.sessions.filter((session) => session.book_id === book.id);
      const bookAnnotations = bundle.annotations.filter((annotation) => annotation.book_id === book.id);
      lines.push(
        "",
        book.title,
        `Autor: ${book.author ?? "Nao informado"}`,
        `Status: ${statusLabels[book.status]}`,
        `Origem: ${originLabels[book.reading_origin]}`,
        `Tempo real registrado no SERENE: ${formatExportDuration(realSeconds)}`,
      );

      if (book.reading_origin === "historico" || book.read_before_serene) {
        lines.push(
          `Tempo historico estimado: ${formatExportDuration(
            book.estimated_reading_seconds ?? 0,
          )} (estimado)`,
        );
      }

      appendTextSessions(lines, bookSessions, bookMap);
      appendTextAnnotationSections(lines, bookAnnotations, muralAnnotationIds);
    }
  }

  if (filters.intent === "mural") {
    lines.push(
      "",
      "NOTA SOBRE O MURAL",
      "O Mural e uma visualizacao das mesmas anotacoes. Este arquivo usa cada anotacao uma unica vez e nao duplica conteudo por posicao visual.",
    );
  }

  const orphanSessions = bundle.sessions.filter((session) => !bookMap.has(session.book_id));
  if (orphanSessions.length > 0) {
    lines.push("", "SESSOES SEM LIVRO DISPONIVEL");
    appendTextSessions(lines, orphanSessions, bookMap);
  }

  const orphanAnnotations = bundle.annotations.filter((annotation) => !annotation.book_id);
  if (orphanAnnotations.length > 0) {
    lines.push("", "ANOTACOES SEM LIVRO");
    appendTextAnnotationSections(lines, orphanAnnotations, muralAnnotationIds);
  }

  if (bundle.books.length === 0 && bundle.sessions.length === 0 && bundle.annotations.length === 0) {
    lines.push("", "Nenhum conteudo encontrado para estes filtros.");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function createExportFileName(format: Extract<ExportFormat, "markdown" | "txt">, intent: ExportIntent) {
  const extension = format === "markdown" ? "md" : "txt";
  const dateToken = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return `serene-${intent}-${dateToken}.${extension}`;
}

export async function createExportRecord(input: {
  userId: string;
  format: Extract<ExportFormat, "markdown" | "txt">;
  filters: ExportFilters;
  fileName: string;
  bundle: ExportBundle;
}): Promise<ServiceResult<ExportRecordRow>> {
  const supabase = getSupabaseBrowserClient();
  const generatedAt = new Date().toISOString();
  const metadata: Json = {
    file_name: input.fileName,
    generated_at: generatedAt,
    intention: input.filters.intent,
    format_label: exportFormatLabel[input.format],
    filters: {
      book_id: input.filters.bookId,
      session_id: input.filters.sessionId,
      period_start: input.filters.periodStart || null,
      period_end: input.filters.periodEnd || null,
    },
    counts: {
      books: input.bundle.books.length,
      sessions: input.bundle.sessions.length,
      annotations: input.bundle.annotations.length,
      mural_positions_referenced: input.bundle.muralPositions.length,
      strongest_categories: input.bundle.strongestCategories.length,
    },
    time: {
      real_seconds_registered_in_serene: input.bundle.totals.realSeconds,
      estimated_historical_seconds: input.bundle.totals.estimatedHistoricalSeconds,
      approximate_total_seconds: input.bundle.totals.approximateTotalSeconds,
    },
    privacy: {
      included_private_content: input.filters.includePrivateContent,
      private_content_policy: input.filters.includePrivateContent
        ? "included_by_explicit_choice"
        : "excluded_by_default",
      omitted_private_books: input.bundle.omitted.privateBooks,
      omitted_private_annotations: input.bundle.omitted.privateAnnotations,
      omitted_private_sessions: input.bundle.omitted.privateSessions,
      omitted_quick_excluded_books: input.bundle.omitted.quickExcludedBooks,
      omitted_quick_excluded_annotations: input.bundle.omitted.quickExcludedAnnotations,
      omitted_quick_excluded_sessions: input.bundle.omitted.quickExcludedSessions,
    },
    strongest_categories: input.bundle.strongestCategories.map((category) => ({
      name: category.name,
      book_count: category.bookCount,
    })),
  };

  const exportResult = await supabase
    .from("exports")
    .insert({
      user_id: input.userId,
      format: input.format,
      export_type: input.filters.intent,
      file_url: null,
      included_private_content: input.filters.includePrivateContent,
      metadata,
    })
    .select("*")
    .single();

  if (exportResult.error || !exportResult.data) {
    return {
      data: null,
      error: { message: exportResult.error?.message ?? "Nao foi possivel registrar a exportacao." },
    };
  }

  await supabase.from("timeline_events").insert({
    user_id: input.userId,
    event_type: "export_created",
    title: "Exportacao concluida",
    description: `${exportIntentLabel[input.filters.intent]} em ${exportFormatLabel[input.format]}.`,
    metadata,
  });

  return { data: exportResult.data, error: null };
}
