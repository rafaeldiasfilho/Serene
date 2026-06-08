import type {
  MenteAnnotationRow,
  MenteAutomaticCategoryRow,
  MenteBookRow,
  MenteManualCategoryRow,
  MenteReadingProgressEntryRow,
  MenteSessionRow,
  MenteSourceData,
  MenteTimelineEventRow,
} from "@/features/mente/mente-services";

type TopicRule = {
  name: string;
  description: string;
  color: string;
  keywords: string[];
};

type DraftCategory = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  confidence: number | null;
  source: "saved" | "inferred";
  bookIds: Set<string>;
  reasons: string[];
};

export type MenteCategory = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  percentage: number;
  confidence: number | null;
  source: "saved" | "inferred";
  bookIds: string[];
  books: MenteBookRow[];
  annotationPreviews: MenteAnnotationPreview[];
  annotationCount: number;
  sessionCount: number;
  realSeconds: number;
  estimatedOutsideSeconds: number;
  estimatedHistoricalSeconds: number;
  favoriteCount: number;
  toReviewCount: number;
  manualCategoryId: string | null;
  manualCategoryExists: boolean;
  score: number;
  reason: string | null;
};

export type MenteAnnotationPreview = {
  id: string;
  type: MenteAnnotationRow["type"];
  content: string;
  bookId: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  createdAt: string;
};

export type MenteEvolutionPoint = {
  key: string;
  label: string;
  seconds: number;
  sessionCount: number;
};

export type MenteConversation = {
  id: string;
  categoryName: string;
  color: string;
  books: MenteBookRow[];
  reason: string;
};

export type MenteInsight = {
  books: MenteBookRow[];
  sessions: MenteSessionRow[];
  annotations: MenteAnnotationRow[];
  categories: MenteCategory[];
  totals: {
    uniqueBooks: number;
    sessions: number;
    annotations: number;
    favoriteIdeas: number;
    itemsToReview: number;
    realSeconds: number;
    estimatedOutsideSeconds: number;
    estimatedHistoricalSeconds: number;
    approximateTotalSeconds: number;
  };
  favoriteIdeas: MenteAnnotationPreview[];
  reviewItems: MenteAnnotationPreview[];
  evolution: MenteEvolutionPoint[];
  conversations: MenteConversation[];
};

