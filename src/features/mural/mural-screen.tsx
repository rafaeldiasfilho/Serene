"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  EyeOff,
  GripHorizontal,
  MapIcon,
  Maximize2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { OPEN_ANNOTATION_SHORTCUT_EVENT } from "@/lib/shortcuts";
import {
  AnnotationModal,
  type AnnotationModalSubmitValue,
} from "@/features/annotations/annotation-modal";
import {
  annotationTypeLabel,
  fallbackAnnotationColors,
} from "@/features/annotations/annotation-definitions";
import {
  PostItPaper,
  getPostItDisplayContent,
} from "@/features/annotations/post-it-paper";
import {
  createAnnotation,
  listAnnotationColors,
  softDeleteAnnotation,
  updateAnnotation,
  type AnnotationBookRow,
  type AnnotationColorRow,
  type AnnotationRow,
} from "@/features/annotations/annotation-services";
import type { AnnotationColorOption } from "@/features/annotations/use-annotations";
import {
  getBookById,
  getOpenPauseForSession,
  getOpenSessionForBook,
  updateReadingSession,
  type BookRow,
  type ReadingOpenedFrom,
  type ReadingPauseRow,
  type ReadingSessionRow,
} from "@/features/reading-sessions/reading-session-services";
import { notifyReadingSessionChanged } from "@/features/reading-sessions/reading-session-events";
import { formatReadingDuration } from "@/features/reading-sessions/use-reading-session";
import {
  defaultMuralPreferences,
  getUserSetting,
  normalizeMuralPreferences,
  type MuralPreferences,
} from "@/features/settings/settings-services";
import {
  convertMuralSuggestionIntoAnnotationPosition,
  createMuralSuggestions,
  listMuralAnnotations,
  listMuralPositions,
  listMuralSuggestions,
  setMuralSuggestionStatus,
  updateMuralPosition,
  updateMuralSuggestionPosition,
  upsertMuralPositions,
  type MuralPositionInsert,
  type MuralPositionRow,
  type MuralSuggestionInsert,
  type MuralSuggestionRow,
} from "@/features/mural/mural-services";
import type { AnnotationType, MuralSuggestionStatus } from "@/lib/supabase/database.types";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

type ModalState =
  | {
      mode: "create";
      rect: Rect;
      defaultType: AnnotationType;
      suggestion: MuralSuggestionRow | null;
    }
  | {
      mode: "edit";
      annotation: AnnotationRow;
    };

type InteractionTarget = "annotation" | "suggestion";
type InteractionKind = "move" | "resize";

type Interaction = {
  target: InteractionTarget;
  kind: InteractionKind;
  id: string;
  startClientX: number;
  startClientY: number;
  startRect: Rect;
};

const CANVAS_WIDTH = 1480;
const CANVAS_HEIGHT = 960;
const CARD_WIDTH = 300;
const CARD_HEIGHT = 170;
const SUGGESTION_WIDTH = 250;
const SUGGESTION_HEIGHT = 126;
const MIN_CARD_WIDTH = 230;
const MIN_CARD_HEIGHT = 130;
const AUTO_SUGGEST_AFTER_SECONDS = 90;
const SUGGESTION_LIMIT = 5;
const SUGGESTION_ENTRY_DELAY_MS = 110;

const suggestionTypes: AnnotationType[] = ["idea", "reflection", "doubt", "action", "thought"];

const suggestionCopy: Record<string, { title: string; body: string }> = {
  idea: {
    title: "Ideia importante?",
    body: "Algo aqui merece virar conexao?",
  },
  reflection: {
    title: "Algo para lembrar?",
    body: "O que ficou depois desta pagina?",
  },
  doubt: {
    title: "Duvida que surgiu?",
    body: "Que pergunta pede retorno?",
  },
  action: {
    title: "Um gesto possivel?",
    body: "Existe algo pequeno a fazer depois?",
  },
  thought: {
    title: "Frase na mente?",
    body: "Alguma frase ficou rondando?",
  },
};

function normalizeOrigin(value: string | null): ReadingOpenedFrom {
  if (value === "inicio" || value === "biblioteca" || value === "anotacoes" || value === "mente") {
    return value;
  }
  return "desconhecido";
}

function getOriginHref(origin: ReadingOpenedFrom) {
  if (origin === "biblioteca") {
    return "/biblioteca";
  }
  if (origin === "anotacoes") {
    return "/anotacoes";
  }
  if (origin === "mente") {
    return "/mente";
  }
  return "/";
}

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toSecondsBetween(startMs: number, endMs: number) {
  if (endMs <= startMs) {
    return 0;
  }
  return Math.floor((endMs - startMs) / 1000);
}

function getActiveSecondsAt(
  session: ReadingSessionRow | null,
  openPause: ReadingPauseRow | null,
  atMs: number,
) {
  if (!session) {
    return 0;
  }

  if (session.status === "active") {
    const startedAtMs = parseIsoToMs(session.started_at) ?? atMs;
    const elapsedTotal = toSecondsBetween(startedAtMs, atMs);
    return Math.max(0, elapsedTotal - getPausedSecondsAt(session, openPause, atMs));
  }

  return session.active_seconds;
}

