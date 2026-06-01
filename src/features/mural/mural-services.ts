import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, MuralSuggestionStatus } from "@/lib/supabase/database.types";

export type MuralPositionRow =
  Database["public"]["Tables"]["annotation_mural_positions"]["Row"];
export type MuralPositionInsert =
  Database["public"]["Tables"]["annotation_mural_positions"]["Insert"];
export type MuralPositionUpdate =
  Database["public"]["Tables"]["annotation_mural_positions"]["Update"];
export type MuralSuggestionRow = Database["public"]["Tables"]["mural_suggestions"]["Row"];
export type MuralSuggestionInsert =
  Database["public"]["Tables"]["mural_suggestions"]["Insert"];
export type MuralSuggestionUpdate =
  Database["public"]["Tables"]["mural_suggestions"]["Update"];

export async function listMuralAnnotations(userId: string, bookId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

export async function listMuralPositions(userId: string, sessionId: string, bookId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_mural_positions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("book_id", bookId)
    .eq("is_visible", true)
    .order("z_index", { ascending: true });
}

export async function upsertMuralPositions(payload: MuralPositionInsert[]) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_mural_positions")
    .upsert(payload, { onConflict: "annotation_id,session_id" })
    .select("*");
}

export async function updateMuralPosition(
  positionId: string,
  userId: string,
  payload: MuralPositionUpdate,
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_mural_positions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", positionId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function listMuralSuggestions(userId: string, sessionId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("mural_suggestions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("suggested_slot", { ascending: true });
}

export async function createMuralSuggestions(payload: MuralSuggestionInsert[]) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("mural_suggestions").insert(payload).select("*");
}

export async function updateMuralSuggestion(
  suggestionId: string,
  userId: string,
  payload: MuralSuggestionUpdate,
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("mural_suggestions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export function updateMuralSuggestionPosition(
  suggestionId: string,
  userId: string,
  payload: Pick<MuralSuggestionUpdate, "x" | "y" | "width" | "height" | "rotation">,
) {
  return updateMuralSuggestion(suggestionId, userId, payload);
}

export function setMuralSuggestionStatus(
  suggestionId: string,
  userId: string,
  status: Extract<MuralSuggestionStatus, "hidden" | "deleted" | "used">,
  convertedAnnotationId?: string | null,
) {
  return updateMuralSuggestion(suggestionId, userId, {
    status,
    converted_annotation_id: convertedAnnotationId,
  });
}

export async function convertMuralSuggestionIntoAnnotationPosition(params: {
  userId: string;
  suggestion: MuralSuggestionRow;
  annotationId: string;
  bookId: string;
  zIndex: number;
}) {
  const positionResult = await upsertMuralPositions([
    {
      user_id: params.userId,
      annotation_id: params.annotationId,
      session_id: params.suggestion.session_id,
      book_id: params.bookId,
      x: params.suggestion.x,
      y: params.suggestion.y,
      width: params.suggestion.width,
      height: params.suggestion.height,
      rotation: params.suggestion.rotation,
      z_index: params.zIndex,
      is_visible: true,
      is_suggested: true,
      suggested_slot: params.suggestion.suggested_slot,
    },
  ]);

  if (positionResult.error) {
    return {
      data: null,
      error: positionResult.error,
    };
  }

  const suggestionResult = await setMuralSuggestionStatus(
    params.suggestion.id,
    params.userId,
    "used",
    params.annotationId,
  );

  return {
    data: {
      position: positionResult.data?.[0] ?? null,
      suggestion: suggestionResult.data ?? null,
    },
    error: suggestionResult.error,
  };
}
