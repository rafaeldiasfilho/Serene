"use client";

import type { CSSProperties } from "react";
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

function getCardVisualClass(type: AnnotationType) {
  if (type === "post_it") {
    return "rounded-xl shadow-[2px_5px_0_rgb(47_42_36_/_7%),var(--serene-shadow-soft)]";
  }
  if (type === "reflection" || type === "thought") {
    return "rounded-[26px] shadow-[var(--serene-shadow-soft)]";
  }
  if (type === "highlight") {
    return "rounded-xl border-dashed shadow-[var(--serene-shadow-soft)]";
  }
  if (type === "flag") {
    return "rounded-xl border-l-4 shadow-[var(--serene-shadow-soft)]";
  }
  return "rounded-xl shadow-[var(--serene-shadow-soft)]";
}

function getCardStyle(type: AnnotationType): CSSProperties | undefined {
  if (type === "post_it") {
    return { transform: "rotate(-0.35deg)" };
  }

  return undefined;
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
      <div
        className="relative rounded-lg border border-black/10 p-3 text-sm leading-relaxed shadow-[2px_4px_0_rgb(0_0_0_/_6%)]"
        style={{
          backgroundColor: annotation.color ?? "#FFE6A8",
          color: annotation.text_color ?? "#4A3A2A",
        }}
      >
        <span className="absolute left-1/2 top-0 h-2 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45 shadow-sm" />
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  if (annotation.type === "highlight") {
    const highlightColor = annotation.highlight_color ?? "#F7E78A";

    return (
      <p className="rounded-lg border border-[color-mix(in_oklab,var(--annotation-border)_58%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_58%,transparent)] px-3 py-2 text-sm leading-7">
        <mark
          className="rounded-sm bg-transparent px-1 py-0.5"
          style={{
            backgroundImage: `linear-gradient(transparent 54%, ${highlightColor} 54%)`,
            boxDecorationBreak: "clone",
            color: "#2B2B2B",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {content}
        </mark>
      </p>
    );
  }

  if (annotation.type === "reflection") {
    return (
      <div className="annotation-detail relative rounded-[28px] border px-5 py-4">
        <span className="literary absolute left-4 top-2 text-3xl leading-none opacity-20">
          &ldquo;
        </span>
        <p className="literary relative text-[15px] italic leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "flag") {
    return (
      <div className="annotation-detail relative flex items-start gap-3 rounded-lg border px-3 py-3">
        <span className="annotation-marker mt-0.5 inline-block h-7 w-1.5 shrink-0 rounded-full" />
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
      <div className="annotation-detail rounded-[22px] border px-4 py-3">
        <p className="literary text-[15px] italic leading-relaxed">{content}</p>
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
        "serene-card-enter border bg-[var(--serene-surface)] p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5",
        getContainerClass(annotation.type),
        getCardVisualClass(annotation.type),
      ].join(" ")}
      style={getCardStyle(annotation.type)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[color-mix(in_oklab,var(--serene-border)_70%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_68%,transparent)] px-2.5 py-1 text-[var(--serene-muted)]">
            {annotationTypeLabel[annotation.type]}
          </span>
          <span className="rounded-full border border-[color-mix(in_oklab,var(--serene-border)_70%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_68%,transparent)] px-2.5 py-1 text-[var(--serene-muted)]">
            {annotationReviewLabel[annotation.review_status]}
          </span>
          {annotation.page_number !== null && (
            <span className="rounded-full border border-[color-mix(in_oklab,var(--serene-border)_70%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_68%,transparent)] px-2.5 py-1 text-[var(--serene-muted)]">
              Pag {annotation.page_number}
            </span>
          )}
          {annotation.is_private && (
            <span className="rounded-full border border-[color-mix(in_oklab,var(--serene-border)_70%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_68%,transparent)] px-2.5 py-1 text-[var(--serene-muted)]">
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
          className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--serene-border)_82%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_62%,transparent)] px-3 py-1.5 text-xs"
        >
          <Pencil className="size-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(annotation, !annotation.is_favorite)}
          className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--serene-border)_82%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_62%,transparent)] px-3 py-1.5 text-xs"
        >
          {annotation.is_favorite ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />}
          {annotation.is_favorite ? "Remover favorita" : "Favoritar"}
        </button>
        <button
          type="button"
          onClick={() => onTogglePrivacy(annotation, !annotation.is_private)}
          className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--serene-border)_82%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_62%,transparent)] px-3 py-1.5 text-xs"
        >
          {annotation.is_private ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {annotation.is_private ? "Tornar publica" : "Tornar privada"}
        </button>
        <button
          type="button"
          onClick={() => onSetReviewStatus(annotation, reviewTransition.next)}
          className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--serene-border)_82%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_62%,transparent)] px-3 py-1.5 text-xs"
        >
          {reviewTransition.label}
        </button>
        <button
          type="button"
          onClick={() => onDelete(annotation)}
          className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--serene-border)_82%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_62%,transparent)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
        >
          <Trash2 className="size-3.5" />
          Lixeira
        </button>
      </div>
    </article>
  );
}
