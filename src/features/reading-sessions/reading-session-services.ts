import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  BookStatus,
  Database,
  ReadingSessionStatus,
} from "@/lib/supabase/database.types";

export type ReadingSessionRow = Database["public"]["Tables"]["reading_sessions"]["Row"];
export type ReadingSessionInsert = Database["public"]["Tables"]["reading_sessions"]["Insert"];
export type ReadingSessionUpdate = Database["public"]["Tables"]["reading_sessions"]["Update"];
export type ReadingPauseRow = Database["public"]["Tables"]["reading_pauses"]["Row"];
export type BookRow = Database["public"]["Tables"]["books"]["Row"];

export type ReadingOpenedFrom = "inicio" | "biblioteca" | "anotacoes" | "mente" | "desconhecido";

type BookProgressUpdate = {
  currentPage: number;
  status?: BookStatus;
};

export async function getBookById(userId: string, bookId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
}

export async function getOpenSessionForBook(userId: string, bookId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .is("deleted_at", null)
    .in("status", ["active", "paused"] satisfies ReadingSessionStatus[])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getOpenPauseForSession(userId: string, sessionId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_pauses")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .is("resumed_at", null)
    .order("paused_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function startReadingSession(payload: ReadingSessionInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("reading_sessions").insert(payload).select("*").single();
}

export async function updateReadingSession(
  sessionId: string,
  userId: string,
  payload: ReadingSessionUpdate,
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_sessions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function createReadingPause(payload: Database["public"]["Tables"]["reading_pauses"]["Insert"]) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("reading_pauses").insert(payload).select("*").single();
}

export async function resumeReadingPause(
  pauseId: string,
  userId: string,
  payload: Database["public"]["Tables"]["reading_pauses"]["Update"],
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_pauses")
    .update(payload)
    .eq("id", pauseId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function updateBookProgress(userId: string, bookId: string, update: BookProgressUpdate) {
  const supabase = getSupabaseBrowserClient();
  const payload: Database["public"]["Tables"]["books"]["Update"] = {
    current_page: update.currentPage,
    updated_at: new Date().toISOString(),
  };

  if (update.status) {
    payload.status = update.status;
  }

  return supabase
    .from("books")
    .update(payload)
    .eq("id", bookId)
    .eq("user_id", userId)
    .select("*")
    .single();
}
