import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

export type UserSettingRow = Database["public"]["Tables"]["user_settings"]["Row"];
export type AnnotationColorRow = Database["public"]["Tables"]["annotation_colors"]["Row"];

export type MuralPreferences = {
  show_suggestions: boolean;
  calm_grid_enabled: boolean;
  max_suggestions_per_session: 5;
  keep_positions_stable_within_session: boolean;
  suggestions_randomized_per_session: boolean;
  open_mural_with_existing_annotations: boolean;
};

export type QuickExportPrivacySetting = {
  include_private_content: boolean;
};

export type PrivacySafetyCounts = {
  privateBooks: number;
  privateAnnotations: number;
  privateBooksInQuickExports: number;
  quickExportBooks: number;
  quickExportAnnotations: number;
};

export const defaultMuralPreferences: MuralPreferences = {
  show_suggestions: true,
  calm_grid_enabled: true,
  max_suggestions_per_session: 5,
  keep_positions_stable_within_session: true,
  suggestions_randomized_per_session: true,
  open_mural_with_existing_annotations: true,
};

export const defaultQuickExportPrivacy: QuickExportPrivacySetting = {
  include_private_content: false,
};

function countFrom(result: { count: number | null }) {
  return result.count ?? 0;
}

export function readObjectSetting(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function normalizeMuralPreferences(value: Json | null): MuralPreferences {
  const objectValue = readObjectSetting(value);

  return {
    show_suggestions:
      typeof objectValue.show_suggestions === "boolean"
        ? objectValue.show_suggestions
        : defaultMuralPreferences.show_suggestions,
    calm_grid_enabled:
      typeof objectValue.calm_grid_enabled === "boolean"
        ? objectValue.calm_grid_enabled
        : defaultMuralPreferences.calm_grid_enabled,
    max_suggestions_per_session: 5,
    keep_positions_stable_within_session: true,
    suggestions_randomized_per_session: true,
    open_mural_with_existing_annotations: true,
  };
}

export function normalizeQuickExportPrivacy(value: Json | null): QuickExportPrivacySetting {
  const objectValue = readObjectSetting(value);

  return {
    include_private_content:
      typeof objectValue.include_private_content === "boolean"
        ? objectValue.include_private_content
        : defaultQuickExportPrivacy.include_private_content,
  };
}

export async function getUserSetting(userId: string, key: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
}

export async function upsertUserSetting(userId: string, key: string, value: Json) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    )
    .select("*")
    .single();
}

export async function listSettingsAnnotationColors(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_colors")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
}

export async function createSettingsAnnotationColor(
  userId: string,
  payload: Pick<AnnotationColorRow, "name" | "color_hex" | "applies_to">,
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_colors")
    .insert({
      user_id: userId,
      name: payload.name,
      color_hex: payload.color_hex,
      applies_to: payload.applies_to,
      is_default: false,
    })
    .select("*")
    .single();
}

export async function updateSettingsAnnotationColor(
  colorId: string,
  userId: string,
  payload: Database["public"]["Tables"]["annotation_colors"]["Update"],
) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_colors")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", colorId)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function setDefaultAnnotationColor(colorId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  const resetResult = await supabase
    .from("annotation_colors")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (resetResult.error) {
    return resetResult;
  }

  return updateSettingsAnnotationColor(colorId, userId, { is_default: true });
}

export async function deleteSettingsAnnotationColor(colorId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("annotation_colors")
    .delete()
    .eq("id", colorId)
    .eq("user_id", userId)
    .eq("is_default", false)
    .select("id")
    .single();
}

export async function getPrivacySafetyCounts(userId: string): Promise<{
  data: PrivacySafetyCounts | null;
  error: { message: string } | null;
}> {
  const supabase = getSupabaseBrowserClient();

  const [
    privateBooks,
    privateAnnotations,
    privateBooksInQuickExports,
    quickExportBooks,
    quickExportAnnotations,
  ] = await Promise.all([
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_private", true)
      .is("deleted_at", null),
    supabase
      .from("annotations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_private", true)
      .is("deleted_at", null),
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_private", true)
      .eq("include_in_quick_exports", true)
      .is("deleted_at", null),
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_private", false)
      .eq("include_in_quick_exports", true)
      .is("deleted_at", null),
    supabase
      .from("annotations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_private", false)
      .is("deleted_at", null),
  ]);

  const firstError =
    privateBooks.error ??
    privateAnnotations.error ??
    privateBooksInQuickExports.error ??
    quickExportBooks.error ??
    quickExportAnnotations.error;

  if (firstError) {
    return { data: null, error: { message: firstError.message } };
  }

  return {
    data: {
      privateBooks: countFrom(privateBooks),
      privateAnnotations: countFrom(privateAnnotations),
      privateBooksInQuickExports: countFrom(privateBooksInQuickExports),
      quickExportBooks: countFrom(quickExportBooks),
      quickExportAnnotations: countFrom(quickExportAnnotations),
    },
    error: null,
  };
}

export async function applyPrivateBookSafetyDefaults(userId: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("books")
    .update({
      include_in_quick_exports: false,
      show_in_home: false,
      show_in_notifications: false,
      show_in_mente: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_private", true)
    .is("deleted_at", null)
    .select("id");
}
