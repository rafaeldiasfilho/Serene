"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitBranch,
  History,
  LibraryBig,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Star,
  Tags,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import {
  buildMenteInsight,
  type MenteAnnotationPreview,
  type MenteCategory,
  type MenteEvolutionPoint,
  type MenteInsight,
} from "@/features/mente/mente-model";
import {
  createManualCategoryFromMente,
  loadMenteSourceData,
  type MenteBookRow,
  type MenteSourceData,
} from "@/features/mente/mente-services";

const annotationTypeLabels: Record<MenteAnnotationPreview["type"], string> = {
  quick_note: "Anotação rápida",
  reflection: "Reflexão",
  highlight: "Marca-texto",
  post_it: "Post-it",
  flag: "Flag",
  doubt: "Dúvida",
  thought: "Pensamento",
  idea: "Ideia",
  action: "Ação",
  ocr_page: "OCR",
};

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0min";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  const days = Math.floor(hours / 24);

  if (hours <= 0) {
    return `${minutes}min`;
  }

  if (hours >= 24) {
    const dayText = days === 1 ? "1 dia" : `${days} dias`;
    return `${hours}h (${dayText} de leitura)`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function timePhrase(seconds: number, suffix: string) {
  return `${formatDuration(seconds)} ${suffix}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getBookInitials(title: string) {
  const words = title
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "S";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function BookMiniature({
  book,
  color = "var(--serene-accent)",
  size = "md",
}: {
  book: Pick<MenteBookRow, "title" | "author" | "cover_url">;
  color?: string;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "h-14 w-10" : "h-20 w-14";

  return (
    <div
      className={`${dimensions} shrink-0 overflow-hidden rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] shadow-[var(--serene-shadow-soft)]`}
      title={book.title}
    >
      {book.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="grid h-full w-full place-items-center px-1 text-center text-[10px] font-semibold text-white"
          style={{
            background: `linear-gradient(145deg, ${color}, color-mix(in oklab, ${color} 56%, #2f2a24 44%))`,
          }}
        >
          {getBookInitials(book.title)}
        </div>
      )}
    </div>
  );
}

function sourceLabel(category: MenteCategory) {
  if (category.source === "saved") {
    return "area automatica";
  }

  return "inferida por leitura";
}

function MetricCard({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-4 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
          {label}
        </p>
        <span className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">{helper}</p>
    </article>
  );
}

function TimeBlock({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-accent)_12%,var(--serene-surface)_88%)] text-[var(--serene-accent)] shadow-[var(--serene-shadow-inner)]">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-normal">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--serene-muted)]">{helper}</p>
    </article>
  );
}

function EmptyBlock({
  icon: Icon,
  text,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  title: string;
}) {
  return (
    <div className="serene-soft-in rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 shadow-[var(--serene-shadow-soft)]">
      <span className="grid size-12 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">{text}</p>
    </div>
  );
}

function MenteEmptyState() {
  return (
    <section className="serene-soft-in overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[radial-gradient(circle_at_20%_18%,color-mix(in_oklab,var(--serene-accent)_14%,transparent),transparent_34%),var(--serene-surface)] p-6 shadow-[var(--serene-shadow-lift)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <span className="grid size-12 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
            <Brain className="size-5" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">Mente tranquila por enquanto</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Sua Mente fica mais rica conforme voce adiciona livros, inclusive aqueles que ja leu
            antes do SERENE.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/biblioteca"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--serene-shadow-soft)] transition hover:opacity-95"
            >
              <BookOpen className="size-4" />
              Ir para Biblioteca
            </Link>
            <Link
              href="/biblioteca"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
            >
              Cadastrar livro
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="relative min-h-[220px] rounded-[1.75rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_62%,transparent)] p-4">
          <Brain className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 text-[var(--serene-accent)] opacity-35" />
          <div className="absolute left-6 top-7 h-12 w-28 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]" />
          <div className="absolute bottom-8 right-7 h-12 w-32 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]" />
          <div className="absolute bottom-12 left-10 h-10 w-24 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]" />
        </div>
      </div>
    </section>
  );
}

function AnnotationPreview({ item }: { item: MenteAnnotationPreview }) {
  return (
    <article className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)]">
      <div className="flex gap-3">
        {item.bookTitle && (
          <BookMiniature
            book={{
              title: item.bookTitle,
              author: item.bookAuthor,
              cover_url: item.bookCoverUrl,
            }}
            size="sm"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--serene-muted)]">
            {annotationTypeLabels[item.type]} {item.bookTitle ? `em ${item.bookTitle}` : "sem livro"}
          </p>
          <p className="literary mt-2 text-sm leading-6 text-[var(--serene-fg)]">
            {item.content}
          </p>
        </div>
      </div>
    </article>
  );
}

