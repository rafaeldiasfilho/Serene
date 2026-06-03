"use client";

import {
  BookOpen,
  CheckCircle2,
  Heart,
  Lock,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
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
import type { AnnotationRow } from "@/features/annotations/annotation-services";
import type { AnnotationReviewStatus, AnnotationType } from "@/lib/supabase/database.types";

type TypeFilter = "all" | AnnotationType | "other";
type ScopeFilter = "all" | "favorites" | "to_review";
type BookFilter = "all" | "without_book" | string;
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

const primaryAnnotationTypeValues = new Set(
  primaryAnnotationTypeOptions.map((option) => option.value),
);

function MetricTile({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <article className="serene-soft-in rounded-[1.35rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] transition duration-500 hover:-translate-y-0.5 hover:shadow-[var(--serene-shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--serene-text)]">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--serene-muted)]">{helper}</p>
    </article>
  );
}

export function AnotacoesClient() {
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<AnnotationRow | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toReviewAnnotations = useMemo(() => {
    return annotations.filter((annotation) => annotation.review_status === "to_review");
  }, [annotations]);

  const favoriteCount = useMemo(() => {
    return annotations.filter((annotation) => annotation.is_favorite).length;
  }, [annotations]);

  const privateCount = useMemo(() => {
    return annotations.filter((annotation) => annotation.is_private).length;
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
      if (typeFilter === "other" && primaryAnnotationTypeValues.has(annotation.type)) {
        return false;
      }
      if (typeFilter !== "all" && typeFilter !== "other" && annotation.type !== typeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const bookTitle = annotation.book_id ? booksById.get(annotation.book_id)?.title ?? "" : "";
      const searchable = `${annotation.content ?? ""} ${bookTitle}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [annotations, bookFilter, booksById, query, scopeFilter, typeFilter]);

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

      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile
          helper="Fragmentos guardados no seu acervo."
          icon={MessageSquareText}
          label="Total"
          value={annotations.length}
        />
        <MetricTile
          helper="Ideias que merecem voltar ao centro."
          icon={Heart}
          label="Favoritas"
          value={favoriteCount}
        />
        <MetricTile
          helper="Notas separadas para uma releitura calma."
          icon={CheckCircle2}
          label="Para revisar"
          value={toReviewAnnotations.length}
        />
        <MetricTile
          helper="Memórias mantidas em espaço reservado."
          icon={Lock}
          label="Privadas"
          value={privateCount}
        />
      </section>

      <section className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--serene-text)]">
              <Search className="size-4 text-[var(--serene-accent)]" />
              Encontrar uma memória
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
              Filtre sem perder o ritmo: por trecho, livro, tipo ou intenção de retorno.
            </p>
          </div>
          <p className="text-xs text-[var(--serene-muted)]">
            {filteredAnnotations.length} de {annotations.length} exibidas
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
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
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
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
      </section>

      {toReviewAnnotations.length > 0 && (
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
            {toReviewAnnotations.slice(0, 4).map((annotation) => (
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

      {saving && (
        <div className="serene-soft-in fixed bottom-4 left-4 z-20 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-xs text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] sm:bottom-6 sm:left-6">
          Salvando alterações...
        </div>
      )}
    </section>
  );
}
