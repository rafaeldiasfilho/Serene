"use client";

import {
  Brain,
  CheckSquare,
  Flag,
  HelpCircle,
  Highlighter,
  Lightbulb,
  Map as MapIcon,
  NotebookPen,
  Quote,
  StickyNote,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { isEditableShortcutTarget } from "@/lib/shortcuts";
import {
  annotationReviewOptions,
  annotationTypeLabel,
  computeTextColor,
  primaryAnnotationTypeOptions,
} from "@/features/annotations/annotation-definitions";
import type { AnnotationColorOption } from "@/features/annotations/use-annotations";
import type { AnnotationRow, AnnotationBookRow } from "@/features/annotations/annotation-services";
import type {
  AnnotationOrigin,
  AnnotationReviewStatus,
  AnnotationType,
} from "@/lib/supabase/database.types";

export type AnnotationModalSubmitValue = {
  type: AnnotationType;
  content: string;
  bookId: string | null;
  sessionId: string | null;
  pageNumber: number | null;
  color: string | null;
  textColor: string | null;
  highlightColor: string | null;
  isFavorite: boolean;
  isPrivate: boolean;
  reviewStatus: AnnotationReviewStatus;
  origin: AnnotationOrigin;
};

type AnnotationModalProps = {
  mode: "create" | "edit";
  books: AnnotationBookRow[];
  colors: AnnotationColorOption[];
  initialAnnotation?: AnnotationRow | null;
  lockedBookId?: string | null;
  lockedSessionId?: string | null;
  forcedOrigin?: AnnotationOrigin;
  defaultType?: AnnotationType;
  defaultContent?: string;
  defaultPageNumber?: number | null;
  onClose: () => void;
  onOpenMural?: () => void;
  onSubmit: (value: AnnotationModalSubmitValue) => Promise<{ ok: boolean; message: string | null }>;
};

type FormState = {
  type: AnnotationType;
  content: string;
  bookId: string | null;
  sessionId: string | null;
  pageNumber: string;
  color: string;
  highlightColor: string;
  isFavorite: boolean;
  isPrivate: boolean;
  reviewStatus: AnnotationReviewStatus;
  origin: AnnotationOrigin;
};

const typeShortcutMap: Partial<Record<string, AnnotationType>> = {
  q: "quick_note",
  m: "highlight",
  p: "post_it",
  r: "reflection",
};

const annotationTypeIcons: Record<AnnotationType, LucideIcon> = {
  quick_note: NotebookPen,
  reflection: Quote,
  highlight: Highlighter,
  post_it: StickyNote,
  flag: Flag,
  doubt: HelpCircle,
  thought: Brain,
  idea: Lightbulb,
  action: CheckSquare,
  ocr_page: NotebookPen,
};

const annotationTypeHints: Record<AnnotationType, string> = {
  quick_note: "Nota simples, direta e leve.",
  reflection: "Uma frase interna, mais literaria.",
  highlight: "Um trecho marcado, sem virar bloco pesado.",
  post_it: "Um lembrete fisico, como colado na leitura.",
  flag: "Um sinal para voltar depois.",
  doubt: "Uma pergunta guardada com calma.",
  thought: "Um pensamento que apareceu durante a leitura.",
  idea: "Uma conexao ou insight.",
  action: "Algo pequeno para fazer depois.",
  ocr_page: "Texto vindo de uma captura revisada.",
};

function getPreviewClass(type: AnnotationType) {
  if (type === "post_it") {
    return "annotation-post-it-preview border-black/10";
  }
  if (type === "reflection" || type === "thought") {
    return "annotation-reflection-bubble border-[color-mix(in_oklab,var(--serene-border)_72%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,var(--serene-surface-soft)_18%)]";
  }
  if (type === "highlight") {
    return "annotation-highlight-frame border-dashed border-[color-mix(in_oklab,var(--serene-accent)_48%,var(--serene-border)_52%)] bg-[color-mix(in_oklab,var(--serene-surface)_88%,transparent)]";
  }
  if (type === "flag") {
    return "border-l-4 border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_86%,var(--serene-surface-soft)_14%)]";
  }
  return "border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_88%,transparent)]";
}

function getPreviewStyle(type: AnnotationType, color: string, textColor: string | null) {
  if (type === "post_it") {
    return {
      backgroundColor: color,
      color: textColor ?? "#2B2B2B",
      boxShadow: "2px 5px 0 rgb(0 0 0 / 6%), var(--serene-shadow-soft)",
      transform: "rotate(-0.25deg)",
    };
  }

  return undefined;
}

function getDefaultColor(colors: AnnotationColorOption[]) {
  return colors.find((color) => color.is_default)?.color_hex ?? colors[0]?.color_hex ?? "#F7E78A";
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.floor(parsed));
}

