import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { LOAD_ERROR_MESSAGE, userFacingError } from "@/lib/user-facing-error";

export type BetaUserRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "email"
  | "name"
  | "role"
  | "is_beta_tester"
  | "access_status"
  | "created_at"
  | "last_seen_at"
>;

export type LatestFeedbackRow = Pick<
  Database["public"]["Tables"]["feedback"]["Row"],
  "id" | "user_id" | "type" | "screen" | "message" | "rating" | "status" | "created_at"
>;

export type BetaOverview = {
  betaUsers: BetaUserRow[];
  totalBooks: number;
  totalNotes: number;
  totalReadingSessions: number;
  feedbackCount: number;
  latestFeedback: LatestFeedbackRow[];
};

function countFrom(result: { count: number | null }) {
  return result.count ?? 0;
}

export async function loadBetaOverview(): Promise<{
  data: BetaOverview | null;
  error: { message: string } | null;
}> {
  const supabase = getSupabaseBrowserClient();

  const [
    betaUsersResult,
    booksCountResult,
    notesCountResult,
    sessionsCountResult,
    feedbackCountResult,
    latestFeedbackResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,name,role,is_beta_tester,access_status,created_at,last_seen_at")
      .eq("is_beta_tester", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("annotations")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("reading_sessions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase.from("feedback").select("id", { count: "exact", head: true }),
    supabase
      .from("feedback")
      .select("id,user_id,type,screen,message,rating,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const firstError =
    betaUsersResult.error ??
    booksCountResult.error ??
    notesCountResult.error ??
    sessionsCountResult.error ??
    feedbackCountResult.error ??
    latestFeedbackResult.error;

  if (firstError) {
    return {
      data: null,
      error: {
        message: userFacingError(firstError, LOAD_ERROR_MESSAGE, "Falha ao carregar painel beta."),
      },
    };
  }

  return {
    data: {
      betaUsers: betaUsersResult.data ?? [],
      totalBooks: countFrom(booksCountResult),
      totalNotes: countFrom(notesCountResult),
      totalReadingSessions: countFrom(sessionsCountResult),
      feedbackCount: countFrom(feedbackCountResult),
      latestFeedback: latestFeedbackResult.data ?? [],
    },
    error: null,
  };
}
