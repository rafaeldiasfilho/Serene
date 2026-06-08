"use client";

import { BookOpen, Check, X } from "lucide-react";
import { useMemo, useState } from "react";

export type VocabularyDialogSubmitValue = {
  word: string;
  definition: string | null;
  note: string | null;
};

type VocabularyDialogProps = {
  bookTitle: string;
  currentPage: number | null;
  onClose: () => void;
  onSubmit: (value: VocabularyDialogSubmitValue) => Promise<{
    ok: boolean;
    message: string | null;
  }>;
};

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function VocabularyDialog({
  bookTitle,
  currentPage,
  onClose,
  onSubmit,
}: VocabularyDialogProps) {
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedWord = useMemo(() => word.trim(), [word]);
  const canSave = normalizedWord.length > 0 && !saving;

  async function handleSubmit() {
    if (!canSave) {
      setFeedback("Escreva a palavra que voce quer guardar.");
      return;
    }

    setSaving(true);
    setFeedback(null);

    const result = await onSubmit({
      word: normalizedWord,
      definition: normalizeOptionalText(definition),
      note: normalizeOptionalText(note),
    });

    setSaving(false);

    if (!result.ok) {
      setFeedback(result.message ?? "Nao foi possivel guardar esta palavra.");
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <section className="serene-soft-in w-full max-w-lg rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              {"Vocabul\u00e1rio da leitura"}
            </p>
            <h2 className="literary mt-2 text-2xl leading-tight">{bookTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
              {"A consulta autom\u00e1tica ainda est\u00e1 em prepara\u00e7\u00e3o. Voc\u00ea j\u00e1 pode salvar esta palavra para revisar depois."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
            aria-label={"Fechar vocabul\u00e1rio"}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
          <label className="grid gap-2 text-sm font-semibold text-[var(--serene-text)]">
            {"Qual palavra voc\u00ea quer guardar?"}
            <input
              autoFocus
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder={"Ex.: inef\u00e1vel"}
              className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 font-normal text-[var(--serene-fg)] outline-none transition focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[var(--serene-text)]">
            Significado, se quiser
            <textarea
              value={definition}
              onChange={(event) => setDefinition(event.target.value)}
              rows={3}
              placeholder={"Escreva com suas palavras. O SERENE n\u00e3o vai inventar uma defini\u00e7\u00e3o."}
              className="resize-none rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 font-normal text-[var(--serene-fg)] outline-none transition focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[var(--serene-text)]">
            {"Observa\u00e7\u00e3o opcional"}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder={"Contexto da frase, sensa\u00e7\u00e3o, d\u00favida..."}
              className="resize-none rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 font-normal text-[var(--serene-fg)] outline-none transition focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--serene-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_74%,transparent)] px-3 py-1.5">
              <BookOpen className="size-3.5 text-[var(--serene-accent)]" />
              {currentPage !== null ? `P\u00e1gina ${currentPage}` : "P\u00e1gina n\u00e3o informada"}
            </span>
            <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_74%,transparent)] px-3 py-1.5">
              Entrada manual
            </span>
          </div>
        </div>

        {feedback && (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
            {feedback}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="size-4" />
            {saving ? "Salvando..." : "Guardar palavra"}
          </button>
        </div>
      </section>
    </div>
  );
}
