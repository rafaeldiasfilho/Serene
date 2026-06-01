"use client";

import { BookOpen, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { OPEN_ANNOTATION_SHORTCUT_EVENT } from "@/lib/shortcuts";
import { AnnotationCard } from "@/features/annotations/annotation-card";
import { AnnotationModal, type AnnotationModalSubmitValue } from "@/features/annotations/annotation-modal";
import { annotationTypeOptions } from "@/features/annotations/annotation-definitions";
import { useAnnotations } from "@/features/annotations/use-annotations";
import type { AnnotationRow } from "@/features/annotations/annotation-services";
import type { AnnotationReviewStatus, AnnotationType } from "@/lib/supabase/database.types";

type TypeFilter = "all" | AnnotationType;
type ScopeFilter = "all" | "favorites" | "to_review";
type BookFilter = "all" | "without_book" | string;

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
      if (typeFilter !== "all" && annotation.type !== typeFilter) {
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
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para carregar as anotacoes.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando suas anotacoes...</p>
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
        setFeedback("Anotacao atualizada.");
      }
      return result;
    }

    const result = await createAnnotationEntry(payload);
    if (result.ok) {
      setFeedback("Anotacao salva.");
    }
    return result;
  }

  async function handleDelete(annotation: AnnotationRow) {
    const confirmed = window.confirm("Enviar esta anotacao para a Lixeira?");
    if (!confirmed) {
      return;
    }

    const result = await deleteAnnotationEntry(annotation.id);
    setFeedback(result.ok ? "Anotacao enviada para a Lixeira." : result.message);
  }

  async function handleToggleFavorite(annotation: AnnotationRow, nextValue: boolean) {
    const result = await setFavorite(annotation, nextValue);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setFeedback(nextValue ? "Anotacao favoritada." : "Anotacao removida dos favoritos.");
  }

  async function handleTogglePrivacy(annotation: AnnotationRow, nextValue: boolean) {
    const result = await setPrivacy(annotation, nextValue);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setFeedback(nextValue ? "Anotacao marcada como privada." : "Anotacao marcada como publica.");
  }

  async function handleSetReviewStatus(annotation: AnnotationRow, nextStatus: AnnotationReviewStatus) {
    const result = await setReviewStatus(annotation, nextStatus);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setFeedback("Status de revisao atualizado.");
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
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Anotacoes
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Seu mapa de ideias em texto</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Crie, edite, favorite e revise sem perder leveza. Tudo com soft delete para sua
            seguranca.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            Nova anotacao
          </button>
        </div>
      </header>

      {feedback && (
        <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">Total</p>
          <p className="mt-1 text-2xl font-semibold">{annotations.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">Favoritas</p>
          <p className="mt-1 text-2xl font-semibold">{favoriteCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">Para revisar</p>
          <p className="mt-1 text-2xl font-semibold">{toReviewAnnotations.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">Privadas</p>
          <p className="mt-1 text-2xl font-semibold">{privateCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="trecho, ideia, livro..."
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Escopo
            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
            >
              <option value="all">Todas</option>
              <option value="favorites">Favoritas</option>
              <option value="to_review">Para revisar</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Livro
            <select
              value={bookFilter}
              onChange={(event) => setBookFilter(event.target.value as BookFilter)}
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
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
          <label className="grid gap-1 text-sm">
            Tipo
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
            >
              <option value="all">Todos</option>
              {annotationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {toReviewAnnotations.length > 0 && (
        <section className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
          <h2 className="text-base font-semibold">Para revisar</h2>
          <p className="mt-1 text-sm text-[var(--serene-muted)]">
            Anotacoes destacadas para retorno com calma.
          </p>
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
        <section className="grid min-h-56 place-items-center rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Carregando anotacoes...</p>
          </div>
        </section>
      ) : filteredAnnotations.length === 0 ? (
        <section className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
          <BookOpen className="size-8 text-[var(--serene-accent)]" />
          <h2 className="mt-3 text-xl font-semibold">Nenhuma anotacao neste filtro</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--serene-muted)]">
            Ajuste os filtros ou crie uma anotacao com o botao +.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            Criar anotacao
          </button>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {filteredAnnotations.map((annotation) => (
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
        </section>
      )}

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-4 right-4 z-20 inline-flex size-12 items-center justify-center rounded-full bg-[var(--serene-accent)] text-white shadow-lg sm:bottom-6 sm:right-6"
        aria-label="Criar anotacao"
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
        <div className="fixed bottom-4 left-4 z-20 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-xs text-[var(--serene-muted)] sm:bottom-6 sm:left-6">
          Salvando alteracoes...
        </div>
      )}
    </section>
  );
}
