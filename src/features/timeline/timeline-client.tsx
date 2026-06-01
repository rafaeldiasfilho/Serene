"use client";

import Link from "next/link";
import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  Heart,
  Lock,
  Map as MapIcon,
  MessageSquareText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import type { AnnotationType, Json } from "@/lib/supabase/database.types";
import {
  groupTimelineEventsByMonth,
  loadTimelineSourceData,
  type TimelineAnnotationRow,
  type TimelineBookRow,
  type TimelineEventRow,
  type TimelineSessionRow,
  type TimelineSourceData,
} from "@/features/timeline/timeline-services";

type IconComponent = ComponentType<{ className?: string }>;

type EventMeta = {
  icon: IconComponent;
  label: string;
  tone: string;
};

type JsonObject = Record<string, Json | undefined>;

const eventTypeMeta: Record<string, EventMeta> = {
  book_added: {
    icon: BookOpen,
    label: "Livro na Biblioteca",
    tone: "Biblioteca",
  },
  historical_book_added: {
    icon: Archive,
    label: "Historico de leitura",
    tone: "Estimado",
  },
  book_started: {
    icon: BookOpen,
    label: "Leitura iniciada",
    tone: "Sessao",
  },
  session_finished: {
    icon: CheckCircle2,
    label: "Sessao finalizada",
    tone: "Tempo real",
  },
  book_completed: {
    icon: Sparkles,
    label: "Livro concluido",
    tone: "Biblioteca",
  },
  annotation_created: {
    icon: MessageSquareText,
    label: "Anotacao criada",
    tone: "Memoria",
  },
  annotation_edited: {
    icon: MessageSquareText,
    label: "Anotacao editada",
    tone: "Memoria",
  },
  annotation_favorited: {
    icon: Heart,
    label: "Anotacao favorita",
    tone: "Memoria",
  },
  annotation_reviewed: {
    icon: CheckCircle2,
    label: "Anotacao revisada",
    tone: "Revisao",
  },
  reading_milestone: {
    icon: Clock3,
    label: "Marco de leitura",
    tone: "Tempo real",
  },
  reading_time_milestone: {
    icon: Clock3,
    label: "Marco de leitura",
    tone: "Tempo real",
  },
  mural_used: {
    icon: MapIcon,
    label: "Mural usado",
    tone: "Ideias",
  },
  export_created: {
    icon: FileDown,
    label: "Exportacao criada",
    tone: "Controle",
  },
};

