"use client";

import {
  Camera,
  Check,
  FileImage,
  FileText,
  ImagePlus,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type {
  AnnotationOrigin,
  AnnotationType,
  Database,
} from "@/lib/supabase/database.types";

export type CaptureBook = Pick<
  Database["public"]["Tables"]["books"]["Row"],
  | "id"
  | "title"
  | "author"
  | "status"
  | "is_current"
  | "current_page"
  | "total_pages"
  | "reading_origin"
  | "read_before_serene"
  | "created_at"
  | "updated_at"
>;

export type CaptureReviewValue = {
  bookId: string;
  sessionId: string | null;
  pageNumber: number | null;
  defaultType: AnnotationType;
  defaultContent: string;
  origin: AnnotationOrigin;
};

type CaptureMode = "ocr_page" | "physical_annotation";

type CapturePlaceholderDialogProps = {
  books: CaptureBook[];
  booksLoading?: boolean;
  currentBookId?: string | null;
  currentSessionId?: string | null;
  onClose: () => void;
  onReview: (value: CaptureReviewValue) => void;
};

const markerOptions = [
  { symbol: "R", label: "Reflexao" },
  { symbol: "I", label: "Ideia" },
  { symbol: "?", label: "Duvida" },
  { symbol: "!", label: "Insight/importante" },
  { symbol: "A", label: "Acao" },
  { symbol: "P", label: "Pensamento" },
];

const visualDetectionPlaceholders = [
  "Post-it fisico",
  "Texto marcado",
  "Nota manuscrita",
  "Foto de pagina",
  "Papel solto",
  "Flag/marcador",
];

const subjectiveDetectionPlaceholders = [
  "Reflexao",
  "Ideia",
  "Duvida",
  "Pensamento",
  "Acao",
  "Insight",
];

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function bookTimestamp(book: CaptureBook) {
  return Date.parse(book.updated_at || book.created_at || "") || 0;
}

function getBookLabel(book: CaptureBook) {
  if (book.author) {
    return `${book.title} - ${book.author}`;
  }
  return book.title;
}

export function CapturePlaceholderDialog({
  books,
  booksLoading = false,
  currentBookId = null,
  currentSessionId = null,
  onClose,
  onReview,
}: CapturePlaceholderDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [mode, setMode] = useState<CaptureMode>("ocr_page");
  const [query, setQuery] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [demoText, setDemoText] = useState("");

  const recentBooks = useMemo(() => {
    return [...books]
      .sort((left, right) => {
        const rightPriority =
          (right.id === currentBookId ? 3 : 0) +
          (right.is_current ? 2 : 0) +
          (right.status === "lendo" ? 1 : 0);
        const leftPriority =
          (left.id === currentBookId ? 3 : 0) +
          (left.is_current ? 2 : 0) +
          (left.status === "lendo" ? 1 : 0);

        if (rightPriority !== leftPriority) {
          return rightPriority - leftPriority;
        }

        return bookTimestamp(right) - bookTimestamp(left);
      })
      .slice(0, 5);
  }, [books, currentBookId]);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(() => {
    return currentBookId ?? recentBooks[0]?.id ?? books[0]?.id ?? null;
  });

  const fallbackBookId = useMemo(() => {
    return currentBookId ?? recentBooks[0]?.id ?? books[0]?.id ?? null;
  }, [books, currentBookId, recentBooks]);

  const effectiveSelectedBookId =
    selectedBookId && books.some((book) => book.id === selectedBookId)
      ? selectedBookId
      : fallbackBookId;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const selectedBook = useMemo(() => {
    return books.find((book) => book.id === effectiveSelectedBookId) ?? null;
  }, [books, effectiveSelectedBookId]);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) {
      return recentBooks;
    }

    return books
      .filter((book) => normalizeSearch(getBookLabel(book)).includes(normalizedQuery))
      .slice(0, 8);
  }, [books, query, recentBooks]);

  function handleReview() {
    if (!effectiveSelectedBookId) {
      return;
    }

    const shouldLinkCurrentSession =
      Boolean(currentSessionId) && effectiveSelectedBookId === currentBookId;

    onReview({
      bookId: effectiveSelectedBookId,
      sessionId: shouldLinkCurrentSession ? currentSessionId : null,
      pageNumber: selectedBook?.current_page ?? null,
      defaultType: mode === "ocr_page" ? "ocr_page" : "quick_note",
      defaultContent: demoText.trim(),
      origin: "camera",
    });
  }

  function handleImageFileChange(nextFile: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextPreviewUrl;
    setImageFile(nextFile);
    setPreviewUrl(nextPreviewUrl);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4"
      onKeyDown={handleDialogKeyDown}
    >
      <section
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-placeholder-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Captura
            </p>
            <h2 id="capture-placeholder-title" className="mt-1 text-xl font-semibold">
              Foto para revisar depois
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--serene-muted)]">
              Em breve, o SERENE podera ajudar a transformar fotos de paginas, post-its e
              anotacoes fisicas em registros organizados. Nada e extraido, enviado ou salvo
              automaticamente nesta fase.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] text-[var(--serene-muted)]"
            aria-label="Fechar captura"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-4">
            <div className="grid min-h-64 place-items-center overflow-hidden rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="max-h-72 w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-[var(--serene-muted)]">
                  <FileImage className="size-10" />
                  <p className="text-sm">Imagem local para preparar a revisao.</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleImageFileChange(event.target.files?.[0] ?? null)}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                <ImagePlus className="size-4" />
                Selecionar imagem
              </button>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => handleImageFileChange(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
                >
                  <X className="size-4" />
                  Remover
                </button>
              )}
            </div>

            {imageFile && (
              <p className="text-xs text-[var(--serene-muted)]">
                {imageFile.name} fica apenas nesta revisao local.
              </p>
            )}

            <label className="block text-sm">
              Texto de teste (opcional)
              <textarea
                value={demoText}
                onChange={(event) => setDemoText(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                placeholder="Digite manualmente um exemplo para revisar. Isto nao e OCR."
              />
              <span className="mt-1 block text-xs text-[var(--serene-muted)]">
                Campo manual para testar a revisao; o SERENE nao esta lendo a imagem.
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("ocr_page")}
                aria-pressed={mode === "ocr_page"}
                className={[
                  "rounded-xl border px-4 py-3 text-left text-sm",
                  mode === "ocr_page"
                    ? "border-[var(--serene-accent)] bg-[var(--serene-surface-soft)]"
                    : "border-[var(--serene-border)] bg-[var(--serene-surface)]",
                ].join(" ")}
              >
                <FileText className="mb-2 size-5 text-[var(--serene-accent)]" />
                <span className="font-semibold">Transcrever pagina</span>
                <span className="mt-1 block text-xs text-[var(--serene-muted)]">
                  A foto de uma pagina fisica podera virar texto editavel apos revisao.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("physical_annotation")}
                aria-pressed={mode === "physical_annotation"}
                className={[
                  "rounded-xl border px-4 py-3 text-left text-sm",
                  mode === "physical_annotation"
                    ? "border-[var(--serene-accent)] bg-[var(--serene-surface-soft)]"
                    : "border-[var(--serene-border)] bg-[var(--serene-surface)]",
                ].join(" ")}
              >
                <StickyNote className="mb-2 size-5 text-[var(--serene-accent)]" />
                <span className="font-semibold">Anotacao fisica</span>
                <span className="mt-1 block text-xs text-[var(--serene-muted)]">
                  Preparado para post-its, marca-texto, escrita manual e marcadores.
                </span>
              </button>
            </div>

            <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-[var(--serene-accent)]" />
                <p className="text-sm font-semibold">Livro da captura</p>
              </div>

              {selectedBook ? (
                <p className="mt-2 text-sm text-[var(--serene-muted)]">
                  Atual: {selectedBook.title}
                  {selectedBook.current_page > 0 ? `, pag. ${selectedBook.current_page}` : ""}
                  {currentSessionId && selectedBook.id === currentBookId
                    ? " - sessao ativa vinculada"
                    : ""}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--serene-muted)]">
                  Escolha um livro para preparar a revisao.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {recentBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    title={getBookLabel(book)}
                    onClick={() => setSelectedBookId(book.id)}
                    className={[
                      "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                      effectiveSelectedBookId === book.id
                        ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]",
                    ].join(" ")}
                  >
                    {effectiveSelectedBookId === book.id && <Check className="size-3.5 shrink-0" />}
                    <span className="truncate">{book.title}</span>
                  </button>
                ))}
              </div>

              {currentSessionId && selectedBook && selectedBook.id !== currentBookId && (
                <p className="mt-3 text-xs text-[var(--serene-muted)]">
                  Ao trocar o livro, a captura nao fica vinculada a sessao ativa.
                </p>
              )}

              <label className="mt-4 block text-sm">
                Buscar livro
                <span className="relative mt-1 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--serene-muted)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] py-2 pl-9 pr-3 outline-none"
                    placeholder="Titulo ou autor"
                  />
                </span>
              </label>

              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)]">
                {booksLoading ? (
                  <p className="px-3 py-2 text-sm text-[var(--serene-muted)]">Carregando livros...</p>
                ) : filteredBooks.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[var(--serene-muted)]">
                    Nenhum livro encontrado.
                  </p>
                ) : (
                  filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBookId(book.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--serene-border)] px-3 py-2 text-left text-sm last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{book.title}</span>
                        <span className="block truncate text-xs text-[var(--serene-muted)]">
                          {book.author ?? "Autor nao informado"}
                        </span>
                      </span>
                      {effectiveSelectedBookId === book.id && (
                        <Check className="size-4 shrink-0 text-[var(--serene-accent)]" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
              <p className="text-sm font-semibold">
                {mode === "ocr_page" ? "OCR preparado" : "Deteccao fisica preparada"}
              </p>
              <p className="mt-1 text-sm text-[var(--serene-muted)]">
                {mode === "ocr_page"
                  ? "No futuro, SERENE transcrevera texto visivel para uma nota editavel. Voce revisa antes de salvar, e o resultado pode virar uma anotacao ocr_page."
                  : "A deteccao futura podera reconhecer formas simples sem criar nada sem confirmacao."}
              </p>
              {mode === "physical_annotation" && (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--serene-muted)]">
                      Casos visuais
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visualDetectionPlaceholders.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-[var(--serene-border)] px-3 py-1 text-xs text-[var(--serene-muted)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--serene-muted)]">
                      Casos subjetivos
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {subjectiveDetectionPlaceholders.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-[var(--serene-border)] px-3 py-1 text-xs text-[var(--serene-muted)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
              <p className="text-sm font-semibold">Marcadores opcionais</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {markerOptions.map((marker) => (
                  <span
                    key={marker.symbol}
                    className="flex items-center gap-2 rounded-lg border border-[var(--serene-border)] px-3 py-2 text-sm"
                  >
                    <strong className="grid size-7 place-items-center rounded-full bg-[var(--serene-surface-soft)]">
                      {marker.symbol}
                    </strong>
                    {marker.label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--serene-muted)]">
                Eles podem aumentar a precisao, mas nunca sao obrigatorios. Voce nao precisa
                aprender um sistema complexo e sempre podera mudar o tipo antes de salvar.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--serene-border)] pt-4">
          <p className="text-xs text-[var(--serene-muted)]">
            Na revisao voce confere texto, tipo, livro, pagina, cor e status. Salvar so acontece
            depois da sua confirmacao.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReview}
              disabled={!effectiveSelectedBookId}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Check className="size-4" />
              Revisar antes de salvar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
