"use client";

import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Lock,
  Map as MapIcon,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import {
  buildExportBundle,
  buildMarkdownExport,
  buildTxtExport,
  createExportFileName,
  createExportRecord,
  exportFormatLabel,
  exportIntentLabel,
  formatExportDuration,
  loadExportSourceData,
  type ExportBookRow,
  type ExportBundle,
  type ExportFormat,
  type ExportIntent,
  type ExportRecordRow,
  type ExportSessionRow,
  type ExportSourceData,
} from "@/features/export/export-services";

type IconComponent = React.ComponentType<{ className?: string }>;

type IntentOption = {
  value: ExportIntent;
  label: string;
  helper: string;
  icon: IconComponent;
};

type FormatOption = {
  value: ExportFormat;
  helper: string;
};

const intentOptions: IntentOption[] = [
  {
    value: "all",
    label: "Tudo",
    helper: "Livros, sessoes e anotacoes em um caderno organizado.",
    icon: Archive,
  },
  {
    value: "book",
    label: "Por livro",
    helper: "Um livro com suas sessoes e anotacoes.",
    icon: BookOpen,
  },
  {
    value: "period",
    label: "Por periodo",
    helper: "Memorias dentro de um intervalo de datas.",
    icon: CalendarDays,
  },
  {
    value: "reflections",
    label: "Reflexoes",
    helper: "Apenas anotacoes do tipo reflexao.",
    icon: MessageSquareText,
  },
  {
    value: "highlights",
    label: "Marca-textos",
    helper: "Trechos destacados, sem transformar cards em blocos.",
    icon: FileText,
  },
  {
    value: "post_its",
    label: "Post-its",
    helper: "Notas visuais salvas como anotacoes canonicas.",
    icon: MessageSquareText,
  },
  {
    value: "favorites",
    label: "Favoritos",
    helper: "Ideias marcadas para permanecer perto.",
    icon: Star,
  },
  {
    value: "to_review",
    label: "Para revisar",
    helper: "Anotacoes que pediram retorno.",
    icon: CheckCircle2,
  },
  {
    value: "session",
    label: "Sessao",
    helper: "Resumo de uma sessao com tempo real e pausas.",
    icon: Clock3,
  },
  {
    value: "mural",
    label: "Mural",
    helper: "Anotacoes do Mural sem duplicar conteudo.",
    icon: MapIcon,
  },
  {
    value: "study",
    label: "Para estudar",
    helper: "Destaques, perguntas, acoes, favoritos e itens para revisar.",
    icon: CheckCircle2,
  },
  {
    value: "beautiful_notebook",
    label: "Caderno bonito",
    helper: "Um arquivo mais editorial para guardar sua vida em livros.",
    icon: FileText,
  },
];

const formatOptions: FormatOption[] = [
  { value: "markdown", helper: "Arquivo .md pronto para guardar ou editar." },
  { value: "txt", helper: "Texto simples, leve e portavel." },
  { value: "pdf", helper: "Placeholder ate haver geracao nativa." },
  { value: "docx", helper: "Placeholder ate haver geracao nativa." },
];

function isDownloadableFormat(format: ExportFormat): format is Extract<ExportFormat, "markdown" | "txt"> {
  return format === "markdown" || format === "txt";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "data preservada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSessionOption(session: ExportSessionRow, booksById: Map<string, ExportBookRow>) {
  const book = booksById.get(session.book_id);
  const duration = formatExportDuration(session.active_seconds);
  return `${book?.title ?? "Livro preservado"} - ${formatDate(session.started_at)} - ${duration}`;
}

function getIntentOption(intent: ExportIntent) {
  return intentOptions.find((option) => option.value === intent) ?? intentOptions[0];
}

function hasBundleContent(bundle: ExportBundle | null) {
  return Boolean(
    bundle && (bundle.books.length > 0 || bundle.sessions.length > 0 || bundle.annotations.length > 0),
  );
}

