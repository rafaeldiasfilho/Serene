"use client";

import {
  Camera,
  Check,
  FileImage,
  FileText,
  ImagePlus,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

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
  { symbol: "R", label: "Reflexão" },
  { symbol: "I", label: "Ideia" },
  { symbol: "?", label: "Dúvida" },
  { symbol: "!", label: "Insight/importante" },
  { symbol: "A", label: "Ação" },
  { symbol: "P", label: "Pensamento" },
];

const visualDetectionPlaceholders = [
  "Post-it físico",
  "Texto marcado",
  "Nota manuscrita",
  "Foto de página",
  "Papel solto",
  "Flag/marcador",
];

const subjectiveDetectionPlaceholders = [
  "Reflexão",
  "Ideia",
  "Dúvida",
  "Pensamento",
  "Ação",
  "Insight",
];

const inputClass =
  "rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 text-sm text-[var(--serene-text)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]";

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

function ModeTile({
  active,
  children,
  icon: Icon,
  onClick,
  title,
}: {
  active: boolean;
  children: ReactNode;
  icon: LucideIcon;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-[1.25rem] border p-4 text-left text-sm shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5",
        active
          ? "border-[var(--serene-accent)] bg-[var(--serene-accent-soft)] text-[var(--serene-text)]"
          : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]",
      ].join(" ")}
    >
      <span className="mb-3 grid size-10 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-accent)]">
        <Icon className="size-4" />
      </span>
      <span className="block font-semibold text-[var(--serene-text)]">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-[var(--serene-muted)]">
        {children}
      </span>
    </button>
  );
}

