"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  BookStatus,
  ReadingSessionStatus,
} from "@/lib/supabase/database.types";
import {
  createReadingPause,
  getBookById,
  getOpenPauseForSession,
  getOpenSessionForBook,
  resumeReadingPause,
  startReadingSession,
  type BookRow,
  type ReadingOpenedFrom,
  type ReadingPauseRow,
  type ReadingSessionRow,
  updateBookProgress,
  updateReadingSession,
} from "@/features/reading-sessions/reading-session-services";
import { notifyReadingSessionChanged } from "@/features/reading-sessions/reading-session-events";

type SessionSummary = {
  sessionId: string;
  status: "finished" | "cancelled";
  activeSeconds: number;
  pausedSeconds: number;
  startPage: number | null;
  endPage: number | null;
  endedAt: string;
};

type UseReadingSessionParams = {
  userId: string | null;
  bookId: string;
  openedFrom: ReadingOpenedFrom;
};

type FinishResult = {
  ok: boolean;
  message: string | null;
};

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toSecondsBetween(startMs: number, endMs: number) {
  if (endMs <= startMs) {
    return 0;
  }
  return Math.floor((endMs - startMs) / 1000);
}

function clampPage(page: number, totalPages: number | null) {
  const normalized = Number.isFinite(page) ? Math.max(0, Math.floor(page)) : 0;
  if (!totalPages || totalPages <= 0) {
    return normalized;
  }
  return Math.min(normalized, totalPages);
}

function getStatusAfterPageUpdate(book: BookRow, endPage: number): BookStatus | undefined {
  if (book.total_pages && endPage >= book.total_pages) {
    return "lido";
  }
  if (book.status === "lido") {
    return undefined;
  }
  return "lendo";
}

function isOpenStatus(status: ReadingSessionStatus) {
  return status === "active" || status === "paused";
}

function emptyFinishResult(): FinishResult {
  return { ok: false, message: null };
}

