"use client";

import { Save, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import type { BookStatus, ReadingOrigin } from "@/lib/supabase/database.types";
import type { BookInsert } from "@/features/books/book-services";
import type { BookWithCategories } from "@/features/books/use-book-library";
import type { ManualCategoryRow } from "@/features/books/book-services";

const statusOptions: Array<{ value: BookStatus; label: string }> = [
  { value: "quero_ler", label: "Quero ler" },
  { value: "lendo", label: "Lendo" },
  { value: "pausado", label: "Pausado" },
  { value: "lido", label: "Lido" },
];

const originOptions: Array<{ value: ReadingOrigin; label: string }> = [
  { value: "serene", label: "Lido no SERENE" },
  { value: "historico", label: "Histórico de leitura" },
];

type BookFormState = {
  title: string;
  author: string;
  cover_url: string;
  description: string;
  publisher: string;
  edition: string;
  publication_year: string;
  total_pages: string;
  current_page: string;
  status: BookStatus;
  reading_origin: ReadingOrigin;
  read_before_serene: boolean;
  completed_inside_serene: boolean;
  is_current: boolean;
  is_private: boolean;
  show_in_home: boolean;
  show_in_notifications: boolean;
  show_in_mente: boolean;
  include_in_quick_exports: boolean;
};

type BookFormProps = {
  book: BookWithCategories | null;
  categories: ManualCategoryRow[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: Omit<BookInsert, "user_id">, categoryIds: string[]) => Promise<void>;
};

function createInitialState(book: BookWithCategories | null): BookFormState {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    cover_url: book?.cover_url ?? "",
    description: book?.description ?? "",
    publisher: book?.publisher ?? "",
    edition: book?.edition ?? "",
    publication_year: book?.publication_year?.toString() ?? "",
    total_pages: book?.total_pages?.toString() ?? "",
    current_page: book?.current_page?.toString() ?? "0",
    status: book?.status ?? "quero_ler",
    reading_origin: book?.reading_origin ?? "serene",
    read_before_serene: book?.read_before_serene ?? false,
    completed_inside_serene: book?.completed_inside_serene ?? false,
    is_current: book?.is_current ?? false,
    is_private: book?.is_private ?? false,
    show_in_home: book?.show_in_home ?? true,
    show_in_notifications: book?.show_in_notifications ?? true,
    show_in_mente: book?.show_in_mente ?? true,
    include_in_quick_exports: book?.include_in_quick_exports ?? true,
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  return Number(value);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function BookForm({ book, categories, saving, onCancel, onSubmit }: BookFormProps) {
  const [form, setForm] = useState<BookFormState>(() => createInitialState(book));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () => book?.categories.map((category) => category.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const isHistorical = form.reading_origin === "historico";

  const normalizedPayload = useMemo<Omit<BookInsert, "user_id">>(() => {
    const status = form.status;
    const readingOrigin = form.reading_origin;

    return {
      title: form.title.trim(),
      author: optionalText(form.author),
      cover_url: optionalText(form.cover_url),
      description: optionalText(form.description),
      publisher: optionalText(form.publisher),
      edition: optionalText(form.edition),
      publication_year: optionalNumber(form.publication_year),
      total_pages: optionalNumber(form.total_pages),
      current_page: optionalNumber(form.current_page) ?? 0,
      status,
      source: "manual",
      reading_origin: readingOrigin,
      is_current: form.is_current,
      is_private: form.is_private,
      show_in_home: form.show_in_home,
      show_in_notifications: form.show_in_notifications,
      show_in_mente: form.show_in_mente,
      include_in_quick_exports: form.include_in_quick_exports,
      read_before_serene: readingOrigin === "historico" ? true : form.read_before_serene,
      completed_inside_serene: readingOrigin === "serene" && status === "lido"
        ? true
        : form.completed_inside_serene,
    };
  }, [form]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!normalizedPayload.title) {
      setError("O título é obrigatório.");
      return;
    }

    const totalPages = normalizedPayload.total_pages ?? 0;
    const currentPage = normalizedPayload.current_page ?? 0;

    if (totalPages > 0 && currentPage > totalPages) {
      setError("A página atual não pode ser maior que o total de páginas.");
      return;
    }

    await onSubmit(normalizedPayload, selectedCategoryIds);
  }

  function updateField<K extends keyof BookFormState>(key: K, value: BookFormState[K]) {
    if (key === "is_private" && value === true) {
      setForm((current) => ({
        ...current,
        is_private: true,
        show_in_home: false,
        show_in_notifications: false,
        show_in_mente: false,
        include_in_quick_exports: false,
      }));
      return;
    }

    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{book ? "Editar livro" : "Novo livro"}</h2>
          <p className="text-sm text-[var(--serene-muted)]">
            Guarde apenas o necessário agora. Detalhes podem ser ajustados depois.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] text-[var(--serene-muted)]"
          aria-label="Fechar formulário"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm md:col-span-2">
          Título
          <input
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Autor
          <input
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.author}
            onChange={(event) => updateField("author", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Capa (URL)
          <input
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.cover_url}
            onChange={(event) => updateField("cover_url", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Descrição
          <textarea
            className="min-h-20 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Editora
          <input
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.publisher}
            onChange={(event) => updateField("publisher", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Edição
          <input
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.edition}
            onChange={(event) => updateField("edition", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Ano
          <input
            type="number"
            min="1"
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.publication_year}
            onChange={(event) => updateField("publication_year", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Páginas
          <input
            type="number"
            min="1"
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.total_pages}
            onChange={(event) => updateField("total_pages", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Página atual
          <input
            type="number"
            min="0"
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.current_page}
            onChange={(event) => updateField("current_page", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.status}
            onChange={(event) => updateField("status", event.target.value as BookStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Origem
          <select
            className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--serene-accent)]"
            value={form.reading_origin}
            onChange={(event) => updateField("reading_origin", event.target.value as ReadingOrigin)}
          >
            {originOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-sm md:grid-cols-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_current}
            onChange={(event) => updateField("is_current", event.target.checked)}
          />
          Livro atual
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_private}
            onChange={(event) => updateField("is_private", event.target.checked)}
          />
          Privado
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isHistorical || form.read_before_serene}
            disabled={isHistorical}
            onChange={(event) => updateField("read_before_serene", event.target.checked)}
          />
          Lido antes do SERENE
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.completed_inside_serene}
            onChange={(event) => updateField("completed_inside_serene", event.target.checked)}
          />
          Concluído no SERENE
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.show_in_home}
            onChange={(event) => updateField("show_in_home", event.target.checked)}
          />
          Mostrar no Início
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.show_in_notifications}
            onChange={(event) => updateField("show_in_notifications", event.target.checked)}
          />
          Mostrar em notificações
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.show_in_mente}
            onChange={(event) => updateField("show_in_mente", event.target.checked)}
          />
          Mostrar na Mente
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.include_in_quick_exports}
            onChange={(event) => updateField("include_in_quick_exports", event.target.checked)}
          />
          Incluir em exportações rápidas
        </label>
      </div>

      <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
        <p className="text-sm font-medium">Categorias</p>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--serene-muted)]">
            Você ainda não criou categorias. Seus livros continuam organizados normalmente na
            Biblioteca. Crie categorias apenas se quiser separar seus livros do seu jeito.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: category.color ?? "var(--serene-accent)" }}
                />
                {category.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Save className="size-4" />
          {saving ? "Salvando..." : "Salvar livro"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