const annotationTypeLabels: Record<AnnotationType, string> = {
  quick_note: "Anotacao rapida",
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

function fallbackEventMeta(eventType: string): EventMeta {
  return {
    icon: CalendarDays,
    label: eventType.replaceAll("_", " "),
    tone: "Memoria",
  };
}

function asMetadataObject(value: Json | null): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function getNumber(metadata: JsonObject, key: string) {
  const value = metadata[key];
  return typeof value === "number" ? value : null;
}

function getString(metadata: JsonObject, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0min";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes}min`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatEventDate(value: string) {
  const date = parseDate(value);
  if (!date) {
    return "Data preservada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSessionDate(value: string) {
  const date = parseDate(value);
  if (!date) {
    return "sessao registrada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildMap<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function canRevealBook(book: TimelineBookRow | null) {
  return Boolean(book && !book.is_private && book.show_in_mente && !book.deleted_at);
}

function canRevealAnnotation(
  annotation: TimelineAnnotationRow | null,
  book: TimelineBookRow | null,
) {
  return Boolean(
    annotation &&
      !annotation.is_private &&
      !annotation.deleted_at &&
      (!book || canRevealBook(book)),
  );
}

function isSensitiveEvent(book: TimelineBookRow | null, annotation: TimelineAnnotationRow | null) {
  return Boolean(
    book?.is_private ||
      book?.show_in_mente === false ||
      book?.deleted_at ||
      annotation?.is_private ||
      annotation?.deleted_at,
  );
}

function isDeletedContext(
  book: TimelineBookRow | null,
  session: TimelineSessionRow | null,
  annotation: TimelineAnnotationRow | null,
) {
  return Boolean(book?.deleted_at || session?.deleted_at || annotation?.deleted_at);
}

function timeChips({
  book,
  event,
  metadata,
}: {
  book: TimelineBookRow | null;
  event: TimelineEventRow;
  metadata: JsonObject;
}) {
  const chips: Array<{ label: string; value: string }> = [];
  const activeSeconds = getNumber(metadata, "active_seconds");
  const pausedSeconds = getNumber(metadata, "paused_seconds");
  const milestoneSeconds = getNumber(metadata, "milestone_seconds");
  const eventType = getString(metadata, "type");
  const estimatedSeconds =
    getNumber(metadata, "estimated_seconds") ??
    (event.event_type === "historical_book_added" ? book?.estimated_reading_seconds ?? null : null);

  if (activeSeconds !== null && activeSeconds > 0) {
    chips.push({
      label: "Tempo real desta sessao",
      value: formatDuration(activeSeconds),
    });
  }

  if (milestoneSeconds !== null && milestoneSeconds > 0) {
    chips.push({
      label: eventType === "real_time" ? "Tempo real acumulado" : "Marco de tempo",
      value: formatDuration(milestoneSeconds),
    });
  }

  if (estimatedSeconds !== null && estimatedSeconds > 0) {
    chips.push({
      label: "Historico estimado",
      value: `${formatDuration(estimatedSeconds)} aproximado`,
    });
  }

  if (pausedSeconds !== null && pausedSeconds > 0) {
    chips.push({
      label: "Pausas registradas",
      value: formatDuration(pausedSeconds),
    });
  }

  return chips;
}

function visibleBookTitle(book: TimelineBookRow | null) {
  if (!book) {
    return null;
  }

  return canRevealBook(book) ? book.title : null;
}

function annotationLabel(annotation: TimelineAnnotationRow | null, book: TimelineBookRow | null) {
  if (!annotation || !canRevealAnnotation(annotation, book)) {
    return "anotacao";
  }

  return annotationTypeLabels[annotation.type].toLowerCase();
}

function buildEventCopy({
  annotation,
  book,
  event,
  metadata,
  session,
}: {
  annotation: TimelineAnnotationRow | null;
  book: TimelineBookRow | null;
  event: TimelineEventRow;
  metadata: JsonObject;
  session: TimelineSessionRow | null;
}) {
  const title = visibleBookTitle(book);
  const annotationText = annotationLabel(annotation, book);
  const endPage = getNumber(metadata, "end_page") ?? session?.end_page ?? null;
  const sensitive = isSensitiveEvent(book, annotation);

  if (event.event_type === "book_added") {
    return {
      title: title ? `${title} entrou na Biblioteca` : "Um livro entrou na Biblioteca",
      description: title
        ? `Voce adicionou ${title} a sua Biblioteca.`
        : "Voce adicionou um livro a sua Biblioteca.",
    };
  }

  if (event.event_type === "historical_book_added") {
    return {
      title: title ? `${title} entrou no seu historico` : "Um livro entrou no seu historico",
      description: title
        ? `${title} foi guardado como leitura historica estimada.`
        : "Um livro foi guardado como leitura historica estimada.",
    };
  }

  if (event.event_type === "book_started") {
    return {
      title: title ? `Voce comecou ${title}` : "Voce iniciou uma leitura",
      description: "Uma sessao comecou sem pressa, com tempo real separado das estimativas.",
    };
  }

  if (event.event_type === "session_finished") {
    return {
      title: "Voce finalizou uma sessao de leitura",
      description:
        endPage !== null
          ? `A sessao foi concluida e a pagina ${endPage} ficou registrada.`
          : "A sessao foi concluida e o tempo real ficou registrado.",
    };
  }

  if (event.event_type === "book_completed") {
    return {
      title: title ? `Voce concluiu ${title}` : "Voce concluiu um livro",
      description: "Esse momento ficou guardado como parte da sua vida de leitura.",
    };
  }

  if (event.event_type === "annotation_created") {
    return {
      title:
        annotation?.type === "reflection"
          ? "Uma reflexao importante foi guardada"
          : `Uma ${annotationText} foi guardada`,
      description: title
        ? `A anotacao ficou ligada a ${title}.`
        : "A anotacao ficou salva para quando voce quiser voltar a ela.",
    };
  }

  if (event.event_type === "annotation_favorited") {
    return {
      title: "Voce marcou uma ideia como favorita",
      description: "Um pensamento ganhou destaque para permanecer mais perto.",
    };
  }

  if (event.event_type === "reading_time_milestone") {
    return {
      title: "Mais tempo dedicado aos livros foi registrado",
      description: "Esse marco preserva tempo de leitura sem transformar isso em cobranca.",
    };
  }

  if (event.event_type === "mural_used") {
    return {
      title: "Voce abriu o Mural durante uma leitura",
      description: "O espaco de ideias foi usado sem interromper o contador da sessao.",
    };
  }

  if (event.event_type === "export_created") {
    return {
      title: "Uma exportacao foi concluida",
      description: "Um registro de leitura foi preparado com controle do usuario.",
    };
  }

  return {
    title: sensitive ? "Memoria de leitura preservada" : event.title?.trim() || "Memoria de leitura",
    description: sensitive
      ? "Um momento foi preservado sem expor conteudo reservado."
      : event.description?.trim() || "Um momento de leitura ficou preservado.",
  };
}

function ContextPills({
  annotation,
  book,
  event,
  session,
}: {
  annotation: TimelineAnnotationRow | null;
  book: TimelineBookRow | null;
  event: TimelineEventRow;
  session: TimelineSessionRow | null;
}) {
  const missingBook = Boolean(event.book_id && !book);
  const missingSession = Boolean(event.session_id && !session);
  const missingAnnotation = Boolean(event.annotation_id && !annotation);
  const bookTitle = visibleBookTitle(book);
  const annotationVisible = canRevealAnnotation(annotation, book);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {book && (
        <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1 text-xs">
          Livro: {bookTitle ?? "reservado"}
        </span>
      )}
      {session && (
        <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1 text-xs">
          Sessao de {formatSessionDate(session.started_at)}
          {session.end_page !== null ? ` ate pag. ${session.end_page}` : ""}
        </span>
      )}
      {annotation && (
        <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1 text-xs">
          {annotationVisible ? annotationTypeLabels[annotation.type] : "Anotacao reservada"}
          {annotationVisible && annotation.page_number !== null ? ` na pag. ${annotation.page_number}` : ""}
        </span>
      )}
      {(missingBook || missingSession || missingAnnotation) && (
        <span className="rounded-full border border-[var(--serene-border)] px-3 py-1 text-xs text-[var(--serene-muted)]">
          Um vinculo antigo foi preservado sem abrir conteudo indisponivel.
        </span>
      )}
    </div>
  );
}

function ActionLinks({
  annotation,
  book,
  session,
}: {
  annotation: TimelineAnnotationRow | null;
  book: TimelineBookRow | null;
  session: TimelineSessionRow | null;
}) {
  const links: Array<{ href: string; label: string; icon: IconComponent }> = [];

  if (book && (canRevealBook(book) || book.deleted_at)) {
    links.push({
      href: book.deleted_at ? "/lixeira" : "/biblioteca",
      label: book.deleted_at ? "Ver na Lixeira" : "Ver Biblioteca",
      icon: book.deleted_at ? Archive : BookOpen,
    });
  }

  if (annotation && (canRevealAnnotation(annotation, book) || annotation.deleted_at)) {
    links.push({
      href: annotation.deleted_at ? "/lixeira" : "/anotacoes",
      label: annotation.deleted_at ? "Anotacao na Lixeira" : "Ver Anotacoes",
      icon: annotation.deleted_at ? Archive : MessageSquareText,
    });
  }

  if (session && !session.deleted_at) {
    links.push({
      href: "/mente#evolucao",
      label: "Contexto da sessao",
      icon: Clock3,
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs font-medium"
          >
            <Icon className="size-3.5" />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

function TimelineEventCard({
  annotation,
  book,
  event,
  session,
}: {
  annotation: TimelineAnnotationRow | null;
  book: TimelineBookRow | null;
  event: TimelineEventRow;
  session: TimelineSessionRow | null;
}) {
  const metadata = asMetadataObject(event.metadata);
  const eventMeta = eventTypeMeta[event.event_type] ?? fallbackEventMeta(event.event_type);
  const Icon = eventMeta.icon;
  const chips = timeChips({ book, event, metadata });
  const eventCopy = buildEventCopy({ annotation, book, event, metadata, session });
  const sensitiveEvent = isSensitiveEvent(book, annotation);
  const deletedContext = isDeletedContext(book, session, annotation);
  const annotationPreview =
    canRevealAnnotation(annotation, book) ? annotation?.content?.trim().slice(0, 140) ?? "" : "";

  return (
    <article
      id={`evento-${event.id}`}
      className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
            <Icon className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                {eventMeta.label}
              </span>
              <span className="rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
                {eventMeta.tone}
              </span>
              {sensitiveEvent && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
                  <Lock className="size-3" />
                  Reservado
                </span>
              )}
              {deletedContext && (
                <span className="rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
                  Na Lixeira
                </span>
              )}
            </div>
            <h3 className="mt-2 text-lg font-semibold">{eventCopy.title}</h3>
          </div>
        </div>
        <time className="text-sm text-[var(--serene-muted)]" dateTime={event.created_at}>
          {formatEventDate(event.created_at)}
        </time>
      </div>

      <p className="literary mt-3 max-w-3xl text-sm leading-6 text-[var(--serene-muted)]">
        {eventCopy.description}
      </p>

      {annotationPreview && (
        <p className="mt-3 max-w-3xl rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]">
          {annotationPreview}
          {annotationPreview.length >= 140 ? "..." : ""}
        </p>
      )}

      <ContextPills annotation={annotation} book={book} event={event} session={session} />

      {chips.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chips.map((chip) => (
            <div
              key={`${chip.label}-${chip.value}`}
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2"
            >
              <p className="text-xs text-[var(--serene-muted)]">{chip.label}</p>
              <p className="mt-1 text-sm font-semibold">{chip.value}</p>
            </div>
          ))}
        </div>
      )}

      <ActionLinks annotation={annotation} book={book} session={session} />
    </article>
  );
}

function TimelineEmptyState() {
  return (
    <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
      <CalendarDays className="size-8 text-[var(--serene-accent)]" />
      <h2 className="mt-3 text-xl font-semibold">Linha do tempo tranquila por enquanto</h2>
      <p className="mt-2 max-w-xl text-sm text-[var(--serene-muted)]">
        Sua linha do tempo comecara a aparecer conforme voce le, anota e guarda momentos
        importantes.
      </p>
    </section>
  );
}

export function TimelineClient() {
  const { authLoading, envReady, profileState, user } = useAppState();
  const [sourceData, setSourceData] = useState<TimelineSourceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    if (!user) {
      setSourceData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await loadTimelineSourceData(user.id);
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Nao foi possivel carregar a linha do tempo.");
      return;
    }

    setSourceData(result.data);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTimeline();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTimeline]);

  const bookById = useMemo(() => buildMap(sourceData?.books ?? []), [sourceData?.books]);
  const sessionById = useMemo(() => buildMap(sourceData?.sessions ?? []), [sourceData?.sessions]);
  const annotationById = useMemo(
    () => buildMap(sourceData?.annotations ?? []),
    [sourceData?.annotations],
  );
  const monthGroups = useMemo(
    () => groupTimelineEventsByMonth(sourceData?.events ?? []),
    [sourceData?.events],
  );
  const reservedEventCount = useMemo(() => {
    if (!sourceData) {
      return 0;
    }

    return sourceData.events.filter((event) => {
      const session = event.session_id ? sessionById.get(event.session_id) ?? null : null;
      const annotation = event.annotation_id
        ? annotationById.get(event.annotation_id) ?? null
        : null;
      const bookId = event.book_id ?? session?.book_id ?? annotation?.book_id ?? null;
      const book = bookId ? bookById.get(bookId) ?? null : null;
      return isSensitiveEvent(book, annotation);
    }).length;
  }, [annotationById, bookById, sessionById, sourceData]);

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para carregar a Linha do tempo.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo sua memoria de leitura...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Linha do tempo
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Sua vida de leitura no tempo</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Uma memoria cronologica, sem metas e sem cobranca. Tempo real registrado e historico
            estimado aparecem separados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTimeline()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
          <Link
            href="/mente"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
          >
            <Sparkles className="size-4" />
            Voltar para Mente
          </Link>
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {loading || !sourceData ? (
        <section className="grid min-h-64 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Organizando memorias por mes...</p>
          </div>
        </section>
      ) : sourceData.events.length === 0 ? (
        <TimelineEmptyState />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Memorias
              </p>
              <p className="mt-2 text-2xl font-semibold">{sourceData.events.length}</p>
              <p className="mt-1 text-xs text-[var(--serene-muted)]">Eventos preservados.</p>
            </article>
            <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Meses
              </p>
              <p className="mt-2 text-2xl font-semibold">{monthGroups.length}</p>
              <p className="mt-1 text-xs text-[var(--serene-muted)]">Agrupados para leitura calma.</p>
            </article>
            <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                Privacidade
              </p>
              <p className="mt-2 text-2xl font-semibold">{reservedEventCount}</p>
              <p className="mt-1 text-xs text-[var(--serene-muted)]">
                Itens privados ou ocultos ficam sem preview.
              </p>
            </article>
          </section>

          <div className="space-y-8">
            {monthGroups.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex flex-col gap-1 border-b border-[var(--serene-border)] pb-3 md:flex-row md:items-end md:justify-between">
                  <h2 className="text-xl font-semibold">{group.label}</h2>
                  <p className="text-sm text-[var(--serene-muted)]">
                    {group.events.length} registro(s) de leitura
                  </p>
                </div>

                <div className="grid gap-3">
                  {group.events.map((event) => {
                    const session = event.session_id
                      ? sessionById.get(event.session_id) ?? null
                      : null;
                    const annotation = event.annotation_id
                      ? annotationById.get(event.annotation_id) ?? null
                      : null;
                    const bookId = event.book_id ?? session?.book_id ?? annotation?.book_id ?? null;
                    const book = bookId ? bookById.get(bookId) ?? null : null;

                    return (
                      <TimelineEventCard
                        key={event.id}
                        event={event}
                        book={book}
                        session={session}
                        annotation={annotation}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
