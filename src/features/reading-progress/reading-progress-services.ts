import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  BookStatus,
  Database,
  Json,
  ReadingEstimateSource,
} from "@/lib/supabase/database.types";

export const FALLBACK_SECONDS_PER_PAGE = 90;
export const ESTIMATED_PROGRESS_EVENT_TYPE = "estimated_progress_registered";

export type ProgressBook = Pick<
  Database["public"]["Tables"]["books"]["Row"],
  | "id"
  | "user_id"
  | "title"
  | "current_page"
  | "total_pages"
  | "status"
  | "reading_origin"
  | "read_before_serene"
  | "estimated_reading_seconds"
  | "audiobook_duration_minutes"
  | "audiobook_source"
  | "audiobook_is_confirmed"
  | "estimated_minutes_per_page"
  | "estimation_source"
>;

export type ProgressContext = {
  realSeconds: number;
  realPages: number;
  bookSecondsPerPage: number | null;
  globalSecondsPerPage: number | null;
  audiobookSecondsPerPage: number | null;
  recommendedSecondsPerPage: number;
  recommendedSource: ReadingEstimateSource;
  outsideEstimatedSeconds: number;
  historicalEstimatedSeconds: number;
};

export type ProgressSaveInput = {
  userId: string;
  book: ProgressBook;
  nextPage: number;
  estimatedSeconds: number;
  secondsPerPage: number;
  estimationSource: ReadingEstimateSource;
  correction: boolean;
};

type ReadingSessionPaceRow = Pick<
  Database["public"]["Tables"]["reading_sessions"]["Row"],
  "active_seconds" | "start_page" | "end_page"
>;