function isRetroactiveBook(book: AnnotationBookRow | undefined) {
  if (!book) {
    return false;
  }

  return book.status === "lido" || book.reading_origin === "historico" || book.read_before_serene;
}

function inferOrigin(
  mode: "create" | "edit",
  state: FormState,
  selectedBook: AnnotationBookRow | undefined,
  lockedSessionId: string | null | undefined,
  forcedOrigin: AnnotationOrigin | undefined,
) {
  if (forcedOrigin) {
    return forcedOrigin;
  }

  if (mode === "edit") {
    return lockedSessionId ? "reading" : state.origin;
  }

  if (lockedSessionId || state.sessionId) {
    return "reading";
  }
  if (state.type === "ocr_page") {
    return "ocr";
  }
  if (isRetroactiveBook(selectedBook)) {
    return "retroactive";
  }
  return "manual";
}

function createInitialFormState(
  mode: "create" | "edit",
  colors: AnnotationColorOption[],
  initialAnnotation: AnnotationRow | null | undefined,
  lockedBookId: string | null | undefined,
  lockedSessionId: string | null | undefined,
  forcedOrigin: AnnotationOrigin | undefined,
  defaultType: AnnotationType | undefined,
  defaultContent: string | undefined,
  defaultPageNumber: number | null | undefined,
) {
  const defaultColor = getDefaultColor(colors);
  const source = initialAnnotation;

  if (mode === "edit" && source) {
    return {
      type: source.type,
      content: source.content ?? "",
      bookId: lockedBookId ?? source.book_id,
      sessionId: lockedSessionId ?? source.session_id,
      pageNumber: source.page_number === null ? "" : String(source.page_number),
      color: source.color ?? defaultColor,
      highlightColor: source.highlight_color ?? defaultColor,
      isFavorite: source.is_favorite,
      isPrivate: source.is_private,
      reviewStatus: source.review_status,
      origin: forcedOrigin ?? source.origin,
    } satisfies FormState;
  }

  return {
    type: defaultType ?? "quick_note",
    content: defaultContent ?? "",
    bookId: lockedBookId ?? null,
    sessionId: lockedSessionId ?? null,
    pageNumber: defaultPageNumber === null || defaultPageNumber === undefined ? "" : String(defaultPageNumber),
    color: defaultColor,
    highlightColor: defaultColor,
    isFavorite: false,
    isPrivate: false,
    reviewStatus: "none",
    origin: forcedOrigin ?? (lockedSessionId ? "reading" : "manual"),
  } satisfies FormState;
}

function getOriginLabel(origin: AnnotationOrigin) {
  if (origin === "reading") {
    return "leitura";
  }
  if (origin === "retroactive") {
    return "retroativa";
  }
  if (origin === "mural") {
    return "mural";
  }
  if (origin === "camera") {
    return "camera";
  }
  if (origin === "ocr") {
    return "ocr";
  }
  return "manual";
}

