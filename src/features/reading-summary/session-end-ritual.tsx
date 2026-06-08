"use client";

import Link from "next/link";
import { BookMarked, BookOpen, CheckCircle2, Clock3, Heart, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  annotationTypeLabel,
  primaryAnnotationTypeOptions,
} from "@/features/annotations/annotation-definitions";
import type { AnnotationRow } from "@/features/annotations/annotation-services";
import { formatReadingDuration } from "@/features/reading-sessions/use-reading-session";
import type { VocabularyEntryRow } from "@/features/vocabulary/vocabulary-services";
import type { AnnotationType } from "@/lib/supabase/database.types";

type SessionEndSummary = {
  status: "finished" | "cancelled";
  activeSeconds: number;
  pausedSeconds: number;
  startPage: number | null;
  endPage: number | null;
  endedAt: string;
};

type SessionEndRitualProps = {
  summary: SessionEndSummary;
  bookTitle: string;
  annotations: AnnotationRow[];
  annotationsLoading: boolean;
  vocabularyEntries: VocabularyEntryRow[];
  vocabularyLoading: boolean;
  bookVocabularyEntries: VocabularyEntryRow[];
  bookCompleted: boolean;
  reducedMotion: boolean;
  reviewHref: string;
  reviewLaterFeedback: string | null;
  reviewLaterLoading: boolean;
  onReviewLater: () => void;
};

type RitualNoteStyle = CSSProperties & {
  "--note-delay"?: string;
  "--note-x"?: string;
  "--note-y"?: string;
};

const notePositions = [
  { x: "-210px", y: "-118px" },
  { x: "178px", y: "-96px" },
  { x: "-230px", y: "82px" },
  { x: "214px", y: "78px" },
  { x: "0px", y: "-154px" },
];

function getPagesRead(startPage: number | null, endPage: number | null) {
  if (startPage === null || endPage === null) {
    return null;
  }
  return Math.max(0, endPage - startPage);
}

function pluralize(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural;
}

function buildTypeCounts(annotations: AnnotationRow[]) {
  const counts = new Map<AnnotationType, number>();
  const primaryTypes = new Set(primaryAnnotationTypeOptions.map((option) => option.value));

  annotations.forEach((annotation) => {
    counts.set(annotation.type, (counts.get(annotation.type) ?? 0) + 1);
  });

  const primaryCounts: Array<{ type: string; label: string; count: number }> =
    primaryAnnotationTypeOptions
    .map((option) => ({
      type: option.value,
      label: annotationTypeLabel[option.value],
      count: counts.get(option.value) ?? 0,
    }));

  const otherCount = annotations.reduce(
    (total, annotation) => total + (primaryTypes.has(annotation.type) ? 0 : 1),
    0,
  );

  if (otherCount > 0) {
    primaryCounts.push({
      type: "other",
      label: "Outros registros",
      count: otherCount,
    });
  }

  return primaryCounts;
}

function formatPageValue(value: number | null) {
  return value === null ? "N\u00e3o informada" : value;
}

function getNoteLabel(annotation: AnnotationRow) {
  const content = annotation.content?.trim();
  if (!content) {
    return annotationTypeLabel[annotation.type];
  }
  return content.length > 46 ? `${content.slice(0, 43)}...` : content;
}

function getShortDefinition(entry: VocabularyEntryRow) {
  const definition = entry.definition?.trim();
  if (!definition) {
    return null;
  }
  return definition.length > 90 ? `${definition.slice(0, 87)}...` : definition;
}

function formatVocabularyMeta(entry: VocabularyEntryRow) {
  const parts: string[] = [];
  if (entry.page_number !== null) {
    parts.push(`p. ${entry.page_number}`);
  }
  parts.push(
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(entry.created_at)),
  );
  return parts.join(" - ");
}

