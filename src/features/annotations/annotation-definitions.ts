import type {
  AnnotationReviewStatus,
  AnnotationType,
} from "@/lib/supabase/database.types";

export type AnnotationTypeOption = {
  value: AnnotationType;
  label: string;
};

export const annotationTypeOptions: AnnotationTypeOption[] = [
  { value: "quick_note", label: "Anotacao Rapida" },
  { value: "reflection", label: "Reflexao" },
  { value: "highlight", label: "Marca-texto" },
  { value: "post_it", label: "Post-it" },
  { value: "flag", label: "Flag" },
  { value: "doubt", label: "Duvida" },
  { value: "thought", label: "Pensamento" },
  { value: "idea", label: "Ideia" },
  { value: "action", label: "Acao" },
];

export const annotationTypeLabel: Record<AnnotationType, string> = {
  quick_note: "Anotacao Rapida",
  reflection: "Reflexao",
  highlight: "Marca-texto",
  post_it: "Post-it",
  flag: "Flag",
  doubt: "Duvida",
  thought: "Pensamento",
  idea: "Ideia",
  action: "Acao",
  ocr_page: "OCR",
};

export const annotationReviewLabel: Record<AnnotationReviewStatus, string> = {
  none: "Sem revisao",
  to_review: "Para revisar",
  reviewed: "Revisada",
};

export const annotationReviewOptions: Array<{
  value: AnnotationReviewStatus;
  label: string;
}> = [
  { value: "none", label: annotationReviewLabel.none },
  { value: "to_review", label: annotationReviewLabel.to_review },
  { value: "reviewed", label: annotationReviewLabel.reviewed },
];

export const fallbackAnnotationColors = [
  "#F7E78A",
  "#DDEAFE",
  "#DFF5E4",
  "#F4DDF8",
  "#EFE1D1",
  "#FFD9CC",
];

function normalizeHex(value: string) {
  const trimmed = value.trim().replace("#", "");
  if (trimmed.length === 3) {
    return trimmed
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase();
  }
  return trimmed.toUpperCase();
}

export function computeTextColor(backgroundHex: string | null) {
  if (!backgroundHex) {
    return null;
  }

  const normalized = normalizeHex(backgroundHex);
  if (!/^[0-9A-F]{6}$/.test(normalized)) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.6 ? "#2B2B2B" : "#F7F2EB";
}
