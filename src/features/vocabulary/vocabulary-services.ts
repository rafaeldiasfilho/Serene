import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type VocabularyEntryRow = Database["public"]["Tables"]["vocabulary_entries"]["Row"];
export type VocabularyEntryInsert = Database["public"]["Tables"]["vocabulary_entries"]["Insert"];

export async function createVocabularyEntry(payload: VocabularyEntryInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("vocabulary_entries").insert(payload).select("*").single();
}

export async function listVocabularyEntries(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("vocabulary_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function listVocabularyEntriesForBook(userId: string, bookId: string, limit?: number) {
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("vocabulary_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  return query;
}

export async function listVocabularyEntriesForSession(userId: string, sessionId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("vocabulary_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("reading_session_id", sessionId)
    .order("created_at", { ascending: false });
}
