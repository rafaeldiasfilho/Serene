import { BrainLoader } from "@/components/ui/brain-loader";

export default function Loading() {
  return (
    <section className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrainLoader />
        <p className="text-sm text-[var(--serene-muted)]">Preparando um espaço calmo para leitura...</p>
      </div>
    </section>
  );
}