const topicRules: TopicRule[] = [
  {
    name: "Filosofia",
    description: "Perguntas sobre presenca, sentido, etica e modo de viver.",
    color: "#7EA6A1",
    keywords: [
      "filosofia",
      "estoic",
      "virtude",
      "sentido",
      "presenca",
      "consciencia",
      "aurelio",
      "tolle",
      "alquimista",
    ],
  },
  {
    name: "Financas",
    description: "Dinheiro, patrimonio, decisoes e comportamento financeiro.",
    color: "#C7A35A",
    keywords: [
      "financa",
      "financeir",
      "dinheiro",
      "patrimonio",
      "invest",
      "ativo",
      "poupanca",
      "kiyosaki",
      "housel",
      "babilonia",
    ],
  },
  {
    name: "Psicologia",
    description: "Emocoes, padroes mentais, vulnerabilidade e autoconsciencia.",
    color: "#B7ABC6",
    keywords: [
      "psicologia",
      "emoc",
      "mente",
      "mental",
      "vulner",
      "pensamento",
      "autoestima",
      "mindset",
      "dweck",
      "brown",
    ],
  },
  {
    name: "Desenvolvimento pessoal",
    description: "Identidade, habitos, disciplina e crescimento sem pressa.",
    color: "#8A9CCF",
    keywords: [
      "habito",
      "identidade",
      "disciplina",
      "crescimento",
      "desenvolvimento",
      "essencial",
      "melhor",
      "esforco",
      "clear",
      "mckeown",
    ],
  },
  {
    name: "Negocios",
    description: "Decisoes, estrategia, lideranca e criacao de valor.",
    color: "#C08A9B",
    keywords: [
      "negocio",
      "empresa",
      "empreend",
      "lideranca",
      "estrateg",
      "mercado",
      "gestao",
      "cliente",
    ],
  },
  {
    name: "Estudos",
    description: "Aprendizado, metodo, pesquisa e livros que pedem caderno aberto.",
    color: "#8DAA6A",
    keywords: [
      "estudo",
      "aprender",
      "aprendizado",
      "metodo",
      "pesquisa",
      "caderno",
      "curso",
      "aula",
    ],
  },
  {
    name: "Historia",
    description: "Tempo, memoria coletiva, contexto e transformacoes humanas.",
    color: "#B99A72",
    keywords: [
      "historia",
      "historico",
      "memoria",
      "civilizacao",
      "politica",
      "guerra",
      "seculo",
      "tempo",
    ],
  },
  {
    name: "Matematica",
    description: "Raciocinio, padroes, numeros e estruturas de pensamento.",
    color: "#7C9BB0",
    keywords: [
      "matematica",
      "numero",
      "calculo",
      "logica",
      "probabilidade",
      "estatistica",
      "padrao",
    ],
  },
  {
    name: "Espiritualidade",
    description: "Silencio, transcendencia, sentido e praticas interiores.",
    color: "#A68ABD",
    keywords: [
      "espiritual",
      "alma",
      "silencio",
      "meditacao",
      "oracao",
      "transcend",
      "sagrado",
      "presenca",
    ],
  },
  {
    name: "Literatura",
    description: "Narrativas, simbolos e imaginacao que continuam reverberando.",
    color: "#D28F84",
    keywords: ["literatura", "narrativa", "simbol", "jornada", "romance", "coelho"],
  },
  {
    name: "Produtividade",
    description: "Foco, execucao, prioridades e formas mais leves de agir.",
    color: "#9FC5A5",
    keywords: ["produtiv", "foco", "execucao", "prior", "sistema", "profundo", "newport"],
  },
];

const fallbackCategory: TopicRule = {
  name: "Leituras em formacao",
  description: "Livros que ainda estao encontrando um lugar natural na sua Mente.",
  color: "#9D958A",
  keywords: [],
};

