"use client";

import { BookOpen, Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { searchDictionaryWord } from "@/features/vocabulary/dictionary-service";
import {
  getPrimaryDictionaryDefinition,
  type DictionaryEntry,
  type DictionarySearchResponse,
} from "@/features/vocabulary/dictionary-types";
import type { VocabularyEntryRow } from "@/features/vocabulary/vocabulary-services";

export type VocabularyDialogSubmitValue = {
  word: string;
  definition: string | null;
  note: string | null;
  source: string | null;
};

type VocabularyDialogProps = {
  bookTitle: string;
  currentPage: number | null;
  recentEntries: VocabularyEntryRow[];
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

function getResultWord(entry: DictionaryEntry | null, fallback: string) {
  return entry?.word.trim() || fallback;
}

export function VocabularyDialog({
  bookTitle,
  currentPage,
  recentEntries,
  onClose,
  onSubmit,
}: VocabularyDialogProps) {
  const [word, setWord] = useState("");
  const [manualDefinition, setManualDefinition] = useState("");
  const [note, setNote] = useState("");
  const [searchResult, setSearchResult] = useState<DictionarySearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedWordKey, setSavedWordKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedWord = useMemo(() => word.trim(), [word]);
  const foundEntry = searchResult?.status === "found" ? searchResult.entry : null;
  const primaryDefinition = getPrimaryDictionaryDefinition(foundEntry);
  const resultWord = getResultWord(foundEntry, normalizedWord);
  const searchResultMessage =
    searchResult?.status === "not_found" || searchResult?.status === "error"
      ? searchResult.message
      : "Não encontramos essa palavra no dicionário em português.";
  const canSearch = normalizedWord.length > 0 && !searching;
  const canShowSaveFields = Boolean(searchResult && searchResult.status !== "error");
  const canSave = canShowSaveFields && normalizedWord.length > 0 && !saving;
  const showManualDefinition = searchResult?.status === "not_found";
  const showDictionaryError = searchResult?.status === "error";

  async function handleSearch() {
    if (!canSearch) {
      setFeedback("Digite uma palavra para buscar.");
      return;
    }

    setSearching(true);
    setFeedback(null);
    setSavedWordKey(null);

    const result = await searchDictionaryWord({
      word: normalizedWord,
    });

    setSearchResult(result);
    setSearching(false);

    if (result.status === "found") {
      setManualDefinition("");
    }
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }

    const definition = primaryDefinition ?? normalizeOptionalText(manualDefinition);
    const source = foundEntry?.source?.name ?? null;

    setSaving(true);
    setFeedback(null);

    const result = await onSubmit({
      word: resultWord,
      definition,
      note: normalizeOptionalText(note),
      source,
    });

    setSaving(false);

    if (!result.ok) {
      setFeedback(result.message ?? "Nao foi possivel salvar esta palavra.");
      return;
    }

    setSavedWordKey(resultWord.toLocaleLowerCase("pt-BR"));
    setFeedback(result.message ?? "Palavra salva.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <section className="serene-soft-in w-full max-w-xl rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Dicionário da leitura
            </p>
            <h2 className="literary mt-2 text-2xl leading-tight">{bookTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
              Busque o significado em português. Depois, salve apenas as palavras que quiser lembrar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
            aria-label="Fechar dicionário"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="mt-5 grid gap-3 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <label className="grid gap-2 text-sm font-semibold text-[var(--serene-text)]">
            Qual palavra em português você quer entender?
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={word}
                onChange={(event) => {
                  setWord(event.target.value);
                  setManualDefinition("");
                  setSearchResult(null);
                  setFeedback(null);
                }}
                placeholder="Ex.: contemplação"
                className="min-h-11 flex-1 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 font-normal text-[var(--serene-fg)] outline-none transition focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
              />
              <button
                type="submit"
                disabled={!canSearch}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="size-4" />
                {searching ? "Buscando..." : "Buscar significado"}
              </button>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--serene-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_74%,transparent)] px-3 py-1.5">
              <BookOpen className="size-3.5 text-[var(--serene-accent)]" />
              {currentPage !== null ? `Página ${currentPage}` : "Página não informada"}
            </span>
            <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_74%,transparent)] px-3 py-1.5">
              Dicionário em português
            </span>
          </div>
        </form>

        {!searchResult && recentEntries.length > 0 && (
          <div className="mt-4 rounded-[1.25rem] border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              Vocabulário deste livro
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentEntries.slice(0, 5).map((entry) => (
                <span
                  key={entry.id}
                  className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                >
                  {entry.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {searching && (
          <p className="mt-4 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]">
            Buscando significado...
          </p>
        )}

        {foundEntry && (
          <section className="mt-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Palavra
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--serene-text)]">
                  {foundEntry.word}
                </h3>
              </div>
              {foundEntry.partOfSpeech && (
                <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]">
                  {foundEntry.partOfSpeech}
                </span>
              )}
            </div>

            {primaryDefinition && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Significado
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--serene-text)]">
                  {primaryDefinition}
                </p>
              </div>
            )}

            {foundEntry.example && (
              <p className="literary mt-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm leading-relaxed text-[var(--serene-muted)]">
                {foundEntry.example}
              </p>
            )}

            {foundEntry.source && (
              <p className="mt-4 text-[11px] text-[var(--serene-muted)]">
                Fonte: {foundEntry.source.name}
              </p>
            )}
          </section>
        )}

        {showManualDefinition && (
          <section className="mt-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--serene-text)]">
              {searchResultMessage}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
              Você ainda pode salvar a palavra no vocabulário deste livro, sem definição automática.
            </p>
            <label className="mt-3 grid gap-2 text-sm font-semibold text-[var(--serene-text)]">
              Significado manual, se quiser
              <textarea
                value={manualDefinition}
                onChange={(event) => setManualDefinition(event.target.value)}
                rows={3}
                placeholder="Escreva com suas palavras. O SERENE não vai inventar uma definição."
                className="resize-none rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 font-normal text-[var(--serene-fg)] outline-none transition focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
              />
            </label>
          </section>
        )}

        {showDictionaryError && (
          <section className="mt-4 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--serene-text)]">
              {searchResultMessage}
            </p>
          </section>
        )}

        {canShowSaveFields && (
          <label className="mt-4 grid gap-2 text-sm font-semibold text-[var(--serene-text)]">
            Observação opcional
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Contexto da frase, sensação, dúvida..."
              className="resize-none rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-4 py-3 font-normal text-[var(--serene-fg)] outline-none transition focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]"
            />
          </label>
        )}

        {feedback && (
          <p className="mt-4 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)]">
            {feedback}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
          >
            Fechar
          </button>
          {canShowSaveFields && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || savedWordKey === resultWord.toLocaleLowerCase("pt-BR")}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="size-4" />
              {saving ? "Salvando..." : "Salvar no vocabulário deste livro"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