const brainNodePositions = [
  { left: 27, top: 27 },
  { left: 56, top: 24 },
  { left: 74, top: 44 },
  { left: 48, top: 55 },
  { left: 25, top: 63 },
  { left: 63, top: 73 },
  { left: 38, top: 42 },
  { left: 78, top: 67 },
];

function MenteBrainMap({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: {
  categories: MenteCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}) {
  const visibleCategories = categories.slice(0, brainNodePositions.length);

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[radial-gradient(circle_at_24%_18%,color-mix(in_oklab,var(--serene-accent)_16%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-lift)] dark:bg-[radial-gradient(circle_at_24%_18%,color-mix(in_oklab,var(--serene-accent)_18%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Interpretacao automatica
          </p>
          <h2 className="mt-1 text-xl font-semibold">Mente em areas vivas</h2>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-[var(--serene-muted)]">
          Os pesos sao aproximados e podem se sobrepor, como acontece com leituras reais.
        </p>
      </div>

      <div className="relative mt-5 min-h-[360px] overflow-hidden rounded-[1.75rem] border border-[color-mix(in_oklab,var(--serene-border)_72%,transparent)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_42%,transparent)] p-4">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-[var(--serene-accent)] opacity-80"
          viewBox="0 0 560 360"
          preserveAspectRatio="none"
        >
          <path
            d="M162 257C95 240 63 183 85 128c17-43 58-61 96-49 20-45 76-59 119-31 35-23 87-12 106 26 47 3 86 42 82 91-4 56-54 88-111 80-38 36-96 39-136 7-23 14-51 17-79 5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M184 95c-6 44 14 72 54 85m52-128c-27 47-13 92 31 121m74-89c-44 22-63 58-57 108M120 165c46-1 83 15 112 49m132-12c31 3 65-4 101-24M234 246c-2-36 14-62 47-78"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
            opacity="0.38"
          />
        </svg>

        {visibleCategories.map((category, index) => {
          const position = brainNodePositions[index];
          const selected = category.id === selectedCategoryId;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={[
                "absolute max-w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] border bg-[color-mix(in_oklab,var(--serene-surface)_88%,transparent)] px-3 py-2 text-left shadow-[var(--serene-shadow-soft)] backdrop-blur transition hover:-translate-y-[calc(50%+2px)] hover:shadow-[var(--serene-shadow-lift)]",
                selected
                  ? "border-[var(--serene-accent)] ring-2 ring-[var(--serene-accent-soft)]"
                  : "border-[var(--serene-border)]",
              ].join(" ")}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shadow-[0_0_0_4px_rgb(138_106_77_/_10%)]"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs font-semibold text-[var(--serene-muted)]">
                  {category.percentage}%
                </span>
              </span>
              <span className="mt-1 block text-sm font-semibold leading-tight">{category.name}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function SelectedAreaPanel({
  category,
  converting,
  onConvert,
}: {
  category: MenteCategory | null;
  converting: boolean;
  onConvert: (category: MenteCategory) => void;
}) {
  if (!category) {
    return (
      <article className="rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
        <h2 className="text-lg font-semibold">A Mente esta se formando</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
          As areas aparecem quando livros e anotacoes deixam sinais suficientes.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-lift)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Area selecionada
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{category.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
            {category.description ?? "Uma area detectada pela sua vida leitora."}
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-2 text-sm font-semibold shadow-[var(--serene-shadow-soft)]"
          style={{ borderColor: category.color, color: category.color }}
        >
          {category.percentage}%
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{category.books.length}</p>
          <p className="text-xs text-[var(--serene-muted)]">livros relacionados</p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{category.annotationCount}</p>
          <p className="text-xs text-[var(--serene-muted)]">anotacoes relacionadas</p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{formatDuration(category.realSeconds)}</p>
          <p className="text-xs text-[var(--serene-muted)]">tempo real</p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{formatDuration(category.estimatedHistoricalSeconds)}</p>
          <p className="text-xs text-[var(--serene-muted)]">historico estimado</p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Livros ligados a esta area</h3>
        <div className="mt-3 grid gap-3">
          {category.books.slice(0, 5).map((book) => (
            <div
              key={book.id}
              className="flex gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 shadow-[var(--serene-shadow-inner)]"
            >
              <BookMiniature book={book} color={category.color} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{book.title}</p>
                <p className="truncate text-xs text-[var(--serene-muted)]">
                  {book.author ?? "Autor nao informado"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Anotacoes que deram sinal</h3>
        <div className="mt-3 grid gap-3">
          {category.annotationPreviews.length === 0 ? (
            <p className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-sm text-[var(--serene-muted)]">
              Quando houver reflexoes ou marca-textos visiveis, eles aparecem aqui.
            </p>
          ) : (
            category.annotationPreviews.map((item) => <AnnotationPreview key={item.id} item={item} />)
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
        <p className="text-xs leading-relaxed text-[var(--serene-muted)]">
          Opcional: esta area pode virar uma categoria manual da Biblioteca. Estantes continuam uma
          organizacao separada e escolhida por voce.
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onConvert(category);
          }}
          disabled={converting}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs font-medium text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
        >
          <Tags className="size-4" />
          {converting
            ? "Salvando..."
            : category.manualCategoryExists
              ? "Atualizar categoria manual"
              : "Guardar como categoria manual"}
        </button>
      </div>
    </article>
  );
}

function CategoryCard({
  category,
  converting,
  selected,
  onConvert,
  onSelect,
}: {
  category: MenteCategory;
  converting: boolean;
  selected: boolean;
  onConvert: (category: MenteCategory) => void;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <article
      className={[
        "relative overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] transition dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]",
        selected
          ? "border-[var(--serene-accent)] ring-2 ring-[var(--serene-accent-soft)]"
          : "border-[var(--serene-border)]",
      ].join(" ")}
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 size-5 shrink-0 rounded-full border border-[var(--serene-border)] shadow-[var(--serene-shadow-soft)]"
            style={{ backgroundColor: category.color }}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
              {sourceLabel(category)}
            </p>
            <button
              type="button"
              onClick={() => onSelect(category.id)}
              className="text-left text-lg font-semibold transition hover:text-[var(--serene-accent)]"
            >
              {category.name}
            </button>
            {category.description && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--serene-muted)]">
                {category.description}
              </p>
            )}
          </div>
        </div>
        {category.confidence !== null && category.confidence >= 0.9 && (
          <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2 py-1 text-xs text-[var(--serene-muted)] shadow-[var(--serene-shadow-inner)]">
            sinal forte
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{category.percentage}%</p>
          <p className="text-xs text-[var(--serene-muted)]">peso</p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{category.books.length}</p>
          <p className="text-xs text-[var(--serene-muted)]">livros</p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
          <p className="text-lg font-semibold">{category.annotationCount}</p>
          <p className="text-xs text-[var(--serene-muted)]">anotacoes</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {category.books.slice(0, 4).map((book) => (
          <div
            key={book.id}
            className="flex max-w-[170px] items-center gap-2 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2 py-2 text-xs shadow-[var(--serene-shadow-inner)]"
          >
            <BookMiniature book={book} color={category.color} size="sm" />
            <span className="line-clamp-2">{book.title}</span>
          </div>
        ))}
        {category.books.length > 4 && (
          <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1 text-xs text-[var(--serene-muted)]">
            +{category.books.length - 4}
          </span>
        )}
      </div>

      {category.reason && (
        <p className="literary mt-4 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-sm leading-6 text-[var(--serene-muted)] shadow-[var(--serene-shadow-inner)]">
          {category.reason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {category.manualCategoryExists && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-xs text-[var(--serene-muted)]">
            <CheckCircle2 className="size-4" />
            Ja existe na Biblioteca
          </span>
        )}
        <button
          type="button"
          onClick={() => onConvert(category)}
          disabled={converting}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-xs font-medium text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-60"
        >
          <Tags className="size-4" />
          {converting
            ? "Salvando..."
            : category.manualCategoryExists
              ? "Atualizar categoria manual"
              : "Guardar como categoria manual"}
        </button>
        {category.toReviewCount > 0 && (
          <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-xs text-[var(--serene-muted)]">
            {category.toReviewCount} para revisar
          </span>
        )}
      </div>
    </article>
  );
}

function EvolutionBars({ points }: { points: MenteEvolutionPoint[] }) {
  const maxSeconds = Math.max(...points.map((point) => point.seconds), 1);

  return (
    <div className="space-y-3">
      {points.map((point) => (
        <div key={point.key} className="grid gap-2 sm:grid-cols-[88px_1fr_96px] sm:items-center">
          <p className="text-sm font-medium text-[var(--serene-muted)]">{point.label}</p>
          <div className="h-3 overflow-hidden rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] shadow-[var(--serene-shadow-inner)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--serene-accent)_72%,white_28%),var(--serene-accent))]"
              style={{ width: `${Math.max((point.seconds / maxSeconds) * 100, 6)}%` }}
            />
          </div>
          <p className="text-sm font-medium">{formatDuration(point.seconds)}</p>
        </div>
      ))}
    </div>
  );
}

function MenteDashboard({
  convertingCategoryId,
  insight,
  onConvertCategory,
}: {
  convertingCategoryId: string | null;
  insight: MenteInsight;
  onConvertCategory: (category: MenteCategory) => void;
}) {
  const strongestCategories = insight.categories.slice(0, 8);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => insight.categories[0]?.id ?? null,
  );

  const selectedCategory =
    insight.categories.find((category) => category.id === selectedCategoryId) ??
    insight.categories[0] ??
    null;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Tempo de vida dedicado a leitura
          </p>
          <h2 className="mt-1 text-xl font-semibold">Horas guardadas nos seus livros</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Horas construindo sua mente leitora, com o tempo real separado das estimativas.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TimeBlock
            icon={Clock3}
            label="Tempo registrado no SERENE"
            value={timePhrase(insight.totals.realSeconds, "registradas no SERENE")}
            helper="Somente tempo ativo de sessões registradas."
          />
          <TimeBlock
            icon={History}
            label="Tempo estimado do seu histórico"
            value={timePhrase(insight.totals.estimatedHistoricalSeconds, "estimadas do histórico")}
            helper="Estimado e aproximado, vindo de livros lidos antes do SERENE."
          />
          <TimeBlock
            icon={Sparkles}
            label="Total aproximado dedicado aos livros"
            value={timePhrase(insight.totals.approximateTotalSeconds, "aproximadas")}
            helper="Soma de tempo real registrado e histórico estimado."
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={LibraryBig}
          label="Livros"
          value={formatCount(insight.totals.uniqueBooks)}
          helper="Únicos, mesmo em várias áreas."
        />
        <MetricCard
          icon={Clock3}
          label="Sessões"
          value={formatCount(insight.totals.sessions)}
          helper="Registros de leitura ativos."
        />
        <MetricCard
          icon={MessageSquareText}
          label="Anotações"
          value={formatCount(insight.totals.annotations)}
          helper="Privadas ficam fora desta visão."
        />
        <MetricCard
          icon={Star}
          label="Ideias favoritas"
          value={formatCount(insight.totals.favoriteIdeas)}
          helper="Favoritos com texto salvo."
        />
        <MetricCard
          icon={CheckCircle2}
          label="Para revisar"
          value={formatCount(insight.totals.itemsToReview)}
          helper="Itens aguardando retorno."
        />
      </section>

      {strongestCategories.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <MenteBrainMap
            categories={strongestCategories}
            selectedCategoryId={selectedCategory?.id ?? null}
            onSelectCategory={setSelectedCategoryId}
          />
          <SelectedAreaPanel
            category={selectedCategory}
            converting={selectedCategory ? convertingCategoryId === selectedCategory.id : false}
            onConvert={onConvertCategory}
          />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Mapa interno
            </p>
            <h2 className="mt-1 text-xl font-semibold">Áreas mais presentes</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Categorias automáticas formadas por livros e anotações, sem depender da Biblioteca.
            </p>
          </div>
          <p className="text-xs text-[var(--serene-muted)]">
            Um livro pode aparecer em várias áreas; totais usam livros únicos.
          </p>
        </div>

        {strongestCategories.length === 0 ? (
          <EmptyBlock
            icon={Brain}
            title="A Mente está pronta"
            text="Adicione livros e anotações visíveis para formar as primeiras áreas automaticamente."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {strongestCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                converting={convertingCategoryId === category.id}
                selected={selectedCategory?.id === category.id}
                onConvert={onConvertCategory}
                onSelect={setSelectedCategoryId}
              />
            ))}
          </div>
        )}
      </section>

      <section id="evolucao" className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <CalendarDays className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Evolução de leitura</h2>
              <p className="text-sm text-[var(--serene-muted)]">
                Um registro tranquilo de presença, sem metas ou cobrança.
              </p>
            </div>
          </div>
          <div className="mt-5">
            {insight.evolution.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Suas sessões recentes aparecerão aqui quando houver tempo registrado.
              </p>
            ) : (
              <EvolutionBars points={insight.evolution} />
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <GitBranch className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Livros que conversam</h2>
              <p className="text-sm text-[var(--serene-muted)]">Encontros simples entre areas.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {insight.conversations.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Quando duas leituras dividirem uma area, esse encontro aparece aqui.
              </p>
            ) : (
              insight.conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 shadow-[var(--serene-shadow-inner)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full border border-[var(--serene-border)]"
                      style={{ backgroundColor: conversation.color }}
                    />
                    <p className="text-sm font-medium">{conversation.categoryName}</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--serene-muted)]">{conversation.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {conversation.books.map((book) => (
                      <div
                        key={book.id}
                        className="flex max-w-[160px] items-center gap-2 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2 py-2 text-xs"
                      >
                        <BookMiniature book={book} color={conversation.color} size="sm" />
                        <span className="line-clamp-2">{book.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Ideias favoritas</h2>
              <p className="text-sm text-[var(--serene-muted)]">Trechos marcados para permanecer.</p>
            </div>
            <Star className="size-5 text-[var(--serene-accent)]" />
          </div>
          <div className="mt-4 grid gap-3">
            {insight.favoriteIdeas.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Favoritos visíveis da Mente aparecerão aqui.
              </p>
            ) : (
              insight.favoriteIdeas.map((item) => <AnnotationPreview key={item.id} item={item} />)
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Para revisar</h2>
              <p className="text-sm text-[var(--serene-muted)]">Notas que pediram um retorno suave.</p>
            </div>
            <CheckCircle2 className="size-5 text-[var(--serene-accent)]" />
          </div>
          <div className="mt-4 grid gap-3">
            {insight.reviewItems.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Nenhum item visível marcado para revisar agora.
              </p>
            ) : (
              insight.reviewItems.map((item) => <AnnotationPreview key={item.id} item={item} />)
            )}
          </div>
        </article>
      </section>

      <section
        id="linha-do-tempo"
        className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Linha do tempo</h2>
              <p className="text-sm text-[var(--serene-muted)]">
                Memória cronológica de livros, sessões e anotações.
              </p>
            </div>
          </div>
          <Link
            href="/linha-do-tempo"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
          >
            Ver linha do tempo
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export function MenteClient() {
  const { authLoading, envReady, profile, profileError, profileState, user } = useAppState();
  const [sourceData, setSourceData] = useState<MenteSourceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [convertingCategoryId, setConvertingCategoryId] = useState<string | null>(null);

  const loadMente = useCallback(async () => {
    if (!user) {
      setSourceData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await loadMenteSourceData(user.id);
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível carregar a Mente.");
      return;
    }

    setSourceData(result.data);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMente();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMente]);

  const insight = useMemo(() => (sourceData ? buildMenteInsight(sourceData) : null), [sourceData]);

  async function handleConvertCategory(category: MenteCategory) {
    if (!user) {
      return;
    }

    setFeedback(null);
    setConvertingCategoryId(category.id);
    const result = await createManualCategoryFromMente({
      userId: user.id,
      name: category.name,
      color: category.color,
      bookIds: category.bookIds,
    });
    setConvertingCategoryId(null);

    if (result.error) {
      setFeedback(result.error.message);
      await loadMente();
      return;
    }

    setFeedback("Categoria salva na Biblioteca com os livros desta area.");
    await loadMente();
  }

  if (!envReady) {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-amber-300/80 bg-amber-50 p-5 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        Configure as variáveis Supabase para carregar a Mente.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando sua Mente...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (profileState === "error") {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-rose-300/80 bg-rose-50 p-5 text-rose-900 shadow-[var(--serene-shadow-soft)] dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100">
        <h1 className="text-xl font-semibold">Não foi possível carregar o perfil</h1>
        <p className="mt-2 text-sm">{profileError ?? "Tente novamente em instantes."}</p>
      </section>
    );
  }

  return (
    <section className="serene-soft-in space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-6 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Mente
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Sua leitura ganhando forma</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
            Uma visão calma das áreas que aparecem nos livros, nas sessões e nas anotações
            visíveis.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-soft)]">
          <BrainLoader className="size-16" />
          <div>
            <p className="text-sm font-medium">{profile?.name ?? user.email ?? "Leitor"}</p>
            <p className="text-xs text-[var(--serene-muted)]">Privados ficam resguardados.</p>
          </div>
        </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void loadMente()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </button>
        <Link
          href="/linha-do-tempo"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
        >
          <CalendarDays className="size-4" />
          Ver linha do tempo
        </Link>
        <Link
          href="/biblioteca"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
        >
          <BookOpen className="size-4" />
          Biblioteca
        </Link>
      </div>

      {feedback && (
        <p className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      )}

      {loading || !insight ? (
        <section className="grid min-h-64 place-items-center rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Lendo seus sinais de leitura...</p>
          </div>
        </section>
      ) : insight.books.length === 0 ? (
        <MenteEmptyState />
      ) : (
        <MenteDashboard
          insight={insight}
          convertingCategoryId={convertingCategoryId}
          onConvertCategory={(category) => void handleConvertCategory(category)}
        />
      )}
    </section>
  );
}
