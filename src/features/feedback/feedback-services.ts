import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, FeedbackScreen, FeedbackType } from "@/lib/supabase/database.types";

export type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];
export type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];

export const feedbackTypes: Array<{ value: FeedbackType; label: string }> = [
  { value: "Bug", label: "Bug" },
  { value: "Suggestion", label: "Sugestão" },
  { value: "Difficulty", label: "Dificuldade" },
  { value: "Confusing", label: "Confuso" },
  { value: "Liked", label: "Gostei" },
  { value: "New idea", label: "Nova ideia" },
];

export const feedbackScreens: FeedbackScreen[] = [
  "Home",
  "Biblioteca",
  "Leitura",
  "Mural",
  "Anotações",
  "Mente",
  "Configurações",
  "Outro",
];

export function screenFromPathname(pathname: string): FeedbackScreen {
  if (pathname === "/") {
    return "Home";
  }
  if (pathname.startsWith("/biblioteca")) {
    return "Biblioteca";
  }
  if (pathname.includes("/mural")) {
    return "Mural";
  }
  if (pathname.startsWith("/leitura")) {
    return "Leitura";
  }
  if (pathname.startsWith("/anotacoes")) {
    return "Anotações";
  }
  if (pathname.startsWith("/mente")) {
    return "Mente";
  }
  if (pathname.startsWith("/configuracoes")) {
    return "Configurações";
  }
  return "Outro";
}

export async function submitFeedback(payload: FeedbackInsert) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("feedback").insert(payload).select("*").single();
}
