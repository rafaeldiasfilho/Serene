"use client";

import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Map as MapIcon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { OPEN_ANNOTATION_SHORTCUT_EVENT } from "@/lib/shortcuts";
import { AnnotationCard } from "@/features/annotations/annotation-card";
import { AnnotationModal, type AnnotationModalSubmitValue } from "@/features/annotations/annotation-modal";
import { primaryAnnotationTypeOptions } from "@/features/annotations/annotation-definitions";
import { PostItStack } from "@/features/annotations/post-it-stack";
import { useAnnotations } from "@/features/annotations/use-annotations";
import type { AnnotationBookRow, AnnotationRow } from "@/features/annotations/annotation-services";
import { MuralEntryDialog } from "@/features/mural/mural-entry-dialog";
import { notifyReadingSessionChanged } from "@/features/reading-sessions/reading-session-events";
import {
  getOpenSessionForBook,
  updateReadingSession,
} from "@/features/reading-sessions/reading-session-services";
import {
  listVocabularyEntries,
  softDeleteVocabularyEntry,
  type VocabularyEntryRow,
} from "@/features/vocabulary/vocabulary-services";
import type { AnnotationReviewStatus, AnnotationType } from "@/lib/supabase/database.types";

type TypeFilter = "all" | AnnotationType | "other";
type ScopeFilter = "all" | "favorites" | "to_review";
type BookFilter = "all" | "without_book" | string;
type AnnotationFolder = "post_it" | "reflection" | "highlight" | "quick_note";
type AnnotationViewItem =
  | {
      kind: "single";
      annotation: AnnotationRow;
    }
  | {
      kind: "post_it_stack";
      annotations: AnnotationRow[];
      key: string;
    };

function getPostItGroupKey(annotation: AnnotationRow) {
  return annotation.book_id ?? "without-book";
}

function getPostItColorLabel(color: string) {
  const normalized = color.toUpperCase();

  if (normalized === "#F7E78A") {
    return "Amarelos";
  }
  if (normalized === "#DDEAFE") {
    return "Azuis";
  }
  if (normalized === "#DFF5E4") {
    return "Verdes";
  }
  if (normalized === "#F4DDF8") {
    return "Rosas";
  }
  if (color === "sem-cor") {
    return "Sem cor";
  }

  return "Outros";
}

function formatVocabularyDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getVocabularyPreview(entry: VocabularyEntryRow) {
  const definition = entry.definition?.trim();
  if (!definition) {
    return "Sem significado manual ainda.";
  }
  return definition.length > 110 ? `${definition.slice(0, 107)}...` : definition;
}

const primaryAnnotationTypeValues = new Set(
  primaryAnnotationTypeOptions.map((option) => option.value),
);

const annotationFolders: Array<{
  type: AnnotationFolder;
  title: string;
  helper: string;
  preview: "post_it" | "reflection" | "highlight" | "quick";
}> = [
  {
    type: "post_it",
    title: "Post-its",
    helper: "Papeis fisicos, cores e pequenas pilhas.",
    preview: "post_it",
  },
  {
    type: "reflection",
    title: "Reflexoes",
    helper: "Pensamentos literarios em baloes suaves.",
    preview: "reflection",
  },
  {
    type: "highlight",
    title: "Marca-textos",
    helper: "Trechos marcados como no livro fisico.",
    preview: "highlight",
  },
  {
    type: "quick_note",
    title: "Anotacoes rapidas",
    helper: "Notas limpas para escrever sem pensar demais.",
    preview: "quick",
  },
];

