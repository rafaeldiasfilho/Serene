"use client";

import {
  Eye,
  EyeOff,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

import {
  annotationReviewLabel,
  annotationTypeLabel,
} from "@/features/annotations/annotation-definitions";
import type { AnnotationRow } from "@/features/annotations/annotation-services";
import type { AnnotationReviewStatus, AnnotationType } from "@/lib/supabase/database.types";

type AnnotationCardProps = {
  annotation: AnnotationRow;
  bookTitle?: string | null;
  onEdit: (annotation: AnnotationRow) => void;
  onDelete: (annotation: AnnotationRow) => void;
  onToggleFavorite: (annotation: AnnotationRow, nextValue: boolean) => void;
  onTogglePrivacy: (annotation: AnnotationRow, nextValue: boolean) => void;
  onSetReviewStatus: (annotation: AnnotationRow, nextStatus: AnnotationReviewStatus) => void;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getContainerClass(type: AnnotationType) {
  if (type === "post_it") {
    return "annotation-tone-post-it";
  }
  if (type === "reflection") {
    return "annotation-tone-reflection";
  }
  if (type === "highlight") {
    return "annotation-tone-highlight";
  }
  if (type === "flag") {
    return "annotation-tone-flag";
  }
  if (type === "idea") {
    return "annotation-tone-idea";
  }
  if (type === "action") {
    return "annotation-tone-action";
  }
  if (type === "thought") {
    return "annotation-tone-thought";
  }
  if (type === "doubt") {
    return "annotation-tone-doubt";
  }
  if (type === "ocr_page") {
    return "annotation-tone-ocr";
  }
  return "border-[var(--serene-border)]";
}

function getReviewTransition(current: AnnotationReviewStatus) {
  if (current === "none") {
    return {
      next: "to_review" as const,
      label: "Enviar para revisar",
    };
  }
  if (current === "to_review") {
    return {
      next: "reviewed" as const,
      label: "Marcar revisada",
    };
  }
  return {
    next: "to_review" as const,
    label: "Voltar para revisar",
  };
}

function renderContent(annotation: AnnotationRow) {
  const content = annotation.content?.trim() || "Sem conteudo";

  if (annotation.type === "post_it") {
    return (
      <p
        className="rounded-md border border-black/10 p-3 text-sm leading-relaxed shadow-sm"
        style={{
          backgroundColor: annotation.color ?? "#FFE6A8",
          color: annotation.text_color ?? "#4A3A2A",
        }}
      >
        {content}
      </p>
    );
  }

  if (annotation.type === "highlight") {
    return (
      <p className="text-sm leading-relaxed">
        <mark
          className="rounded px-1 py-0.5"
          style={{ backgroundColor: annotation.highlight_color ?? "#F7E78A", color: "#2B2B2B" }}
        >
          {content}
        </mark>
      </p>
    );
  }

  if (annotation.type === "reflection") {
    return (
      <div className="annotation-detail rounded-[26px] border px-4 py-3">
        <p className="literary text-[15px] leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "flag") {
    return (
      <div className="annotation-detail flex items-start gap-2 rounded-md border px-3 py-2">
        <span className="annotation-marker mt-0.5 inline-block h-5 w-1 rounded" />
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "idea") {
    return (
      <div className="annotation-detail rounded-md border px-3 py-2">
        <p className="annotation-label text-[11px] font-semibold uppercase tracking-[0.14em]">Insight</p>
        <p className="mt-1 text-sm leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "doubt") {
    return (
      <div className="annotation-detail rounded-md border px-3 py-2">
        <p className="annotation-label text-[11px] font-semibold uppercase tracking-[0.14em]">Pergunta</p>
        <p className="mt-1 text-sm leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "action") {
    return (
      <div className="annotation-detail rounded-md border px-3 py-2">
        <p className="annotation-label text-[11px] font-semibold uppercase tracking-[0.14em]">Acao pratica</p>
        <p className="mt-1 text-sm leading-relaxed">[ ] {content}</p>
      </div>
    );
  }

  if (annotation.type === "thought") {
    return (
      <div className="annotation-detail rounded-[20px] border px-4 py-3">
        <p className="literary text-[15px] leading-relaxed">{content}</p>
      </div>
    );
  }

  return <p className="text-sm leading-relaxed">{content}</p>;
}

export function AnnotationCard({
  annotation,
  bookTitle,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePrivacy,
  onSetReviewStatus,
}: AnnotationCardProps) {
  const reviewTransition = getReviewTransition(annotation.review_status);

  return (
    <article
      className={[
        "rounded-2xl border bg-[var(--serene-surface)] p-4 shadow-sm",
        getContainerClass(annotation.type),
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-1 text-[var(--serene-muted)]">
            {annotationTypeLabel[annotation.type]}
          </span>
          <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-1 text-[var(--serene-muted)]">
            {annotationReviewLabel[annotation.review_status]}
          </span>
          {annotation.page_number !== null && (
            <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-1 text-[var(--serene-muted)]">
              Pag {annotation.page_number}
            </span>
          )}
          {annotation.is_private && (
            <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-1 text-[var(--serene-muted)]">
              Privada
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--serene-muted)]">{formatDateTime(annotation.created_at)}</p>
      </div>

      <div className="mt-3">{renderContent(annotation)}</div>

      <p className="mt-3 text-xs text-[var(--serene-muted)]">
        {bookTitle ?? "Sem livro vinculado"}
        {annotation.session_id ? " - vinculada a sessao de leitura" : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(annotation)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs"
        >
          <Pencil className="size-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(annotation, !annotation.is_favorite)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs"
        >
          {annotation.is_favorite ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />}
          {annotation.is_favorite ? "Remover favorita" : "Favoritar"}
        </button>
        <button
          type="button"
          onClick={() => onTogglePrivacy(annotation, !annotation.is_private)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs"
        >
          {annotation.is_private ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {annotation.is_private ? "Tornar publica" : "Tornar privada"}
        </button>
        <button
          type="button"
          onClick={() => onSetReviewStatus(annotation, reviewTransition.next)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs"
        >
          {reviewTransition.label}
        </button>
        <button
          type="button"
          onClick={() => onDelete(annotation)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
        >
          <Trash2 className="size-3.5" />
          Lixeira
        </button>
      </div>
    </article>
  );
}