export function formatReadingDuration(totalSeconds: number) {
  const safeTotal = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}min`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

export function useReadingSession({ userId, bookId, openedFrom }: UseReadingSessionParams) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [book, setBook] = useState<BookRow | null>(null);
  const [session, setSession] = useState<ReadingSessionRow | null>(null);
  const [openPause, setOpenPause] = useState<ReadingPauseRow | null>(null);
  const [muralOpen, setMuralOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());

  const isSessionOpen = Boolean(session && isOpenStatus(session.status));

  const getPausedSecondsAt = useCallback(
    (atMs: number) => {
      if (!session) {
        return 0;
      }

      if (session.status !== "paused") {
        return session.paused_seconds;
      }

      const pauseStartMs =
        parseIsoToMs(openPause?.paused_at) ?? parseIsoToMs(session.updated_at) ?? atMs;
      return session.paused_seconds + toSecondsBetween(pauseStartMs, atMs);
    },
    [openPause?.paused_at, session],
  );

  const getActiveSecondsAt = useCallback(
    (atMs: number) => {
      if (!session) {
        return 0;
      }

      if (session.status === "active") {
        const startedAtMs = parseIsoToMs(session.started_at) ?? atMs;
        const elapsedTotal = toSecondsBetween(startedAtMs, atMs);
        return Math.max(0, elapsedTotal - getPausedSecondsAt(atMs));
      }

      return session.active_seconds;
    },
    [getPausedSecondsAt, session],
  );

  const activeSeconds = useMemo(() => getActiveSecondsAt(clockMs), [clockMs, getActiveSecondsAt]);
  const pausedSeconds = useMemo(() => getPausedSecondsAt(clockMs), [clockMs, getPausedSecondsAt]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setBook(null);
      setSession(null);
      setOpenPause(null);
      setMuralOpen(false);
      setCurrentPage(0);
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    const [bookResult, openSessionResult] = await Promise.all([
      getBookById(userId, bookId),
      getOpenSessionForBook(userId, bookId),
    ]);

    if (bookResult.error) {
      setError(bookResult.error.message);
      setLoading(false);
      return;
    }

    if (!bookResult.data) {
      setError("Livro nao encontrado.");
      setLoading(false);
      return;
    }

    setBook(bookResult.data);

    if (openSessionResult.error) {
      setError(openSessionResult.error.message);
      setLoading(false);
      return;
    }

    const openSession = openSessionResult.data;
    if (!openSession) {
      setSession(null);
      setOpenPause(null);
      setMuralOpen(false);
      setCurrentPage(bookResult.data.current_page);
      setSummary(null);
      setClockMs(Date.now());
      setLoading(false);
      return;
    }

    setSession(openSession);
    setMuralOpen(openSession.mural_opened);
    setCurrentPage(openSession.current_page_snapshot ?? bookResult.data.current_page);
    setSummary(null);

    if (openSession.status === "paused") {
      const openPauseResult = await getOpenPauseForSession(userId, openSession.id);
      if (openPauseResult.error) {
        setError(openPauseResult.error.message);
      } else {
        setOpenPause(openPauseResult.data ?? null);
      }
    } else {
      setOpenPause(null);
    }

    setClockMs(Date.now());
    setLoading(false);
  }, [bookId, userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  useEffect(() => {
    if (!session || !isOpenStatus(session.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session]);

  const startSession = useCallback(async () => {
    if (!userId || !book) {
      return false;
    }

    if (session && isOpenStatus(session.status)) {
      return true;
    }

    setActionLoading(true);
    setError(null);

    const nowIso = new Date().toISOString();
    const normalizedPage = clampPage(currentPage, book.total_pages);

    const sessionResult = await startReadingSession({
      user_id: userId,
      book_id: book.id,
      started_at: nowIso,
      status: "active",
      active_seconds: 0,
      paused_seconds: 0,
      start_page: normalizedPage,
      current_page_snapshot: normalizedPage,
      opened_from: openedFrom,
      is_minimized: false,
      mural_opened: false,
      updated_at: nowIso,
    });

    if (sessionResult.error || !sessionResult.data) {
      setActionLoading(false);
      setError(sessionResult.error?.message ?? "Nao foi possivel iniciar a leitura.");
      return false;
    }

    const shouldMarkAsReading = book.status === "quero_ler" || book.status === "pausado";
    const bookUpdateResult = await updateBookProgress(userId, book.id, {
      currentPage: normalizedPage,
      status: shouldMarkAsReading ? "lendo" : undefined,
    });

    if (!bookUpdateResult.error && bookUpdateResult.data) {
      setBook(bookUpdateResult.data);
    }

    setSession(sessionResult.data);
    setOpenPause(null);
    setMuralOpen(false);
    setCurrentPage(normalizedPage);
    setSummary(null);
    setClockMs(Date.now());
    setActionLoading(false);
    notifyReadingSessionChanged();
    return true;
  }, [book, currentPage, openedFrom, session, userId]);

  const saveCurrentPage = useCallback(
    async (rawPage: number) => {
      if (!book || !userId) {
        return false;
      }

      const nextPage = clampPage(rawPage, book.total_pages);
      setCurrentPage(nextPage);
      setActionLoading(true);
      setError(null);

      const bookStatus =
        session && isOpenStatus(session.status) ? getStatusAfterPageUpdate(book, nextPage) : undefined;

      const [bookResult, sessionResult] = await Promise.all([
        updateBookProgress(userId, book.id, {
          currentPage: nextPage,
          status: bookStatus,
        }),
        session && isOpenStatus(session.status)
          ? updateReadingSession(session.id, userId, {
              current_page_snapshot: nextPage,
            })
          : Promise.resolve(null),
      ]);

      if (bookResult.error) {
        setActionLoading(false);
        setError(bookResult.error.message);
        return false;
      }

      if (bookResult.data) {
        setBook(bookResult.data);
      }

      if (sessionResult?.error) {
        setActionLoading(false);
        setError(sessionResult.error.message);
        return false;
      }

      if (sessionResult?.data) {
      setSession(sessionResult.data);
    }

    setActionLoading(false);
    notifyReadingSessionChanged();
    return true;
  },
    [book, session, userId],
  );

  const pauseSession = useCallback(async () => {
    if (!userId || !session || session.status !== "active") {
      return false;
    }

    setActionLoading(true);
    setError(null);

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const activeNow = getActiveSecondsAt(now);

    const pauseResult = await createReadingPause({
      user_id: userId,
      session_id: session.id,
      paused_at: nowIso,
      duration_seconds: 0,
    });

    if (pauseResult.error || !pauseResult.data) {
      setActionLoading(false);
      setError(pauseResult.error?.message ?? "Nao foi possivel pausar a leitura.");
      return false;
    }

    const sessionResult = await updateReadingSession(session.id, userId, {
      status: "paused",
      active_seconds: activeNow,
      current_page_snapshot: currentPage,
      is_minimized: false,
    });

    if (sessionResult.error || !sessionResult.data) {
      setActionLoading(false);
      setError(sessionResult.error?.message ?? "Nao foi possivel pausar a sessao.");
      return false;
    }

    setSession(sessionResult.data);
    setOpenPause(pauseResult.data);
    setClockMs(Date.now());
    setActionLoading(false);
    notifyReadingSessionChanged();
    return true;
  }, [currentPage, getActiveSecondsAt, session, userId]);

  const resumeSession = useCallback(async () => {
    if (!userId || !session || session.status !== "paused" || !openPause) {
      return false;
    }

    setActionLoading(true);
    setError(null);

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const pauseStartedAtMs = parseIsoToMs(openPause.paused_at) ?? now;
    const pauseDuration = toSecondsBetween(pauseStartedAtMs, now);
    const totalPaused = session.paused_seconds + pauseDuration;

    const pauseResult = await resumeReadingPause(openPause.id, userId, {
      resumed_at: nowIso,
      duration_seconds: pauseDuration,
    });

    if (pauseResult.error) {
      setActionLoading(false);
      setError(pauseResult.error.message);
      return false;
    }

    const sessionResult = await updateReadingSession(session.id, userId, {
      status: "active",
      paused_seconds: totalPaused,
      current_page_snapshot: currentPage,
      is_minimized: false,
    });

    if (sessionResult.error || !sessionResult.data) {
      setActionLoading(false);
      setError(sessionResult.error?.message ?? "Nao foi possivel retomar a leitura.");
      return false;
    }

    setSession(sessionResult.data);
    setOpenPause(null);
    setClockMs(Date.now());
    setActionLoading(false);
    notifyReadingSessionChanged();
    return true;
  }, [currentPage, openPause, session, userId]);

  const setMuralOpenState = useCallback(async (nextValue: boolean) => {
    if (!userId || !session || !isOpenStatus(session.status)) {
      return false;
    }

    setMuralOpen(nextValue);

    const sessionResult = await updateReadingSession(session.id, userId, {
      mural_opened: nextValue,
    });

    if (sessionResult.error || !sessionResult.data) {
      setMuralOpen(!nextValue);
      setError(sessionResult.error?.message ?? "Nao foi possivel atualizar o Mural.");
      return false;
    }

    setSession(sessionResult.data);
    notifyReadingSessionChanged();
    return true;
  }, [session, userId]);

  const toggleMural = useCallback(() => {
    return setMuralOpenState(!muralOpen);
  }, [muralOpen, setMuralOpenState]);

  const openMural = useCallback(() => {
    return setMuralOpenState(true);
  }, [setMuralOpenState]);

  const closeMural = useCallback(() => {
    return setMuralOpenState(false);
  }, [setMuralOpenState]);

  const closeOpenPauseIfNeeded = useCallback(async () => {
    if (!userId || !session || session.status !== "paused" || !openPause) {
      return {
        ok: true,
        pausedSeconds: session?.paused_seconds ?? 0,
      };
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const pauseStartedAtMs = parseIsoToMs(openPause.paused_at) ?? now;
    const pauseDuration = toSecondsBetween(pauseStartedAtMs, now);
    const totalPaused = session.paused_seconds + pauseDuration;

    const pauseResult = await resumeReadingPause(openPause.id, userId, {
      resumed_at: nowIso,
      duration_seconds: pauseDuration,
    });

    if (pauseResult.error) {
      return {
        ok: false,
        pausedSeconds: session.paused_seconds,
        message: pauseResult.error.message,
      };
    }

    return {
      ok: true,
      pausedSeconds: totalPaused,
    };
  }, [openPause, session, userId]);

  const finishSession = useCallback(
    async (rawEndPage: number): Promise<FinishResult> => {
      if (!userId || !book || !session || !isOpenStatus(session.status)) {
        return emptyFinishResult();
      }

      const endPage = clampPage(rawEndPage, book.total_pages);
      if (session.start_page !== null && endPage < session.start_page) {
        return {
          ok: false,
          message: "A pagina final nao pode ser menor que a pagina inicial da sessao.",
        };
      }

      setActionLoading(true);
      setError(null);

      const pauseCloseResult = await closeOpenPauseIfNeeded();
      if (!pauseCloseResult.ok) {
        setActionLoading(false);
        setError(pauseCloseResult.message ?? "Nao foi possivel fechar a pausa atual.");
        return {
          ok: false,
          message: pauseCloseResult.message ?? "Nao foi possivel fechar a pausa atual.",
        };
      }

      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const finalActive = session.status === "active" ? getActiveSecondsAt(now) : session.active_seconds;
      const finalPaused = pauseCloseResult.pausedSeconds;

      const sessionResult = await updateReadingSession(session.id, userId, {
        status: "finished",
        ended_at: nowIso,
        active_seconds: finalActive,
        paused_seconds: finalPaused,
        end_page: endPage,
        current_page_snapshot: endPage,
        mural_opened: false,
        is_minimized: false,
      });

      if (sessionResult.error || !sessionResult.data) {
        setActionLoading(false);
        const message = sessionResult.error?.message ?? "Nao foi possivel finalizar a sessao.";
        setError(message);
        return { ok: false, message };
      }

      const statusForBook = getStatusAfterPageUpdate(book, endPage);
      const bookResult = await updateBookProgress(userId, book.id, {
        currentPage: endPage,
        status: statusForBook,
      });

      if (!bookResult.error && bookResult.data) {
        setBook(bookResult.data);
      }

      setSession(sessionResult.data);
      setOpenPause(null);
      setMuralOpen(false);
      setCurrentPage(endPage);
      setSummary({
        sessionId: sessionResult.data.id,
        status: "finished",
        activeSeconds: finalActive,
        pausedSeconds: finalPaused,
        startPage: sessionResult.data.start_page,
        endPage: sessionResult.data.end_page,
        endedAt: nowIso,
      });
      setClockMs(Date.now());
      setActionLoading(false);
      notifyReadingSessionChanged();

      return { ok: true, message: null };
    },
    [book, closeOpenPauseIfNeeded, getActiveSecondsAt, session, userId],
  );

  const cancelSession = useCallback(async (): Promise<FinishResult> => {
    if (!userId || !session || !isOpenStatus(session.status)) {
      return emptyFinishResult();
    }

    setActionLoading(true);
    setError(null);

    const pauseCloseResult = await closeOpenPauseIfNeeded();
    if (!pauseCloseResult.ok) {
      setActionLoading(false);
      const message = pauseCloseResult.message ?? "Nao foi possivel encerrar a pausa atual.";
      setError(message);
      return { ok: false, message };
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const activeNow = session.status === "active" ? getActiveSecondsAt(now) : session.active_seconds;
    const pausedNow = pauseCloseResult.pausedSeconds;

    const sessionResult = await updateReadingSession(session.id, userId, {
      status: "cancelled",
      ended_at: nowIso,
      active_seconds: activeNow,
      paused_seconds: pausedNow,
      current_page_snapshot: currentPage,
      mural_opened: false,
      is_minimized: false,
    });

    if (sessionResult.error || !sessionResult.data) {
      setActionLoading(false);
      const message = sessionResult.error?.message ?? "Nao foi possivel cancelar a sessao.";
      setError(message);
      return { ok: false, message };
    }

    if (book) {
      const bookResult = await updateBookProgress(userId, book.id, {
        currentPage,
        status: book.status === "lido" ? undefined : "lendo",
      });
      if (!bookResult.error && bookResult.data) {
        setBook(bookResult.data);
      }
    }

    setSession(sessionResult.data);
    setOpenPause(null);
    setMuralOpen(false);
    setSummary({
      sessionId: sessionResult.data.id,
      status: "cancelled",
      activeSeconds: activeNow,
      pausedSeconds: pausedNow,
      startPage: sessionResult.data.start_page,
      endPage: sessionResult.data.end_page,
      endedAt: nowIso,
    });
    setClockMs(Date.now());
    setActionLoading(false);
    notifyReadingSessionChanged();
    return { ok: true, message: null };
  }, [book, closeOpenPauseIfNeeded, currentPage, getActiveSecondsAt, session, userId]);

  const minimizeSession = useCallback(async () => {
    if (!userId || !session || !isOpenStatus(session.status)) {
      return false;
    }

    setActionLoading(true);
    setError(null);

    const now = Date.now();
    const payload =
      session.status === "active"
        ? {
            is_minimized: true,
            current_page_snapshot: currentPage,
            active_seconds: getActiveSecondsAt(now),
          }
        : {
            is_minimized: true,
            current_page_snapshot: currentPage,
          };

    const sessionResult = await updateReadingSession(session.id, userId, payload);
    if (sessionResult.error || !sessionResult.data) {
      setActionLoading(false);
      setError(sessionResult.error?.message ?? "Nao foi possivel minimizar a sessao.");
      return false;
    }

    setSession(sessionResult.data);
    setActionLoading(false);
    notifyReadingSessionChanged();
    return true;
  }, [currentPage, getActiveSecondsAt, session, userId]);

  const restoreSession = useCallback(async () => {
    if (!userId || !session || !isOpenStatus(session.status)) {
      return false;
    }

    setActionLoading(true);
    setError(null);

    const sessionResult = await updateReadingSession(session.id, userId, {
      is_minimized: false,
      current_page_snapshot: currentPage,
    });

    if (sessionResult.error || !sessionResult.data) {
      setActionLoading(false);
      setError(sessionResult.error?.message ?? "Nao foi possivel restaurar a sessao.");
      return false;
    }

    setSession(sessionResult.data);
    setActionLoading(false);
    notifyReadingSessionChanged();
    return true;
  }, [currentPage, session, userId]);

  return {
    loading,
    actionLoading,
    error,
    setError,
    book,
    session,
    summary,
    isSessionOpen,
    muralOpen,
    currentPage,
    setCurrentPage,
    activeSeconds,
    pausedSeconds,
    startSession,
    pauseSession,
    resumeSession,
    toggleMural,
    openMural,
    closeMural,
    saveCurrentPage,
    finishSession,
    cancelSession,
    minimizeSession,
    restoreSession,
    refresh: loadData,
  };
}