export function AnnotationModal({
  mode,
  books,
  colors,
  initialAnnotation = null,
  lockedBookId,
  lockedSessionId,
  forcedOrigin,
  defaultType,
  defaultContent,
  defaultPageNumber,
  onClose,
  onOpenMural,
  onSubmit,
}: AnnotationModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(
      mode,
      colors,
      initialAnnotation,
      lockedBookId,
      lockedSessionId,
      forcedOrigin,
      defaultType,
      defaultContent,
      defaultPageNumber,
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBook = useMemo(() => {
    return books.find((book) => book.id === form.bookId);
  }, [books, form.bookId]);

  const computedOrigin = useMemo(() => {
    return inferOrigin(mode, form, selectedBook, lockedSessionId, forcedOrigin);
  }, [forcedOrigin, form, lockedSessionId, mode, selectedBook]);

  const visibleTypeOptions = useMemo(() => {
    const options = [...primaryAnnotationTypeOptions];
    const currentType = initialAnnotation?.type ?? defaultType ?? form.type;
    const shouldShowPreservedType =
      mode === "edit" &&
      currentType &&
      !options.some((option) => option.value === currentType);
    const shouldShowOcrType =
      defaultType === "ocr_page" ||
      initialAnnotation?.type === "ocr_page" ||
      form.type === "ocr_page";

    if (currentType && shouldShowPreservedType) {
      options.push({
        value: currentType,
        label: `Preservado: ${annotationTypeLabel[currentType]}`,
      });
    }

    if (shouldShowOcrType && !options.some((option) => option.value === "ocr_page")) {
      options.push({ value: "ocr_page", label: "Pagina OCR" });
    }

    return options;
  }, [defaultType, form.type, initialAnnotation?.type, mode]);

  const selectableColors = useMemo(() => {
    if (form.type === "highlight") {
      return colors.filter((color) => color.applies_to === null || color.applies_to === "highlight");
    }
    return colors;
  }, [colors, form.type]);
  const currentColor = form.type === "highlight" ? form.highlightColor : form.color;
  const currentTextColor = form.type === "highlight" ? "#2B2B2B" : computeTextColor(currentColor);
  const ActiveTypeIcon = annotationTypeIcons[form.type] ?? NotebookPen;

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    const trimmedContent = form.content.trim();
    if (!trimmedContent) {
      setError("Escreva algo antes de salvar a anotacao.");
      return;
    }

    const parsedPage = toOptionalNumber(form.pageNumber);
    if (form.pageNumber.trim() && parsedPage === null) {
      setError("Informe uma pagina valida.");
      return;
    }

    setSaving(true);
    setError(null);

    const submittedColor = form.type === "highlight" ? form.highlightColor : form.color;
    const result = await onSubmit({
      type: form.type,
      content: trimmedContent,
      bookId: lockedBookId ?? form.bookId,
      sessionId: lockedSessionId ?? form.sessionId,
      pageNumber: parsedPage,
      color: form.type === "highlight" ? null : submittedColor,
      textColor: form.type === "highlight" ? null : computeTextColor(submittedColor),
      highlightColor: form.type === "highlight" ? submittedColor : null,
      isFavorite: form.isFavorite,
      isPrivate: form.isPrivate,
      reviewStatus: form.reviewStatus,
      origin: computedOrigin,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message ?? "Nao foi possivel salvar a anotacao.");
      return;
    }

    onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !saving) {
      event.preventDefault();
      onClose();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "Enter" || event.key.toLowerCase() === "s")) {
      event.preventDefault();
      if (!saving) {
        void handleSubmit();
      }
      return;
    }

    if (isEditableShortcutTarget(event.target)) {
      return;
    }

    const nextType = typeShortcutMap[event.key.toLowerCase()];
    if (nextType && visibleTypeOptions.some((option) => option.value === nextType)) {
      event.preventDefault();
      updateForm("type", nextType);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm"
      onKeyDown={handleDialogKeyDown}
    >
      <section
        className="serene-soft-in max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-lift)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-modal-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              {mode === "create" ? "Nova anotacao" : "Editar anotacao"}
            </p>
            <h2 id="annotation-modal-title" className="mt-1 text-xl font-semibold">
              {mode === "create" ? "Capture esta ideia com leveza" : "Ajuste sua anotacao"}
            </h2>
            <p className="mt-1 text-sm text-[var(--serene-muted)]">
              Tipo padrao: Anotacao Rapida. Voce pode trocar o tipo nesta mesma janela.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] transition hover:border-[var(--serene-accent)] hover:text-[var(--serene-fg)]"
            aria-label="Fechar janela de anotacao"
            disabled={saving}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Tipo de anotacao
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTypeOptions.map((option) => {
                const Icon = annotationTypeIcons[option.value] ?? NotebookPen;
                const selected = form.type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm("type", option.value)}
                    className={[
                      "group flex min-h-[4.75rem] items-start gap-3 rounded-2xl border p-3 text-left text-sm transition",
                      selected
                        ? "border-[var(--serene-accent)] bg-[color-mix(in_oklab,var(--serene-accent)_11%,var(--serene-surface)_89%)] shadow-[var(--serene-shadow-soft)]"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:border-[color-mix(in_oklab,var(--serene-accent)_50%,var(--serene-border)_50%)] hover:bg-[color-mix(in_oklab,var(--serene-surface)_80%,var(--serene-surface-soft)_20%)]",
                    ].join(" ")}
                    disabled={saving}
                  >
                    <span
                      className={[
                        "grid size-9 shrink-0 place-items-center rounded-full border transition",
                        selected
                          ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                          : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] group-hover:text-[var(--serene-fg)]",
                      ].join(" ")}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-[var(--serene-fg)]">{option.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[var(--serene-muted)]">
                        {annotationTypeHints[option.value]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]">
                <ActiveTypeIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Conteudo</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
                  {form.type === "highlight"
                    ? "O trecho fica com aparencia de marca-texto, preservando a leitura leve."
                    : annotationTypeHints[form.type]}
                </p>
              </div>
            </div>

            <div
              className={[
                "relative mt-3 overflow-hidden rounded-2xl border p-4 transition",
                getPreviewClass(form.type),
              ].join(" ")}
              style={getPreviewStyle(form.type, currentColor, currentTextColor)}
            >
              {form.type === "post_it" && (
                <span className="absolute left-1/2 top-0 h-3 w-16 -translate-x-1/2 rounded-b-full bg-white/35" />
              )}
              {(form.type === "reflection" || form.type === "thought") && (
                <span className="literary pointer-events-none absolute left-4 top-1 text-4xl leading-none opacity-[0.15]">
                  &ldquo;
                </span>
              )}
              {form.type === "flag" && (
                <span className="absolute bottom-0 left-0 top-0 w-1.5 bg-[var(--serene-accent)] opacity-60" />
              )}
              <textarea
                value={form.content}
                onChange={(event) => updateForm("content", event.target.value)}
                placeholder={
                  form.type === "highlight"
                    ? "Cole o trecho selecionado para destacar apenas essas palavras."
                    : "Registre a ideia principal deste momento de leitura."
                }
                className={[
                  "relative min-h-32 w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed outline-none placeholder:text-[var(--serene-muted)]",
                  form.type === "reflection" || form.type === "thought" ? "literary text-base italic" : "",
                  form.type === "highlight" ? "annotation-highlight-mark rounded-lg px-1 py-0.5 text-[#2B2B2B]" : "",
                ].join(" ")}
                style={
                  form.type === "highlight"
                    ? { backgroundImage: `linear-gradient(transparent 48%, ${currentColor} 48%, ${currentColor} 88%, transparent 88%)` }
                    : undefined
                }
                disabled={saving}
              />
            </div>
          </section>

          <div className="grid gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Livro
              {lockedBookId ? (
                <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2">
                  {selectedBook?.title ?? "Livro da sessao atual"}
                </div>
              ) : (
                <select
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                  value={form.bookId ?? ""}
                  onChange={(event) => updateForm("bookId", event.target.value || null)}
                  disabled={saving}
                >
                  <option value="">Sem livro</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} ({book.status === "lido" ? "Lido" : "Em progresso"})
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="grid gap-1.5 text-sm">
              Pagina (opcional)
              <input
                type="number"
                min={0}
                value={form.pageNumber}
                onChange={(event) => updateForm("pageNumber", event.target.value)}
                className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                disabled={saving}
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 text-sm">
            <label className="grid gap-1.5">
              Status de revisao
              <select
                value={form.reviewStatus}
                onChange={(event) => updateForm("reviewStatus", event.target.value as AnnotationReviewStatus)}
                className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
                disabled={saving}
              >
                {annotationReviewOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">Cor</p>
            <div className="flex flex-wrap gap-2">
              {selectableColors.map((color) => {
                const selected =
                  form.type === "highlight"
                    ? form.highlightColor === color.color_hex
                    : form.color === color.color_hex;
                return (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={color.name ?? color.color_hex}
                    onClick={() => {
                      if (form.type === "highlight") {
                        updateForm("highlightColor", color.color_hex);
                        return;
                      }
                      updateForm("color", color.color_hex);
                    }}
                    className={[
                      "size-9 rounded-full border-2 transition",
                      selected
                        ? "border-[var(--serene-fg)] ring-2 ring-[var(--serene-accent)] ring-offset-2 ring-offset-[var(--serene-surface)]"
                        : "border-[var(--serene-border)] shadow-[var(--serene-shadow-soft)]",
                    ].join(" ")}
                    style={{ backgroundColor: color.color_hex }}
                    disabled={saving}
                  />
                );
              })}
            </div>
            <p className="text-xs text-[var(--serene-muted)]">
              {form.type === "highlight"
                ? "Marca-texto destaca apenas o trecho selecionado."
                : "A cor ajuda a diferenciar suas anotacoes com calma."}
            </p>
          </div>

          <div className="grid gap-2 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-sm md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2">
              <input
                type="checkbox"
                checked={form.isFavorite}
                onChange={(event) => updateForm("isFavorite", event.target.checked)}
                disabled={saving}
              />
              Favorita
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(event) => updateForm("isPrivate", event.target.checked)}
                disabled={saving}
              />
              Privada
            </label>
          </div>

          <p className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-xs text-[var(--serene-muted)]">
            Origem salva: {getOriginLabel(computedOrigin)}
            {lockedSessionId ? " (sessao ativa vinculada)" : ""}
          </p>

          {onOpenMural && (
            <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-accent)]">
                    <MapIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--serene-text)]">
                      Quer organizar visualmente suas ideias?
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
                      Leve seus pensamentos para o Mural sem transformar isso em um tipo de anotacao.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenMural}
                  disabled={saving}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
                >
                  <MapIcon className="size-3.5" />
                  Abrir Mural
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Salvando..." : mode === "create" ? "Salvar anotacao" : "Salvar edicao"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
            >
              Cancelar
            </button>
            {form.reviewStatus === "to_review" && (
              <span className="inline-flex items-center rounded-full border border-[var(--serene-border)] px-3 py-2 text-xs text-[var(--serene-muted)]">
                Esta anotacao ira para Para revisar.
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