const favoriteIdeaTypes = new Set<MenteAnnotationRow["type"]>([
  "idea",
  "reflection",
  "thought",
  "highlight",
  "quick_note",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function topicRuleForName(name: string) {
  const key = normalizeKey(name);
  return topicRules.find((rule) => normalizeKey(rule.name) === key);
}

function sumSeconds(rows: Array<Pick<MenteSessionRow, "active_seconds">>) {
  return rows.reduce((total, row) => total + row.active_seconds, 0);
}

function isHistoricalBook(book: MenteBookRow) {
  return book.reading_origin === "historico" || book.read_before_serene;
}

function estimatedHistoricalSecondsForBook(book: MenteBookRow) {
  if (!isHistoricalBook(book)) {
    return 0;
  }

  return book.estimated_reading_seconds ?? 0;
}

function metadataNumber(metadata: MenteTimelineEventRow["metadata"], key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metadataString(metadata: MenteTimelineEventRow["metadata"], key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function estimatedSecondsFromProgressEntry(entry: MenteReadingProgressEntryRow) {
  return (entry.estimated_minutes ?? 0) * 60;
}

function labelForDay(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getAnnotationContent(annotation: MenteAnnotationRow) {
  return annotation.content?.trim() ?? "";
}

function createAnnotationPreview(
  annotation: MenteAnnotationRow,
  bookById: Map<string, MenteBookRow>,
): MenteAnnotationPreview {
  const book = annotation.book_id ? bookById.get(annotation.book_id) ?? null : null;

  return {
    id: annotation.id,
    type: annotation.type,
    content: getAnnotationContent(annotation),
    bookId: book?.id ?? null,
    bookTitle: book?.title ?? null,
    bookAuthor: book?.author ?? null,
    bookCoverUrl: book?.cover_url ?? null,
    createdAt: annotation.created_at,
  };
}

function ensureCategory(
  categories: Map<string, DraftCategory>,
  category: Pick<MenteAutomaticCategoryRow, "id" | "name" | "description" | "confidence"> & {
    color?: string;
    source?: "saved" | "inferred";
  },
) {
  const key = normalizeKey(category.name);
  const existing = categories.get(key);

  if (existing) {
    if (category.description && !existing.description) {
      existing.description = category.description;
    }
    if (category.source === "saved") {
      existing.source = "saved";
    }
    if (category.confidence !== null) {
      existing.confidence = Math.max(existing.confidence ?? 0, category.confidence);
    }
    if (category.color && existing.color === "#7EA6A1") {
      existing.color = category.color;
    }
    return existing;
  }

  const matchedRule = topicRuleForName(category.name);
  const draft: DraftCategory = {
    id: category.id,
    name: category.name,
    description: category.description,
    color: category.color ?? matchedRule?.color ?? "#7EA6A1",
    confidence: category.confidence,
    source: category.source ?? "saved",
    bookIds: new Set<string>(),
    reasons: [],
  };

  categories.set(key, draft);
  return draft;
}

function bookSignal(
  book: MenteBookRow,
  annotations: MenteAnnotationRow[],
  manualCategoryNames: string[],
) {
  return normalizeText(
    [
      book.title,
      book.author,
      book.description,
      book.publisher,
      book.language,
      book.isbn,
      ...(book.subjects ?? []),
      ...manualCategoryNames,
      ...annotations.map((annotation) => annotation.content),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function hasTopicMatch(signal: string, rule: TopicRule) {
  return rule.keywords.some((keyword) => signal.includes(keyword));
}

function findManualCategory(
  category: DraftCategory,
  manualCategories: MenteManualCategoryRow[],
) {
  const categoryKey = normalizeKey(category.name);
  return (
    manualCategories.find((manualCategory) => normalizeKey(manualCategory.name) === categoryKey) ??
    null
  );
}

export function buildMenteInsight(source: MenteSourceData): MenteInsight {
  const bookById = new Map(source.books.map((book) => [book.id, book]));
  const visibleBookIds = new Set(source.books.map((book) => book.id));

  const sessions = source.sessions.filter(
    (session) => visibleBookIds.has(session.book_id) && session.status !== "cancelled",
  );
  const outsideProgressEntries = source.readingProgressEntries.filter((entry) =>
    visibleBookIds.has(entry.book_id),
  );
  const outsideProgressEvents = source.timelineEvents.filter(
    (event) => event.book_id !== null && visibleBookIds.has(event.book_id),
  );
  const annotations = source.annotations.filter(
    (annotation) => !annotation.book_id || visibleBookIds.has(annotation.book_id),
  );

  const estimatedOutsideSecondsByBook = new Map<string, number>();
  for (const entry of outsideProgressEntries) {
    estimatedOutsideSecondsByBook.set(
      entry.book_id,
      (estimatedOutsideSecondsByBook.get(entry.book_id) ?? 0) +
        estimatedSecondsFromProgressEntry(entry),
    );
  }

  for (const event of outsideProgressEvents) {
    if (!event.book_id) {
      continue;
    }

    if (metadataString(event.metadata, "progress_entry_id")) {
      continue;
    }

    estimatedOutsideSecondsByBook.set(
      event.book_id,
      (estimatedOutsideSecondsByBook.get(event.book_id) ?? 0) +
        metadataNumber(event.metadata, "estimated_seconds"),
    );
  }

  const annotationsByBook = new Map<string, MenteAnnotationRow[]>();
  for (const annotation of annotations) {
    if (!annotation.book_id) {
      continue;
    }

    const current = annotationsByBook.get(annotation.book_id) ?? [];
    current.push(annotation);
    annotationsByBook.set(annotation.book_id, current);
  }

  const categoryById = new Map(
    source.automaticCategories.map((category) => [category.id, category]),
  );
  const manualCategoryById = new Map(
    source.manualCategories.map((category) => [category.id, category]),
  );
  const manualCategoryNamesByBook = new Map<string, string[]>();

  for (const relation of source.manualRelations) {
    if (!visibleBookIds.has(relation.book_id)) {
      continue;
    }

    const manualCategory = manualCategoryById.get(relation.category_id);
    if (!manualCategory) {
      continue;
    }

    const current = manualCategoryNamesByBook.get(relation.book_id) ?? [];
    current.push(manualCategory.name);
    manualCategoryNamesByBook.set(relation.book_id, current);
  }

  const categories = new Map<string, DraftCategory>();

  for (const relation of source.automaticRelations) {
    if (!visibleBookIds.has(relation.book_id)) {
      continue;
    }

    const automaticCategory = categoryById.get(relation.automatic_category_id);
    if (!automaticCategory) {
      continue;
    }

    const draft = ensureCategory(categories, {
      id: automaticCategory.id,
      name: automaticCategory.name,
      description: automaticCategory.description,
      confidence: automaticCategory.confidence,
      source: "saved",
    });
    draft.bookIds.add(relation.book_id);
    if (relation.reason) {
      draft.reasons.push(relation.reason);
    }
  }

  for (const book of source.books) {
    const signal = bookSignal(
      book,
      annotationsByBook.get(book.id) ?? [],
      manualCategoryNamesByBook.get(book.id) ?? [],
    );

    for (const rule of topicRules) {
      if (!hasTopicMatch(signal, rule)) {
        continue;
      }

      const draft = ensureCategory(categories, {
        id: `inferred-${normalizeKey(rule.name)}`,
        name: rule.name,
        description: rule.description,
        confidence: null,
        color: rule.color,
        source: "inferred",
      });
      draft.bookIds.add(book.id);
    }
  }

  const assignedBookIds = new Set<string>();
  for (const category of categories.values()) {
    for (const bookId of category.bookIds) {
      assignedBookIds.add(bookId);
    }
  }

  const unassignedBooks = source.books.filter((book) => !assignedBookIds.has(book.id));
  if (unassignedBooks.length > 0) {
    const draft = ensureCategory(categories, {
      id: "inferred-leituras-em-formacao",
      name: fallbackCategory.name,
      description: fallbackCategory.description,
      confidence: null,
      color: fallbackCategory.color,
      source: "inferred",
    });

    for (const book of unassignedBooks) {
      draft.bookIds.add(book.id);
    }
  }

  const draftCategoryList = Array.from(categories.values())
    .filter((category) => category.bookIds.size > 0)
    .map<MenteCategory>((category) => {
      const bookIds = Array.from(category.bookIds);
      const bookIdSet = new Set(bookIds);
      const books = bookIds
        .map((bookId) => bookById.get(bookId))
        .filter((book): book is MenteBookRow => Boolean(book))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
      const categorySessions = sessions.filter((session) => bookIdSet.has(session.book_id));
      const categoryAnnotations = annotations.filter(
        (annotation) => annotation.book_id !== null && bookIdSet.has(annotation.book_id),
      );
      const realSeconds = sumSeconds(categorySessions);
      const estimatedOutsideSeconds = books.reduce(
        (total, book) => total + (estimatedOutsideSecondsByBook.get(book.id) ?? 0),
        0,
      );
      const estimatedHistoricalSeconds = books.reduce(
        (total, book) => total + estimatedHistoricalSecondsForBook(book),
        0,
      );
      const favoriteCount = categoryAnnotations.filter((annotation) => annotation.is_favorite).length;
      const toReviewCount = categoryAnnotations.filter(
        (annotation) => annotation.review_status === "to_review",
      ).length;
      const manualCategory = findManualCategory(category, source.manualCategories);
      const score =
        books.length * 6 +
        categoryAnnotations.length * 2 +
        categorySessions.length * 1.5 +
        realSeconds / 1800 +
        favoriteCount * 2;

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        percentage: 0,
        confidence: category.confidence,
        source: category.source,
        bookIds,
        books,
        annotationPreviews: categoryAnnotations
          .filter((annotation) => getAnnotationContent(annotation).length > 0)
          .sort((a, b) => {
            if (a.is_favorite !== b.is_favorite) {
              return a.is_favorite ? -1 : 1;
            }
            return b.created_at.localeCompare(a.created_at);
          })
          .map((annotation) => createAnnotationPreview(annotation, bookById))
          .slice(0, 4),
        annotationCount: categoryAnnotations.length,
        sessionCount: categorySessions.length,
        realSeconds,
        estimatedOutsideSeconds,
        estimatedHistoricalSeconds,
        favoriteCount,
        toReviewCount,
        manualCategoryId: manualCategory?.id ?? null,
        manualCategoryExists: Boolean(manualCategory),
        score,
        reason: category.reasons[0] ?? null,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-BR"));

  const totalCategoryScore = draftCategoryList.reduce(
    (total, category) => total + Math.max(category.score, 1),
    0,
  );
  const categoryList = draftCategoryList.map((category) => ({
    ...category,
    percentage:
      totalCategoryScore > 0
        ? Math.max(1, Math.round((Math.max(category.score, 1) / totalCategoryScore) * 100))
        : 0,
  }));

  const realSeconds = sumSeconds(sessions);
  const estimatedOutsideSeconds = source.books.reduce(
    (total, book) => total + (estimatedOutsideSecondsByBook.get(book.id) ?? 0),
    0,
  );
  const estimatedHistoricalSeconds = source.books.reduce(
    (total, book) => total + estimatedHistoricalSecondsForBook(book),
    0,
  );
  const favoriteIdeaRows = annotations.filter(
    (annotation) =>
      annotation.is_favorite &&
      favoriteIdeaTypes.has(annotation.type) &&
      getAnnotationContent(annotation).length > 0,
  );
  const reviewRows = annotations.filter(
    (annotation) =>
      annotation.review_status === "to_review" && getAnnotationContent(annotation).length > 0,
  );

  const groupedEvolution = new Map<string, MenteEvolutionPoint>();
  for (const session of sessions) {
    if (session.active_seconds <= 0) {
      continue;
    }

    const key = session.started_at.slice(0, 10);
    const current = groupedEvolution.get(key) ?? {
      key,
      label: labelForDay(key),
      seconds: 0,
      sessionCount: 0,
    };

    current.seconds += session.active_seconds;
    current.sessionCount += 1;
    groupedEvolution.set(key, current);
  }

  const evolution = Array.from(groupedEvolution.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6);

  const conversations = categoryList
    .filter((category) => category.books.length > 1)
    .slice(0, 3)
    .map<MenteConversation>((category) => {
      const books = category.books.slice(0, 3);
      const bookTitles = books.map((book) => book.title);
      const [firstBook, secondBook] = bookTitles;

      return {
        id: category.id,
        categoryName: category.name,
        color: category.color,
        books,
        reason:
          firstBook && secondBook
            ? `${firstBook} e ${secondBook} aparecem juntos em ${category.name}.`
            : `Esta area conecta leituras proximas em ${category.name}.`,
      };
    });

  return {
    books: source.books,
    sessions,
    annotations,
    categories: categoryList,
    totals: {
      uniqueBooks: source.books.length,
      sessions: sessions.length,
      annotations: annotations.length,
      favoriteIdeas: favoriteIdeaRows.length,
      itemsToReview: reviewRows.length,
      realSeconds,
      estimatedOutsideSeconds,
      estimatedHistoricalSeconds,
      approximateTotalSeconds: realSeconds + estimatedOutsideSeconds + estimatedHistoricalSeconds,
    },
    favoriteIdeas: favoriteIdeaRows
      .map((annotation) => createAnnotationPreview(annotation, bookById))
      .slice(0, 4),
    reviewItems: reviewRows.map((annotation) => createAnnotationPreview(annotation, bookById)).slice(0, 4),
    evolution,
    conversations,
  };
}
