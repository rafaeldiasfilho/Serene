"use client";

import { AlertCircle, BookOpen, Check, Clock3, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  FALLBACK_SECONDS_PER_PAGE,
  loadProgressContext,
  saveProgressUpdate,
  type ProgressBook,
  type ProgressContext,
} from "@/features/reading-progress/reading-progress-services";

type ProgressUpdateDialogProps = {
  userId: string;
  book: ProgressBook;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0 min";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}h ${restMinutes}min` : `${hours}h`;
}

function parsePage(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProgressUpdateDialog({
  book,
  onClose,
  onSaved,
  userId,
}: ProgressUpdateDialogProps) {
  const [context, setContext] = useState<ProgressContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [pageInput, setPageInput] = useState(String(book.current_page));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadProgressContext(userId, book).then((result) => {
      if (!isMounted) {
        return;
      }

      if (result.error || !result.data) {
        setFeedback(result.error?.message ?? "Nao foi possivel carregar o progresso.");
        setContext(null);
      } else {
        setContext(result.data);
      }

      setLoadingContext(false);
    });

    return () => {
      isMounted = false;
    };
  }, [book, userId]);

  const page = parsePage(pageInput);
  const secondsPerPage = context?.personalSecondsPerPage ?? FALLBACK_SECONDS_PER_PAGE;
  const estimationSource = context?.personalSecondsPerPage
    ? "personal_average"
    : "initial_average";
  const pagesAdvanced = page !== null ? Math.max(page - book.current_page, 0) : 0;
  const estimatedSeconds = Math.round(pagesAdvanced * secondsPerPage);
  const totalAfter = useMemo(() => {
    const base =
      (context?.realSeconds ?? 0) +
      (context?.outsideEstimatedSeconds ?? 0) +
      (context?.historicalEstimatedSeconds ?? 0);

    return base + estimatedSeconds;
  }, [context, estimatedSeconds]);

  const validationMessage = useMemo(() => {
    if (pageInput.trim().length === 0 || page === null) {
      return "Informe uma pagina.";
    }

    if (page < 0) {
      return "A pagina nao pode ser negativa.";
    }

    if (book.total_pages && page > book.total_pages) {
      return `Este livro tem ${book.total_pages} paginas. Confira a pagina informada.`;
    }

    return null;
  }, [book.total_pages, page, pageInput]);

  async function handleSubmit() {
    if (validationMessage || page === null) {
      setFeedback(validationMessage);
      return;
    }

    const correction = page < book.current_page;
    if (correction) {
      const confirmed = window.confirm(
        "A pagina informada e menor que o progresso atual. Deseja corrigir a pagina marcada sem apagar registros anteriores?",
      );
      if (!confirmed) {
        return;
      }
    }

    setSaving(true);
    setFeedback(null);

    const result = await saveProgressUpdate({
      userId,
      book,
      nextPage: page,
      estimatedSeconds: correction ? 0 : estimatedSeconds,
      secondsPerPage,
      estimationSource,
      correction,
    });

    setSaving(false);

    if (result.error) {
      setFeedback(result.error.message);
      return;
    }

    await onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <section className="serene-soft-in w-full max-w-xl rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Atualizar pagina
            </p>
            <h2 className="literary mt-2 text-2xl leading-tight">{book.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
              Use quando voce leu fora do app. O SERENE registra o avanco como tempo estimado,
              separado das sessoes cronometradas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]"
            aria-label="Fechar atualizacao de pagina"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
          <label className="grid gap-2 text-sm text-[var(--serene-muted)]">
            Pagina atual
            <input
              type="number"
              min={0}
              max={book.total_pages ?? undefined}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 text-lg text-[var(--serene-fg)] outline-none"
              placeholder="Ex.: 84"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_72%,transparent)] p-3">
              <Clock3 className="size-4 text-[var(--serene-accent)]" />
              <p className="mt-2 text-xs text-[var(--serene-muted)]">
                Tempo registrado no SERENE
              </p>
              <p className="mt-1 font-semibold">{formatDuration(context?.realSeconds ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_72%,transparent)] p-3">
              <BookOpen className="size-4 text-[var(--serene-accent)]" />
              <p className="mt-2 text-xs text-[var(--serene-muted)]">
                Tempo estimado fora do app
              </p>
              <p className="mt-1 font-semibold">
                {formatDuration((context?.outsideEstimatedSeconds ?? 0) + estimatedSeconds)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_72%,transparent)] p-3">
              <Check className="size-4 text-[var(--serene-accent)]" />
              <p className="mt-2 text-xs text-[var(--serene-muted)]">
                Tempo total dedicado ao livro
              </p>
              <p className="mt-1 font-semibold">{formatDuration(totalAfter)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_72%,transparent)] p-3 text-sm leading-relaxed text-[var(--serene-muted)]">
            {loadingContext ? (
              "Calculando uma estimativa calma..."
            ) : pagesAdvanced > 0 ? (
              <>
                Voce avancou {pagesAdvanced} pagina{pagesAdvanced === 1 ? "" : "s"}. O tempo
                estimado e de aproximadamente {formatDuration(estimatedSeconds)} usando{" "}
                {context?.personalSecondsPerPage
                  ? "sua media real de leitura."
                  : "uma media inicial simples, que melhora com o uso."}
              </>
            ) : page !== null && page < book.current_page ? (
              <span className="inline-flex gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--serene-accent)]" />
                Esta acao corrige a pagina marcada e nao cria tempo estimado novo.
              </span>
            ) : (
              "Informe uma pagina maior para registrar novo tempo estimado fora do app."
            )}
          </div>
        </div>

        {feedback && (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {feedback}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || loadingContext}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="size-4" />
            {saving ? "Salvando..." : "Confirmar progresso"}
          </button>
        </div>
      </section>
    </div>
  );
}
