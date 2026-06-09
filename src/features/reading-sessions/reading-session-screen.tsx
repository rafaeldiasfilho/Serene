"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  Map as MapIcon,
  Minimize2,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { OPEN_ANNOTATION_SHORTCUT_EVENT } from "@/lib/shortcuts";
import { ACTION_ERROR_MESSAGE, LOAD_ERROR_MESSAGE, SAVE_ERROR_MESSAGE, userFacingError } from "@/lib/user-facing-error";
import { AnnotationModal, type AnnotationModalSubmitValue } from "@/features/annotations/annotation-modal";
import {
  createAnnotation,
  listAnnotationColors,
  listAnnotationsForSession,
  markSessionAnnotationsToReview,
  type AnnotationRow,
} from "@/features/annotations/annotation-services";
import { fallbackAnnotationColors } from "@/features/annotations/annotation-definitions";
import type { AnnotationColorOption } from "@/features/annotations/use-annotations";
import { listBooks } from "@/features/books/book-services";
import {
  CapturePlaceholderDialog,
  type CaptureBook,
  type CaptureReviewValue,
} from "@/features/camera-placeholder/capture-placeholder-dialog";
import { SessionEndRitual } from "@/features/reading-summary/session-end-ritual";
import {
  formatReadingDuration,
  useReadingSession,
} from "@/features/reading-sessions/use-reading-session";
import type { ReadingOpenedFrom } from "@/features/reading-sessions/reading-session-services";
import { VocabularyDialog, type VocabularyDialogSubmitValue } from "@/features/vocabulary/vocabulary-dialog";
import {
  createVocabularyEntry,
  listVocabularyEntriesForBook,
  listVocabularyEntriesForSession,
  softDeleteVocabularyEntry,
  type VocabularyEntryRow,
} from "@/features/vocabulary/vocabulary-services";

type SessionAnnotationSummary = {
  sessionId: string;
  annotations: AnnotationRow[];
};

type SessionVocabularySummary = {
  sessionId: string;
  entries: VocabularyEntryRow[];
};

type ReadingPresenceStatus = "active" | "paused";

function normalizeOrigin(value: string | null): ReadingOpenedFrom {
  if (value === "inicio" || value === "biblioteca" || value === "anotacoes" || value === "mente") {
    return value;
  }
  return "desconhecido";
}

function getOriginMeta(origin: ReadingOpenedFrom) {
  if (origin === "biblioteca") {
    return { href: "/biblioteca", label: "Biblioteca" };
  }
  if (origin === "anotacoes") {
    return { href: "/anotacoes", label: "Anotacoes" };
  }
  if (origin === "mente") {
    return { href: "/mente", label: "Mente" };
  }
  return { href: "/", label: "Inicio" };
}

function parsePageInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor(parsed));
}

function fallbackColors(): AnnotationColorOption[] {
  return fallbackAnnotationColors.map((color, index) => ({
    id: `fallback-${index + 1}`,
    color_hex: color,
    name: null,
    applies_to: null,
    is_default: index === 0,
  }));
}

function formatVocabularyDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getVocabularyKey(word: string) {
  return word.trim().toLocaleLowerCase("pt-BR");
}

function ReadingPresenceIndicator({ status }: { status: ReadingPresenceStatus }) {
  const isPaused = status === "paused";

  return (
    <div
      className={`reading-presence ${isPaused ? "reading-presence--paused" : ""}`}
      aria-label={isPaused ? "Sessao pausada com calma" : "Sessao de leitura ativa"}
    >
      <div className="reading-presence-visual" aria-hidden="true">
        <span className="reading-presence-steam reading-presence-steam-one" />
        <span className="reading-presence-steam reading-presence-steam-two" />
        <span className="reading-presence-steam reading-presence-steam-three" />
        <span className="reading-presence-cup" />
        <span className="reading-presence-saucer" />
      </div>
      <div className="reading-presence-copy">
        <span className="reading-presence-title">
          {isPaused ? "Pausa suave" : "Sessao viva"}
        </span>
        {isPaused && (
          <span className="reading-presence-note">Volte com calma.</span>
        )}
      </div>
    </div>
  );
}

