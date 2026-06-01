"use client";

import { Edit3, PlayCircle, Trash2, X } from "lucide-react";

import type { BookStatus } from "@/lib/supabase/database.types";
import type { BookWithCategories } from "@/features/books/use-book-library";

const statusLabels: Record<BookStatus, string> = {
  quero_ler: "Quero ler",
  lendo: "Lendo",
  pausado: "Pausado",
  lido: "Lido",
};

type BookCardProps = {
  book: BookWithCategories;
  compact?: boolean;
  onEdit: (book: BookWithCategories) => void;
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

export function BookCard({
  book,
  compact = false,
  onEdit,
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
        "group relative overflow-hidden rounded-lg border bg-[var(--serene-surface)] shadow-sm motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md",
        book.is_current ? "border-[var(--serene-accent)]" : "border-[var(--serene-border)]",
        compact ? "p-3" : "p-4",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <div className="grid aspect-[2/3] w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-center text-xs text-[var(--serene-muted)]">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2">Sem capa</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
              {statusLabels[book.status]}
            </span>
            <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
              {getOriginLabel(book)}
            </span>
            {book.is_private && (
              <span className="rounded-full bg-[var(--serene-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--serene-muted)]">
                Privado
              </span>
            )}
          </div>

          <h3 className="mt-2 truncate text-base font-semibold">{book.title}</h3>
          <p className="truncate text-sm text-[var(--serene-muted)]">
            {book.author ?? "Autor nao informado"}
          </p>

          {book.total_pages && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--serene-surface-soft)]">
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
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--serene-border)] px-2 py-0.5 text-[11px]"
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
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onStartReading && (
          <button
            type="button"
            onClick={() => onStartReading(book)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs"
          >
            <PlayCircle className="size-3.5" />
            Iniciar leitura
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(book)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs"
        >
          <Edit3 className="size-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onSoftDelete(book)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
        >
          <Trash2 className="size-3.5" />
          Lixeira
        </button>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 hidden w-44 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]/95 p-3 text-xs opacity-0 shadow-md motion-safe:transition motion-safe:delay-300 group-hover:opacity-95 group-focus-within:opacity-95 sm:block">
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