function getPausedSecondsAt(
  session: ReadingSessionRow | null,
  openPause: ReadingPauseRow | null,
  atMs: number,
) {
  if (!session) {
    return 0;
  }

  if (session.status !== "paused") {
    return session.paused_seconds;
  }

  const pauseStartMs = parseIsoToMs(openPause?.paused_at) ?? parseIsoToMs(session.updated_at) ?? atMs;
  return session.paused_seconds + toSecondsBetween(pauseStartMs, atMs);
}

function mapColorRows(rows: AnnotationColorRow[]): AnnotationColorOption[] {
  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      color_hex: row.color_hex,
      name: row.name,
      applies_to: row.applies_to,
      is_default: row.is_default,
    }));
  }

  return fallbackAnnotationColors.map((color, index) => ({
    id: `fallback-${index + 1}`,
    color_hex: color,
    name: null,
    applies_to: null,
    is_default: index === 0,
  }));
}

function rowToAnnotationBook(book: BookRow): AnnotationBookRow {
  return {
    id: book.id,
    title: book.title,
    status: book.status,
    reading_origin: book.reading_origin,
    read_before_serene: book.read_before_serene,
    total_pages: book.total_pages,
    current_page: book.current_page,
  };
}

function numberOr(value: number | null, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampRect(rect: Rect) {
  const width = clamp(rect.width, MIN_CARD_WIDTH, CANVAS_WIDTH - 40);
  const height = clamp(rect.height, MIN_CARD_HEIGHT, CANVAS_HEIGHT - 40);
  return {
    ...rect,
    width,
    height,
    x: clamp(rect.x, 0, CANVAS_WIDTH - width),
    y: clamp(rect.y, 0, CANVAS_HEIGHT - height),
  };
}

function overlaps(a: Rect, b: Rect, gap = 24) {
  return !(
    a.x + a.width + gap < b.x ||
    b.x + b.width + gap < a.x ||
    a.y + a.height + gap < b.y ||
    b.y + b.height + gap < a.y
  );
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashString(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) % 10000) / 10000;
  };
}

function findFreeRect(
  seed: string,
  blockedRects: Rect[],
  width: number,
  height: number,
  fallbackIndex: number,
) {
  const random = seededRandom(seed);
  const maxX = Math.max(0, CANVAS_WIDTH - width - 48);
  const maxY = Math.max(0, CANVAS_HEIGHT - height - 48);

  for (let attempt = 0; attempt < 42; attempt += 1) {
    const candidate = {
      x: Math.round(48 + random() * maxX),
      y: Math.round(84 + random() * Math.max(240, maxY - 84)),
      width,
      height,
    };

    if (!blockedRects.some((rect) => overlaps(candidate, rect))) {
      return candidate;
    }
  }

  const columns = Math.max(1, Math.floor((CANVAS_WIDTH - 96) / (width + 36)));
  const rows = Math.max(1, Math.floor((CANVAS_HEIGHT - 140) / (height + 42)));
  const totalSlots = columns * rows;

  for (let step = 0; step < totalSlots; step += 1) {
    const gridIndex = (fallbackIndex + step) % totalSlots;
    const candidate = clampRect({
      x: 48 + (gridIndex % columns) * (width + 36),
      y: 96 + Math.floor(gridIndex / columns) * (height + 42),
      width,
      height,
    });

    if (!blockedRects.some((rect) => overlaps(candidate, rect))) {
      return candidate;
    }
  }

  return clampRect({
    x: 72 + (fallbackIndex % 4) * (width + 34),
    y: 110 + Math.floor(fallbackIndex / 4) * (height + 48),
    width,
    height,
  });
}

function getPositionRect(position: MuralPositionRow): Rect {
  return {
    x: numberOr(position.x, 80),
    y: numberOr(position.y, 120),
    width: numberOr(position.width, CARD_WIDTH),
    height: numberOr(position.height, CARD_HEIGHT),
    rotation: numberOr(position.rotation, 0),
    zIndex: position.z_index,
  };
}

function getSuggestionRect(suggestion: MuralSuggestionRow): Rect {
  return {
    x: numberOr(suggestion.x, 80),
    y: numberOr(suggestion.y, 120),
    width: numberOr(suggestion.width, SUGGESTION_WIDTH),
    height: numberOr(suggestion.height, SUGGESTION_HEIGHT),
    rotation: numberOr(suggestion.rotation, 0),
    zIndex: 60 + suggestion.suggested_slot,
  };
}

function buildMissingPositionPayloads(
  userId: string,
  sessionId: string,
  bookId: string,
  annotations: AnnotationRow[],
  existingPositions: MuralPositionRow[],
) {
  const existingAnnotationIds = new Set(existingPositions.map((position) => position.annotation_id));
  const blockedRects = existingPositions.map(getPositionRect);
  const maxZ = existingPositions.reduce((highest, position) => Math.max(highest, position.z_index), 0);
  const payloads: MuralPositionInsert[] = [];

  annotations.forEach((annotation, index) => {
    if (existingAnnotationIds.has(annotation.id)) {
      return;
    }

    const rect = findFreeRect(
      `${sessionId}:${annotation.id}`,
      blockedRects,
      CARD_WIDTH,
      CARD_HEIGHT,
      index,
    );
    blockedRects.push(rect);

    payloads.push({
      user_id: userId,
      annotation_id: annotation.id,
      session_id: sessionId,
      book_id: bookId,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotation: 0,
      z_index: maxZ + payloads.length + 1,
      is_visible: true,
      is_suggested: false,
      suggested_slot: null,
    });
  });

  return payloads;
}

