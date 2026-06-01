import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type MenteBookRow = Database["public"]["Tables"]["books"]["Row"];
export type MenteSessionRow = Database["public"]["Tables"]["reading_sessions"]["Row"];
export type MenteAnnotationRow = Database["public"]["Tables"]["annotations"]["Row"];
export type MenteAutomaticCategoryRow =
  Database["public"]["Tables"]["automatic_mente_categories"]["Row"];
export type MenteBookAutomaticCategoryRow =
  Database["public"]["Tables"]["book_automatic_mente_categories"]["Row"];
export type MenteManualCategoryRow =
  Database["public"]["Tables"]["manual_categories"]["Row"];

export type MenteSourceData = {
  books: MenteBookRow[];
  sessions: MenteSessionRow[];
  annotations: MenteAnnotationRow[];
  automaticCategories: MenteAutomaticCategoryRow[];
  automaticRelations: MenteBookAutomaticCategoryRow[];
  manualCategories: MenteManualCategoryRow[];
};

type ServiceResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function loadMenteSourceData(userId: string): Promise<ServiceResult<MenteSourceData>> {
  const supabase = getSupabaseBrowserClient();

  const [
    booksResult,
    sessionsResult,
    annotationsResult,
    automaticCategoriesResult,
    automaticRelationsResult,
    manualCategoriesResult,
  ] = await Promise.all([
    supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .eq("is_private", false)
      .eq("show_in_mente", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("reading_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("started_at", { ascending: false }),
    supabase
      .from("annotations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_private", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("automatic_mente_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase.from("book_automatic_mente_categories").select("*").eq("user_id", userId),
    supabase
      .from("manual_categories")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const firstError =
    booksResult.error ??
    sessionsResult.error ??
    annotationsResult.error ??
    automaticCategoriesResult.error ??
    automaticRelationsResult.error ??
    manualCategoriesResult.error;

  if (firstError) {
    return { data: null, error: { message: firstError.message } };
  }

  return {
    data: {
      books: booksResult.data ?? [],
      sessions: sessionsResult.data ?? [],
      annotations: annotationsResult.data ?? [],
      automaticCategories: automaticCategoriesResult.data ?? [],
      automaticRelations: automaticRelationsResult.data ?? [],
      manualCategories: manualCategoriesResult.data ?? [],
    },
    error: null,
  };
}

export async function createManualCategoryFromMente(input: {
  userId: string;
  name: string;
  color: string;
  bookIds: string[];
}): Promise<ServiceResult<MenteManualCategoryRow>> {
  const supabase = getSupabaseBrowserClient();
  const uniqueBookIds = Array.from(new Set(input.bookIds));
  const existingCategoriesResult = await supabase
    .from("manual_categories")
    .select("*")
    .eq("user_id", input.userId)
    .is("deleted_at", null);

  if (existingCategoriesResult.error) {
    return { data: null, error: { message: existingCategoriesResult.error.message } };
  }

  const inputKey = normalizeKey(input.name);
  const existingCategory =
    existingCategoriesResult.data?.find((category) => normalizeKey(category.name) === inputKey) ??
    null;

  let manualCategory = existingCategory;

  if (!manualCategory) {
    const categoryResult = await supabase
      .from("manual_categories")
      .insert({
        user_id: input.userId,
        name: input.name,
        color: input.color,
      })
      .select("*")
      .single();

    if (categoryResult.error || !categoryResult.data) {
      return {
        data: null,
        error: { message: categoryResult.error?.message ?? "Nao foi possivel criar a categoria." },
      };
    }

    manualCategory = categoryResult.data;
  }

  if (uniqueBookIds.length === 0) {
    return { data: manualCategory, error: null };
  }

  const relationResult = await supabase
    .from("book_manual_categories")
    .upsert(
      uniqueBookIds.map((bookId) => ({
        user_id: input.userId,
        book_id: bookId,
        category_id: manualCategory.id,
      })),
      { onConflict: "book_id,category_id", ignoreDuplicates: true },
    );

  if (relationResult.error) {
    return { data: manualCategory, error: { message: relationResult.error.message } };
  }

  return { data: manualCategory, error: null };
}