function downloadTextFile(
  content: string,
  fileName: string,
  format: Extract<ExportFormat, "markdown" | "txt">,
) {
  const mimeType = format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildBooksById(sourceData: ExportSourceData | null) {
  return new Map((sourceData?.books ?? []).map((book) => [book.id, book]));
}

function filterBooksByPrivacy(books: ExportBookRow[], includePrivateContent: boolean) {
  return includePrivateContent
    ? books
    : books.filter((book) => !book.is_private && book.include_in_quick_exports);
}

function filterSessionsByPrivacy(
  sessions: ExportSessionRow[],
  booksById: Map<string, ExportBookRow>,
  includePrivateContent: boolean,
) {
  if (includePrivateContent) {
    return sessions;
  }

  return sessions.filter((session) => {
    const book = booksById.get(session.book_id);
    return Boolean(book && !book.is_private && book.include_in_quick_exports);
  });
}

function getRequirementMessage({
  bundle,
  format,
  intent,
  periodEnd,
  periodStart,
  selectedBookId,
  selectedSessionId,
  sourceData,
}: {
  bundle: ExportBundle | null;
  format: ExportFormat;
  intent: ExportIntent;
  periodEnd: string;
  periodStart: string;
  selectedBookId: string | null;
  selectedSessionId: string | null;
  sourceData: ExportSourceData | null;
}) {
  if (!sourceData) {
    return "Carregue suas memorias antes de exportar.";
  }

  if (!isDownloadableFormat(format)) {
    return `${exportFormatLabel[format]} esta preparado como placeholder nesta fase. Use Markdown ou TXT agora.`;
  }

  if (intent === "book" && !selectedBookId) {
    return "Escolha um livro para exportar.";
  }

  if (intent === "session" && !selectedSessionId) {
    return "Escolha uma sessao para exportar.";
  }

  if (intent === "period" && !periodStart && !periodEnd) {
    return "Escolha ao menos uma data para o periodo.";
  }

  if (!hasBundleContent(bundle)) {
    return "Nao ha conteudo para estes filtros.";
  }

  return null;
}

function Metric({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--serene-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--serene-muted)]">{helper}</p>
    </div>
  );
}

function RecentExportRow({ record }: { record: ExportRecordRow }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--serene-border)] py-3 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium">
          {exportIntentLabel[(record.export_type as ExportIntent) ?? "all"] ?? record.export_type ?? "Exportacao"}
        </p>
        <p className="text-xs text-[var(--serene-muted)]">
          {formatDate(record.created_at)} em {record.format.toUpperCase()}
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--serene-border)] px-2 py-1 text-xs text-[var(--serene-muted)]">
        {record.included_private_content ? <Lock className="size-3" /> : <ShieldCheck className="size-3" />}
        {record.included_private_content ? "Privados incluidos" : "Privados excluidos"}
      </span>
    </div>
  );
}

function BundlePreview({
  bundle,
  includePrivateContent,
}: {
  bundle: ExportBundle | null;
  includePrivateContent: boolean;
}) {
  if (!bundle) {
    return (
      <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
        <BrainLoader />
      </section>
    );
  }

  const omittedTotal =
    bundle.omitted.privateBooks + bundle.omitted.privateAnnotations + bundle.omitted.privateSessions;
  const quickExcludedTotal =
    bundle.omitted.quickExcludedBooks +
    bundle.omitted.quickExcludedAnnotations +
    bundle.omitted.quickExcludedSessions;

  return (
    <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <FileText className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            Previa
          </p>
          <h2 className="text-lg font-semibold">{bundle.title}</h2>
          <p className="mt-1 text-sm text-[var(--serene-muted)]">{bundle.description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric helper="unicos neste caderno" label="Livros" value={String(bundle.books.length)} />
        <Metric helper="tempo real registrado" label="Sessoes" value={String(bundle.sessions.length)} />
        <Metric helper="sem duplicar Mural" label="Anotacoes" value={String(bundle.annotations.length)} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric
          helper="somente sessoes registradas"
          label="Tempo real"
          value={formatExportDuration(bundle.totals.realSeconds)}
        />
        <Metric
          helper="historico estimado"
          label="Estimado"
          value={formatExportDuration(bundle.totals.estimatedHistoricalSeconds)}
        />
        <Metric
          helper="sempre aproximado"
          label="Total aprox."
          value={formatExportDuration(bundle.totals.approximateTotalSeconds)}
        />
      </div>

      {bundle.warnings.length > 0 && (
        <div className="mt-4 grid gap-2">
          {bundle.warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]"
            >
              {warning}
            </p>
          ))}
        </div>
      )}

      {bundle.strongestCategories.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]">
          Areas mais fortes:{" "}
          {bundle.strongestCategories
            .map((category) => `${category.name} (${category.bookCount})`)
            .join(", ")}
        </div>
      )}

      {!includePrivateContent && omittedTotal > 0 && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--serene-border)] px-3 py-2 text-sm text-[var(--serene-muted)]">
          <Lock className="size-4" />
          {bundle.omitted.privateBooks} livro(s), {bundle.omitted.privateAnnotations} anotacao(oes)
          e {bundle.omitted.privateSessions} sessao(oes) privadas ficaram fora.
        </p>
      )}

      {!includePrivateContent && quickExcludedTotal > 0 && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--serene-border)] px-3 py-2 text-sm text-[var(--serene-muted)]">
          <ShieldCheck className="size-4" />
          {bundle.omitted.quickExcludedBooks} livro(s), {bundle.omitted.quickExcludedAnnotations}
          {" "}anotacao(oes) e {bundle.omitted.quickExcludedSessions} sessao(oes) fora de
          exportacoes rapidas ficaram fora.
        </p>
      )}
    </section>
  );
}

