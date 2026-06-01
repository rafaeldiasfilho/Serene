"use client";

import { BookOpen, PauseCircle, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ActiveReadingSnapshot } from "@/features/reading-minimize/use-active-reading-session";
import { formatReadingDuration } from "@/features/reading-sessions/use-reading-session";

type ActiveReadingIndicatorProps = {
  activeReading: ActiveReadingSnapshot;
  onRestore: () => Promise<boolean>;
};

function getRestoreHref(activeReading: ActiveReadingSnapshot) {
  const origin =
    activeReading.session.opened_from === "biblioteca" ||
    activeReading.session.opened_from === "anotacoes" ||
    activeReading.session.opened_from === "mente" ||
    activeReading.session.opened_from === "inicio"
      ? activeReading.session.opened_from
      : "inicio";

  return `/leitura/${activeReading.book.id}?origem=${origin}`;
}

export function ActiveReadingIndicator({
  activeReading,
  onRestore,
}: ActiveReadingIndicatorProps) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);
  const Icon = activeReading.isTimeRunning ? Timer : PauseCircle;

  async function handleRestore() {
    setRestoring(true);
    const restored = await onRestore();
    setRestoring(false);

    if (restored) {
      router.push(getRestoreHref(activeReading));
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleRestore()}
      disabled={restoring}
      className="flex w-full min-w-0 items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-left text-xs shadow-sm transition hover:bg-[var(--serene-surface-soft)] disabled:opacity-70"
      aria-label="Restaurar leitura ativa"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
        <BookOpen className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">
            {activeReading.isTimeRunning ? "Leitura em andamento" : "Leitura pausada"}
          </span>
          <span className="rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
            Sessao ativa
          </span>
          {activeReading.session.mural_opened && (
            <span className="rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
              Mural aberto
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--serene-muted)]">
          {activeReading.book.title}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[var(--serene-surface-soft)] px-2 py-1 text-[11px] tabular-nums text-[var(--serene-muted)] sm:inline-flex">
        <Icon className="size-3.5" />
        {formatReadingDuration(activeReading.activeSeconds)}
      </span>
    </button>
  );
}
