"use client";

import Link from "next/link";
import {
  BookOpen,
  Camera,
  Clock3,
  LibraryBig,
  PlayCircle,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

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
import { useBookLibrary, type BookWithCategories } from "@/features/books/use-book-library";
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

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Bom dia";
  }
  if (hour < 18) {
    return "Boa tarde";
  }
  return "Boa noite";
}

function getFirstName(name: string | null | undefined, fallback: string) {
  return (name ?? fallback).trim().split(" ")[0] || "leitor";
}

function getProgress(currentPage: number, totalPages: number | null) {
  if (!totalPages || totalPages <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((currentPage / totalPages) * 100));
}

function getCoverFallback(title: string) {
  let hash = 0;

  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) >>> 0;
  }

  const hue = 30 + (hash % 52);
  return `linear-gradient(145deg, hsl(${hue} 28% 58%), hsl(${hue + 28} 24% 34%))`;
}

function BookCover({
  book,
  size = "regular",
}: {
  book: BookWithCategories;
  size?: "feature" | "regular";
}) {
  const frameClass =
    size === "feature"
      ? "aspect-[2/3] w-40 sm:w-48 lg:w-56"
      : "aspect-[2/3] w-24 sm:w-28";

  return (
    <div
      className={`${frameClass} grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--serene-border)_78%,transparent)] bg-[var(--serene-surface-soft)] text-center text-white shadow-[0_18px_42px_rgb(47_42_36_/_14%)]`}
    >
      {book.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="grid h-full w-full place-items-center px-4"
          style={{ background: getCoverFallback(book.title) }}
        >
          <span className="literary line-clamp-5 text-base leading-snug text-white/92">
            {book.title}
          </span>
        </div>
      )}
    </div>
  );
}

function ProgressLine({ book }: { book: BookWithCategories }) {
  const progress = getProgress(book.current_page, book.total_pages);

  if (!book.total_pages) {
    return (
      <p className="text-xs text-[var(--serene-muted)]">
        Página atual: {book.current_page || "não informada"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-[var(--serene-surface-soft)]">
        <div
          className="h-full rounded-full bg-[var(--serene-accent)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[var(--serene-muted)]">
        Página {book.current_page} de {book.total_pages} · {progress}%
      </p>
    </div>
  );
}

function StatCard({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <article className="rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_84%,transparent)] p-4 shadow-[var(--serene-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            {label}
          </p>
          <p className="literary mt-3 text-2xl leading-none text-[var(--serene-fg)]">{value}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-2xl bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--serene-muted)]">{helper}</p>
    </article>
  );
}