function SectionShell({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="serene-soft-in rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-4 shadow-[var(--serene-shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-semibold text-[var(--serene-text)]">{title}</p>
      </div>
      {children}
    </section>
  );
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
      className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onKeyDown={handleDialogKeyDown}
    >
      <section
        className="serene-rise max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-lift)] sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-placeholder-title"
      >
        <header className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(135deg,var(--serene-surface),var(--serene-paper),var(--serene-accent-soft))] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-accent)]">
                <Camera className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                  Captura preparada
                </p>
                <h2
                  id="capture-placeholder-title"
                  className="mt-1 text-xl font-semibold leading-tight text-[var(--serene-text)] sm:text-2xl"
                >
                  Foto para revisar depois
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
                  Esta área antecipa a captura por foto e OCR do SERENE. Por enquanto, a imagem
                  fica local, nada é extraído automaticamente e você revisa tudo antes de salvar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
              aria-label="Fechar captura"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--serene-accent)]" />
            <p className="text-xs leading-relaxed text-[var(--serene-muted)]">
              A foto selecionada serve apenas para preparar a revisão nesta tela. O SERENE não
              envia, interpreta ou salva a imagem sem uma ação sua.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-4">
            <SectionShell icon={FileImage} title="Imagem local">
              <div className="grid min-h-72 place-items-center overflow-hidden rounded-[1.35rem] border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)]">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Prévia da imagem selecionada"
                    className="max-h-80 w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-[var(--serene-muted)]">
                    <span className="grid size-14 place-items-center rounded-[1.25rem] border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
                      <FileImage className="size-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--serene-text)]">
                        Nenhuma imagem selecionada
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-relaxed">
                        Use uma foto local de página, post-it ou anotação física para preparar a
                        revisão.
                      </p>
                    </div>
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

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-lift)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105"
                >
                  <ImagePlus className="size-4" />
                  Selecionar imagem
                </button>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => handleImageFileChange(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
                  >
                    <X className="size-4" />
                    Remover
                  </button>
                )}
              </div>

              {imageFile && (
                <p className="mt-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--serene-muted)]">
                  {imageFile.name} fica apenas nesta revisão local.
                </p>
              )}
            </SectionShell>

            <SectionShell icon={FileText} title="Texto manual de teste">
              <label className="block text-sm font-semibold text-[var(--serene-text)]">
                Trecho para revisar
                <textarea
                  value={demoText}
                  onChange={(event) => setDemoText(event.target.value)}
                  className={`${inputClass} mt-2 min-h-28 w-full resize-y`}
                  placeholder="Digite manualmente um exemplo para revisar. Isto não é OCR."
                />
                <span className="mt-2 block text-xs leading-relaxed text-[var(--serene-muted)]">
                  Campo manual para testar a revisão; o SERENE ainda não está lendo a imagem.
                </span>
              </label>
            </SectionShell>
          </div>

          <div className="space-y-4">
            <section className="serene-soft-in rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-4 shadow-[var(--serene-shadow-soft)]">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--serene-accent)]" />
                <p className="text-sm font-semibold text-[var(--serene-text)]">Modo de captura</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ModeTile
                  active={mode === "ocr_page"}
                  icon={FileText}
                  onClick={() => setMode("ocr_page")}
                  title="Transcrever página"
                >
                  Uma foto de página física poderá virar texto editável após a sua revisão.
                </ModeTile>

                <ModeTile
                  active={mode === "physical_annotation"}
                  icon={StickyNote}
                  onClick={() => setMode("physical_annotation")}
                  title="Anotação física"
                >
                  Preparado para post-its, marca-texto, escrita manual e marcadores.
                </ModeTile>
              </div>
            </section>

            <SectionShell icon={Camera} title="Livro da captura">
              {selectedBook ? (
                <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3">
                  <p className="text-sm font-semibold text-[var(--serene-text)]">
                    {selectedBook.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
                    {selectedBook.author ?? "Autor não informado"}
                    {selectedBook.current_page > 0 ? ` · pág. ${selectedBook.current_page}` : ""}
                    {currentSessionId && selectedBook.id === currentBookId
                      ? " · sessão ativa vinculada"
                      : ""}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm text-[var(--serene-muted)]">
                  Escolha um livro para preparar a revisão.
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
                      "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-300",
                      effectiveSelectedBookId === book.id
                        ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white shadow-[var(--serene-shadow-soft)]"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]",
                    ].join(" ")}
                  >
                    {effectiveSelectedBookId === book.id && <Check className="size-3.5 shrink-0" />}
                    <span className="truncate">{book.title}</span>
                  </button>
                ))}
              </div>

              {currentSessionId && selectedBook && selectedBook.id !== currentBookId && (
                <p className="mt-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--serene-muted)]">
                  Ao trocar o livro, a captura não fica vinculada à sessão ativa.
                </p>
              )}

              <label className="mt-4 block text-sm font-semibold text-[var(--serene-text)]">
                Buscar livro
                <span className="relative mt-2 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--serene-muted)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={`${inputClass} w-full pl-9`}
                    placeholder="Título ou autor"
                  />
                </span>
              </label>

              <div className="mt-3 max-h-44 overflow-y-auto rounded-[1.25rem] border border-[var(--serene-border)] bg-[var(--serene-surface)]">
                {booksLoading ? (
                  <p className="px-3 py-3 text-sm text-[var(--serene-muted)]">
                    Carregando livros...
                  </p>
                ) : filteredBooks.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-[var(--serene-muted)]">
                    Nenhum livro encontrado.
                  </p>
                ) : (
                  filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBookId(book.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--serene-border)] px-3 py-2.5 text-left text-sm transition duration-300 last:border-b-0 hover:bg-[var(--serene-accent-soft)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-[var(--serene-text)]">
                          {book.title}
                        </span>
                        <span className="block truncate text-xs text-[var(--serene-muted)]">
                          {book.author ?? "Autor não informado"}
                        </span>
                      </span>
                      {effectiveSelectedBookId === book.id && (
                        <Check className="size-4 shrink-0 text-[var(--serene-accent)]" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </SectionShell>

            <SectionShell
              icon={mode === "ocr_page" ? FileText : StickyNote}
              title={mode === "ocr_page" ? "OCR preparado" : "Detecção física preparada"}
            >
              <p className="text-sm leading-relaxed text-[var(--serene-muted)]">
                {mode === "ocr_page"
                  ? "No futuro, o SERENE transcreverá texto visível para uma nota editável. Você revisa antes de salvar, e o resultado pode virar uma anotação ocr_page."
                  : "A detecção futura poderá reconhecer formas simples sem criar nada sem confirmação."}
              </p>
              {mode === "physical_annotation" && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--serene-muted)]">
                      Casos visuais
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visualDetectionPlaceholders.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
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
                          className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </SectionShell>

            <SectionShell icon={Sparkles} title="Marcadores opcionais">
              <div className="grid gap-2 sm:grid-cols-3">
                {markerOptions.map((marker) => (
                  <span
                    key={marker.symbol}
                    className="flex items-center gap-2 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm text-[var(--serene-muted)]"
                  >
                    <strong className="grid size-7 place-items-center rounded-full bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
                      {marker.symbol}
                    </strong>
                    {marker.label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--serene-muted)]">
                Eles podem aumentar a precisão, mas nunca são obrigatórios. Você não precisa
                aprender um sistema complexo e sempre poderá mudar o tipo antes de salvar.
              </p>
            </SectionShell>
          </div>
        </div>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-4">
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--serene-muted)]">
            Na revisão você confere texto, tipo, livro, página, cor e status. Salvar só acontece
            depois da sua confirmação.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReview}
              disabled={!effectiveSelectedBookId}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-lift)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="size-4" />
              Revisar antes de salvar
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