export function ReadingSessionScreen() {
  const params = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    authLoading,
    envReady,
    profileState,
    readingCloseBehavior,
    reducedMotionEnabled,
    user,
  } = useAppState();

  const queryOrigin = normalizeOrigin(searchParams.get("origem"));
  const bookId = typeof params.bookId === "string" ? params.bookId : "";

  const {
    loading,
    actionLoading,
    error,
    setError,
    book,
    session,
    summary,
    isSessionOpen,
    currentPage,
    setCurrentPage,
    activeSeconds,
    pausedSeconds,
    startSession,
    pauseSession,
    resumeSession,
    openMural,
    saveCurrentPage,
    finishSession,
    cancelSession,
    minimizeSession,
  } = useReadingSession({
    userId: user?.id ?? null,
    bookId,
    openedFrom: queryOrigin,
  });

  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [finishPageInput, setFinishPageInput] = useState("0");
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [vocabularyDialogOpen, setVocabularyDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<CaptureReviewValue | null>(null);
  const [captureBooks, setCaptureBooks] = useState<CaptureBook[]>([]);
  const [captureBooksLoading, setCaptureBooksLoading] = useState(false);
  const [captureBooksLoaded, setCaptureBooksLoaded] = useState(false);
  const [annotationColors, setAnnotationColors] = useState<AnnotationColorOption[]>(() =>
    fallbackColors(),
  );
  const [sessionAnnotationSummary, setSessionAnnotationSummary] =
    useState<SessionAnnotationSummary | null>(null);
  const [bookVocabularyEntries, setBookVocabularyEntries] = useState<VocabularyEntryRow[]>([]);
  const [sessionVocabularySummary, setSessionVocabularySummary] =
    useState<SessionVocabularySummary | null>(null);
  const [reviewLaterLoading, setReviewLaterLoading] = useState(false);
  const [reviewLaterFeedback, setReviewLaterFeedback] = useState<string | null>(null);
  const [annotationFeedback, setAnnotationFeedback] = useState<string | null>(null);
  const [vocabularyFeedback, setVocabularyFeedback] = useState<string | null>(null);
  const autoStartAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!book || loading || actionLoading || session) {
      return;
    }

    if (autoStartAttemptRef.current === bookId) {
      return;
    }

    autoStartAttemptRef.current = bookId;
    void startSession();
  }, [actionLoading, book, bookId, loading, session, startSession]);

  const sourceFromSession = normalizeOrigin(session?.opened_from ?? null);
  const backTarget = getOriginMeta(sourceFromSession === "desconhecido" ? queryOrigin : sourceFromSession);
  const muralReturnOrigin = sourceFromSession === "desconhecido" ? queryOrigin : sourceFromSession;

  const canPause = session?.status === "active";
  const canResume = session?.status === "paused";
  const canFinish = Boolean(session && (session.status === "active" || session.status === "paused"));
  const readingPresenceStatus: ReadingPresenceStatus | null =
    session?.status === "active" || session?.status === "paused" ? session.status : null;

  const captureBooksForDialog = useMemo<CaptureBook[]>(() => {
    if (captureBooks.length > 0) {
      return captureBooks;
    }
    return book ? [book] : [];
  }, [book, captureBooks]);

  const focusMessage = useMemo(() => {
    if (!session) {
      return "Preparando a sessao de leitura.";
    }

    if (session.status === "paused") {
      return "Sessao pausada por sua escolha. Retome quando quiser.";
    }

    if (session.status === "active") {
      return "Tempo de vida dedicado a leitura, contado com precisao.";
    }

    if (session.status === "finished") {
      return "Sessao finalizada com registro completo.";
    }

    return "Sessao encerrada.";
  }, [session]);

  const readingStateLabel = (() => {
    if (session?.status === "paused") {
      return "Pausada";
    }
    if (session?.status === "active") {
      return "Em leitura";
    }
    if (session?.status === "finished") {
      return "Finalizada";
    }
    return "Preparando";
  })();
  const pageProgressLabel = book?.total_pages
    ? `de ${book.total_pages} paginas`
    : "total de paginas opcional";

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
    if (!user || !book) {
      return;
    }

    let isMounted = true;

    void listVocabularyEntriesForBook(user.id, book.id).then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setError(userFacingError(error, LOAD_ERROR_MESSAGE, "Falha ao carregar vocabulario do livro."));
        return;
      }

      setBookVocabularyEntries(data ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [book, setError, user]);

  useEffect(() => {
    if (!user || !summary) {
      return;
    }

    let isMounted = true;

    void listAnnotationsForSession(user.id, summary.sessionId).then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setError(userFacingError(error, LOAD_ERROR_MESSAGE, "Falha ao carregar resumo de anotacoes."));
        return;
      }

      setSessionAnnotationSummary({
        sessionId: summary.sessionId,
        annotations: data ?? [],
      });
    });

    return () => {
      isMounted = false;
    };
  }, [setError, summary, user]);

  useEffect(() => {
    if (!user || !summary) {
      return;
    }

    let isMounted = true;

    void listVocabularyEntriesForSession(user.id, summary.sessionId).then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setError(userFacingError(error, LOAD_ERROR_MESSAGE, "Falha ao carregar resumo de vocabulario."));
        return;
      }

      setSessionVocabularySummary({
        sessionId: summary.sessionId,
        entries: data ?? [],
      });
    });

    return () => {
      isMounted = false;
    };
  }, [setError, summary, user]);

  useEffect(() => {
    function handleOpenAnnotationShortcut() {
      if (summary) {
        return;
      }

      if (!isSessionOpen) {
        setError("Abra uma sessao ativa para criar uma anotacao vinculada.");
        return;
      }

      setAnnotationFeedback(null);
      setCaptureDraft(null);
      setAnnotationModalOpen(true);
    }

    window.addEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);

    return () => {
      window.removeEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);
    };
  }, [isSessionOpen, setError, summary]);

  const sessionAnnotations =
    summary && sessionAnnotationSummary?.sessionId === summary.sessionId
      ? sessionAnnotationSummary.annotations
      : [];
  const summaryAnnotationsLoading = Boolean(
    summary && sessionAnnotationSummary?.sessionId !== summary.sessionId,
  );
  const sessionVocabularyEntries =
    summary && sessionVocabularySummary?.sessionId === summary.sessionId
      ? sessionVocabularySummary.entries
      : [];
  const summaryVocabularyLoading = Boolean(
    summary && sessionVocabularySummary?.sessionId !== summary.sessionId,
  );
  const bookCompletedInSummary = Boolean(
    summary &&
      book &&
      (book.status === "lido" ||
        (book.total_pages !== null &&
          summary.endPage !== null &&
          summary.endPage >= book.total_pages)),
  );

  if (!envReady) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-800">
        Configure as variaveis Supabase para usar as sessoes de leitura.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo seu espaco de leitura...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (loading) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Carregando livro e sessao...</p>
        </div>
      </section>
    );
  }

  if (!book) {
    return (
      <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
        <h1 className="text-xl font-semibold">Livro nao encontrado</h1>
        <p className="mt-2 text-sm text-[var(--serene-muted)]">
          O livro desta rota nao foi encontrado para o seu perfil.
        </p>
        <Link
          href={backTarget.href}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          Voltar para {backTarget.label}
        </Link>
      </section>
    );
  }

  async function handleSaveCurrentPage() {
    await saveCurrentPage(currentPage);
  }

  async function handlePauseOrResume() {
    if (canPause) {
      await pauseSession();
      return;
    }
    if (canResume) {
      await resumeSession();
    }
  }

  async function handleOpenMural() {
    if (!book || !session || !isSessionOpen) {
      return;
    }

    const opened = await openMural();
    if (opened) {
      router.push(`/leitura/${book.id}/mural?origem=${muralReturnOrigin}`);
    }
  }

  async function handleFinish() {
    const parsed = parsePageInput(finishPageInput);
    if (parsed === null) {
      setError("Informe uma pagina final valida.");
      return;
    }

    const result = await finishSession(parsed);
    if (result.ok) {
      setReviewLaterFeedback(null);
      setShowFinishPrompt(false);
    } else if (result.message) {
      setError(result.message);
    }
  }

  async function handleExitReading() {
    if (!session || !isSessionOpen) {
      router.push(backTarget.href);
      return;
    }

    if (readingCloseBehavior === "minimize") {
      const minimized = await minimizeSession();
      if (minimized) {
        router.push(backTarget.href);
      }
      return;
    }

    const confirmed = window.confirm("Encerrar a leitura agora e cancelar esta sessao ativa?");
    if (!confirmed) {
      return;
    }

    const result = await cancelSession();
    if (result.ok) {
      router.push(backTarget.href);
    } else if (result.message) {
      setError(result.message);
    }
  }

  async function loadCaptureBooks() {
    if (!user || captureBooksLoaded || captureBooksLoading) {
      return;
    }

    setCaptureBooksLoading(true);
    const { data, error } = await listBooks(user.id);
    setCaptureBooksLoading(false);
    setCaptureBooksLoaded(true);

    if (error) {
      setError(userFacingError(error, LOAD_ERROR_MESSAGE, "Falha ao carregar livros para captura."));
      return;
    }

    setCaptureBooks(data ?? []);
  }

  function handleOpenCapture() {
    setCaptureDraft(null);
    setCaptureDialogOpen(true);
    void loadCaptureBooks();
  }

  function handleCaptureReview(value: CaptureReviewValue) {
    setCaptureDraft(value);
    setCaptureDialogOpen(false);
    setAnnotationFeedback(null);
    setAnnotationModalOpen(true);
  }

  async function handleCreateReadingAnnotation(value: AnnotationModalSubmitValue) {
    if (!user || !book || !session || !isSessionOpen) {
      return {
        ok: false,
        message: "Abra uma sessao ativa para vincular a anotacao.",
      };
    }

    const result = await createAnnotation({
      user_id: user.id,
      book_id: value.bookId ?? book.id,
      session_id: value.origin === "reading" ? session.id : value.sessionId,
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
        message: userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao salvar anotacao da leitura."),
      };
    }

    setAnnotationFeedback(
      value.origin === "camera"
        ? "Foto revisada salva como anotacao."
        : "Anotacao vinculada a sessao ativa.",
    );
    return { ok: true, message: null };
  }

  async function handleCreateVocabularyEntry(value: VocabularyDialogSubmitValue) {
    if (!user || !book || !session || !isSessionOpen) {
      return {
        ok: false,
        message: "Abra uma sessao ativa para guardar uma palavra deste livro.",
      };
    }

    const existingEntry = bookVocabularyEntries.find(
      (entry) => getVocabularyKey(entry.word) === getVocabularyKey(value.word),
    );

    if (existingEntry) {
      setVocabularyFeedback("Essa palavra já está no vocabulário deste livro.");
      return {
        ok: true,
        message: "Essa palavra já está no vocabulário deste livro.",
      };
    }

    const result = await createVocabularyEntry({
      user_id: user.id,
      book_id: book.id,
      reading_session_id: session.id,
      word: value.word,
      definition: value.definition,
      page_number: currentPage,
      note: value.note,
      source: value.source,
    });

    if (result.error || !result.data) {
      return {
        ok: false,
        message: result.error
          ? userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao guardar palavra.")
          : "Não foi possível salvar essa alteração agora.",
      };
    }

    setBookVocabularyEntries((current) => [result.data, ...current]);
    setVocabularyFeedback("Palavra salva");
    return { ok: true, message: "Palavra salva" };
  }

  async function handleRemoveVocabularyEntry(entry: VocabularyEntryRow) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm("Remover esta palavra do vocabulário deste livro?");
    if (!confirmed) {
      return;
    }

    const result = await softDeleteVocabularyEntry(entry.id, user.id);

    if (result.error) {
      setVocabularyFeedback(
        userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao remover palavra salva."),
      );
      return;
    }

    setBookVocabularyEntries((current) => current.filter((item) => item.id !== entry.id));
    setVocabularyFeedback("Palavra removida do vocabulário deste livro.");
  }

  async function handleReviewLater() {
    if (!user || !summary) {
      return;
    }

    setReviewLaterLoading(true);
    setReviewLaterFeedback(null);
    setError(null);

    const result = await markSessionAnnotationsToReview(user.id, summary.sessionId);
    setReviewLaterLoading(false);

    if (result.error) {
      setError(userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao marcar anotacoes para revisar."));
      return;
    }

    const updatedAnnotations = result.data ?? [];
    if (updatedAnnotations.length > 0) {
      const updatedById = new Map(updatedAnnotations.map((annotation) => [annotation.id, annotation]));
      setSessionAnnotationSummary((current) => {
        if (!current || current.sessionId !== summary.sessionId) {
          return current;
        }

        return {
          sessionId: current.sessionId,
          annotations: current.annotations.map((annotation) =>
            updatedById.get(annotation.id) ?? annotation,
          ),
        };
      });
    }

    setReviewLaterFeedback("Suas anota\u00e7\u00f5es ficaram em Para revisar.");
  }

  return (
    <section className="serene-soft-in space-y-5">
      <header className="overflow-hidden rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleExitReading()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
            disabled={actionLoading}
          >
            {readingCloseBehavior === "close" ? (
              <XCircle className="size-4" />
            ) : (
              <Minimize2 className="size-4" />
            )}
            {readingCloseBehavior === "close"
              ? `Voltar para ${backTarget.label}`
              : `Minimizar para ${backTarget.label}`}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
              <BookOpen className="size-4" />
              {readingStateLabel}
            </span>
            <button
              type="button"
              onClick={() => void handleOpenMural()}
              disabled={!isSessionOpen || actionLoading}
              title="Organize suas ideias visualmente"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
            >
              <MapIcon className="size-4" />
              Mural de ideias
            </button>
            <button
              type="button"
              onClick={() => {
                setVocabularyFeedback(null);
                setVocabularyDialogOpen(true);
              }}
              disabled={!isSessionOpen || actionLoading || Boolean(summary)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
            >
              <BookMarked className="size-4" />
              {"Dicion\u00e1rio"}
            </button>
            <button
              type="button"
              onClick={handleOpenCapture}
              disabled={!isSessionOpen || actionLoading || Boolean(summary)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
              title="Preparar foto"
            >
              <Camera className="size-4" />
              Foto
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,320px)] lg:items-stretch">
          <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-5 shadow-[var(--serene-shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Leitura iniciada
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal">{book.title}</h1>
            <p className="text-sm text-[var(--serene-muted)]">
              {book.author ?? "Autor nao informado"}
            </p>
            <p className="literary mt-4 max-w-2xl text-base leading-relaxed text-[var(--serene-muted)]">
              {focusMessage}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--serene-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--serene-accent)_12%,transparent),transparent_42%),var(--serene-surface-soft)] px-5 py-4 text-right shadow-[var(--serene-shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-3 text-left">
              {readingPresenceStatus ? (
                <ReadingPresenceIndicator status={readingPresenceStatus} />
              ) : (
                <span className="grid size-10 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]">
                  <Clock3 className="size-4" />
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]">
                <span className="size-2 rounded-full bg-[var(--serene-accent)]" />
                {session?.status === "paused" ? "em pausa" : "tempo real"}
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Tempo ativo
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums leading-none sm:text-5xl">
              {formatReadingDuration(activeSeconds)}
            </p>
            <p className="mt-3 text-xs text-[var(--serene-muted)]">
              Pausas registradas: {formatReadingDuration(pausedSeconds)}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {annotationFeedback && (
        <p className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm shadow-[var(--serene-shadow-soft)]">
          {annotationFeedback}
        </p>
      )}

      {vocabularyFeedback && (
        <p className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm shadow-[var(--serene-shadow-soft)]">
          {vocabularyFeedback}
        </p>
      )}

      {!summary && (
      <section className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="grid gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Pagina atual
              </span>
              <input
                type="number"
                min={0}
                value={String(currentPage)}
                onChange={(event) => {
                  const parsed = parsePageInput(event.target.value);
                  if (parsed !== null) {
                    setCurrentPage(parsed);
                  }
                }}
                className="h-11 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-lg outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleSaveCurrentPage()}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
            >
              <Save className="size-4" />
              Salvar pagina
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-3 text-xs text-[var(--serene-muted)] md:text-right">
            <p className="font-semibold uppercase tracking-[0.14em]">Progresso</p>
            <p className="mt-1 text-sm text-[var(--serene-fg)]">{pageProgressLabel}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handlePauseOrResume()}
            disabled={actionLoading || !canPause && !canResume}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
          >
            {canPause ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
            {canPause ? "Pausar" : "Retomar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFinishPageInput(String(currentPage));
              setShowFinishPrompt(true);
            }}
            disabled={actionLoading || !canFinish}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95 disabled:opacity-60"
          >
            <CheckCircle2 className="size-4" />
            Finalizar leitura
          </button>
        </div>

        <p className="mt-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--serene-muted)]">
          Durante a leitura, voce tambem pode abrir o Mural de ideias para organizar pensamentos
          visualmente. Ele nao pausa a sessao.
        </p>
      </section>
      )}

      {!summary && bookVocabularyEntries.length > 0 && (
        <section className="rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                {"Palavras salvas neste livro"}
              </p>
              <h2 className="mt-1 text-base font-semibold">{"Vocabul\u00e1rio deste livro"}</h2>
            </div>
            <Link
              href="/anotacoes?vocabulario=1"
              className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1.5 text-xs text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
            >
              Ver todas
            </Link>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bookVocabularyEntries.slice(0, 6).map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-[var(--serene-fg)]">{entry.word}</h3>
                  {entry.page_number !== null && (
                    <span className="rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
                      {`p. ${entry.page_number}`}
                    </span>
                  )}
                </div>
                {entry.definition && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--serene-muted)]">
                    {entry.definition}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-[var(--serene-muted)]">
                  {formatVocabularyDate(entry.created_at)}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRemoveVocabularyEntry(entry)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2.5 py-1 text-[11px] text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
                >
                  <Trash2 className="size-3" />
                  Remover
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {!summary && showFinishPrompt && (
        <section className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                Guardar sessao
              </p>
              <h2 className="mt-1 text-lg font-semibold">Em qual pagina voce parou?</h2>
              <p className="mt-2 text-sm text-[var(--serene-muted)]">
                Esse ponto sera salvo como seu progresso atual deste livro.
              </p>
            </div>
            <BookOpen className="size-5 text-[var(--serene-accent)]" />
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Pagina final
              </span>
              <input
                type="number"
                min={0}
                value={finishPageInput}
                onChange={(event) => setFinishPageInput(event.target.value)}
                className="h-11 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-lg outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={actionLoading}
              className="rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95 disabled:opacity-60"
            >
              Confirmar finalizacao
            </button>
            <button
              type="button"
              onClick={() => setShowFinishPrompt(false)}
              className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {summary && (
        <SessionEndRitual
          summary={summary}
          bookTitle={book.title}
          annotations={sessionAnnotations}
          annotationsLoading={summaryAnnotationsLoading}
          vocabularyEntries={sessionVocabularyEntries}
          vocabularyLoading={summaryVocabularyLoading}
          bookVocabularyEntries={bookVocabularyEntries}
          bookCompleted={bookCompletedInSummary}
          reducedMotion={reducedMotionEnabled}
          reviewHref="/anotacoes"
          reviewLaterFeedback={reviewLaterFeedback}
          reviewLaterLoading={reviewLaterLoading}
          onReviewLater={() => void handleReviewLater()}
        />
      )}

      {!summary && (
      <button
        type="button"
        onClick={() => {
          setAnnotationFeedback(null);
          setCaptureDraft(null);
          setAnnotationModalOpen(true);
        }}
        disabled={!isSessionOpen || actionLoading}
        className="fixed bottom-4 right-4 z-20 inline-flex size-12 items-center justify-center rounded-full bg-[var(--serene-accent)] text-white shadow-[var(--serene-shadow-lift)] transition hover:opacity-95 disabled:opacity-60 sm:bottom-6 sm:right-6"
        aria-label="Nova anotacao"
      >
        <Plus className="size-5" />
      </button>
      )}

      {!summary && annotationModalOpen && (
        <AnnotationModal
          mode="create"
          books={captureDraft ? captureBooksForDialog : book ? [book] : []}
          colors={annotationColors}
          lockedBookId={captureDraft?.bookId ?? book?.id ?? null}
          lockedSessionId={captureDraft ? captureDraft.sessionId : isSessionOpen ? session?.id ?? null : null}
          forcedOrigin={captureDraft?.origin}
          defaultType={captureDraft?.defaultType}
          defaultContent={captureDraft?.defaultContent}
          defaultPageNumber={captureDraft ? captureDraft.pageNumber : currentPage}
          onOpenMural={() => {
            setAnnotationModalOpen(false);
            setCaptureDraft(null);
            void handleOpenMural();
          }}
          onClose={() => {
            setAnnotationModalOpen(false);
            setCaptureDraft(null);
          }}
          onSubmit={handleCreateReadingAnnotation}
        />
      )}

      {!summary && vocabularyDialogOpen && (
        <VocabularyDialog
          bookTitle={book.title}
          currentPage={currentPage}
          recentEntries={bookVocabularyEntries}
          onClose={() => setVocabularyDialogOpen(false)}
          onSubmit={handleCreateVocabularyEntry}
        />
      )}

      {!summary && captureDialogOpen && (
        <CapturePlaceholderDialog
          books={captureBooksForDialog}
          booksLoading={captureBooksLoading}
          currentBookId={book.id}
          currentSessionId={session?.id ?? null}
          onClose={() => setCaptureDialogOpen(false)}
          onReview={handleCaptureReview}
        />
      )}
    </section>
  );
}
