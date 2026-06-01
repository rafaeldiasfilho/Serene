import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type TimelineEventRow = Database["public"]["Tables"]["timeline_events"]["Row"];
export type TimelineBookRow = Pick<
  Database["public"]["Tables"]["books"]["Row"],
  | "id"
  | "title"
  | "author"
  | "status"
  | "reading_origin"
  | "is_private"
  | "show_in_mente"
  | "read_before_serene"
  | "estimated_reading_seconds"
  | "deleted_at"
>;
export type TimelineSessionRow = Pick<
  Database["public"]["Tables"]["reading_sessions"]["Row"],
  | "id"
  | "book_id"
  | "status"
  | "active_seconds"
  | "paused_seconds"
  | "start_page"
  | "end_page"
  | "started_at"
  | "ended_at"
  | "deleted_at"
>;
export type TimelineAnnotationRow = Pick<
  Database["public"]["Tables"]["annotations"]["Row"],
  | "id"
  | "book_id"
  | "session_id"
  | "type"
  | "content"
  | "page_number"
  | "is_favorite"
  | "is_private"
  | "review_status"
  | "deleted_at"
  | "created_at"
>;

export type TimelineSourceData = {
  events: TimelineEventRow[];
  books: TimelineBookRow[];
  sessions: TimelineSessionRow[];
  annotations: TimelineAnnotationRow[];
};

export type TimelineMonthGroup = {
  key: string;
  label: string;
  events: TimelineEventRow[];
};

type ServiceResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthLabel(value: string) {
  const date = parseDate(value);
  if (!date) {
    return "Memorias sem data";
  }

  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.slice(0, 1).toUpperCase() + label.slice(1);
}

function uniqueDefined(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function groupTimelineEventsByMonth(events: TimelineEventRow[]): TimelineMonthGroup[] {
  const groups = new Map<string, TimelineMonthGroup>();

  for (const event of events) {
    const date = parseDate(event.created_at);
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : "sem-data";
    const current = groups.get(key) ?? {
      key,
      label: formatMonthLabel(event.created_at),
      events: [],
    };

    current.events.push(event);
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export async function loadTimelineSourceData(
  userId: string,
): Promise<ServiceResult<TimelineSourceData>> {
  const supabase = getSupabaseBrowserClient();

  const eventsResult = await supabase
    .from("timeline_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(240);

  if (eventsResult.error) {
    return { data: null, error: { message: eventsResult.error.message } };
  }

  const events = eventsResult.data ?? [];
  const sessionIds = uniqueDefined(events.map((event) => event.session_id));
  const annotationIds = uniqueDefined(events.map((event) => event.annotation_id));

  const [sessionsResult, annotationsResult] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from("reading_sessions")
          .select(
            "id,book_id,status,active_seconds,paused_seconds,start_page,end_page,started_at,ended_at,deleted_at",
          )
          .eq("user_id", userId)
          .in("id", sessionIds)
      : Promise.resolve({ data: [] as TimelineSessionRow[], error: null }),
    annotationIds.length > 0
      ? supabase
          .from("annotations")
          .select(
            "id,book_id,session_id,type,content,page_number,is_favorite,is_private,review_status,deleted_at,created_at",
          )
          .eq("user_id", userId)
          .in("id", annotationIds)
      : Promise.resolve({ data: [] as TimelineAnnotationRow[], error: null }),
  ]);

  const relationshipError = sessionsResult.error ?? annotationsResult.error;

  if (relationshipError) {
    return { data: null, error: { message: relationshipError.message } };
  }

  const sessionRows = sessionsResult.data ?? [];
  const annotationRows = annotationsResult.data ?? [];
  const bookIds = uniqueDefined([
    ...events.map((event) => event.book_id),
    ...sessionRows.map((session) => session.book_id),
    ...annotationRows.map((annotation) => annotation.book_id),
  ]);

  const booksResult =
    bookIds.length > 0
      ? await supabase
          .from("books")
          .select(
            "id,title,author,status,reading_origin,is_private,show_in_mente,read_before_serene,estimated_reading_seconds,deleted_at",
          )
          .eq("user_id", userId)
          .in("id", bookIds)
      : { data: [] as TimelineBookRow[], error: null };

  if (booksResult.error) {
    return { data: null, error: { message: booksResult.error.message } };
  }

  return {
    data: {
      events,
      books: booksResult.data ?? [],
      sessions: sessionRows,
      annotations: annotationRows,
    },
    error: null,
  };
}
