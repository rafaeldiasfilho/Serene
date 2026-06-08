"use client";

import { Map as MapIcon, PlayCircle, X } from "lucide-react";

type MuralEntryDialogProps = {
  bookTitle: string;
  onClose: () => void;
  onStartReading: () => void;
};

export function MuralEntryDialog({
  bookTitle,
  onClose,
  onStartReading,
}: MuralEntryDialogProps) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <section className="serene-soft-in w-full max-w-xl rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
              <MapIcon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                Mural deste livro
              </p>
              <h2 className="literary mt-2 text-2xl leading-tight">{bookTitle}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]"
            aria-label="Fechar aviso do Mural"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--serene-text)]">
            O Mural fica disponivel durante a leitura deste livro.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
            Abra a leitura para organizar post-its, reflexoes e marca-textos em um espaco visual,
            sem pausar o contador automaticamente.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onStartReading}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
          >
            <PlayCircle className="size-4" />
            Iniciar leitura
          </button>
        </div>
      </section>
    </div>
  );
}
