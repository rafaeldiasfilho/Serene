import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type VocabularyEntryRow = Database["public"]["Tables"]["vocabulary_entries"]["Row"];
export type VocabularyEntryInsert = Database["public"]["Tables"]["vocabulary_entries"]["Insert"];
export type VocabularyEntryUpdate = Database["public"]["Tables"]["vocabulary_entries"]["Update"];

export async function createVocabularyEntry(payload: VocabularyEntryInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("vocabulary_entries").insert(payload).select("*").single();
}

export async function updateVocabularyEntry(
  entryId: string,
  userId: string,
  payload: VocabularyEntryUpdate,
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("vocabulary_entries")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function softDeleteVocabularyEntry(entryId: string, userId: string) {
  return updateVocabularyEntry(entryId, userId, {
    deleted_at: new Date().toISOString(),
  });
}

export async function listVocabularyEntries(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("vocabulary_entries")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function listVocabularyEntriesForBook(userId: string, bookId: string, limit?: number) {
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("vocabulary_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .is("deleted_at", null)
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
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}
