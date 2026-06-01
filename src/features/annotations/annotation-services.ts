import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AnnotationType, Database } from "@/lib/supabase/database.types";

export type AnnotationRow = Database["public"]["Tables"]["annotations"]["Row"];
export type AnnotationInsert = Database["public"]["Tables"]["annotations"]["Insert"];
export type AnnotationUpdate = Database["public"]["Tables"]["annotations"]["Update"];
export type AnnotationColorRow = Database["public"]["Tables"]["annotation_colors"]["Row"];
export type AnnotationBookRow = Pick<
  Database["public"]["Tables"]["books"]["Row"],
  | "id"
  | "title"
  | "status"
  | "reading_origin"
  | "read_before_serene"
  | "total_pages"
  | "current_page"
>;

export async function listAnnotations(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function listAnnotationsForSession(userId: string, sessionId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

export async function markSessionAnnotationsToReview(
  userId: string,
  sessionId: string,
  types: AnnotationType[] = ["quick_note"],
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .update({
      review_status: "to_review",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .in("type", types)
    .eq("review_status", "none")
    .is("deleted_at", null)
    .select("*");
}

export async function listBooksForAnnotations(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .select("id,title,status,reading_origin,read_before_serene,total_pages,current_page")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("title", { ascending: true });
}

export async function listAnnotationColors(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_colors")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
}

export async function createAnnotation(payload: AnnotationInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("annotations").insert(payload).select("*").single();
}

export async function updateAnnotation(annotationId: string, userId: string, payload: AnnotationUpdate) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", annotationId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function softDeleteAnnotation(annotationId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotations")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", annotationId)
    .eq("user_id", userId);
}
