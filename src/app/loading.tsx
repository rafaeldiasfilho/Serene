import { BrainLoader } from "@/components/ui/brain-loader";

export default function Loading() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4">
      <div className="serene-rise flex w-full max-w-md flex-col items-center gap-4 rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(135deg,var(--serene-surface),var(--serene-surface-soft))] px-8 py-9 text-center shadow-[var(--serene-shadow-lift)]">
        <BrainLoader />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            SERENE
          </p>
          <h1 className="mt-2 text-xl font-semibold text-[var(--serene-fg)]">
            Preparando seu espaço de leitura
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
            Um instante para organizar livros, notas e silêncio.
          </p>
        </div>
      </div>
    </section>
  );
}