function ReadingBookTile({ book }: { book: BookWithCategories }) {
  return (
    <article className="serene-card-enter flex gap-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 shadow-[var(--serene-shadow-soft)]">
      <BookCover book={book} />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
        <div className="min-w-0">
          <p className="literary truncate text-lg leading-tight text-[var(--serene-fg)]">
            {book.title}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--serene-muted)]">
            {book.author ?? "Autor não informado"}
          </p>
        </div>

        <ProgressLine book={book} />

        <Link
          href={`/leitura/${book.id}?origem=inicio`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--serene-accent)] transition hover:-translate-y-0.5 hover:border-[var(--serene-accent)]"
        >
          <PlayCircle className="size-3.5" />
          Ler agora
        </Link>
      </div>
    </article>
  );
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

  const readingBooks = useMemo(() => {
    return books.filter((book) => book.status === "lendo" && book.show_in_home);
  }, [books]);

  const currentBook = useMemo(() => {
    return (
      readingBooks.find((book) => book.is_current) ??
      readingBooks[0] ??
      books.find((book) => book.is_current && book.show_in_home) ??
      null
    );
  }, [books, readingBooks]);

  const otherReadingBooks = useMemo(() => {
    return readingBooks.filter((book) => book.id !== currentBook?.id);
  }, [currentBook, readingBooks]);

  const homeStats = useMemo(() => {
    const readingCount = books.filter((book) => book.status === "lendo").length;
    const readCount = books.filter((book) => book.status === "lido").length;
    const historicalCount = books.filter(
      (book) => book.reading_origin === "historico" || book.read_before_serene,
    ).length;

    return {
      historicalCount,
      readCount,
      readingCount,
      totalCount: books.length,
    };
  }, [books]);

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
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando seu Início...</p>
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
        message: "Usuário não autenticado.",
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
        ? "Captura revisada salva como anotação."
        : "Anotação salva a partir do Início.",
    );
    return { ok: true, message: null };
  }

  function handleCaptureReview(value: CaptureReviewValue) {
    setCaptureDraft(value);
    setCaptureDialogOpen(false);
    setAnnotationFeedback(null);
    setAnnotationModalOpen(true);
  }

  const firstName = getFirstName(profile?.name, user.email ?? "leitor");

  return (
    <section className="space-y-7">
      <div className="serene-soft-in overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-lift)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Início
            </p>
            <h1 className="literary mt-2 text-4xl leading-tight sm:text-5xl">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="literary mt-3 max-w-2xl text-base italic leading-relaxed text-[var(--serene-muted)]">
              Sua mesa de leitura: capas abertas, caminhos em andamento e espaço para guardar o que
              ficou.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCaptureDraft(null);
                setCaptureDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-fg)]"
              title="Preparar captura"
            >
              <Camera className="size-4" />
              Captura
            </button>

            <div className="flex items-center gap-3 rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,transparent)] p-3 shadow-[var(--serene-shadow-soft)]">
              <div className="grid size-11 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-sm font-semibold text-[var(--serene-accent)]">
                {(profile?.name ?? user.email ?? "S").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{profile?.name ?? user.email}</p>
                <p className="text-xs text-[var(--serene-muted)]">Perfil conectado</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {annotationFeedback && (
        <p className="serene-soft-in rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]">
          {annotationFeedback}
        </p>
      )}

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-col items-center gap-3 text-center">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Reunindo sua mesa de leitura...</p>
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="serene-rise rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-7 shadow-[var(--serene-shadow-soft)]">
          <BookOpen className="size-8 text-[var(--serene-accent)]" />
          <h2 className="literary mt-3 text-2xl">Comece pela Biblioteca</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Adicione seu primeiro livro quando quiser. O Início ganha vida quando há uma leitura
            para voltar.
          </p>
          <Link
            href="/biblioteca"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
          >
            <Plus className="size-4" />
            Adicionar livro
          </Link>
        </div>
      ) : (
        <section className="serene-rise overflow-hidden rounded-[2rem] border border-[color-mix(in_oklab,var(--serene-accent)_48%,var(--serene-border)_52%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,white_8%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-lift)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
                Leituras em andamento
              </p>
              <h2 className="literary mt-2 text-3xl leading-tight text-[var(--serene-fg)]">
                Livros abertos agora
              </h2>
            </div>
            <p className="text-sm text-[var(--serene-muted)]">
              {readingBooks.length} {readingBooks.length === 1 ? "leitura ativa" : "leituras ativas"}
            </p>
          </div>

          {readingBooks.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
              <p className="text-sm leading-relaxed text-[var(--serene-muted)]">
                Nenhum livro está marcado como em leitura agora. Quando você iniciar uma leitura, a
                capa aparece aqui como parte da sua mesa.
              </p>
            </div>
          ) : currentBook ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(180px,260px)_1fr] lg:items-end">
                <div className="mx-auto lg:mx-0">
                  <BookCover book={currentBook} size="feature" />
                </div>
                <div className="min-w-0 rounded-[1.5rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_84%,transparent)] p-5 shadow-[var(--serene-shadow-soft)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                    Livro atual em destaque
                  </p>
                  <h3 className="literary mt-2 text-3xl leading-tight text-[var(--serene-fg)] sm:text-4xl">
                    {currentBook.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--serene-muted)]">
                    {currentBook.author ?? "Autor não informado"}
                  </p>
                  <div className="mt-5 max-w-xl">
                    <ProgressLine book={currentBook} />
                  </div>
                  <Link
                    href={`/leitura/${currentBook.id}?origem=inicio`}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:-translate-y-0.5 hover:brightness-105"
                  >
                    <PlayCircle className="size-4" />
                    Continuar leitura
                  </Link>
                </div>
              </div>

              {otherReadingBooks.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                    Também na mesa
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {otherReadingBooks.map((book) => (
                      <ReadingBookTile key={book.id} book={book} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={LibraryBig}
            label="Biblioteca"
            value={homeStats.totalCount}
            helper="livros guardados no seu espaço"
          />
          <StatCard
            icon={BookOpen}
            label="Em leitura"
            value={homeStats.readingCount}
            helper="caminhos abertos neste momento"
          />
          <StatCard
            icon={Sparkles}
            label="Lidos"
            value={homeStats.readCount}
            helper="memórias concluídas"
          />
          <StatCard
            icon={Clock3}
            label="Histórico"
            value={homeStats.historicalCount}
            helper="leituras que vieram antes"
          />
        </section>

        {showCuriosity && (
          <aside className="serene-soft-in flex items-start justify-between gap-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_88%,var(--serene-surface-soft)_12%)] p-4 shadow-[var(--serene-shadow-soft)]">
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                <Sparkles className="size-4" />
              </span>
              <p className="literary text-sm leading-relaxed text-[var(--serene-muted)]">
                Reler um trecho favorito em outro dia pode revelar uma pergunta nova, não apenas
                uma resposta antiga.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCuriosity(false)}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
              aria-label="Fechar curiosidade"
            >
              <X className="size-4" />
            </button>
          </aside>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setAnnotationFeedback(null);
          setCaptureDraft(null);
          setAnnotationModalOpen(true);
        }}
        className="fixed bottom-20 right-4 z-20 inline-flex size-12 items-center justify-center rounded-full bg-[var(--serene-accent)] text-white shadow-[var(--serene-shadow-lift)] transition hover:-translate-y-0.5 hover:brightness-105 sm:bottom-6 sm:right-6"
        aria-label="Nova anotação"
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
