import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type BookRow = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
export type BookUpdate = Database["public"]["Tables"]["books"]["Update"];
export type ManualCategoryRow = Database["public"]["Tables"]["manual_categories"]["Row"];
export type BookManualCategoryRow =
  Database["public"]["Tables"]["book_manual_categories"]["Row"];

export async function listBooks(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function createBook(payload: BookInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("books").insert(payload).select("*").single();
}

export async function updateBook(bookId: string, userId: string, payload: BookUpdate) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function softDeleteBook(bookId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("user_id", userId);
}

export async function listManualCategories(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("manual_categories")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("name", { ascending: true });
}

export async function createManualCategory(userId: string, name: string, color?: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("manual_categories")
    .insert({ user_id: userId, name, color: color ?? null })
    .select("*")
    .single();
}

export async function listBookManualCategories(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("book_manual_categories").select("*").eq("user_id", userId);
}

export async function assignCategoriesToBook(
  userId: string,
  bookId: string,
  categoryIds: string[],
) {
  const supabase = getSupabaseBrowserClient();
  const uniqueCategoryIds = Array.from(new Set(categoryIds));

  const deleteResult = await supabase
    .from("book_manual_categories")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (deleteResult.error || uniqueCategoryIds.length === 0) {
    return deleteResult;
  }

  return supabase.from("book_manual_categories").insert(
    uniqueCategoryIds.map((categoryId) => ({
      user_id: userId,
      book_id: bookId,
      category_id: categoryId,
    })),
  );
}

export async function removeCategoryFromBook(userId: string, bookId: string, categoryId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("book_manual_categories")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("category_id", categoryId);
}
