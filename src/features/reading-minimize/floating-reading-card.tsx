"use client";

import { BookOpen, GripHorizontal, Maximize2, PauseCircle, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { ActiveReadingSnapshot } from "@/features/reading-minimize/use-active-reading-session";
import { formatReadingDuration } from "@/features/reading-sessions/use-reading-session";
import { cn } from "@/lib/utils";

type FloatingReadingCardProps = {
  activeReading: ActiveReadingSnapshot;
  onRestore: () => Promise<boolean>;
};

type DockCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type DragState = {
  offsetX: number;
  offsetY: number;
};

type Point = {
  x: number;
  y: number;
};

const CARD_CORNER_STORAGE_KEY = "serene_minimized_reading_card_corner";

const dockClasses: Record<DockCorner, string> = {
  "top-left": "left-4 top-24 sm:left-6",
  "top-right": "right-4 top-24 sm:right-6",
  "bottom-left": "bottom-5 left-4 sm:left-6",
  "bottom-right": "bottom-5 right-4 sm:right-6",
};

function getStoredCorner(): DockCorner {
  if (typeof window === "undefined") {
    return "bottom-left";
  }

  const storedValue = window.localStorage.getItem(CARD_CORNER_STORAGE_KEY);
  if (
    storedValue === "top-left" ||
    storedValue === "top-right" ||
    storedValue === "bottom-left" ||
    storedValue === "bottom-right"
  ) {
    return storedValue;
  }

  return "bottom-left";
}

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBookInitial(title: string) {
  return title.trim().slice(0, 1).toUpperCase() || "S";
}

function getNearestCorner(point: Point, width: number, height: number): DockCorner {
  const centerX = point.x + width / 2;
  const centerY = point.y + height / 2;
  const horizontal = centerX < window.innerWidth / 2 ? "left" : "right";
  const vertical = centerY < window.innerHeight / 2 ? "top" : "bottom";
  return `${vertical}-${horizontal}` as DockCorner;
}

export function FloatingReadingCard({ activeReading, onRestore }: FloatingReadingCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [corner, setCorner] = useState<DockCorner>(getStoredCorner);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [restoring, setRestoring] = useState(false);
  const StatusIcon = activeReading.isTimeRunning ? Timer : PauseCircle;

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const currentDragState = dragState;

    function handlePointerMove(event: PointerEvent) {
      const card = cardRef.current;
      const width = card?.offsetWidth ?? 320;
      const height = card?.offsetHeight ?? 168;
      const nextX = clamp(
        event.clientX - currentDragState.offsetX,
        12,
        window.innerWidth - width - 12,
      );
      const nextY = clamp(
        event.clientY - currentDragState.offsetY,
        84,
        window.innerHeight - height - 12,
      );
      setDragPoint({ x: nextX, y: nextY });
    }

    function handlePointerUp() {
      const card = cardRef.current;
      const point = dragPoint;
      const width = card?.offsetWidth ?? 320;
      const height = card?.offsetHeight ?? 168;

      if (point) {
        const nextCorner = getNearestCorner(point, width, height);
        setCorner(nextCorner);
        window.localStorage.setItem(CARD_CORNER_STORAGE_KEY, nextCorner);
      }

      setDragState(null);
      setDragPoint(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragPoint, dragState]);

  function handleDragStart(event: React.PointerEvent<HTMLButtonElement>) {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();
    setDragPoint({ x: rect.left, y: rect.top });
    setDragState({
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  }

  async function handleRestore() {
    setRestoring(true);
    const restored = await onRestore();
    setRestoring(false);

    if (restored) {
      router.push(getRestoreHref(activeReading));
    }
  }

  function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    void handleRestore();
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    void handleRestore();
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "fixed z-50 w-[min(332px,calc(100vw-2rem))] rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-[var(--serene-fg)] shadow-2xl shadow-black/15",
        dragPoint ? "cursor-grabbing" : `cursor-pointer ${dockClasses[corner]}`,
      )}
      style={dragPoint ? { left: dragPoint.x, top: dragPoint.y } : undefined}
      role="group"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label="Leitura minimizada. Voltar para o livro."
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid aspect-[2/3] w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          {activeReading.book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeReading.book.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center">
              <BookOpen className="size-5" />
              <span className="sr-only">{getBookInitial(activeReading.book.title)}</span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
            Leitura minimizada
          </p>
          <h2 className="mt-1 truncate text-sm font-semibold">{activeReading.book.title}</h2>
          <p className="truncate text-xs text-[var(--serene-muted)]">
            {activeReading.book.author ?? "Autor nao informado"}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={handleDragStart}
          onClick={(event) => event.stopPropagation()}
          className="grid size-8 shrink-0 touch-none place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)]"
          aria-label="Mover cartao de leitura"
          title="Mover"
        >
          <GripHorizontal className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2">
        <div>
          <p className="flex items-center gap-1 text-xs font-medium">
            <StatusIcon className="size-3.5 text-[var(--serene-accent)]" />
            {activeReading.isTimeRunning ? "Tempo contando" : "Pausada por escolha"}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatReadingDuration(activeReading.activeSeconds)}
          </p>
        </div>
        <div className="text-right text-[11px] text-[var(--serene-muted)]">
          <p>Sessao ativa</p>
          <p>Pag. {activeReading.session.current_page_snapshot ?? activeReading.book.current_page}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleRestore()}
        disabled={restoring}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        <Maximize2 className="size-4" />
        Restaurar leitura
      </button>
    </div>
  );
}