function getRitualNoteClass(type: AnnotationType) {
  if (type === "post_it") {
    return "session-ritual-note-post-it";
  }
  if (type === "reflection") {
    return "session-ritual-note-reflection";
  }
  if (type === "highlight") {
    return "session-ritual-note-highlight";
  }
  if (type === "flag") {
    return "session-ritual-note-flag";
  }
  if (type === "doubt") {
    return "session-ritual-note-doubt";
  }
  if (type === "thought") {
    return "session-ritual-note-thought";
  }
  if (type === "idea") {
    return "session-ritual-note-idea";
  }
  if (type === "action") {
    return "session-ritual-note-action";
  }
  return "session-ritual-note-quick";
}

function getFinishedMessage(status: SessionEndSummary["status"]) {
  if (status === "finished") {
    return "Leitura guardada com sucesso.";
  }
  return "Sess\u00e3o encerrada e guardada.";
}

function getReadingTimePhrase(activeSeconds: number, bookTitle: string) {
  const duration = formatReadingDuration(activeSeconds);
  const minutes = Math.floor(activeSeconds / 60);

  if (minutes >= 40) {
    return `Voc\u00ea guardou ${duration} de leitura profunda nesta sess\u00e3o.`;
  }
  if (minutes >= 20) {
    return `Hoje voc\u00ea dedicou ${duration} \u00e0 leitura, sem pressa.`;
  }
  if (activeSeconds > 0) {
    return `Mais um peda\u00e7o de ${bookTitle} foi guardado.`;
  }
  return "Mais um peda\u00e7o da sua leitura foi guardado.";
}