function FolderPreview({ preview }: { preview: (typeof annotationFolders)[number]["preview"] }) {
  if (preview === "post_it") {
    return (
      <div className="relative h-24">
        <span className="absolute left-6 top-3 h-16 w-16 rotate-[-5deg] rounded-sm bg-[#F7E78A] shadow-[0_12px_24px_rgb(47_42_36_/_14%)]" />
        <span className="absolute left-12 top-5 h-16 w-16 rotate-[4deg] rounded-sm bg-[#DDEAFE] shadow-[0_12px_24px_rgb(47_42_36_/_12%)]" />
        <span className="absolute left-9 top-8 h-16 w-16 rotate-[-1deg] rounded-sm bg-[#F4DDF8] shadow-[0_12px_24px_rgb(47_42_36_/_16%)]" />
      </div>
    );
  }

  if (preview === "reflection") {
    return (
      <div className="relative h-24">
        <span className="absolute left-4 top-4 h-16 w-32 rounded-[2rem] border border-[color-mix(in_oklab,var(--serene-accent)_36%,var(--serene-border)_64%)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_76%,transparent)] shadow-[var(--serene-shadow-soft)]" />
        <span className="absolute bottom-5 left-11 size-4 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)]" />
        <span className="absolute bottom-2 left-6 size-2.5 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)]" />
      </div>
    );
  }

  if (preview === "highlight") {
    return (
      <div className="grid h-24 content-center gap-2 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
        <span className="h-3 w-28 rounded-sm bg-[linear-gradient(180deg,transparent_42%,#F7E78A_42%,#F7E78A_88%,transparent_88%)]" />
        <span className="h-3 w-36 rounded-sm bg-[linear-gradient(180deg,transparent_42%,#DDEAFE_42%,#DDEAFE_88%,transparent_88%)]" />
        <span className="h-3 w-24 rounded-sm bg-[linear-gradient(180deg,transparent_42%,#DFF5E4_42%,#DFF5E4_88%,transparent_88%)]" />
      </div>
    );
  }

  return (
    <div className="grid h-24 content-center gap-2 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
      <span className="h-2 w-28 rounded-full bg-[var(--serene-border)]" />
      <span className="h-2 w-36 rounded-full bg-[var(--serene-border)]" />
      <span className="h-2 w-20 rounded-full bg-[var(--serene-border)]" />
    </div>
  );
}

