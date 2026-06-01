import { cn } from "@/lib/utils";

type BrainLoaderProps = {
  className?: string;
};

export function BrainLoader({ className }: BrainLoaderProps) {
  return (
    <div
      className={cn(
        "relative grid size-14 place-items-center rounded-full border border-[var(--serene-border)]",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute size-9 rounded-full border border-[var(--serene-muted)] motion-safe:animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
      <div className="absolute size-6 rounded-full border border-[var(--serene-accent)] motion-safe:animate-[spin_4s_linear_infinite_reverse] motion-reduce:animate-none" />
      <span className="relative text-xs font-semibold tracking-wide text-[var(--serene-accent)]">
        SERENE
      </span>
    </div>
  );
}
