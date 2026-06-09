"use client";

import {
  AlertTriangle,
  BookOpen,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { annotationTypeLabel } from "@/features/annotations/annotation-definitions";
import {
  listBooksForTrash,
  listDeletedAnnotations,
  listDeletedBooks,
  permanentlyDeleteAnnotation,
  permanentlyDeleteBook,
  restoreAnnotation,
  restoreBook,
  type TrashAnnotationRow,
  type TrashBookRow,
} from "@/features/trash/trash-services";
import type { AnnotationType } from "@/lib/supabase/database.types";
import { ACTION_ERROR_MESSAGE, LOAD_ERROR_MESSAGE, userFacingError } from "@/lib/user-facing-error";

type TrashFilter = "all" | "books" | "annotations";
type AnnotationTrashFilter = "all" | Exclude<AnnotationType, "ocr_page"> | "others";
type ConfirmState =
  | {
      kind: "book" | "annotation";
      id: string;
      title: string;
      input: string;
    }
  | null;

type BookTitleRow = {
  id: string;
  title: string;
  deleted_at: string | null;
};

const confirmationText = "EXCLUIR";

const annotationTypeFilters: Array<{ value: AnnotationTrashFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "post_it", label: "Post-its" },
  { value: "reflection", label: "Reflexões" },
  { value: "highlight", label: "Marca-textos" },
  { value: "quick_note", label: "Anotações rápidas" },
  { value: "flag", label: "Flags" },
  { value: "idea", label: "Ideias" },
  { value: "doubt", label: "Dúvidas" },
  { value: "thought", label: "Pensamentos" },
  { value: "action", label: "Ações" },
  { value: "others", label: "Outros" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Data não registrada";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function annotationTitle(annotation: TrashAnnotationRow) {
  const content = annotation.content?.trim();
  if (!content) {
    return annotationTypeLabel[annotation.type];
  }

  return content.length > 72 ? `${content.slice(0, 72)}...` : content;
}

export function TrashClient() {
  const { authLoading, envReady, profileState, user } = useAppState();
  const [books, setBooks] = useState<TrashBookRow[]>([]);
  const [annotations, setAnnotations] = useState<TrashAnnotationRow[]>([]);
  const [bookTitles, setBookTitles] = useState<BookTitleRow[]>([]);
  const [filter, setFilter] = useState<TrashFilter>("all");
  const [annotationFilter, setAnnotationFilter] = useState<AnnotationTrashFilter>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const bookTitleById = useMemo(() => {
    return new Map(bookTitles.map((book) => [book.id, book.title]));
  }, [bookTitles]);

  const hasTrash = books.length > 0 || annotations.length > 0;
  const visibleBooks = filter === "all" || filter === "books" ? books : [];
  const visibleAnnotations = useMemo(() => {
    if (filter !== "all" && filter !== "annotations") {
      return [];
    }

    if (annotationFilter === "all") {
      return annotations;
    }

    if (annotationFilter === "others") {
      return annotations.filter((annotation) => annotation.type === "ocr_page");
    }

    return annotations.filter((annotation) => annotation.type === annotationFilter);
  }, [annotationFilter, annotations, filter]);

  const refresh = useCallback(async () => {
    if (!user) {
      setBooks([]);
      setAnnotations([]);
      setBookTitles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [booksResult, annotationsResult, bookTitlesResult] = await Promise.all([
      listDeletedBooks(user.id),
      listDeletedAnnotations(user.id),
      listBooksForTrash(user.id),
    ]);

    const firstError = booksResult.error ?? annotationsResult.error ?? bookTitlesResult.error;

    if (firstError) {
      setError(userFacingError(firstError, LOAD_ERROR_MESSAGE, "Falha ao carregar Lixeira."));
      setLoading(false);
      return;
    }

    setBooks(booksResult.data ?? []);
    setAnnotations(annotationsResult.data ?? []);
    setBookTitles((bookTitlesResult.data ?? []) as BookTitleRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  async function handleRestore(kind: "book" | "annotation", id: string) {
    if (!user) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    const result =
      kind === "book" ? await restoreBook(id, user.id) : await restoreAnnotation(id, user.id);
    setSaving(false);

    if (result.error) {
      setFeedback(userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao restaurar item da Lixeira."));
      return;
    }

    setFeedback(kind === "book" ? "Livro restaurado." : "Anotação restaurada.");
    await refresh();
  }

  async function handlePermanentDelete() {
    if (!user || !confirmState || confirmState.input !== confirmationText) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    const result =
      confirmState.kind === "book"
        ? await permanentlyDeleteBook(confirmState.id, user.id)
        : await permanentlyDeleteAnnotation(confirmState.id, user.id);

    setSaving(false);

    if (result.error) {
      setFeedback(userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao excluir item permanentemente."));
      return;
    }

    setFeedback(
      confirmState.kind === "book"
        ? "Livro excluído definitivamente."
        : "Anotação excluída definitivamente.",
    );
    setConfirmState(null);
    await refresh();
  }

  function handleConfirmKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setConfirmState(null);
    }
  }

  if (!envReady) {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-amber-300/80 bg-amber-50 p-5 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        Configure as variáveis Supabase para carregar a Lixeira.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo a Lixeira...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <section className="serene-soft-in space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-6 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Lixeira
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Recuperação sem susto</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Livros e anotações removidos ficam aqui antes de qualquer exclusão definitiva. É uma
              área de segurança, não um atalho para apagar sem cuidado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.35rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">Livros</p>
          <p className="mt-1 text-2xl font-semibold">{books.length}</p>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Anotações
          </p>
          <p className="mt-1 text-2xl font-semibold">{annotations.length}</p>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--serene-accent)]" />
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Padrão
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
            Restaurar é sempre a primeira opção. Excluir para sempre exige confirmação clara.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Tudo" },
          { value: "books", label: "Livros" },
          { value: "annotations", label: "Anotações" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value as TrashFilter)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm",
              filter === item.value
                ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {feedback && (
        <p className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      )}

      {loading ? (
        <section className="grid min-h-56 place-items-center rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Verificando itens removidos...</p>
          </div>
        </section>
      ) : !hasTrash ? (
        <section className="rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 shadow-[var(--serene-shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="mt-3 text-xl font-semibold">Lixeira vazia</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Nada foi removido no momento. Quando algo for enviado para a Lixeira, a restauração
            aparece aqui.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {visibleBooks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Livros apagados
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {visibleBooks.map((book) => (
                  <article
                    key={book.id}
                    className="rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                        <BookOpen className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2 py-1 text-xs text-[var(--serene-muted)]">
                            Livro
                          </span>
                          {book.is_private && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2 py-1 text-xs text-[var(--serene-muted)]">
                              <Lock className="size-3" />
                              Privado
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 truncate text-lg font-semibold">{book.title}</h3>
                        <p className="text-sm text-[var(--serene-muted)]">
                          {book.author ?? "Autor não informado"}
                        </p>
                        <p className="mt-2 text-xs text-[var(--serene-muted)]">
                          Removido em {formatDate(book.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRestore("book", book.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:opacity-60"
                      >
                        <RotateCcw className="size-3.5" />
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            kind: "book",
                            id: book.id,
                            title: book.title,
                            input: "",
                          })
                        }
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-300/80 bg-rose-50 px-3 py-1.5 text-xs text-rose-800 disabled:opacity-60 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100"
                      >
                        <Trash2 className="size-3.5" />
                        Excluir definitivamente
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {(filter === "all" || filter === "annotations") && annotations.length > 0 && (
            <section className="space-y-3">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Anotações apagadas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {annotationTypeFilters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setAnnotationFilter(item.value)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-xs",
                        annotationFilter === item.value
                          ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                          : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {visibleAnnotations.length === 0 ? (
                <p className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
                  Nenhuma anotação apagada neste tipo.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleAnnotations.map((annotation) => (
                  <article
                    key={annotation.id}
                    className="rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                        <StickyNote className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2 py-1 text-xs text-[var(--serene-muted)]">
                            {annotationTypeLabel[annotation.type]}
                          </span>
                          {annotation.is_private && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2 py-1 text-xs text-[var(--serene-muted)]">
                              <Lock className="size-3" />
                              Privada
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-base font-semibold">{annotationTitle(annotation)}</h3>
                        <p className="mt-1 text-sm text-[var(--serene-muted)]">
                          {annotation.book_id
                            ? bookTitleById.get(annotation.book_id) ?? "Livro não encontrado"
                            : "Sem livro vinculado"}
                        </p>
                        <p className="mt-2 text-xs text-[var(--serene-muted)]">
                          Removida em {formatDate(annotation.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRestore("annotation", annotation.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:opacity-60"
                      >
                        <RotateCcw className="size-3.5" />
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            kind: "annotation",
                            id: annotation.id,
                            title: annotationTitle(annotation),
                            input: "",
                          })
                        }
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-300/80 bg-rose-50 px-3 py-1.5 text-xs text-rose-800 disabled:opacity-60 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100"
                      >
                        <Trash2 className="size-3.5" />
                        Excluir definitivamente
                      </button>
                    </div>
                  </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {confirmState && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
          onKeyDown={handleConfirmKeyDown}
        >
          <section
            className="w-full max-w-md rounded-[1.75rem] border border-rose-300/80 bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-lift)] dark:border-rose-700/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trash-confirm-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-200">
                  <AlertTriangle className="size-5" />
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Confirmação clara
                  </p>
                </div>
                <h2 id="trash-confirm-title" className="mt-2 text-xl font-semibold">
                  Apagar definitivamente?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="grid size-8 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)]"
                aria-label="Fechar confirmação"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-3 rounded-2xl border border-rose-300/80 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100">
              Essa ação não poderá ser desfeita. {confirmState.title} será removido de forma
              permanente. Para continuar, digite{" "}
              <strong>{confirmationText}</strong>.
            </p>

            <input
              value={confirmState.input}
              onChange={(event) =>
                setConfirmState((current) =>
                  current ? { ...current, input: event.target.value.toUpperCase() } : current,
                )
              }
              className="mt-4 w-full rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
              placeholder={confirmationText}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handlePermanentDelete()}
                disabled={confirmState.input !== confirmationText || saving}
                className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:opacity-50 dark:bg-rose-600"
              >
                <Trash2 className="size-4" />
                Excluir para sempre
              </button>
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                disabled={saving}
                className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)]"
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
