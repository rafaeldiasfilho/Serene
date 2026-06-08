"use client";

import { Camera, Check, Edit3, Search, X } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import {
  bookResultToInsert,
  manualBookInsert,
  searchBookSuggestions,
  type BookDiscoveryResult,
} from "@/features/books/book-discovery-service";
import type { BookInsert } from "@/features/books/book-services";

type BookIntakeDialogProps = {
  saving: boolean;
  onClose: () => void;
  onConfirm: (payload: Omit<BookInsert, "user_id">) => Promise<{ ok: boolean; message: string | null }>;
  onEdit: (payload: Omit<BookInsert, "user_id">) => void;
};

function formatMeta(result: BookDiscoveryResult) {
  return [result.publicationYear, result.totalPages ? `${result.totalPages} paginas` : null, result.publisher]
    .filter(Boolean)
    .join(" - ");
}

function subjectPreview(subjects: string[]) {
  return subjects.slice(0, 3).join(", ");
}

function resultToManualDiscovery(title: string): BookDiscoveryResult {
  return {
    id: "manual-draft",
    title: title.trim(),
    author: null,
    coverUrl: null,
    publicationYear: null,
    totalPages: null,
    publisher: null,
    description: null,
    language: null,
    isbn: null,
    subjects: [],
    source: "manual",
    sourceLabel: "Manual",
  };
}

function CoverPreview({ result }: { result: BookDiscoveryResult }) {
  return (
    <div className="grid aspect-[2/3] w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-center text-xs text-[var(--serene-muted)]">
      {result.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={result.coverUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="px-2">Sem capa</span>
      )}
    </div>
  );
}

export function BookIntakeDialog({
  onClose,
  onConfirm,
  onEdit,
  saving,
}: BookIntakeDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookDiscoveryResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<BookDiscoveryResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [photoPlaceholderOpen, setPhotoPlaceholderOpen] = useState(false);

  const trimmedQuery = query.trim();
  const selectedPayload = useMemo(() => {
    if (!selectedResult) {
      return null;
    }

    return selectedResult.source === "manual"
      ? manualBookInsert(selectedResult.title)
      : bookResultToInsert(selectedResult);
  }, [selectedResult]);

  async function handleSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!trimmedQuery) {
      setFeedback("Digite o nome do livro para buscar.");
      return;
    }

    setStatus("loading");
    setFeedback(null);
    setSelectedResult(null);

    const result = await searchBookSuggestions(trimmedQuery);
    setResults(result.data);
    setStatus("done");

    if (result.error) {
      setFeedback(result.error);
      return;
    }

    if (result.data.length === 0) {
      setFeedback("Nenhum resultado claro apareceu. Voce ainda pode cadastrar manualmente.");
    }
  }

  async function handleConfirm() {
    if (!selectedPayload) {
      return;
    }

    const result = await onConfirm(selectedPayload);
    if (!result.ok) {
      setFeedback(result.message ?? "Nao foi possivel salvar este livro agora.");
    }
  }

  function handleManualDraft() {
    if (!trimmedQuery) {
      setFeedback("Digite ao menos o nome do livro.");
      return;
    }

    setSelectedResult(resultToManualDiscovery(trimmedQuery));
    setFeedback(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <section className="serene-soft-in max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Novo livro
            </p>
            <h2 className="literary mt-2 text-3xl leading-tight">Comece pelo nome</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Digite o nome do livro. O SERENE busca dados possiveis e voce confirma antes de
              guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]"
            aria-label="Fechar cadastro de livro"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSearch(event)} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Nome do livro
            <input
              className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 text-[var(--serene-fg)] outline-none focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Meditacoes"
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 self-end rounded-full bg-[var(--serene-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="size-4" />
            {status === "loading" ? "Buscando..." : "Buscar"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPhotoPlaceholderOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)]"
          >
            <Camera className="size-4" />
            Adicionar por foto da capa
          </button>
          <button
            type="button"
            onClick={handleManualDraft}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)]"
          >
            Cadastrar manualmente
          </button>
        </div>

        {photoPlaceholderOpen && (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
                <Camera className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Foto da capa em preparacao</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--serene-muted)]">
                  Em uma fase futura, a foto da capa ajudara a identificar titulo e autor com
                  IA/OCR. Por enquanto, siga pelo nome do livro e confirme o resultado antes de
                  salvar.
                </p>
              </div>
            </div>
          </div>
        )}

        {feedback && (
          <p className="mt-4 rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
            {feedback}
          </p>
        )}

        {selectedResult ? (
          <div className="mt-5 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Encontramos este livro
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <CoverPreview result={selectedResult} />
              <div className="min-w-0 flex-1">
                <h3 className="literary text-2xl leading-tight">{selectedResult.title}</h3>
                <p className="mt-1 text-sm text-[var(--serene-muted)]">
                  {selectedResult.author ?? "Autor nao informado pela fonte"}
                </p>
                <div className="mt-3 grid gap-2 text-sm text-[var(--serene-muted)] sm:grid-cols-2">
                  <p>Paginas: {selectedResult.totalPages ?? "nao informado"}</p>
                  <p>Editora: {selectedResult.publisher ?? "nao informada"}</p>
                  <p>Ano: {selectedResult.publicationYear ?? "nao informado"}</p>
                  <p>Idioma: {selectedResult.language ?? "nao informado"}</p>
                  <p>ISBN: {selectedResult.isbn ?? "nao informado"}</p>
                  <p>Fonte: {selectedResult.sourceLabel}</p>
                </div>
                {selectedResult.subjects.length > 0 && (
                  <p className="mt-3 rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_72%,transparent)] px-3 py-2 text-sm text-[var(--serene-muted)]">
                    Area sugerida: {subjectPreview(selectedResult.subjects)}
                  </p>
                )}
                {selectedResult.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--serene-muted)]">
                    {selectedResult.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
              >
                Buscar outro resultado
              </button>
              {selectedPayload && (
                <button
                  type="button"
                  onClick={() => onEdit(selectedPayload)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
                >
                  <Edit3 className="size-4" />
                  Editar dados
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="size-4" />
                {saving ? "Salvando..." : "Confirmar livro"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            {status === "idle" ? (
              <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-5 text-sm leading-relaxed text-[var(--serene-muted)]">
                A busca pode preencher capa, autor, paginas, editora, ano, idioma, ISBN e assuntos
                quando a fonte retornar esses dados.
              </div>
            ) : results.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setSelectedResult(result)}
                    className="flex gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-left shadow-[var(--serene-shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--serene-accent)]"
                  >
                    <CoverPreview result={result} />
                    <span className="min-w-0">
                      <span className="literary line-clamp-2 text-lg leading-tight text-[var(--serene-fg)]">
                        {result.title}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--serene-muted)]">
                        {result.author ?? "Autor nao informado"}
                      </span>
                      <span className="mt-2 line-clamp-2 text-xs text-[var(--serene-muted)]">
                        {formatMeta(result) || result.sourceLabel}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-5 text-sm leading-relaxed text-[var(--serene-muted)]">
                Nenhum resultado para escolher agora. Voce pode cadastrar manualmente com apenas o
                nome e completar depois.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
