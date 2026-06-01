import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type TrashBookRow = Database["public"]["Tables"]["books"]["Row"];
export type TrashAnnotationRow = Database["public"]["Tables"]["annotations"]["Row"];

export async function listDeletedBooks(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
}

export async function listDeletedAnnotations(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
}

export async function listBooksForTrash(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .select("id,title,deleted_at")
    .eq("user_id", userId)
    .order("title", { ascending: true });
}

export async function restoreBook(bookId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("*")
    .single();
}

export async function restoreAnnotation(annotationId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", annotationId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("*")
    .single();
}

export async function permanentlyDeleteBook(bookId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .single();
}

export async function permanentlyDeleteAnnotation(annotationId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .delete()
    .eq("id", annotationId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .single();
}