function buildMissingSuggestionPayloads(
  userId: string,
  sessionId: string,
  existingSuggestions: MuralSuggestionRow[],
  blockedRects: Rect[],
) {
  const existingSlots = new Set(existingSuggestions.map((suggestion) => suggestion.suggested_slot));
  const payloads: MuralSuggestionInsert[] = [];

  for (let slot = 1; slot <= SUGGESTION_LIMIT; slot += 1) {
    if (existingSlots.has(slot)) {
      continue;
    }

    const rect = findFreeRect(
      `${sessionId}:suggestion:${slot}`,
      blockedRects,
      SUGGESTION_WIDTH,
      SUGGESTION_HEIGHT,
      slot + 8,
    );
    blockedRects.push(rect);

    payloads.push({
      user_id: userId,
      session_id: sessionId,
      suggested_type: suggestionTypes[(slot - 1) % suggestionTypes.length],
      suggested_slot: slot,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotation: slot % 2 === 0 ? -1 : 1,
      status: "available",
      converted_annotation_id: null,
    });
  }

  return payloads.slice(0, Math.max(0, SUGGESTION_LIMIT - existingSuggestions.length));
}

function normalizeSuggestionType(type: AnnotationType | null): AnnotationType {
  if (type && type !== "ocr_page") {
    return type;
  }
  return "idea";
}

function getSuggestionProgressLabel(
  showSuggestions: boolean,
  createdCount: number,
  visibleCount: number,
) {
  if (!showSuggestions) {
    return "Convites suaves desligados";
  }

  if (createdCount >= SUGGESTION_LIMIT && visibleCount === 0) {
    return "5 convites registrados - continue pelo +";
  }

  if (visibleCount === 0) {
    return `${createdCount}/${SUGGESTION_LIMIT} convites da sessao`;
  }

  return `${visibleCount} ${
    visibleCount === 1 ? "convite visivel" : "convites visiveis"
  } - ${createdCount}/${SUGGESTION_LIMIT}`;
}

