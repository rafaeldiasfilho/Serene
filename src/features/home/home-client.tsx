"use client";

import Link from "next/link";
import { BookOpen, Camera, PlayCircle, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { OPEN_ANNOTATION_SHORTCUT_EVENT } from "@/lib/shortcuts";
import { AnnotationModal, type AnnotationModalSubmitValue } from "@/features/annotations/annotation-modal";
import {
  createAnnotation,
  listAnnotationColors,
} from "@/features/annotations/annotation-services";
import { fallbackAnnotationColors } from "@/features/annotations/annotation-definitions";
import type { AnnotationColorOption } from "@/features/annotations/use-annotations";
import { useBookLibrary } from "@/features/books/use-book-library";
import {
  CapturePlaceholderDialog,
  type CaptureReviewValue,
} from "@/features/camera-placeholder/capture-placeholder-dialog";

function fallbackColors(): AnnotationColorOption[] {
  return fallbackAnnotationColors.map((color, index) => ({
    id: `fallback-${index + 1}`,
    color_hex: color,
    name: null,
    applies_to: null,
    is_default: index === 0,
  }));
}

export function HomeClient() {
  const { authLoading, profile, profileState, user } = useAppState();
  const { books, loading } = useBookLibrary(user?.id ?? null);
  const [showCuriosity, setShowCuriosity] = useState(true);
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<CaptureReviewValue | null>(null);
  const [annotationColors, setAnnotationColors] = useState<AnnotationColorOption[]>(() =>
    fallbackColors(),
  );
  const [annotationFeedback, setAnnotationFeedback] = useState<string | null>(null);

  const currentBook = useMemo(() => {
    return (
      books.find((book) => book.is_current && book.show_in_home) ??
      books.find((book) => book.status === "lendo" && book.show_in_home) ??
      null
    );
  }, [books]);

  const otherReadingBooks = useMemo(() => {
    return books
      .filter((book) => book.status === "lendo" && book.show_in_home && book.id !== currentBook?.id)
      .slice(0, 4);
  }, [books, currentBook]);

  const booksForAnnotations = useMemo(() => {
    return books.map((book) => ({
      id: book.id,
      title: book.title,
      status: book.status,
      reading_origin: book.reading_origin,
      read_before_serene: book.read_before_serene,
      total_pages: book.total_pages,
      current_page: book.current_page,
    }));
  }, [books]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    void listAnnotationColors(user.id).then(({ data, error }) => {
      if (!isMounted || error) {
        return;
      }
      if (!data || data.length === 0) {
        return;
      }

      setAnnotationColors(
        data.map((row) => ({
          id: row.id,
          color_hex: row.color_hex,
          name: row.name,
          applies_to: row.applies_to,
          is_default: row.is_default,
        })),
      );
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    function handleOpenAnnotationShortcut() {
      setAnnotationFeedback(null);
      setCaptureDraft(null);
      setAnnotationModalOpen(true);
    }

    window.addEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);

    return () => {
      window.removeEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);
    };
  }, []);

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando seu Inicio...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  async function handleHomeAnnotationSubmit(value: AnnotationModalSubmitValue) {
    if (!user) {
      return {
        ok: false,
        message: "Usuario nao autenticado.",
      };
    }

    const result = await createAnnotation({
      user_id: user.id,
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
    });

    if (result.error) {
      return {
        ok: false,
        message: result.error.message,
      };
    }

    setAnnotationFeedback(
      value.origin === "camera"
        ? "Captura revisada salva como anotacao."
        : "Anotacao salva a partir do Inicio.",
    );
    return { ok: true, message: null };
  }

  function handleCaptureReview(value: CaptureReviewValue) {
    setCaptureDraft(value);
    setCaptureDialogOpen(false);
    setAnnotationFeedback(null);
    setAnnotationModalOpen(true);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Inicio
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Ola, {profile?.name ?? "leitor"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Um painel calmo para retomar seus livros sem pressa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCaptureDraft(null);
              setCaptureDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
            title="Preparar captura"
          >
            <Camera className="size-4" />
            Captura
          </button>

          <div className="flex items-center gap-3 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
            <div className="grid size-11 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-sm font-semibold">
              {(profile?.name ?? user.email ?? "S").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{profile?.name ?? user.email}</p>
              <p className="text-xs text-[var(--serene-muted)]">Perfil conectado</p>
            </div>
          </div>
        </div>
      </div>

      {annotationFeedback && (
        <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm">
          {annotationFeedback}
        </p>
      )}

      {showCuriosity && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
          <p className="literary text-sm text-[var(--serene-muted)]">
            Curiosidade literaria: reler um trecho favorito em outro dia pode revelar uma pergunta
            nova, nao apenas uma resposta antiga.
          </p>
          <button
            type="button"
            onClick={() => setShowCuriosity(false)}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--serene-border)]"
            aria-label="Fechar curiosidade"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-60 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <BrainLoader />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
          <BookOpen className="size-8 text-[var(--serene-accent)]" />
          <h2 className="mt-3 text-xl font-semibold">Comece pela Biblioteca</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--serene-muted)]">
            Adicione seu primeiro livro quando quiser. SERENE mantem a organizacao simples desde o
            primeiro registro.
          </p>
          <Link
            href="/biblioteca"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            Adicionar livro
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-lg border border-[var(--serene-accent)] bg-[var(--serene-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Livro atual
            </p>
            {currentBook ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="grid aspect-[2/3] w-20 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-xs text-[var(--serene-muted)]">
                  {currentBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentBook.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "Sem capa"
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{currentBook.title}</h2>
                  <p className="mt-1 text-sm text-[var(--serene-muted)]">
                    {currentBook.author ?? "Autor nao informado"}
                  </p>
                  <p className="mt-3 text-sm text-[var(--serene-muted)]">
                    Pagina {currentBook.current_page}
                    {currentBook.total_pages ? ` de ${currentBook.total_pages}` : ""}
                  </p>
                  <Link
                    href={`/leitura/${currentBook.id}?origem=inicio`}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    <PlayCircle className="size-4" />
                    Iniciar ou retomar leitura
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--serene-muted)]">
                Marque um livro como atual na Biblioteca para destaca-lo aqui.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Tambem lendo
            </p>
            {otherReadingBooks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--serene-muted)]">
                Nenhum outro livro em andamento por enquanto.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {otherReadingBooks.map((book) => (
                  <div
                    key={book.id}
                    className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3"
                  >
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="truncate text-xs text-[var(--serene-muted)]">
                      {book.author ?? "Autor nao informado"}
                    </p>
                    <Link
                      href={`/leitura/${book.id}?origem=inicio`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--serene-accent)]"
                    >
                      Ler agora
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setAnnotationFeedback(null);
          setCaptureDraft(null);
          setAnnotationModalOpen(true);
        }}
        className="fixed bottom-4 right-4 z-20 inline-flex size-12 items-center justify-center rounded-full bg-[var(--serene-accent)] text-white shadow-lg sm:bottom-6 sm:right-6"
        aria-label="Nova anotacao"
      >
        <Plus className="size-5" />
      </button>

      {annotationModalOpen && (
        <AnnotationModal
          mode="create"
          books={booksForAnnotations}
          colors={annotationColors}
          lockedBookId={captureDraft?.bookId ?? null}
          lockedSessionId={null}
          forcedOrigin={captureDraft?.origin}
          defaultType={captureDraft?.defaultType}
          defaultContent={captureDraft?.defaultContent}
          defaultPageNumber={captureDraft ? captureDraft.pageNumber : currentBook?.current_page ?? null}
          onClose={() => {
            setAnnotationModalOpen(false);
            setCaptureDraft(null);
          }}
          onSubmit={handleHomeAnnotationSubmit}
        />
      )}

      {captureDialogOpen && (
        <CapturePlaceholderDialog
          books={books}
          booksLoading={loading}
          currentBookId={currentBook?.id ?? null}
          currentSessionId={null}
          onClose={() => setCaptureDialogOpen(false)}
          onReview={handleCaptureReview}
        />
      )}
    </section>
  );
}