export function ExportClient() {
  const { authLoading, envReady, profileState, user } = useAppState();
  const [sourceData, setSourceData] = useState<ExportSourceData | null>(null);
  const [intent, setIntent] = useState<ExportIntent>("all");
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includePrivateContent, setIncludePrivateContent] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadExports = useCallback(async () => {
    if (!user) {
      setSourceData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await loadExportSourceData(user.id);
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Nao foi possivel carregar as memorias para exportar.");
      return;
    }

    setSourceData(result.data);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadExports();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadExports]);

  const booksById = useMemo(() => buildBooksById(sourceData), [sourceData]);
  const availableBooks = useMemo(
    () => filterBooksByPrivacy(sourceData?.books ?? [], includePrivateContent),
    [includePrivateContent, sourceData?.books],
  );
  const availableSessions = useMemo(
    () => filterSessionsByPrivacy(sourceData?.sessions ?? [], booksById, includePrivateContent),
    [booksById, includePrivateContent, sourceData?.sessions],
  );

  const effectiveBookId = useMemo(() => {
    if (intent === "book") {
      return selectedBookId && availableBooks.some((book) => book.id === selectedBookId)
        ? selectedBookId
        : availableBooks[0]?.id ?? null;
    }

    if (intent === "mural") {
      return selectedBookId && availableBooks.some((book) => book.id === selectedBookId)
        ? selectedBookId
        : null;
    }

    return null;
  }, [availableBooks, intent, selectedBookId]);

  const effectiveSessionId = useMemo(() => {
    if (intent !== "session") {
      return null;
    }

    return selectedSessionId && availableSessions.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : availableSessions[0]?.id ?? null;
  }, [availableSessions, intent, selectedSessionId]);

  const filters = useMemo(
    () => ({
      intent,
      bookId: effectiveBookId,
      sessionId: effectiveSessionId,
      periodStart,
      periodEnd,
      includePrivateContent,
    }),
    [effectiveBookId, effectiveSessionId, includePrivateContent, intent, periodEnd, periodStart],
  );

  const bundle = useMemo(
    () => (sourceData ? buildExportBundle(sourceData, filters) : null),
    [filters, sourceData],
  );

  const requirementMessage = useMemo(
    () =>
      getRequirementMessage({
        bundle,
        format,
        intent,
        periodEnd,
        periodStart,
        selectedBookId: effectiveBookId,
        selectedSessionId: effectiveSessionId,
        sourceData,
      }),
    [bundle, effectiveBookId, effectiveSessionId, format, intent, periodEnd, periodStart, sourceData],
  );

  const selectedIntent = getIntentOption(intent);
  const SelectedIntentIcon = selectedIntent.icon;

  async function handleGenerateExport() {
    setFeedback(null);
    setError(null);

    if (!user || !bundle || !sourceData) {
      return;
    }

    if (requirementMessage) {
      setFeedback(requirementMessage);
      return;
    }

    if (!isDownloadableFormat(format)) {
      setFeedback(`${exportFormatLabel[format]} fica reservado como placeholder por enquanto.`);
      return;
    }

    const generatedAt = new Date();
    const fileName = createExportFileName(format, intent);
    const content =
      format === "markdown"
        ? buildMarkdownExport(bundle, filters, generatedAt)
        : buildTxtExport(bundle, filters, generatedAt);

    setExporting(true);
    const recordResult = await createExportRecord({
      userId: user.id,
      format,
      filters,
      fileName,
      bundle,
    });
    setExporting(false);

    if (recordResult.error) {
      setError(recordResult.error.message);
      return;
    }

    downloadTextFile(content, fileName, format);
    setFeedback(`Seu caderno de leitura esta pronto: ${fileName}`);
    await loadExports();
  }

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para preparar exportacoes.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando Exportar...</p>
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
            Exportar
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Seu caderno fora do SERENE</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Escolha o que deseja guardar fora do SERENE. Essas paginas preservam sua vida em livros
            com privacidade clara e tempo real separado das estimativas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadExports()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </button>
      </header>

      {feedback && (
        <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {loading || !sourceData ? (
        <section className="grid min-h-64 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Organizando seu caderno...</p>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                  <SelectedIntentIcon className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                    Intencao
                  </p>
                  <h2 className="text-lg font-semibold">{selectedIntent.label}</h2>
                  <p className="mt-1 text-sm text-[var(--serene-muted)]">{selectedIntent.helper}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-1 text-sm">
                  Tipo de exportacao
                  <select
                    className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                    value={intent}
                    onChange={(event) => {
                      setIntent(event.target.value as ExportIntent);
                      setFeedback(null);
                    }}
                  >
                    {intentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {(intent === "book" || intent === "mural") && (
                  <label className="grid gap-1 text-sm">
                    {intent === "mural" ? "Livro do Mural (opcional)" : "Livro"}
                    <select
                      className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                      value={effectiveBookId ?? ""}
                      onChange={(event) => setSelectedBookId(event.target.value || null)}
                    >
                      {intent === "mural" && <option value="">Todos os Murais encontrados</option>}
                      {intent === "book" && availableBooks.length === 0 && (
                        <option value="">Nenhum livro disponivel</option>
                      )}
                      {availableBooks.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.title}
                          {book.is_private ? " (privado)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {intent === "period" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      Inicio
                      <input
                        type="date"
                        className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                        value={periodStart}
                        onChange={(event) => setPeriodStart(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Fim
                      <input
                        type="date"
                        className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                        value={periodEnd}
                        onChange={(event) => setPeriodEnd(event.target.value)}
                      />
                    </label>
                  </div>
                )}

                {intent === "session" && (
                  <label className="grid gap-1 text-sm">
                    Sessao
                    <select
                      className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                      value={effectiveSessionId ?? ""}
                      onChange={(event) => setSelectedSessionId(event.target.value || null)}
                    >
                      {availableSessions.length === 0 && (
                        <option value="">Nenhuma sessao disponivel</option>
                      )}
                      {availableSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {formatSessionOption(session, booksById)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                  <Download className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                    Arquivo
                  </p>
                  <h2 className="text-lg font-semibold">Formato e privacidade</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {formatOptions.map((option) => {
                  const selected = format === option.value;
                  const placeholder = !isDownloadableFormat(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormat(option.value);
                        setFeedback(null);
                      }}
                      className={[
                        "rounded-lg border p-3 text-left transition",
                        selected
                          ? "border-[var(--serene-accent)] bg-[var(--serene-surface-soft)]"
                          : "border-[var(--serene-border)]",
                      ].join(" ")}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{exportFormatLabel[option.value]}</span>
                        {placeholder && (
                          <span className="rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
                            Placeholder
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block text-xs text-[var(--serene-muted)]">
                        {option.helper}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 flex items-start justify-between gap-4 border-t border-[var(--serene-border)] pt-4">
                <span>
                  <span className="block text-sm font-medium">
                    Incluir conteudo privado nesta exportacao
                  </span>
                  <span className="mt-1 block text-xs text-[var(--serene-muted)]">
                    Desligado por padrao. Ligue apenas quando quiser incluir livros e anotacoes
                    privadas neste arquivo.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={includePrivateContent}
                  onChange={(event) => setIncludePrivateContent(event.target.checked)}
                />
              </label>

              {requirementMessage && (
                <p className="mt-4 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]">
                  {requirementMessage}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleGenerateExport()}
                disabled={exporting || Boolean(requirementMessage)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Download className="size-4" />
                {exporting ? "Preparando..." : "Exportar caderno"}
              </button>
            </section>
          </div>

          <div className="space-y-5">
            <BundlePreview bundle={bundle} includePrivateContent={includePrivateContent} />

            <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                    Registro
                  </p>
                  <h2 className="text-lg font-semibold">Exportacoes recentes</h2>
                  <p className="mt-1 text-sm text-[var(--serene-muted)]">
                    Cada arquivo gerado registra formato, intencao e decisao de privacidade.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {sourceData.recentExports.length === 0 ? (
                  <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]">
                    Nenhuma exportacao registrada ainda.
                  </p>
                ) : (
                  sourceData.recentExports.map((record) => (
                    <RecentExportRow key={record.id} record={record} />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