function AnnotationFolderCard({
  active,
  count,
  folder,
  onOpen,
}: {
  active: boolean;
  count: number;
  folder: (typeof annotationFolders)[number];
  onOpen: (folder: AnnotationFolder) => void;
}) {
  return (
    <article
      className={[
        "serene-card-enter rounded-[1.55rem] border bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--serene-shadow-lift)]",
        active
          ? "border-[var(--serene-accent)] ring-2 ring-[var(--serene-accent-soft)]"
          : "border-[var(--serene-border)]",
      ].join(" ")}
    >
      <FolderPreview preview={folder.preview} />
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
          Pasta
        </p>
        <h2 className="literary mt-1 text-xl leading-tight">{folder.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">{folder.helper}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1 text-xs text-[var(--serene-muted)]">
          {count === 1 ? "1 item" : `${count} itens`}
        </span>
        <button
          type="button"
          onClick={() => onOpen(folder.type)}
          className="rounded-full bg-[var(--serene-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--serene-shadow-soft)]"
        >
          Abrir
        </button>
      </div>
    </article>
  );
}

export function AnotacoesClient() {
  const router = useRouter();
  const { authLoading, envReady, profileState, user } = useAppState();
  const {
    annotations,
    booksById,
    books,
    colors,
    loading,
    saving,
    error,
    refresh,
    createAnnotationEntry,
    editAnnotationEntry,
    deleteAnnotationEntry,
    setFavorite,
    setPrivacy,
    setReviewStatus,
  } = useAnnotations(user?.id ?? null);

  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [bookFilter, setBookFilter] = useState<BookFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeFolder, setActiveFolder] = useState<AnnotationFolder | null>(null);
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyEntries, setVocabularyEntries] = useState<VocabularyEntryRow[]>([]);
  const [vocabularyLoading, setVocabularyLoading] = useState(false);
  const [vocabularyError, setVocabularyError] = useState<string | null>(null);
  const [postItColorFilter, setPostItColorFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<AnnotationRow | null>(null);
  const [muralPromptBook, setMuralPromptBook] = useState<AnnotationBookRow | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toReviewAnnotations = useMemo(() => {
    return annotations.filter((annotation) => annotation.review_status === "to_review");
  }, [annotations]);

  const folderCounts = useMemo(() => {
    return annotationFolders.reduce<Record<AnnotationFolder, number>>(
      (counts, folder) => {
        counts[folder.type] = annotations.filter((annotation) => annotation.type === folder.type).length;
        return counts;
      },
      {
        highlight: 0,
        post_it: 0,
        quick_note: 0,
        reflection: 0,
      },
    );
  }, [annotations]);

  const postItColorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    annotations
      .filter((annotation) => annotation.type === "post_it")
      .forEach((annotation) => {
        const key = annotation.color ?? "sem-cor";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });

    return Array.from(counts.entries()).map(([color, count]) => ({
      color,
      count,
      label: getPostItColorLabel(color),
    }));
  }, [annotations]);

  const filteredAnnotations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return annotations.filter((annotation) => {
      if (scopeFilter === "favorites" && !annotation.is_favorite) {
        return false;
      }
      if (scopeFilter === "to_review" && annotation.review_status !== "to_review") {
        return false;
      }
      if (bookFilter === "without_book" && annotation.book_id !== null) {
        return false;
      }
      if (bookFilter !== "all" && bookFilter !== "without_book" && annotation.book_id !== bookFilter) {
        return false;
      }
      if (activeFolder && annotation.type !== activeFolder) {
        return false;
      }
      if (
        activeFolder === "post_it" &&
        postItColorFilter !== "all" &&
        (annotation.color ?? "sem-cor") !== postItColorFilter
      ) {
        return false;
      }
      if (!activeFolder && typeFilter === "other" && primaryAnnotationTypeValues.has(annotation.type)) {
        return false;
      }
      if (!activeFolder && typeFilter !== "all" && typeFilter !== "other" && annotation.type !== typeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const bookTitle = annotation.book_id ? booksById.get(annotation.book_id)?.title ?? "" : "";
      const searchable = `${annotation.content ?? ""} ${bookTitle}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [
    activeFolder,
    annotations,
    bookFilter,
    booksById,
    postItColorFilter,
    query,
    scopeFilter,
    typeFilter,
  ]);

  const filteredVocabularyEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return vocabularyEntries.filter((entry) => {
      if (bookFilter === "without_book" && entry.book_id !== null) {
        return false;
      }
      if (bookFilter !== "all" && bookFilter !== "without_book" && entry.book_id !== bookFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const bookTitle = entry.book_id ? booksById.get(entry.book_id)?.title ?? "" : "";
      const searchable = [
        entry.word,
        entry.definition,
        entry.note,
        bookTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [bookFilter, booksById, query, vocabularyEntries]);

  const selectedMuralBook = useMemo(() => {
    if (bookFilter === "all" || bookFilter === "without_book") {
      return null;
    }

    return books.find((book) => book.id === bookFilter) ?? null;
  }, [bookFilter, books]);

  const annotationViewItems = useMemo<AnnotationViewItem[]>(() => {
    const postItGroups = new Map<string, AnnotationRow[]>();

    filteredAnnotations.forEach((annotation) => {
      if (annotation.type !== "post_it") {
        return;
      }

      const key = getPostItGroupKey(annotation);
      postItGroups.set(key, [...(postItGroups.get(key) ?? []), annotation]);
    });

    const stackKeys = new Set(
      Array.from(postItGroups.entries())
        .filter(([, group]) => group.length > 1)
        .map(([key]) => key),
    );
    const renderedStacks = new Set<string>();

    const items: AnnotationViewItem[] = [];

    filteredAnnotations.forEach((annotation) => {
      if (annotation.type !== "post_it") {
        items.push({ kind: "single", annotation });
        return;
      }

      const key = getPostItGroupKey(annotation);
      if (!stackKeys.has(key)) {
        items.push({ kind: "single", annotation });
        return;
      }

      if (renderedStacks.has(key)) {
        return;
      }

      renderedStacks.add(key);
      items.push({
        kind: "post_it_stack",
        annotations: postItGroups.get(key) ?? [annotation],
        key,
      });
    });

    return items;
  }, [filteredAnnotations]);

  useEffect(() => {
    function handleOpenAnnotationShortcut() {
      setEditingAnnotation(null);
      setFeedback(null);
      setModalOpen(true);
    }

    window.addEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);

    return () => {
      window.removeEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("nova") !== "1") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEditingAnnotation(null);
      setFeedback(null);
      setModalOpen(true);
      window.history.replaceState(null, "", "/anotacoes");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("vocabulario") !== "1") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveFolder(null);
      setTypeFilter("all");
      setPostItColorFilter("all");
      setVocabularyOpen(true);
      window.history.replaceState(null, "", "/anotacoes");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;
    void listVocabularyEntries(user.id).then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setVocabularyError(error.message);
        setVocabularyEntries([]);
      } else {
        setVocabularyError(null);
        setVocabularyEntries(data ?? []);
      }

      setVocabularyLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!envReady) {
    return (
      <section className="serene-soft-in rounded-[1.75rem] border border-amber-300/70 bg-amber-50/90 p-6 text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-sm font-semibold">As memórias ainda não podem ser abertas.</p>
        <p className="mt-2 text-sm opacity-80">
          Configure as variáveis Supabase para carregar as anotações.
        </p>
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando suas anotações...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  async function handleModalSubmit(value: AnnotationModalSubmitValue) {
    const payload = {
      book_id: value.bookId,
      session_id: value.sessionId,
      type: value.type,
      content: value.content,
      page_number: value.pageNumber,
      color: value.color,
      text_color: value.textColor,
      highlight_color: value.highlightColor,
      origin: value.origin,
      is_favorite: value.isFavorite,
      is_private: value.isPrivate,
      review_status: value.reviewStatus,
    };

    if (editingAnnotation) {
      const result = await editAnnotationEntry(editingAnnotation.id, payload);
      if (result.ok) {
        setFeedback("Anotação atualizada.");
      }
      return result;
    }

    const result = await createAnnotationEntry(payload);
    if (result.ok) {
      setFeedback("Anotação salva.");
    }
    return result;
  }

  async function handleDelete(annotation: AnnotationRow) {
    const confirmed = window.confirm("Enviar esta anotação para a Lixeira?");
    if (!confirmed) {
      return;
    }

    const result = await deleteAnnotationEntry(annotation.id);
    setFeedback(
      result.ok
        ? annotation.type === "post_it"
          ? "Post-it movido para a Lixeira."
          : "Anotação enviada para a Lixeira."
        : result.message,
    );
  }

  async function handleRemoveVocabularyEntry(entry: VocabularyEntryRow) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm("Remover esta palavra do vocabulario?");
    if (!confirmed) {
      return;
    }

    const result = await softDeleteVocabularyEntry(entry.id, user.id);

    if (result.error) {
      setFeedback(result.error.message);
      return;
    }

    setVocabularyEntries((current) => current.filter((item) => item.id !== entry.id));
    setFeedback("Palavra removida do vocabulario.");
  }

  async function handleToggleFavorite(annotation: AnnotationRow, nextValue: boolean) {
    const result = await setFavorite(annotation, nextValue);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setFeedback(nextValue ? "Anotação favoritada." : "Anotação removida dos favoritos.");
  }

  async function handleTogglePrivacy(annotation: AnnotationRow, nextValue: boolean) {
    const result = await setPrivacy(annotation, nextValue);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setFeedback(nextValue ? "Anotação marcada como privada." : "Anotação marcada como pública.");
  }

  async function handleSetReviewStatus(annotation: AnnotationRow, nextStatus: AnnotationReviewStatus) {
    const result = await setReviewStatus(annotation, nextStatus);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setFeedback("Status de revisão atualizado.");
  }

  function openCreateModal() {
    setEditingAnnotation(null);
    setModalOpen(true);
  }

  function openFolder(folder: AnnotationFolder) {
    setVocabularyOpen(false);
    setActiveFolder(folder);
    setTypeFilter(folder);
    setPostItColorFilter("all");
  }

  function openVocabularyFolder() {
    setActiveFolder(null);
    setTypeFilter("all");
    setPostItColorFilter("all");
    setVocabularyOpen(true);
  }

  async function handleOpenSelectedBookMural() {
    if (!user || !selectedMuralBook) {
      return;
    }

    setFeedback(null);
    const sessionResult = await getOpenSessionForBook(user.id, selectedMuralBook.id);

    if (sessionResult.error) {
      setFeedback(sessionResult.error.message);
      return;
    }

    if (!sessionResult.data) {
      setMuralPromptBook(selectedMuralBook);
      return;
    }

    const muralResult = await updateReadingSession(sessionResult.data.id, user.id, {
      mural_opened: true,
      is_minimized: false,
    });

    if (muralResult.error) {
      setFeedback(muralResult.error.message);
      return;
    }

    notifyReadingSessionChanged();
    router.push(`/leitura/${selectedMuralBook.id}/mural?origem=anotacoes`);
  }

  function handleStartReadingFromMuralPrompt() {
    if (!muralPromptBook) {
      return;
    }

    const bookId = muralPromptBook.id;
    setMuralPromptBook(null);
    router.push(`/leitura/${bookId}?origem=anotacoes`);
  }

  function openEditModal(annotation: AnnotationRow) {
    setEditingAnnotation(annotation);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingAnnotation(null);
  }

  return (
    <section className="space-y-7">
      <header className="serene-rise overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(135deg,var(--serene-surface),var(--serene-paper),var(--serene-accent-soft))] p-5 shadow-[var(--serene-shadow-lift)] sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
              <Sparkles className="size-3.5 text-[var(--serene-accent)]" />
              Anotações
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--serene-text)] sm:text-4xl">
              Memórias organizadas em palavras
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Guarde trechos, pensamentos e retornos de leitura em um espaço calmo, com tudo pronto
              para ser revisitado quando a ideia pedir silêncio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm font-semibold text-[var(--serene-text)] shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--serene-accent)]"
            >
              <RefreshCw className="size-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-lift)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105"
            >
              <Plus className="size-4" />
              Nova anotação
            </button>
          </div>
        </div>
      </header>

      {feedback && (
        <p className="serene-soft-in rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
          {feedback}
        </p>
      )}

      {error && (
        <p className="serene-soft-in rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      )}

      {vocabularyError && (
        <p className="serene-soft-in rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          {vocabularyError}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {annotationFolders.map((folder) => (
          <AnnotationFolderCard
            key={folder.type}
            active={activeFolder === folder.type}
            folder={folder}
            count={folderCounts[folder.type]}
            onOpen={openFolder}
          />
        ))}
      </section>

      <section
        className={[
          "serene-soft-in rounded-[1.5rem] border bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]",
          vocabularyOpen
            ? "border-[var(--serene-accent)] ring-2 ring-[var(--serene-accent-soft)]"
            : "border-[var(--serene-border)]",
        ].join(" ")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
              <BookMarked className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Pasta secundaria
              </p>
              <h2 className="mt-1 text-base font-semibold">{"Vocabul\u00e1rio"}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
                Palavras guardadas durante a leitura, organizadas por livro sem virar uma area principal.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1.5 text-xs text-[var(--serene-muted)]">
              {vocabularyEntries.length === 1 ? "1 palavra" : `${vocabularyEntries.length} palavras`}
            </span>
            <button
              type="button"
              onClick={openVocabularyFolder}
              className="rounded-full bg-[var(--serene-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--serene-shadow-soft)]"
            >
              Abrir
            </button>
          </div>
        </div>
      </section>

      {vocabularyOpen && (
      <section className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--serene-text)]">
              <Search className="size-4 text-[var(--serene-accent)]" />
              Encontrar palavra
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
              Busque pelo termo, pelo significado escrito por voce ou pelo livro.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[var(--serene-muted)]">
              {filteredVocabularyEntries.length} de {vocabularyEntries.length} exibidas
            </p>
            <button
              type="button"
              onClick={() => {
                setVocabularyOpen(false);
                setBookFilter("all");
                setQuery("");
              }}
              className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
            >
              Voltar para pastas
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="palavra, significado, livro..."
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 font-normal text-[var(--serene-text)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Livro
            <select
              value={bookFilter}
              onChange={(event) => setBookFilter(event.target.value as BookFilter)}
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 font-normal text-[var(--serene-text)] outline-none transition duration-300 focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            >
              <option value="all">Todos</option>
              <option value="without_book">Sem livro</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      )}

      {activeFolder && (
      <section className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--serene-text)]">
              <Search className="size-4 text-[var(--serene-accent)]" />
              Encontrar dentro da pasta
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
              Filtre sem perder o ritmo: por trecho, livro ou intencao de retorno.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[var(--serene-muted)]">
              {filteredAnnotations.length} de {folderCounts[activeFolder]} exibidas
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFolder(null);
                setTypeFilter("all");
                setPostItColorFilter("all");
              }}
              className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
            >
              Voltar para pastas
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="trecho, ideia, livro..."
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 font-normal text-[var(--serene-text)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Escopo
            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 font-normal text-[var(--serene-text)] outline-none transition duration-300 focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            >
              <option value="all">Todas</option>
              <option value="favorites">Favoritas</option>
              <option value="to_review">Para revisar</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Livro
            <select
              value={bookFilter}
              onChange={(event) => setBookFilter(event.target.value as BookFilter)}
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 font-normal text-[var(--serene-text)] outline-none transition duration-300 focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            >
              <option value="all">Todos</option>
              <option value="without_book">Sem livro</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
          <label className="hidden gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Tipo
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 font-normal text-[var(--serene-text)] outline-none transition duration-300 focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            >
              <option value="all">Todos</option>
              {primaryAnnotationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="other">Outros registros</option>
            </select>
          </label>
        </div>

        {activeFolder === "post_it" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPostItColorFilter("all")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs",
                postItColorFilter === "all"
                  ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                  : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)]",
              ].join(" ")}
            >
              Todos
            </button>
            {postItColorOptions.map((option) => (
              <button
                key={option.color}
                type="button"
                onClick={() => setPostItColorFilter(option.color)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                  postItColorFilter === option.color
                    ? "border-[var(--serene-accent)] bg-[var(--serene-surface)] text-[var(--serene-fg)]"
                    : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)]",
                ].join(" ")}
              >
                <span
                  className="size-3 rounded-full border border-black/10"
                  style={{
                    backgroundColor:
                      option.color === "sem-cor" ? "var(--serene-surface)" : option.color,
                  }}
                />
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {activeFolder && selectedMuralBook && (
        <section className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
                <MapIcon className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Mural de ideias
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--serene-text)]">
                  Organizar no Mural
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
                  Veja as anotacoes de {selectedMuralBook.title} em um espaco mais livre. Se ainda
                  nao houver sessao ativa, a leitura abre primeiro.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleOpenSelectedBookMural()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
            >
              <MapIcon className="size-4" />
              Ver no Mural
            </button>
          </div>
        </section>
      )}

      {activeFolder && toReviewAnnotations.some((annotation) => annotation.type === activeFolder) && (
        <section className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-4 shadow-[var(--serene-shadow-soft)] sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
              <CheckCircle2 className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--serene-text)]">Para revisar</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--serene-muted)]">
                Retornos guardados para quando você quiser reencontrar uma ideia com mais calma.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {toReviewAnnotations
              .filter((annotation) => annotation.type === activeFolder)
              .slice(0, 4)
              .map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                bookTitle={annotation.book_id ? booksById.get(annotation.book_id)?.title ?? null : null}
                onEdit={openEditModal}
                onDelete={(item) => void handleDelete(item)}
                onToggleFavorite={(item, next) => void handleToggleFavorite(item, next)}
                onTogglePrivacy={(item, next) => void handleTogglePrivacy(item, next)}
                onSetReviewStatus={(item, next) => void handleSetReviewStatus(item, next)}
              />
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <section className="serene-soft-in grid min-h-56 place-items-center rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-col items-center gap-3 text-center">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Reunindo suas memórias de leitura...</p>
          </div>
        </section>
      ) : vocabularyOpen ? (
        vocabularyLoading ? (
          <section className="serene-soft-in grid min-h-48 place-items-center rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
            <div className="flex flex-col items-center gap-3 text-center">
              <BrainLoader />
              <p className="text-sm text-[var(--serene-muted)]">Carregando vocabulario...</p>
            </div>
          </section>
        ) : filteredVocabularyEntries.length === 0 ? (
          <section className="serene-rise rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-7 shadow-[var(--serene-shadow-soft)]">
            <span className="grid size-12 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
              <BookMarked className="size-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-[var(--serene-text)]">
              Nenhuma palavra neste filtro
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Salve palavras pela tela de leitura. Elas aparecem aqui como um historico leve por livro.
            </p>
          </section>
        ) : (
          <section className="grid gap-3 md:grid-cols-2">
            {filteredVocabularyEntries.map((entry) => {
              const bookTitle = entry.book_id ? booksById.get(entry.book_id)?.title ?? null : null;

              return (
                <details
                  key={entry.id}
                  className="serene-card-enter rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]"
                >
                  <summary className="cursor-pointer">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-[var(--serene-text)]">{entry.word}</h3>
                      <span className="text-xs text-[var(--serene-muted)]">
                        {formatVocabularyDate(entry.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
                      {getVocabularyPreview(entry)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--serene-muted)]">
                      {bookTitle && (
                        <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2.5 py-1">
                          {bookTitle}
                        </span>
                      )}
                      {entry.page_number !== null && (
                        <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2.5 py-1">
                          {`p. ${entry.page_number}`}
                        </span>
                      )}
                    </div>
                  </summary>

                  {(entry.definition || entry.note || entry.source) && (
                    <div className="mt-4 space-y-2 border-t border-[var(--serene-border)] pt-3 text-sm leading-relaxed text-[var(--serene-muted)]">
                      {entry.definition && <p>{entry.definition}</p>}
                      {entry.note && <p>{entry.note}</p>}
                      {entry.source && <p className="text-xs">Fonte: {entry.source}</p>}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end border-t border-[var(--serene-border)] pt-3">
                    <button
                      type="button"
                      onClick={() => void handleRemoveVocabularyEntry(entry)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1.5 text-xs text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
                    >
                      <Trash2 className="size-3.5" />
                      Remover
                    </button>
                  </div>
                </details>
              );
            })}
          </section>
        )
      ) : !activeFolder ? (
        <section className="serene-rise rounded-[2rem] border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] p-7 shadow-[var(--serene-shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
            <BookOpen className="size-5" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-[var(--serene-text)]">
            Abra uma pasta para rever suas anotacoes
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Post-its, reflexoes, marca-textos e anotacoes rapidas ficam separados para cada forma de
            pensamento manter sua identidade.
          </p>
        </section>
      ) : filteredAnnotations.length === 0 ? (
        <section className="serene-rise rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-7 shadow-[var(--serene-shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
            <BookOpen className="size-5" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-[var(--serene-text)]">
            Nenhuma memória neste filtro
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Ajuste os filtros ou crie uma anotação para guardar o trecho, pensamento ou pergunta que
            ficou depois da leitura.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105"
          >
            <Plus className="size-4" />
            Criar anotação
          </button>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {annotationViewItems.map((item) => {
            if (item.kind === "post_it_stack") {
              const firstAnnotation = item.annotations[0];

              return (
                <PostItStack
                  key={`post-it-stack-${item.key}`}
                  annotations={item.annotations}
                  bookTitle={
                    firstAnnotation?.book_id ? booksById.get(firstAnnotation.book_id)?.title ?? null : null
                  }
                  onEdit={openEditModal}
                  onDelete={(annotation) => void handleDelete(annotation)}
                  onToggleFavorite={(annotation, next) => void handleToggleFavorite(annotation, next)}
                  onTogglePrivacy={(annotation, next) => void handleTogglePrivacy(annotation, next)}
                  onSetReviewStatus={(annotation, next) => void handleSetReviewStatus(annotation, next)}
                />
              );
            }

            return (
              <AnnotationCard
                key={item.annotation.id}
                annotation={item.annotation}
                bookTitle={item.annotation.book_id ? booksById.get(item.annotation.book_id)?.title ?? null : null}
                onEdit={openEditModal}
                onDelete={(annotation) => void handleDelete(annotation)}
                onToggleFavorite={(annotation, next) => void handleToggleFavorite(annotation, next)}
                onTogglePrivacy={(annotation, next) => void handleTogglePrivacy(annotation, next)}
                onSetReviewStatus={(annotation, next) => void handleSetReviewStatus(annotation, next)}
              />
            );
          })}
        </section>
      )}

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-20 right-4 z-20 inline-flex size-12 items-center justify-center rounded-full bg-[var(--serene-accent)] text-white shadow-[var(--serene-shadow-lift)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 sm:bottom-6 sm:right-6"
        aria-label="Criar anotação"
      >
        <Plus className="size-5" />
      </button>

      {modalOpen && (
        <AnnotationModal
          mode={editingAnnotation ? "edit" : "create"}
          books={books}
          colors={colors}
          initialAnnotation={editingAnnotation}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
        />
      )}

      {muralPromptBook && (
        <MuralEntryDialog
          bookTitle={muralPromptBook.title}
          onClose={() => setMuralPromptBook(null)}
          onStartReading={handleStartReadingFromMuralPrompt}
        />
      )}

      {saving && (
        <div className="serene-soft-in fixed bottom-4 left-4 z-20 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-xs text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] sm:bottom-6 sm:left-6">
          Salvando alterações...
        </div>
      )}
    </section>
  );
}