function renderAnnotationContent(annotation: AnnotationRow) {
  const content = annotation.content?.trim() || "Sem conteudo";

  if (annotation.type === "post_it") {
    return (
      <PostItPaper
        color={annotation.color}
        content={getPostItDisplayContent(content, false)}
        size="mural"
        textColor={annotation.text_color}
      />
    );
  }

  if (annotation.type === "highlight") {
    return (
      <p className="text-sm leading-relaxed">
        <mark
          className="rounded px-1 py-0.5 shadow-[0_1px_0_rgb(0_0_0_/_4%)]"
          style={{ backgroundColor: annotation.highlight_color ?? "#F7E78A", color: "#2B2B2B" }}
        >
          {content}
        </mark>
      </p>
    );
  }

  if (annotation.type === "reflection" || annotation.type === "thought") {
    return (
      <div className="annotation-detail rounded-[24px] border px-3 py-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_22%)]">
        <p className="literary text-[15px] leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "flag") {
    return (
      <div className="annotation-detail flex items-start gap-2 rounded-lg border px-3 py-2">
        <span className="annotation-marker mt-0.5 inline-block h-5 w-1 rounded" />
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "idea") {
    return (
      <div className="annotation-detail rounded-lg border px-3 py-2">
        <p className="annotation-label text-[11px] font-semibold uppercase tracking-[0.14em]">
          Insight
        </p>
        <p className="mt-1 text-sm leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "doubt") {
    return (
      <div className="annotation-detail rounded-lg border px-3 py-2">
        <p className="annotation-label text-[11px] font-semibold uppercase tracking-[0.14em]">
          Pergunta
        </p>
        <p className="mt-1 text-sm leading-relaxed">{content}</p>
      </div>
    );
  }

  if (annotation.type === "action") {
    return (
      <div className="annotation-detail rounded-lg border px-3 py-2">
        <p className="annotation-label text-[11px] font-semibold uppercase tracking-[0.14em]">
          Acao pratica
        </p>
        <p className="mt-1 text-sm leading-relaxed">[ ] {content}</p>
      </div>
    );
  }

  return <p className="text-sm leading-relaxed">{content}</p>;
}

function getAnnotationClass(type: AnnotationType) {
  if (type === "post_it") {
    return "annotation-tone-post-it";
  }
  if (type === "reflection") {
    return "annotation-tone-reflection";
  }
  if (type === "highlight") {
    return "annotation-tone-highlight";
  }
  if (type === "flag") {
    return "annotation-tone-flag";
  }
  if (type === "idea") {
    return "annotation-tone-idea";
  }
  if (type === "doubt") {
    return "annotation-tone-doubt";
  }
  if (type === "action") {
    return "annotation-tone-action";
  }
  if (type === "thought") {
    return "annotation-tone-thought";
  }
  return "border-[var(--serene-border)] bg-[var(--serene-surface)]";
}

function getAnnotationSurfaceStyle(type: AnnotationType) {
  if (type === "post_it") {
    return "0 16px 30px rgb(0 0 0 / 9%), 2px 5px 0 rgb(0 0 0 / 5%)";
  }
  if (type === "reflection" || type === "thought") {
    return "0 18px 38px rgb(0 0 0 / 8%)";
  }
  return "0 14px 30px rgb(0 0 0 / 7%)";
}

export function MuralScreen() {
  const params = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { authLoading, envReady, profileState, user } = useAppState();

  const bookId = typeof params.bookId === "string" ? params.bookId : "";
  const queryOrigin = normalizeOrigin(searchParams.get("origem"));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);
  const [session, setSession] = useState<ReadingSessionRow | null>(null);
  const [openPause, setOpenPause] = useState<ReadingPauseRow | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationRow[]>([]);
  const [positions, setPositions] = useState<MuralPositionRow[]>([]);
  const [suggestions, setSuggestions] = useState<MuralSuggestionRow[]>([]);
  const [colors, setColors] = useState<AnnotationColorOption[]>(() => mapColorRows([]));
  const [muralPreferences, setMuralPreferences] =
    useState<MuralPreferences>(defaultMuralPreferences);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const latestInteractionRectRef = useRef<Rect | null>(null);

  const activeSeconds = useMemo(
    () => getActiveSecondsAt(session, openPause, clockMs),
    [clockMs, openPause, session],
  );
  const pausedSeconds = useMemo(
    () => getPausedSecondsAt(session, openPause, clockMs),
    [clockMs, openPause, session],
  );

  const originFromSession = normalizeOrigin(session?.opened_from ?? null);
  const returnOrigin = originFromSession === "desconhecido" ? queryOrigin : originFromSession;

  const loadMural = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [bookResult, sessionResult, colorsResult, muralPreferencesResult] = await Promise.all([
      getBookById(user.id, bookId),
      getOpenSessionForBook(user.id, bookId),
      listAnnotationColors(user.id),
      getUserSetting(user.id, "mural_preferences"),
    ]);

    if (bookResult.error || sessionResult.error || colorsResult.error) {
      setError(
        bookResult.error?.message ??
          sessionResult.error?.message ??
          colorsResult.error?.message ??
          "Nao foi possivel abrir o Mural.",
      );
      setLoading(false);
      return;
    }

    const loadedMuralPreferences = muralPreferencesResult.error
      ? defaultMuralPreferences
      : normalizeMuralPreferences(muralPreferencesResult.data?.value ?? null);

    if (!bookResult.data || !sessionResult.data) {
      setBook(bookResult.data ?? null);
      setSession(sessionResult.data ?? null);
      setLoading(false);
      return;
    }

    let activeSession = sessionResult.data;
    if (!activeSession.mural_opened) {
      const muralResult = await updateReadingSession(activeSession.id, user.id, {
        mural_opened: true,
      });
      if (!muralResult.error && muralResult.data) {
        activeSession = muralResult.data;
        notifyReadingSessionChanged();
      }
    }

    const [pauseResult, annotationsResult, positionsResult, suggestionsResult] = await Promise.all([
      activeSession.status === "paused"
        ? getOpenPauseForSession(user.id, activeSession.id)
        : Promise.resolve({ data: null, error: null }),
      listMuralAnnotations(user.id, bookId),
      listMuralPositions(user.id, activeSession.id, bookId),
      listMuralSuggestions(user.id, activeSession.id),
    ]);

    if (
      pauseResult.error ||
      annotationsResult.error ||
      positionsResult.error ||
      suggestionsResult.error
    ) {
      setError(
        pauseResult.error?.message ??
          annotationsResult.error?.message ??
          positionsResult.error?.message ??
          suggestionsResult.error?.message ??
          "Nao foi possivel carregar o Mural.",
      );
      setLoading(false);
      return;
    }

    const annotationRows = annotationsResult.data ?? [];
    let positionRows = positionsResult.data ?? [];
    let suggestionRows = suggestionsResult.data ?? [];

    const missingPositions = buildMissingPositionPayloads(
      user.id,
      activeSession.id,
      bookId,
      annotationRows,
      positionRows,
    );

    if (missingPositions.length > 0) {
      const upsertResult = await upsertMuralPositions(missingPositions);
      if (upsertResult.error) {
        setError(upsertResult.error.message);
        setLoading(false);
        return;
      }
      positionRows = [...positionRows, ...(upsertResult.data ?? [])];
    }

    const suggestionEligible =
      getActiveSecondsAt(activeSession, pauseResult.data ?? null, Date.now()) >=
        AUTO_SUGGEST_AFTER_SECONDS || annotationRows.length > 0;

    if (
      loadedMuralPreferences.show_suggestions &&
      suggestionEligible &&
      suggestionRows.length < SUGGESTION_LIMIT
    ) {
      const blockedRects = [
        ...positionRows.map(getPositionRect),
        ...suggestionRows.map(getSuggestionRect),
      ];
      const missingSuggestions = buildMissingSuggestionPayloads(
        user.id,
        activeSession.id,
        suggestionRows,
        blockedRects,
      );

      if (missingSuggestions.length > 0) {
        const suggestionResult = await createMuralSuggestions(missingSuggestions);
        if (suggestionResult.error) {
          setError(suggestionResult.error.message);
          setLoading(false);
          return;
        }
        suggestionRows = [...suggestionRows, ...(suggestionResult.data ?? [])];
      }
    }

    setBook(bookResult.data);
    setSession(activeSession);
    setOpenPause(pauseResult.data ?? null);
    setAnnotations(annotationRows);
    setPositions(positionRows);
    setSuggestions(suggestionRows);
    setColors(mapColorRows(colorsResult.data ?? []));
    setMuralPreferences(loadedMuralPreferences);
    setClockMs(Date.now());
    setLoading(false);
  }, [bookId, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMural();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMural]);

  useEffect(() => {
    if (!session || (session.status !== "active" && session.status !== "paused")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session]);

  useEffect(() => {
    function handleOpenAnnotationShortcut() {
      if (loading || !book || !session) {
        return;
      }

      setFeedback(null);
      setModalState({
        mode: "create",
        rect: getVisibleCenterRect(),
        defaultType: "quick_note",
        suggestion: null,
      });
    }

    window.addEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);

    return () => {
      window.removeEventListener(OPEN_ANNOTATION_SHORTCUT_EVENT, handleOpenAnnotationShortcut);
    };
  }, [book, loading, session]);

  useEffect(() => {
    if (!interaction || !user) {
      return;
    }

    const activeInteraction = interaction;
    const activeUser = user;

    function updateLocalRect(nextRect: Rect) {
      latestInteractionRectRef.current = nextRect;

      if (activeInteraction.target === "annotation") {
        setPositions((current) =>
          current.map((position) =>
            position.id === activeInteraction.id
              ? {
                  ...position,
                  x: nextRect.x,
                  y: nextRect.y,
                  width: nextRect.width,
                  height: nextRect.height,
                  z_index: nextRect.zIndex ?? position.z_index,
                }
              : position,
          ),
        );
        return;
      }

      setSuggestions((current) =>
        current.map((suggestion) =>
          suggestion.id === activeInteraction.id
            ? {
                ...suggestion,
                x: nextRect.x,
                y: nextRect.y,
                width: nextRect.width,
                height: nextRect.height,
              }
            : suggestion,
        ),
      );
    }

    function handlePointerMove(event: PointerEvent) {
      const deltaX = event.clientX - activeInteraction.startClientX;
      const deltaY = event.clientY - activeInteraction.startClientY;
      const startRect = activeInteraction.startRect;

      const nextRect =
        activeInteraction.kind === "move"
          ? clampRect({
              ...startRect,
              x: startRect.x + deltaX,
              y: startRect.y + deltaY,
            })
          : clampRect({
              ...startRect,
              width: startRect.width + deltaX,
              height: startRect.height + deltaY,
            });

      updateLocalRect(nextRect);
    }

    function handlePointerUp() {
      const finalRect = latestInteractionRectRef.current ?? activeInteraction.startRect;
      const payload = {
        x: finalRect.x,
        y: finalRect.y,
        width: finalRect.width,
        height: finalRect.height,
      };

      if (activeInteraction.target === "annotation") {
        void updateMuralPosition(activeInteraction.id, activeUser.id, {
          ...payload,
          z_index: finalRect.zIndex,
        }).then(({ error: updateError, data }) => {
          if (updateError) {
            setError(updateError.message);
            void loadMural();
            return;
          }
          if (data) {
            setPositions((current) =>
              current.map((position) => (position.id === data.id ? data : position)),
            );
          }
        });
      } else {
        void updateMuralSuggestionPosition(activeInteraction.id, activeUser.id, payload).then(
          ({ error: updateError, data }) => {
            if (updateError) {
              setError(updateError.message);
              void loadMural();
              return;
            }
            if (data) {
              setSuggestions((current) =>
                current.map((suggestion) => (suggestion.id === data.id ? data : suggestion)),
              );
            }
          },
        );
      }

      latestInteractionRectRef.current = null;
      setInteraction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [interaction, loadMural, user]);

  const positionsByAnnotationId = useMemo(() => {
    return new Map(positions.map((position) => [position.annotation_id, position]));
  }, [positions]);

  const visibleSuggestions = useMemo(() => {
    if (!muralPreferences.show_suggestions) {
      return [];
    }
    return suggestions.filter((suggestion) => suggestion.status === "available");
  }, [muralPreferences.show_suggestions, suggestions]);

  const suggestionProgressLabel = useMemo(
    () =>
      getSuggestionProgressLabel(
        muralPreferences.show_suggestions,
        suggestions.length,
        visibleSuggestions.length,
      ),
    [muralPreferences.show_suggestions, suggestions.length, visibleSuggestions.length],
  );

  const annotationCountLabel = `${annotations.length} ${
    annotations.length === 1 ? "memoria" : "memorias"
  }`;
  const positionCountLabel = `${positions.length} ${
    positions.length === 1 ? "posicao guardada" : "posicoes guardadas"
  }`;

  function startInteraction(
    event: React.PointerEvent,
    target: InteractionTarget,
    kind: InteractionKind,
    id: string,
    rect: Rect,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const nextZ =
      target === "annotation"
        ? Math.max(1, ...positions.map((position) => position.z_index)) + 1
        : rect.zIndex;
    const startRect = { ...rect, zIndex: nextZ };
    latestInteractionRectRef.current = startRect;

    if (target === "annotation" && nextZ) {
      setPositions((current) =>
        current.map((position) =>
          position.id === id ? { ...position, z_index: nextZ } : position,
        ),
      );
    }

    setInteraction({
      target,
      kind,
      id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect,
    });
  }

  function getVisibleCenterRect() {
    const viewport = viewportRef.current;
    if (!viewport) {
      return {
        x: CANVAS_WIDTH / 2 - CARD_WIDTH / 2,
        y: CANVAS_HEIGHT / 2 - CARD_HEIGHT / 2,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      };
    }

    return clampRect({
      x: viewport.scrollLeft + viewport.clientWidth / 2 - CARD_WIDTH / 2,
      y: viewport.scrollTop + viewport.clientHeight / 2 - CARD_HEIGHT / 2,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  }

  async function closeMural() {
    if (!user || !session) {
      router.push(`/leitura/${bookId}?origem=${returnOrigin}`);
      return;
    }

    setSaving(true);
    const result = await updateReadingSession(session.id, user.id, {
      mural_opened: false,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    notifyReadingSessionChanged();
    router.push(`/leitura/${bookId}?origem=${returnOrigin}`);
  }

  async function updateSuggestionStatus(
    suggestion: MuralSuggestionRow,
    status: Exclude<MuralSuggestionStatus, "available" | "used">,
  ) {
    if (!user) {
      return;
    }

    setSaving(true);
    const result = await setMuralSuggestionStatus(suggestion.id, user.id, status);
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.data) {
      setSuggestions((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
    }
  }

  async function handleDeleteAnnotation(annotation: AnnotationRow) {
    if (!user) {
      return;
    }

    setSaving(true);
    const result = await softDeleteAnnotation(annotation.id, user.id);
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setFeedback(
      annotation.type === "post_it"
        ? "Post-it movido para a Lixeira."
        : "Anotacao enviada para a Lixeira.",
    );
    await loadMural();
  }

  async function handleModalSubmit(value: AnnotationModalSubmitValue) {
    if (!user || !book || !session || !modalState) {
      return { ok: false, message: "Mural indisponivel para salvar agora." };
    }

    if (modalState.mode === "edit") {
      const result = await updateAnnotation(modalState.annotation.id, user.id, {
        book_id: value.bookId,
        session_id: value.sessionId,
        type: value.type,
        content: value.content,
        page_number: value.pageNumber,
        color: value.color,
        text_color: value.textColor,
        highlight_color: value.highlightColor,
        origin: value.origin,
        is_favorite: value.isFavorite,
        is_private: value.isPrivate,
        review_status: value.reviewStatus,
      });

      if (result.error) {
        return { ok: false, message: result.error.message };
      }

      setFeedback("Anotacao atualizada no Mural e nas outras telas.");
      await loadMural();
      return { ok: true, message: null };
    }

    const created = await createAnnotation({
      user_id: user.id,
      book_id: book.id,
      session_id: session.id,
      type: value.type,
      content: value.content,
      page_number: value.pageNumber,
      color: value.color,
      text_color: value.textColor,
      highlight_color: value.highlightColor,
      origin: "mural",
      is_favorite: value.isFavorite,
      is_private: value.isPrivate,
      review_status: value.reviewStatus,
    });

    if (created.error || !created.data) {
      return {
        ok: false,
        message: created.error?.message ?? "Nao foi possivel criar a anotacao.",
      };
    }

    const sourceSuggestion = modalState.suggestion;
    const nextZIndex = Math.max(1, ...positions.map((position) => position.z_index)) + 1;

    if (sourceSuggestion) {
      const suggestionResult = await convertMuralSuggestionIntoAnnotationPosition({
        userId: user.id,
        suggestion: sourceSuggestion,
        annotationId: created.data.id,
        bookId: book.id,
        zIndex: nextZIndex,
      });

      if (suggestionResult.error) {
        return { ok: false, message: suggestionResult.error.message };
      }
    } else {
      const positionPayload: MuralPositionInsert = {
        user_id: user.id,
        annotation_id: created.data.id,
        session_id: session.id,
        book_id: book.id,
        x: modalState.rect.x,
        y: modalState.rect.y,
        width: modalState.rect.width,
        height: modalState.rect.height,
        rotation: modalState.rect.rotation ?? 0,
        z_index: nextZIndex,
        is_visible: true,
        is_suggested: false,
        suggested_slot: null,
      };

      const positionResult = await upsertMuralPositions([positionPayload]);
      if (positionResult.error) {
        return { ok: false, message: positionResult.error.message };
      }
    }

    setFeedback(
      sourceSuggestion
        ? "Balao convertido em anotacao real."
        : "Anotacao criada no centro visivel do Mural.",
    );
    await loadMural();
    return { ok: true, message: null };
  }

  if (!envReady) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-800">
        Configure as variaveis Supabase para usar o Mural.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo seu Mural...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (loading) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Organizando o espaco visual...</p>
        </div>
      </section>
    );
  }

  if (!book || !session) {
    return (
      <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
        <h1 className="text-xl font-semibold">Mural indisponivel</h1>
        <p className="mt-2 text-sm text-[var(--serene-muted)]">
          Abra uma sessao de leitura ativa para usar o Mural deste livro.
        </p>
        <button
          type="button"
          onClick={() => router.push(getOriginHref(returnOrigin))}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
      </section>
    );
  }

  return (
    <section className="mural-enter space-y-4">
      <header className="overflow-hidden rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-4 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void closeMural()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
          >
            <ArrowLeft className="size-4" />
            Voltar para leitura
          </button>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--serene-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 shadow-[var(--serene-shadow-soft)]">
              <MapIcon className="size-4" />
              Mural aberto sem pausar
            </span>
            <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_76%,transparent)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] shadow-[var(--serene-shadow-soft)]">
              {suggestionProgressLabel}
            </span>
            <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 font-semibold tabular-nums text-[var(--serene-fg)] shadow-[var(--serene-shadow-soft)]">
              {formatReadingDuration(activeSeconds)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              Mesa de ideias
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{book.title}</h1>
            <p className="text-sm text-[var(--serene-muted)]">
              {book.author ?? "Autor nao informado"}
            </p>
          </div>
          <p className="text-sm text-[var(--serene-muted)]">
            Tempo pausado: {formatReadingDuration(pausedSeconds)}
          </p>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
        <div className="rounded-[1.5rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_88%,transparent)] px-4 py-3 shadow-[var(--serene-shadow-soft)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
            Mapa mental da sessao
          </p>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Uma mesa aberta para aproximar trechos, ideias e perguntas deste livro, com posicoes
            preservadas enquanto a leitura continua.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_88%,transparent)] px-4 py-3 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] backdrop-blur">
          <span className="rounded-full bg-[var(--serene-surface-soft)] px-3 py-1.5">
            {annotationCountLabel}
          </span>
          <span className="rounded-full bg-[var(--serene-surface-soft)] px-3 py-1.5">
            {positionCountLabel}
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {feedback && (
        <p className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm shadow-[var(--serene-shadow-soft)]">
          {feedback}
        </p>
      )}

      <div
        ref={viewportRef}
        className="relative h-[68vh] min-h-[420px] overflow-auto rounded-[2rem] border border-[color-mix(in_oklab,var(--serene-border)_82%,transparent)] bg-[#fbfaf5] shadow-[inset_0_1px_0_rgb(255_255_255_/_60%),inset_0_0_48px_rgb(94_74_51_/_7%),var(--serene-shadow-lift)] dark:bg-[#1f211d] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_5%),inset_0_0_56px_rgb(0_0_0_/_28%),var(--serene-shadow-lift)] sm:min-h-[560px]"
      >
        <div
          className="relative"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundImage: muralPreferences.calm_grid_enabled
              ? "radial-gradient(circle at 18% 14%, color-mix(in oklab, var(--serene-surface) 76%, white 24%), transparent 25%), radial-gradient(circle at 78% 18%, color-mix(in oklab, var(--serene-accent) 13%, transparent), transparent 28%), linear-gradient(color-mix(in oklab, var(--serene-border) 42%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--serene-border) 42%, transparent) 1px, transparent 1px)"
              : "radial-gradient(circle at 18% 14%, color-mix(in oklab, var(--serene-surface) 76%, white 24%), transparent 25%), radial-gradient(circle at 78% 18%, color-mix(in oklab, var(--serene-accent) 13%, transparent), transparent 28%)",
            backgroundPosition: muralPreferences.calm_grid_enabled
              ? "0 0, 0 0, -1px -1px, -1px -1px"
              : undefined,
            backgroundSize: muralPreferences.calm_grid_enabled
              ? "auto, auto, 38px 38px, 38px 38px"
              : undefined,
          }}
        >
          {annotations.map((annotation) => {
            const position = positionsByAnnotationId.get(annotation.id);
            if (!position) {
              return null;
            }
            const rect = getPositionRect(position);

            return (
              <article
                key={annotation.id}
                className={[
                  "serene-soft-in absolute border transition-[box-shadow,transform,opacity] touch-none",
                  annotation.type === "post_it"
                    ? "overflow-visible rounded-[1.35rem] p-2"
                    : "overflow-hidden rounded-2xl p-3",
                  interaction?.id === position.id ? "ring-2 ring-[var(--serene-accent)] ring-offset-2 ring-offset-transparent" : "",
                  getAnnotationClass(annotation.type),
                ].join(" ")}
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  zIndex: rect.zIndex,
                  transform: `rotate(${rect.rotation ?? 0}deg)`,
                  boxShadow: getAnnotationSurfaceStyle(annotation.type),
                }}
              >
                <div
                  className="flex cursor-grab items-start justify-between gap-2 rounded-xl border border-black/5 bg-white/20 px-2 py-1.5 backdrop-blur-[1px] active:cursor-grabbing dark:bg-white/5"
                  onPointerDown={(event) =>
                    startInteraction(event, "annotation", "move", position.id, rect)
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] opacity-75">
                      {annotationTypeLabel[annotation.type]}
                    </p>
                    {annotation.page_number !== null && (
                      <p className="text-xs opacity-70">Pag {annotation.page_number}</p>
                    )}
                  </div>
                  <GripHorizontal className="size-4 shrink-0 opacity-45" />
                </div>

                <div className={annotation.type === "post_it" ? "mt-2 overflow-visible" : "mt-2 max-h-[calc(100%-74px)] overflow-hidden"}>
                  {renderAnnotationContent(annotation)}
                </div>

                <div className="absolute bottom-2 left-2 flex gap-1 opacity-85 transition hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setModalState({ mode: "edit", annotation });
                    }}
                    className="grid size-8 place-items-center rounded-full border border-black/10 bg-white/75 text-[#2f2a24] shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-black/25 dark:text-[var(--serene-fg)]"
                    title="Editar anotacao"
                    aria-label="Editar anotacao"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteAnnotation(annotation);
                    }}
                    className="grid size-8 place-items-center rounded-full border border-black/10 bg-white/75 text-[#6f665d] shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-black/25 dark:text-[var(--serene-muted)]"
                    title="Enviar para Lixeira"
                    aria-label="Enviar anotacao para Lixeira"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  className="absolute bottom-2 right-2 grid size-8 cursor-nwse-resize place-items-center rounded-full border border-black/10 bg-white/75 text-[#2f2a24] opacity-85 shadow-sm backdrop-blur transition hover:bg-white hover:opacity-100 dark:border-white/10 dark:bg-black/25 dark:text-[var(--serene-fg)]"
                  title="Redimensionar"
                  aria-label="Redimensionar anotacao"
                  onPointerDown={(event) =>
                    startInteraction(event, "annotation", "resize", position.id, rect)
                  }
                >
                  <Maximize2 className="size-3.5" />
                </button>
              </article>
            );
          })}

          {visibleSuggestions.map((suggestion) => {
            const rect = getSuggestionRect(suggestion);
            const type = normalizeSuggestionType(suggestion.suggested_type);
            const copy = suggestionCopy[type] ?? suggestionCopy.idea;

            return (
              <article
                key={suggestion.id}
                className="mural-suggestion-enter absolute rounded-[30px] border border-dashed border-[#78a7a0]/70 bg-[#f4fbf8]/95 p-4 text-[#243f3b] shadow-[0_14px_30px_rgb(0_0_0_/_7%)] touch-none backdrop-blur-[1px] dark:border-[#7fb3a9]/70 dark:bg-[#21322f]/95 dark:text-[#e5f7f2]"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  minHeight: rect.height,
                  zIndex: rect.zIndex,
                  transform: `rotate(${rect.rotation ?? 0}deg)`,
                  animationDelay: `${
                    Math.max(0, suggestion.suggested_slot - 1) * SUGGESTION_ENTRY_DELAY_MS
                  }ms`,
                }}
                onClick={() => setFeedback("Balao mantido no Mural. Use um comando explicito para remove-lo.")}
              >
                <div
                  className="flex cursor-grab items-start justify-between gap-2 active:cursor-grabbing"
                  onPointerDown={(event) =>
                    startInteraction(event, "suggestion", "move", suggestion.id, rect)
                  }
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 size-2 rounded-full bg-[#78a7a0] shadow-[0_0_0_4px_rgb(120_167_160_/_12%)]" />
                    <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                      Sugestao {suggestion.suggested_slot}/5
                    </p>
                    <h2 className="mt-1 text-sm font-semibold">{copy.title}</h2>
                    </div>
                  </div>
                  <GripHorizontal className="size-4 shrink-0 opacity-60" />
                </div>
                <p className="mt-2 text-sm leading-relaxed">{copy.body}</p>

                <div className="mt-3 flex gap-1 opacity-90 transition hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setModalState({
                        mode: "create",
                        rect,
                        defaultType: type,
                        suggestion,
                      });
                    }}
                    className="grid size-8 place-items-center rounded-full bg-[#37695f] text-white shadow-sm transition hover:opacity-95"
                    title="Converter em anotacao"
                    aria-label="Converter sugestao em anotacao"
                  >
                    <Plus className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateSuggestionStatus(suggestion, "hidden");
                    }}
                    className="grid size-8 place-items-center rounded-full border border-[#78a7a0] bg-white/75 text-[#37695f] shadow-sm transition hover:bg-white dark:bg-white/10 dark:text-[#e5f7f2]"
                    title="Ocultar sugestao"
                    aria-label="Ocultar sugestao"
                  >
                    <EyeOff className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateSuggestionStatus(suggestion, "deleted");
                    }}
                    className="grid size-8 place-items-center rounded-full border border-[#78a7a0] bg-white/75 text-[#37695f] shadow-sm transition hover:bg-white dark:bg-white/10 dark:text-[#e5f7f2]"
                    title="Remover sugestao"
                    aria-label="Remover sugestao"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </article>
            );
          })}

          {annotations.length === 0 && visibleSuggestions.length === 0 && (
            <div className="serene-soft-in absolute left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_92%,transparent)] p-5 text-center shadow-[var(--serene-shadow-soft)] backdrop-blur">
              <h2 className="text-lg font-semibold">Um espaco limpo para pensar</h2>
              <p className="mt-2 text-sm text-[var(--serene-muted)]">
                Crie a primeira anotacao pelo botao flutuante. Ela vai nascer no centro visivel do
                Mural.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => void loadMural()}
          className="grid size-11 place-items-center rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_92%,transparent)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-lift)] backdrop-blur transition hover:text-[var(--serene-fg)]"
          title="Atualizar Mural"
          aria-label="Atualizar Mural"
        >
          <RefreshCw className="size-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            setModalState({
              mode: "create",
              rect: getVisibleCenterRect(),
              defaultType: "quick_note",
              suggestion: null,
            })
          }
          className="grid size-12 place-items-center rounded-full bg-[var(--serene-accent)] text-white shadow-[var(--serene-shadow-lift)] transition hover:opacity-95"
          title="Nova anotacao no Mural"
          aria-label="Nova anotacao no Mural"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {modalState && (
        <AnnotationModal
          mode={modalState.mode}
          books={[rowToAnnotationBook(book)]}
          colors={colors}
          initialAnnotation={modalState.mode === "edit" ? modalState.annotation : null}
          lockedBookId={book.id}
          lockedSessionId={modalState.mode === "create" ? session.id : null}
          forcedOrigin={modalState.mode === "create" ? "mural" : undefined}
          defaultType={modalState.mode === "create" ? modalState.defaultType : undefined}
          onClose={() => setModalState(null)}
          onSubmit={handleModalSubmit}
        />
      )}
    </section>
  );
}
