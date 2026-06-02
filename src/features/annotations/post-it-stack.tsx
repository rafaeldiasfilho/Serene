"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import {
  Eye,
  EyeOff,
  FolderOpen,
  Pencil,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";

import { annotationReviewLabel } from "@/features/annotations/annotation-definitions";
import type { AnnotationRow } from "@/features/annotations/annotation-services";
import {
  PostItPaper,
  getPostItDisplayContent,
} from "@/features/annotations/post-it-paper";
import type { AnnotationReviewStatus } from "@/lib/supabase/database.types";

type PostItStackProps = {
  annotations: AnnotationRow[];
  bookTitle?: string | null;
  onEdit: (annotation: AnnotationRow) => void;
  onDelete: (annotation: AnnotationRow) => void;
  onToggleFavorite: (annotation: AnnotationRow, nextValue: boolean) => void;
  onTogglePrivacy: (annotation: AnnotationRow, nextValue: boolean) => void;
  onSetReviewStatus: (annotation: AnnotationRow, nextStatus: AnnotationReviewStatus) => void;
};

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

function getPostItContent(annotation: AnnotationRow) {
  return annotation.content?.trim() || "Sem conteudo";
}

function getStackTitle(annotations: AnnotationRow[]) {
  if (annotations.length === 1) {
    return "1 post-it guardado";
  }
  return `${annotations.length} post-its guardados`;
}

function handleKeyboardPress(event: KeyboardEvent<HTMLDivElement>, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  action();
}

export function PostItStack({
  annotations,
  bookTitle,
  onDelete,
  onEdit,
  onSetReviewStatus,
  onToggleFavorite,
  onTogglePrivacy,
}: PostItStackProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topAnnotation = annotations[0];
  const folderTitle = useMemo(() => getStackTitle(annotations), [annotations]);

  if (!topAnnotation) {
    return null;
  }

  if (!open) {
    const content = getPostItDisplayContent(getPostItContent(topAnnotation), false);

    return (
      <article className="serene-card-enter rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-4 shadow-[var(--serene-shadow-soft)]">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => handleKeyboardPress(event, () => setOpen(true))}
          className="group block w-full rounded-[1.25rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--serene-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--serene-paper)]"
          aria-expanded={open}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Pilha de post-its
              </p>
              <h2 className="mt-1 text-base font-semibold text-[var(--serene-text)]">
                {folderTitle}
              </h2>
              <p className="mt-1 text-xs text-[var(--serene-muted)]">
                {bookTitle ?? "Sem livro vinculado"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--serene-accent)] shadow-[var(--serene-shadow-soft)]">
              <FolderOpen className="size-3.5" />
              Abrir
            </span>
          </div>

          <div className="mt-4 max-w-[15.5rem] transition duration-500 group-hover:-translate-y-0.5">
            <PostItPaper
              color={topAnnotation.color}
              content={content}
              textColor={topAnnotation.text_color}
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="serene-soft-in rounded-[1.9rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-paper)_92%,var(--serene-surface)_8%),var(--serene-surface))] p-4 shadow-[var(--serene-shadow-lift)] md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Pasta de post-its
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--serene-text)]">{folderTitle}</h2>
          <p className="mt-1 text-sm text-[var(--serene-muted)]">
            {bookTitle ?? "Sem livro vinculado"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setExpandedId(null);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
        >
          <X className="size-4" />
          Fechar pilha
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {annotations.map((annotation) => {
          const expanded = expandedId === annotation.id;
          const reviewTransition = getReviewTransition(annotation.review_status);
          const rawContent = getPostItContent(annotation);
          const content = getPostItDisplayContent(rawContent, expanded);
          const canExpand = rawContent.length > content.length || expanded;

          return (
            <article
              key={annotation.id}
              className="serene-card-enter rounded-[1.5rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_84%,transparent)] p-3 shadow-[var(--serene-shadow-soft)]"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId((current) => (current === annotation.id ? null : annotation.id))}
                onKeyDown={(event) =>
                  handleKeyboardPress(event, () =>
                    setExpandedId((current) => (current === annotation.id ? null : annotation.id)),
                  )
                }
                className="block w-full rounded-[1.15rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--serene-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--serene-surface)]"
                aria-expanded={expanded}
              >
                <PostItPaper
                  color={annotation.color}
                  content={content}
                  expanded={expanded}
                  size="folder"
                  textColor={annotation.text_color}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-[var(--serene-muted)]">
                <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2.5 py-1">
                  {annotationReviewLabel[annotation.review_status]}
                </span>
                {annotation.page_number !== null && (
                  <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2.5 py-1">
                    Pag {annotation.page_number}
                  </span>
                )}
                {canExpand && (
                  <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2.5 py-1">
                    {expanded ? "Aberto" : "Toque para abrir"}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(annotation)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                >
                  <Pencil className="size-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(annotation, !annotation.is_favorite)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                >
                  {annotation.is_favorite ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />}
                  {annotation.is_favorite ? "Remover" : "Favoritar"}
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePrivacy(annotation, !annotation.is_private)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                >
                  {annotation.is_private ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {annotation.is_private ? "Publica" : "Privada"}
                </button>
                <button
                  type="button"
                  onClick={() => onSetReviewStatus(annotation, reviewTransition.next)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                >
                  {reviewTransition.label}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(annotation)}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                >
                  <Trash2 className="size-3.5" />
                  Lixeira
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
