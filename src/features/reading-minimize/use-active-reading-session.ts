"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getBookById,
  getOpenPauseForSession,
  updateReadingSession,
  type BookRow,
  type ReadingPauseRow,
  type ReadingSessionRow,
} from "@/features/reading-sessions/reading-session-services";
import {
  notifyReadingSessionChanged,
  READING_SESSION_CHANGED_EVENT,
} from "@/features/reading-sessions/reading-session-events";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReadingSessionStatus } from "@/lib/supabase/database.types";

const OPEN_SESSION_STATUSES = ["active", "paused"] satisfies ReadingSessionStatus[];

type ActiveReadingRows = {
  session: ReadingSessionRow;
  book: BookRow;
  openPause: ReadingPauseRow | null;
};

export type ActiveReadingSnapshot = ActiveReadingRows & {
  activeSeconds: number;
  pausedSeconds: number;
  isTimeRunning: boolean;
};

async function getLatestOpenReadingSession(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("status", OPEN_SESSION_STATUSES)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

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

function getPausedSecondsAt(
  session: ReadingSessionRow,
  openPause: ReadingPauseRow | null,
  atMs: number,
) {
  if (session.status !== "paused") {
    return session.paused_seconds;
  }

  const pauseStartMs = parseIsoToMs(openPause?.paused_at) ?? parseIsoToMs(session.updated_at) ?? atMs;
  return session.paused_seconds + toSecondsBetween(pauseStartMs, atMs);
}

function getActiveSecondsAt(
  session: ReadingSessionRow,
  openPause: ReadingPauseRow | null,
  atMs: number,
) {
  if (session.status === "active") {
    const startedAtMs = parseIsoToMs(session.started_at) ?? atMs;
    const elapsedTotal = toSecondsBetween(startedAtMs, atMs);
    return Math.max(0, elapsedTotal - getPausedSecondsAt(session, openPause, atMs));
  }

  return session.active_seconds;
}

export function useActiveReadingSession(userId: string | null, refreshKey?: string | null) {
  const [rows, setRows] = useState<ActiveReadingRows | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!userId) {
      setRows(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sessionResult = await getLatestOpenReadingSession(userId);
    if (sessionResult.error) {
      setRows(null);
      setError(sessionResult.error.message);
      setLoading(false);
      return;
    }

    const activeSession = sessionResult.data;
    if (!activeSession) {
      setRows(null);
      setLoading(false);
      return;
    }

    const [bookResult, pauseResult] = await Promise.all([
      getBookById(userId, activeSession.book_id),
      activeSession.status === "paused"
        ? getOpenPauseForSession(userId, activeSession.id)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (bookResult.error || pauseResult.error) {
      setRows(null);
      setError(bookResult.error?.message ?? pauseResult.error?.message ?? "Nao foi possivel ler a sessao ativa.");
      setLoading(false);
      return;
    }

    if (!bookResult.data) {
      setRows(null);
      setLoading(false);
      return;
    }

    setRows({
      session: activeSession,
      book: bookResult.data,
      openPause: pauseResult.data ?? null,
    });
    setClockMs(Date.now());
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refresh, refreshKey]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleReadingSessionChange = () => {
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener(READING_SESSION_CHANGED_EVENT, handleReadingSessionChange);
    window.addEventListener("focus", handleReadingSessionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const refreshIntervalId = window.setInterval(handleReadingSessionChange, 15000);

    return () => {
      window.removeEventListener(READING_SESSION_CHANGED_EVENT, handleReadingSessionChange);
      window.removeEventListener("focus", handleReadingSessionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(refreshIntervalId);
    };
  }, [refresh, userId]);

  useEffect(() => {
    if (!rows) {
      return;
    }

    const clockIntervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(clockIntervalId);
    };
  }, [rows]);

  const activeReading = useMemo<ActiveReadingSnapshot | null>(() => {
    if (!rows) {
      return null;
    }

    return {
      ...rows,
      activeSeconds: getActiveSecondsAt(rows.session, rows.openPause, clockMs),
      pausedSeconds: getPausedSecondsAt(rows.session, rows.openPause, clockMs),
      isTimeRunning: rows.session.status === "active",
    };
  }, [clockMs, rows]);

  const restore = useCallback(async () => {
    if (!userId || !rows) {
      return false;
    }

    const result = await updateReadingSession(rows.session.id, userId, {
      is_minimized: false,
    });

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Nao foi possivel restaurar a leitura.");
      return false;
    }

    setRows({
      ...rows,
      session: result.data,
    });
    notifyReadingSessionChanged();
    return true;
  }, [rows, userId]);

  return {
    activeReading,
    loading,
    error,
    refresh,
    restore,
  };
}
