"use client";

import { BookOpen, Edit3, LibraryBig, PlayCircle, Trash2, X } from "lucide-react";

import type { BookStatus } from "@/lib/supabase/database.types";
import type { BookWithCategories } from "@/features/books/use-book-library";

const statusLabels: Record<BookStatus, string> = {
  quero_ler: "Quero ler",
  lendo: "Lendo",
  pausado: "Pausado",
  lido: "Lido",
};

const statusChipClasses: Record<BookStatus, string> = {
  quero_ler:
    "border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface-soft)_78%,white_22%)] text-[var(--serene-muted)]",
  lendo:
    "border-[color-mix(in_oklab,var(--serene-accent)_54%,transparent)] bg-[color-mix(in_oklab,var(--serene-accent)_14%,var(--serene-surface)_86%)] text-[var(--serene-fg)]",
  pausado:
    "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)]",
  lido:
    "border-[color-mix(in_oklab,#7a9a70_52%,transparent)] bg-[color-mix(in_oklab,#dff0d8_54%,var(--serene-surface)_46%)] text-[color-mix(in_oklab,var(--serene-fg)_82%,#4f7648_18%)]",
};

type BookCardProps = {
  book: BookWithCategories;
  compact?: boolean;
  onEdit: (book: BookWithCategories) => void;
  onManageShelves?: (book: BookWithCategories) => void;
  onSoftDelete: (book: BookWithCategories) => void;
  onStartReading?: (book: BookWithCategories) => void;
  onRemoveCategory?: (bookId: string, categoryId: string) => void;
};

function getOriginLabel(book: BookWithCategories) {
  if (book.reading_origin === "historico" || book.read_before_serene) {
    return "Historico de leitura";
  }

  if (book.status === "lido" || book.completed_inside_serene) {
    return "Lido no SERENE";
  }

  return "SERENE";
}

function hashTitle(title: string) {
  let hash = 0;

  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getFallbackCover(title: string) {
  const hash = hashTitle(title);
  const hue = 28 + (hash % 54);
  const secondHue = hue + 28;

  return {
    background:
      `linear-gradient(145deg, hsl(${hue} 28% 58%), hsl(${secondHue} 23% 34%))`,
  };
}

export function BookCard({
  book,
  compact = false,
  onEdit,
  onManageShelves,
  onSoftDelete,
  onStartReading,
  onRemoveCategory,
}: BookCardProps) {
  const progress =
    book.total_pages && book.total_pages > 0
      ? Math.min(100, Math.round((book.current_page / book.total_pages) * 100))
      : 0;

  return (
    <article
      className={[
        "serene-card-enter group relative overflow-hidden rounded-xl border bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)] motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--serene-shadow-lift)]",
        book.is_current
          ? "border-[color-mix(in_oklab,var(--serene-accent)_58%,transparent)]"
          : "border-[var(--serene-border)]",
        compact ? "p-3" : "p-4 sm:p-5",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-accent)_8%,transparent),transparent)] opacity-70" />

      <div className="relative flex gap-4">
        <div className="relative grid aspect-[2/3] w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[color-mix(in_oklab,var(--serene-border)_78%,transparent)] bg-[var(--serene-surface-soft)] text-center text-xs text-white shadow-[0_12px_28px_rgb(47_42_36_/_12%)] sm:w-24">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="grid h-full w-full place-items-center px-3"
              style={getFallbackCover(book.title)}
            >
              <div className="grid gap-2 text-center">
                <BookOpen className="mx-auto size-5 opacity-80" />
                <span className="literary line-clamp-3 text-[11px] leading-snug text-white/90">
                  {book.title}
                </span>
              </div>
            </div>
          )}
          {book.is_current && (
            <span className="absolute bottom-2 left-2 right-2 rounded-full bg-white/88 px-2 py-1 text-[10px] font-semibold text-[#4a3929] shadow-sm backdrop-blur">
              Atual
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                statusChipClasses[book.status],
              ].join(" ")}
            >
              {statusLabels[book.status]}
            </span>
            <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_72%,var(--serene-surface-soft)_28%)] px-2.5 py-1 text-[11px] text-[var(--serene-muted)]">
              {getOriginLabel(book)}
            </span>
            {book.is_private && (
              <span className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--serene-muted)]">
                Privado
              </span>
            )}
          </div>

          <h3 className="literary mt-3 line-clamp-2 text-lg leading-snug">{book.title}</h3>
          <p className="mt-1 truncate text-sm text-[var(--serene-muted)]">
            {book.author ?? "Autor nao informado"}
          </p>

          {book.total_pages && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--serene-surface-soft)_74%,var(--serene-surface)_26%)]">
                <div
                  className="h-full rounded-full bg-[var(--serene-accent)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--serene-muted)]">
                Pagina {book.current_page} de {book.total_pages}
              </p>
            </div>
          )}

          {book.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {book.categories.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1 text-[11px] text-[var(--serene-muted)]"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: category.color ?? "var(--serene-accent)" }}
                  />
                  {category.name}
                  {onRemoveCategory && (
                    <button
                      type="button"
                      aria-label={`Remover ${category.name}`}
                      onClick={() => onRemoveCategory(book.id, category.id)}
                      className="ml-0.5 grid size-5 place-items-center rounded-full text-[var(--serene-muted)] hover:text-[var(--serene-fg)]"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {book.shelves.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1 text-[11px] text-[var(--serene-muted)]">
              <LibraryBig className="size-3" />
              {book.shelves.length === 1
                ? "1 estante"
                : `${book.shelves.length} estantes`}
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {onStartReading && (
          <button
            type="button"
            onClick={() => onStartReading(book)}
            className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--serene-accent)_46%,transparent)] bg-[color-mix(in_oklab,var(--serene-accent)_10%,var(--serene-surface)_90%)] px-3 py-1.5 text-xs font-medium"
          >
            <PlayCircle className="size-3.5" />
            Iniciar leitura
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(book)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_74%,transparent)] px-3 py-1.5 text-xs"
        >
          <Edit3 className="size-3.5" />
          Editar
        </button>
        {onManageShelves && (
          <button
            type="button"
            onClick={() => onManageShelves(book)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_74%,transparent)] px-3 py-1.5 text-xs"
          >
            <LibraryBig className="size-3.5" />
            Estantes
          </button>
        )}
        <button
          type="button"
          onClick={() => onSoftDelete(book)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_74%,transparent)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
        >
          <Trash2 className="size-3.5" />
          Lixeira
        </button>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 hidden w-44 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)]/95 p-3 text-xs opacity-0 shadow-[var(--serene-shadow-soft)] backdrop-blur motion-safe:transition motion-safe:delay-300 group-hover:opacity-95 group-focus-within:opacity-95 sm:block">
        <p className="font-semibold">Estatisticas</p>
        <dl className="mt-2 grid gap-1 text-[var(--serene-muted)]">
          <div className="flex justify-between gap-2">
            <dt>reflexoes</dt>
            <dd>0</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>marca-textos</dt>
            <dd>0</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>post-its</dt>
            <dd>0</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>anotacoes rapidas</dt>
            <dd>0</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>tempo lido</dt>
            <dd>0 min</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
