import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type BookRow = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
export type BookUpdate = Database["public"]["Tables"]["books"]["Update"];
export type ManualCategoryRow = Database["public"]["Tables"]["manual_categories"]["Row"];
export type BookManualCategoryRow =
  Database["public"]["Tables"]["book_manual_categories"]["Row"];
export type ShelfRow = Database["public"]["Tables"]["shelves"]["Row"];
export type ShelfInsert = Database["public"]["Tables"]["shelves"]["Insert"];
export type ShelfUpdate = Database["public"]["Tables"]["shelves"]["Update"];
export type BookShelfRow = Database["public"]["Tables"]["book_shelves"]["Row"];
export type BookReadingSessionStatsRow = Pick<
  Database["public"]["Tables"]["reading_sessions"]["Row"],
  "book_id" | "active_seconds" | "start_page" | "end_page" | "status"
>;
export type BookReadingProgressEntryRow = Pick<
  Database["public"]["Tables"]["reading_progress_entries"]["Row"],
  "book_id" | "estimated_minutes" | "is_estimated"
>;
export type BookEstimatedProgressEventRow = Pick<
  Database["public"]["Tables"]["timeline_events"]["Row"],
  "book_id" | "metadata"
>;

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

export async function listShelves(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("shelves")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("name", { ascending: true });
}

export async function createShelf(payload: ShelfInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("shelves").insert(payload).select("*").single();
}

export async function updateShelf(shelfId: string, userId: string, payload: ShelfUpdate) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("shelves")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", shelfId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function softDeleteShelf(shelfId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();

  const relationResult = await supabase
    .from("book_shelves")
    .delete()
    .eq("user_id", userId)
    .eq("shelf_id", shelfId);

  if (relationResult.error) {
    return relationResult;
  }

  return supabase
    .from("shelves")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", shelfId)
    .eq("user_id", userId);
}

export async function listBookShelves(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("book_shelves").select("*").eq("user_id", userId);
}

export async function assignShelvesToBook(userId: string, bookId: string, shelfIds: string[]) {
  const supabase = getSupabaseBrowserClient();
  const uniqueShelfIds = Array.from(new Set(shelfIds));

  const deleteResult = await supabase
    .from("book_shelves")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (deleteResult.error || uniqueShelfIds.length === 0) {
    return deleteResult;
  }

  return supabase.from("book_shelves").insert(
    uniqueShelfIds.map((shelfId) => ({
      user_id: userId,
      book_id: bookId,
      shelf_id: shelfId,
    })),
  );
}

export async function assignBooksToShelf(userId: string, shelfId: string, bookIds: string[]) {
  const supabase = getSupabaseBrowserClient();
  const uniqueBookIds = Array.from(new Set(bookIds));

  const deleteResult = await supabase
    .from("book_shelves")
    .delete()
    .eq("user_id", userId)
    .eq("shelf_id", shelfId);

  if (deleteResult.error || uniqueBookIds.length === 0) {
    return deleteResult;
  }

  return supabase.from("book_shelves").insert(
    uniqueBookIds.map((bookId) => ({
      user_id: userId,
      book_id: bookId,
      shelf_id: shelfId,
    })),
  );
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

export async function removeBookFromShelf(userId: string, bookId: string, shelfId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("book_shelves")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("shelf_id", shelfId);
}

export async function listAnnotationBookLinks(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .select("book_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("book_id", "is", null);
}

export async function listReadingSessionBookStats(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_sessions")
    .select("book_id,active_seconds,start_page,end_page,status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("status", "cancelled");
}

export async function listReadingProgressEntriesForBooks(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("reading_progress_entries")
    .select("book_id,estimated_minutes,is_estimated")
    .eq("user_id", userId)
    .eq("is_estimated", true);
}

export async function listEstimatedProgressEvents(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("timeline_events")
    .select("book_id,metadata")
    .eq("user_id", userId)
    .eq("event_type", "estimated_progress_registered");
}