function numberFromMetadata(metadata: Json | null, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringFromMetadata(metadata: Json | null, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function historicalSecondsForBook(book: ProgressBook) {
  if (book.reading_origin !== "historico" && !book.read_before_serene) {
    return 0;
  }

  return book.estimated_reading_seconds ?? 0;
}

function statusForPage(book: ProgressBook, nextPage: number): BookStatus {
  if (book.total_pages && nextPage >= book.total_pages) {
    return "lido";
  }

  if (book.status === "quero_ler" && nextPage > 0) {
    return "lendo";
  }

  return book.status;
}

function paceStatsFromSessions(sessions: ReadingSessionPaceRow[]) {
  return sessions.reduce(
    (stats, session) => {
      const activeSeconds = session.active_seconds ?? 0;
      const startPage = session.start_page ?? null;
      const endPage = session.end_page ?? null;
      const pages =
        startPage !== null && endPage !== null && endPage > startPage ? endPage - startPage : 0;

      return {
        realPages: stats.realPages + pages,
        realSeconds: stats.realSeconds + activeSeconds,
        paceSeconds: stats.paceSeconds + (pages > 0 ? activeSeconds : 0),
      };
    },
    { realPages: 0, realSeconds: 0, paceSeconds: 0 },
  );
}

function secondsPerPageFromStats(stats: ReturnType<typeof paceStatsFromSessions>) {
  return stats.realPages > 0 && stats.paceSeconds > 0
    ? Math.round(stats.paceSeconds / stats.realPages)
    : null;
}

function audiobookSecondsPerPage(book: ProgressBook) {
  if (!book.audiobook_duration_minutes || !book.total_pages || book.total_pages <= 0) {
    return null;
  }

  return Math.max(1, Math.round((book.audiobook_duration_minutes * 60) / book.total_pages));
}

function chooseEstimateSource(input: {
  bookSecondsPerPage: number | null;
  globalSecondsPerPage: number | null;
  audiobookSecondsPerPage: number | null;
}): {
  recommendedSecondsPerPage: number;
  recommendedSource: ReadingEstimateSource;
} {
  if (input.bookSecondsPerPage) {
    return {
      recommendedSecondsPerPage: input.bookSecondsPerPage,
      recommendedSource: "user_book_pace" satisfies ReadingEstimateSource,
    };
  }

  if (input.globalSecondsPerPage) {
    return {
      recommendedSecondsPerPage: input.globalSecondsPerPage,
      recommendedSource: "user_global_pace" satisfies ReadingEstimateSource,
    };
  }

  if (input.audiobookSecondsPerPage) {
    return {
      recommendedSecondsPerPage: input.audiobookSecondsPerPage,
      recommendedSource: "audiobook_duration" satisfies ReadingEstimateSource,
    };
  }

  return {
    recommendedSecondsPerPage: FALLBACK_SECONDS_PER_PAGE,
    recommendedSource: "default_average" satisfies ReadingEstimateSource,
  };
}

export async function loadProgressContext(userId: string, book: ProgressBook) {
  const supabase = getSupabaseBrowserClient();

  const [bookSessionsResult, globalSessionsResult, progressEntriesResult, outsideEventsResult] =
    await Promise.all([
    supabase
      .from("reading_sessions")
      .select("active_seconds,start_page,end_page,status")
      .eq("user_id", userId)
      .eq("book_id", book.id)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    supabase
      .from("reading_sessions")
      .select("active_seconds,start_page,end_page,status")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    supabase
      .from("reading_progress_entries")
      .select("estimated_minutes,is_estimated")
      .eq("user_id", userId)
      .eq("book_id", book.id)
      .eq("is_estimated", true),
    supabase
      .from("timeline_events")
      .select("metadata")
      .eq("user_id", userId)
      .eq("book_id", book.id)
      .eq("event_type", ESTIMATED_PROGRESS_EVENT_TYPE),
  ]);

  const error =
    bookSessionsResult.error ??
    globalSessionsResult.error ??
    progressEntriesResult.error ??
    outsideEventsResult.error;
  if (error) {
    return { data: null, error: { message: error.message } };
  }

  const bookStats = paceStatsFromSessions(bookSessionsResult.data ?? []);
  const globalStats = paceStatsFromSessions(globalSessionsResult.data ?? []);
  const bookSecondsPerPage = secondsPerPageFromStats(bookStats);
  const globalSecondsPerPage = secondsPerPageFromStats(globalStats);
  const audiobookPace = audiobookSecondsPerPage(book);
  const recommendation = chooseEstimateSource({
    bookSecondsPerPage,
    globalSecondsPerPage,
    audiobookSecondsPerPage: audiobookPace,
  });

  const progressEntrySeconds = (progressEntriesResult.data ?? []).reduce(
    (total, entry) => total + (entry.estimated_minutes ?? 0) * 60,
    0,
  );
  const legacyEventSeconds = (outsideEventsResult.data ?? []).reduce((total, event) => {
    if (stringFromMetadata(event.metadata, "progress_entry_id")) {
      return total;
    }

    return total + numberFromMetadata(event.metadata, "estimated_seconds");
  }, 0);

  return {
    data: {
      realSeconds: bookStats.realSeconds,
      realPages: bookStats.realPages,
      bookSecondsPerPage,
      globalSecondsPerPage,
      audiobookSecondsPerPage: audiobookPace,
      recommendedSecondsPerPage: recommendation.recommendedSecondsPerPage,
      recommendedSource: recommendation.recommendedSource,
      outsideEstimatedSeconds: progressEntrySeconds + legacyEventSeconds,
      historicalEstimatedSeconds: historicalSecondsForBook(book),
    },
    error: null,
  };
}

export async function saveProgressUpdate(input: ProgressSaveInput) {
  const supabase = getSupabaseBrowserClient();
  const previousPage = input.book.current_page;
  const pagesAdvanced = Math.max(input.nextPage - previousPage, 0);
  const nextStatus = statusForPage(input.book, input.nextPage);
  const shouldRecordEstimate = !input.correction && pagesAdvanced > 0 && input.estimatedSeconds > 0;
  const bookUpdate: Database["public"]["Tables"]["books"]["Update"] = {
    current_page: input.nextPage,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (shouldRecordEstimate) {
    bookUpdate.estimated_minutes_per_page = Number((input.secondsPerPage / 60).toFixed(2));
    bookUpdate.estimation_source = input.estimationSource;
  }

  const bookResult = await supabase
    .from("books")
    .update(bookUpdate)
    .eq("id", input.book.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (bookResult.error) {
    return { data: null, error: { message: bookResult.error.message } };
  }

  if (!shouldRecordEstimate) {
    return { data: bookResult.data, error: null };
  }

  const estimatedMinutes = Math.max(1, Math.round(input.estimatedSeconds / 60));
  const progressResult = await supabase
    .from("reading_progress_entries")
    .insert({
      user_id: input.userId,
      book_id: input.book.id,
      reading_session_id: null,
      from_page: previousPage,
      to_page: input.nextPage,
      pages_read: pagesAdvanced,
      estimated_minutes: estimatedMinutes,
      estimation_source: input.estimationSource,
      is_estimated: true,
    })
    .select("id")
    .single();

  if (progressResult.error || !progressResult.data) {
    return {
      data: null,
      error: {
        message: progressResult.error?.message ?? "Nao foi possivel registrar o tempo estimado.",
      },
    };
  }

  const eventResult = await supabase.from("timeline_events").insert({
    user_id: input.userId,
    book_id: input.book.id,
    event_type: ESTIMATED_PROGRESS_EVENT_TYPE,
    title: "Progresso registrado fora do app",
    description: `${pagesAdvanced} pagina${pagesAdvanced === 1 ? "" : "s"} registrada${pagesAdvanced === 1 ? "" : "s"} como tempo estimado.`,
    metadata: {
      previous_page: previousPage,
      new_page: input.nextPage,
      pages_advanced: pagesAdvanced,
      estimated_seconds: input.estimatedSeconds,
      estimated_minutes: estimatedMinutes,
      seconds_per_page: input.secondsPerPage,
      estimation_source: input.estimationSource,
      progress_entry_id: progressResult.data.id,
      time_kind: "estimated_outside_app",
    },
  });

  if (eventResult.error) {
    return { data: bookResult.data, error: null };
  }

  return { data: bookResult.data, error: null };
}
