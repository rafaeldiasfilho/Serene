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
    <article className="rounded-xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_86%,transparent)] p-4 shadow-[var(--serene-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">{label}</p>
        <span className="grid size-8 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="literary mt-3 text-2xl leading-none">{value}</p>
      <p className="mt-2 text-xs text-[var(--serene-muted)]">{helper}</p>
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

  const currentProgress = useMemo(() => {
    if (!currentBook) {
      return 0;
    }

    return getProgress(currentBook.current_page, currentBook.total_pages);
  }, [currentBook]);

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

  const firstName = getFirstName(profile?.name, user.email ?? "leitor");

  return (
    <section className="space-y-7">
      <div className="serene-soft-in overflow-hidden rounded-2xl border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Inicio
            </p>
            <h1 className="literary mt-2 text-4xl leading-tight sm:text-5xl">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="literary mt-3 max-w-2xl text-base italic leading-relaxed text-[var(--serene-muted)]">
              Um lugar quieto para voltar ao livro certo, guardar ideias e seguir lendo sem pressa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCaptureDraft(null);
                setCaptureDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,transparent)] px-4 py-2 text-sm shadow-[var(--serene-shadow-soft)]"
              title="Preparar captura"
            >
              <Camera className="size-4" />
              Captura
            </button>

            <div className="flex items-center gap-3 rounded-xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,transparent)] p-3 shadow-[var(--serene-shadow-soft)]">
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={LibraryBig}
            label="Biblioteca"
            value={homeStats.totalCount}
            helper="livros guardados"
          />
          <StatCard
            icon={BookOpen}
            label="Em leitura"
            value={homeStats.readingCount}
            helper="caminhos abertos agora"
          />
          <StatCard
            icon={Sparkles}
            label="Lidos"
            value={homeStats.readCount}
            helper="memorias concluidas"
          />
          <StatCard
            icon={Clock3}
            label="Historico"
            value={homeStats.historicalCount}
            helper="leituras antes do SERENE"
          />
        </div>
      </div>

      {annotationFeedback && (
        <p className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm shadow-[var(--serene-shadow-soft)]">
          {annotationFeedback}
        </p>
      )}

      {showCuriosity && (
        <div className="serene-rise flex items-start justify-between gap-4 rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_88%,var(--serene-surface-soft)_12%)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <Sparkles className="size-4" />
            </span>
            <p className="literary text-sm leading-relaxed text-[var(--serene-muted)]">
              Reler um trecho favorito em outro dia pode revelar uma pergunta nova, nao apenas uma
              resposta antiga.
            </p>
          </div>
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
        <div className="grid min-h-60 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 shadow-[var(--serene-shadow-soft)]">
          <BookOpen className="size-8 text-[var(--serene-accent)]" />
          <h2 className="literary mt-3 text-2xl">Comece pela Biblioteca</h2>
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
        <div className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
          <section className="overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--serene-accent)_54%,transparent)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Continue de onde parou
            </p>
            {currentBook ? (
              <div className="mt-4 grid gap-5 md:grid-cols-[180px_1fr] md:items-end">
                <div className="grid aspect-[2/3] w-36 max-w-full place-items-center overflow-hidden rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-center text-xs text-white shadow-[0_18px_42px_rgb(47_42_36_/_14%)] md:w-full">
                  {currentBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentBook.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center px-4"
                      style={{ background: getCoverFallback(currentBook.title) }}
                    >
                      <span className="literary line-clamp-4 text-base leading-snug text-white/90">
                        {currentBook.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="literary text-3xl leading-tight">{currentBook.title}</h2>
                  <p className="mt-1 text-sm text-[var(--serene-muted)]">
                    {currentBook.author ?? "Autor nao informado"}
                  </p>
                  <div className="mt-4 max-w-md">
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--serene-surface-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--serene-accent)]"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-[var(--serene-muted)]">
                      Pagina {currentBook.current_page}
                      {currentBook.total_pages ? ` de ${currentBook.total_pages}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/leitura/${currentBook.id}?origem=inicio`}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
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

          <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
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
                    className="rounded-xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_78%,var(--serene-surface)_22%)] p-3"
                  >
                    <p className="literary truncate text-base">{book.title}</p>
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