function SessionVocabularyPanel({
  entries,
  loading,
}: {
  entries: VocabularyEntryRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
        <p className="text-sm text-[var(--serene-muted)]">
          {"Organizando palavras consultadas nesta leitura..."}
        </p>
      </section>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{"Palavras consultadas nesta leitura"}</h3>
          <p className="mt-1 text-sm text-[var(--serene-muted)]">
            {entries.length} {pluralize(entries.length, "palavra", "palavras")} {"guardada"}
            {entries.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/anotacoes?vocabulario=1"
          className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
        >
          Ver todas
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {entries.slice(0, 5).map((entry) => (
          <span
            key={entry.id}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-sm shadow-[var(--serene-shadow-soft)]"
          >
            {entry.word}
          </span>
        ))}
      </div>
    </section>
  );
}

function BookVocabularyPanel({
  entries,
}: {
  entries: VocabularyEntryRow[];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            {"Palavras que este livro te apresentou"}
          </p>
          <h3 className="mt-1 text-base font-semibold">{"Vocabul\u00e1rio deste livro"}</h3>
          <p className="mt-1 text-sm text-[var(--serene-muted)]">
            {entries.length} {pluralize(entries.length, "palavra", "palavras")} {"salva"}
            {entries.length === 1 ? "" : "s"} {"ao longo da leitura."}
          </p>
        </div>
        <Link
          href="/anotacoes?vocabulario=1"
          className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
        >
          {"Abrir hist\u00f3rico"}
        </Link>
      </div>

      <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
        {entries.map((entry) => {
          const shortDefinition = getShortDefinition(entry);
          const hasDetails = Boolean(entry.definition || entry.note);

          return (
            <details
              key={entry.id}
              className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm"
            >
              <summary className="cursor-pointer">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--serene-fg)]">{entry.word}</span>
                  <span className="text-xs text-[var(--serene-muted)]">
                    {formatVocabularyMeta(entry)}
                  </span>
                </span>
                {shortDefinition && (
                  <span className="mt-2 block text-xs leading-relaxed text-[var(--serene-muted)]">
                    {shortDefinition}
                  </span>
                )}
                {!hasDetails && (
                  <span className="mt-2 block text-xs text-[var(--serene-muted)]">
                    {"Sem significado manual ainda."}
                  </span>
                )}
              </summary>
              {hasDetails && (
                <div className="mt-3 space-y-2 border-t border-[var(--serene-border)] pt-3 text-xs leading-relaxed text-[var(--serene-muted)]">
                  {entry.definition && <p>{entry.definition}</p>}
                  {entry.note && <p>{entry.note}</p>}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}

function SummaryPanel({
  annotations,
  annotationsLoading,
  bookCompleted,
  bookTitle,
  bookVocabularyEntries,
  onReviewLater,
  reviewHref,
  reviewLaterFeedback,
  reviewLaterLoading,
  summary,
  vocabularyEntries,
  vocabularyLoading,
}: Omit<SessionEndRitualProps, "reducedMotion">) {
  const typeCounts = useMemo(() => buildTypeCounts(annotations), [annotations]);
  const favoriteCount = useMemo(
    () => annotations.filter((annotation) => annotation.is_favorite).length,
    [annotations],
  );
  const reviewCount = useMemo(
    () => annotations.filter((annotation) => annotation.review_status === "to_review").length,
    [annotations],
  );
  const privateCount = useMemo(
    () => annotations.filter((annotation) => annotation.is_private).length,
    [annotations],
  );
  const pagesRead = getPagesRead(summary.startPage, summary.endPage);

  return (
    <div className="space-y-5 rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)] shadow-[var(--serene-shadow-soft)]">
              <CheckCircle2 className="size-5" />
            </span>
            <h2 className="text-xl font-semibold">{getFinishedMessage(summary.status)}</h2>
          </div>
          <p className="literary mt-3 max-w-2xl text-lg leading-relaxed text-[var(--serene-muted)]">
            {getReadingTimePhrase(summary.activeSeconds, bookTitle)}
          </p>
          <p className="mt-2 text-sm text-[var(--serene-muted)]">
            Sua leitura ficou registrada com tempo ativo, paginas e anota\u00e7\u00f5es desta sess\u00e3o.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--serene-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--serene-accent)_12%,transparent),transparent_44%),var(--serene-surface-soft)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Tempo ativo real
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {formatReadingDuration(summary.activeSeconds)}
          </p>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {summary.pausedSeconds > 0 && (
          <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
            <Clock3 className="size-5 text-[var(--serene-accent)]" />
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Pausas
            </p>
            <p className="mt-1 text-lg font-semibold">{formatReadingDuration(summary.pausedSeconds)}</p>
          </div>
        )}
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
          <BookOpen className="size-5 text-[var(--serene-accent)]" />
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Paginas
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatPageValue(summary.startPage)} - {formatPageValue(summary.endPage)}
          </p>
          <p className="mt-1 text-xs text-[var(--serene-muted)]">
            {pagesRead === null
              ? "Avan\u00e7o n\u00e3o informado"
              : `${pagesRead} ${pluralize(pagesRead, "p\u00e1gina", "p\u00e1ginas")} nesta sess\u00e3o`}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
          <Heart className="size-5 text-[var(--serene-accent)]" />
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Favoritas
          </p>
          <p className="mt-1 text-lg font-semibold">
            {annotationsLoading ? "..." : favoriteCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
          <ListChecks className="size-5 text-[var(--serene-accent)]" />
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Para revisar
          </p>
          <p className="mt-1 text-lg font-semibold">{annotationsLoading ? "..." : reviewCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Anota\u00e7\u00f5es desta sess\u00e3o</h3>
            <p className="mt-1 text-sm text-[var(--serene-muted)]">
              {annotationsLoading
                ? "Organizando o resumo..."
                : `${annotations.length} ${pluralize(annotations.length, "registro", "registros")} salvo${annotations.length === 1 ? "" : "s"}.`}
            </p>
            {!annotationsLoading && privateCount > 0 && (
              <p className="mt-1 text-xs text-[var(--serene-muted)]">
                {privateCount} {pluralize(privateCount, "anota\u00e7\u00e3o privada", "anota\u00e7\u00f5es privadas")} mantida{privateCount === 1 ? "" : "s"} discretamente no resumo.
              </p>
            )}
          </div>
          <BookMarked className="size-5 text-[var(--serene-accent)]" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {annotationsLoading ? (
            <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
              ...
            </span>
          ) : annotations.length > 0 ? (
            typeCounts.map((item) => (
              <span
                key={item.type}
                className={[
                  "rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-sm shadow-[var(--serene-shadow-soft)]",
                  item.count === 0 ? "text-[var(--serene-muted)] opacity-70" : "",
                ].join(" ")}
              >
                {item.label}: {item.count}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
              Nenhuma anota\u00e7\u00e3o registrada nesta sess\u00e3o
            </span>
          )}
        </div>
      </section>

      <SessionVocabularyPanel entries={vocabularyEntries} loading={vocabularyLoading} />

      {bookCompleted && <BookVocabularyPanel entries={bookVocabularyEntries} />}

      {reviewLaterFeedback && (
        <p className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm shadow-[var(--serene-shadow-soft)]">
          {reviewLaterFeedback}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={reviewHref}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95"
        >
          <BookOpen className="size-4" />
          Revisar anota\u00e7\u00f5es agora
        </Link>
        <button
          type="button"
          onClick={onReviewLater}
          disabled={reviewLaterLoading || annotationsLoading}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
        >
          {reviewLaterLoading ? "Guardando..." : "Revisar depois"}
        </button>
      </div>
    </div>
  );
}

export function SessionEndRitual(props: SessionEndRitualProps) {
  const [showSummary, setShowSummary] = useState(props.reducedMotion);
  const ritualNotes = props.annotations.slice(0, 5);

  useEffect(() => {
    if (props.reducedMotion || showSummary) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSummary(true);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [props.reducedMotion, showSummary]);

  if (showSummary) {
    return (
      <section className="session-end-ritual space-y-5">
        <SummaryPanel {...props} />
      </section>
    );
  }

  return (
    <section className="session-end-ritual overflow-hidden rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
            Mem\u00f3ria de leitura
          </p>
          <h2 className="mt-1 text-xl font-semibold">Guardando sua leitura dentro do livro</h2>
          <p className="literary mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
            As anota\u00e7\u00f5es desta sess\u00e3o entram como pequenos marcadores do que ficou.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSummary(true)}
          className="shrink-0 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1.5 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
        >
          Ver resumo
        </button>
      </div>

      <div className="session-ritual-stage mt-6 rounded-[2rem] border border-[color-mix(in_oklab,var(--serene-border)_76%,transparent)] bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--serene-accent)_10%,transparent),transparent_48%),var(--serene-surface-soft)] shadow-[inset_0_1px_0_rgb(255_255_255_/_40%),var(--serene-shadow-soft)] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_6%),var(--serene-shadow-soft)]">
        <div className="session-ritual-book" aria-hidden="true">
          <div className="session-ritual-page session-ritual-page-left" />
          <div className="session-ritual-page session-ritual-page-right" />
          <div className="session-ritual-spine" />
          <div className="session-ritual-cover" />

          {ritualNotes.map((annotation, index) => {
            const position = notePositions[index] ?? notePositions[0];
            const style: RitualNoteStyle = {
              "--note-delay": `${120 + index * 140}ms`,
              "--note-x": position.x,
              "--note-y": position.y,
            };

            return (
              <div
                key={annotation.id}
                className={["session-ritual-note", getRitualNoteClass(annotation.type)].join(" ")}
                style={style}
              >
                <span>{annotationTypeLabel[annotation.type]}</span>
                <p>{getNoteLabel(annotation)}</p>
              </div>
            );
          })}

          {ritualNotes.length === 0 && (
            <div
              className="session-ritual-note"
              style={{ "--note-delay": "120ms", "--note-x": "0px", "--note-y": "-142px" } as RitualNoteStyle}
            >
              <span>Leitura</span>
              <p>Tempo guardado como mem\u00f3ria</p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-[var(--serene-muted)]">
        Em instantes, o resumo aparece com tempo, paginas e anota\u00e7\u00f5es salvas.
      </p>
    </section>
  );
}
