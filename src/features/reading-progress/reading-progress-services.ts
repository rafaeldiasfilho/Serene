import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookStatus, Database, Json } from "@/lib/supabase/database.types";

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
>;

export type ProgressContext = {
  realSeconds: number;
  realPages: number;
  personalSecondsPerPage: number | null;
  outsideEstimatedSeconds: number;
  historicalEstimatedSeconds: number;
};

export type ProgressSaveInput = {
  userId: string;
  book: ProgressBook;
  nextPage: number;
  estimatedSeconds: number;
  secondsPerPage: number;
  estimationSource: "personal_average" | "initial_average";
  correction: boolean;
};

function numberFromMetadata(metadata: Json | null, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

export async function loadProgressContext(userId: string, book: ProgressBook) {
  const supabase = getSupabaseBrowserClient();

  const [sessionsResult, outsideEventsResult] = await Promise.all([
    supabase
      .from("reading_sessions")
      .select("active_seconds,start_page,end_page,status")
      .eq("user_id", userId)
      .eq("book_id", book.id)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    supabase
      .from("timeline_events")
      .select("metadata")
      .eq("user_id", userId)
      .eq("book_id", book.id)
      .eq("event_type", ESTIMATED_PROGRESS_EVENT_TYPE),
  ]);

  const error = sessionsResult.error ?? outsideEventsResult.error;
  if (error) {
    return { data: null, error: { message: error.message } };
  }

  const realStats = (sessionsResult.data ?? []).reduce(
    (stats, session) => {
      const activeSeconds = session.active_seconds ?? 0;
      const startPage = session.start_page ?? null;
      const endPage = session.end_page ?? null;
      const pages =
        startPage !== null && endPage !== null && endPage > startPage ? endPage - startPage : 0;

      return {
        realPages: stats.realPages + pages,
        realSeconds: stats.realSeconds + activeSeconds,
      };
    },
    { realPages: 0, realSeconds: 0 },
  );

  const outsideEstimatedSeconds = (outsideEventsResult.data ?? []).reduce(
    (total, event) => total + numberFromMetadata(event.metadata, "estimated_seconds"),
    0,
  );

  const personalSecondsPerPage =
    realStats.realPages > 0 && realStats.realSeconds > 0
      ? Math.round(realStats.realSeconds / realStats.realPages)
      : null;

  return {
    data: {
      realSeconds: realStats.realSeconds,
      realPages: realStats.realPages,
      personalSecondsPerPage,
      outsideEstimatedSeconds,
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

  const bookResult = await supabase
    .from("books")
    .update({
      current_page: input.nextPage,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.book.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (bookResult.error) {
    return { data: null, error: { message: bookResult.error.message } };
  }

  if (input.correction || pagesAdvanced <= 0 || input.estimatedSeconds <= 0) {
    return { data: bookResult.data, error: null };
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
      seconds_per_page: input.secondsPerPage,
      estimation_source: input.estimationSource,
      time_kind: "estimated_outside_app",
    },
  });

  if (eventResult.error) {
    return { data: null, error: { message: eventResult.error.message } };
  }

  return { data: bookResult.data, error: null };
}
