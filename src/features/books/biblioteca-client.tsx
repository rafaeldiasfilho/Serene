"use client";

import { BookOpen, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { BookCard } from "@/features/books/book-card";
import { BookForm } from "@/features/books/book-form";
import { useBookLibrary, type BookWithCategories } from "@/features/books/use-book-library";
import type { BookInsert } from "@/features/books/book-services";
import type { BookStatus } from "@/lib/supabase/database.types";

type FilterValue = "todos" | "lendo" | "quero_ler" | "pausado" | "lido";
type OrderValue = "alfabetica" | "recentes" | "status" | "autor";

const filters: Array<{ value: FilterValue; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "lendo", label: "Lendo" },
  { value: "quero_ler", label: "Quero ler" },
  { value: "pausado", label: "Pausados" },
  { value: "lido", label: "Lidos" },
];

const statusOrder: Record<BookStatus, number> = {
  lendo: 0,
  pausado: 1,
  quero_ler: 2,
  lido: 3,
};

const categoryColors = ["#7EA6A1", "#8DAA6A", "#C7A35A", "#8A9CCF", "#C08A9B", "#9D958A"];

function sortBooks(books: BookWithCategories[], order: OrderValue) {
  return [...books].sort((a, b) => {
    if (order === "alfabetica") {
      return a.title.localeCompare(b.title, "pt-BR");
    }
    if (order === "status") {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (order === "autor") {
      return (a.author ?? "").localeCompare(b.author ?? "", "pt-BR");
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function isHistorical(book: BookWithCategories) {
  return book.reading_origin === "historico" || book.read_before_serene;
}

export function BibliotecaClient() {
  const router = useRouter();
  const { authLoading, envReady, profileState, user } = useAppState();
  const {
    addCategory,
    books,
    categories,
    deleteBook,
    error,
    loading,
    refresh,
    removeCategory,
    saveBook,
  } = useBookLibrary(user?.id ?? null);

  const [activeFilter, setActiveFilter] = useState<FilterValue>("todos");
  const [orderBy, setOrderBy] = useState<OrderValue>("recentes");
  const [editingBook, setEditingBook] = useState<BookWithCategories | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);

  const visibleBooks = useMemo(() => {
    const filteredBooks =
      activeFilter === "todos" ? books : books.filter((book) => book.status === activeFilter);
    return sortBooks(filteredBooks, orderBy);
  }, [activeFilter, books, orderBy]);

  const historicalReadBooks = useMemo(
    () => visibleBooks.filter((book) => book.status === "lido" && isHistorical(book)),
    [visibleBooks],
  );

  const sereneReadBooks = useMemo(
    () => visibleBooks.filter((book) => book.status === "lido" && !isHistorical(book)),
    [visibleBooks],
  );

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variáveis Supabase para carregar a Biblioteca.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Carregando Biblioteca...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  async function handleSaveBook(payload: Omit<BookInsert, "user_id">, categoryIds: string[]) {
    setSaving(true);
    setFeedback(null);
    const result = await saveBook(editingBook?.id ?? null, payload, categoryIds);
    setSaving(false);

    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setFeedback("Livro salvo com calma.");
    setFormOpen(false);
    setEditingBook(null);
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setFeedback("Informe um nome para a categoria.");
      return;
    }

    const result = await addCategory(name, newCategoryColor);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setNewCategoryName("");
    setFeedback("Categoria criada.");
  }

  async function handleSoftDelete(book: BookWithCategories) {
    const confirmed = window.confirm(`Enviar "${book.title}" para a Lixeira?`);
    if (!confirmed) {
      return;
    }

    const result = await deleteBook(book.id);
    setFeedback(result.ok ? "Livro enviado para a Lixeira." : result.message);
  }

  async function handleRemoveCategory(bookId: string, categoryId: string) {
    const result = await removeCategory(bookId, categoryId);
    setFeedback(result.ok ? "Categoria removida do livro." : result.message);
  }

  function openCreateForm() {
    setEditingBook(null);
    setFormOpen(true);
    setFeedback(null);
  }

  function openEditForm(book: BookWithCategories) {
    setEditingBook(book);
    setFormOpen(true);
    setFeedback(null);
  }

  function handleStartReading(book: BookWithCategories) {
    router.push(`/leitura/${book.id}?origem=biblioteca`);
  }

  function renderBookGrid(bookList: BookWithCategories[]) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bookList.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onStartReading={handleStartReading}
            onEdit={openEditForm}
            onSoftDelete={handleSoftDelete}
            onRemoveCategory={handleRemoveCategory}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Biblioteca
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Seus livros, sem pressa</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Tudo aparece aqui mesmo sem categorias. Use categorias apenas quando elas deixarem sua
            leitura mais confortável.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            Novo livro
          </button>
        </div>
      </div>

      {feedback && (
        <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {formOpen && (
        <BookForm
          key={editingBook?.id ?? "new-book"}
          book={editingBook}
          categories={categories}
          saving={saving}
          onCancel={() => {
            setFormOpen(false);
            setEditingBook(null);
          }}
          onSubmit={handleSaveBook}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm",
                  activeFilter === filter.value
                    ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                    : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]",
                ].join(" ")}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="grid max-w-xs gap-1 text-sm">
            Ordenar por
            <select
              className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
              value={orderBy}
              onChange={(event) => setOrderBy(event.target.value as OrderValue)}
            >
              <option value="recentes">recentes</option>
              <option value="alfabetica">alfabética</option>
              <option value="status">status</option>
              <option value="autor">autor</option>
            </select>
          </label>

          {loading ? (
            <div className="grid min-h-64 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
              <div className="flex flex-col items-center gap-3">
                <BrainLoader />
                <p className="text-sm text-[var(--serene-muted)]">Buscando seus livros...</p>
              </div>
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
              <BookOpen className="size-8 text-[var(--serene-accent)]" />
              <h2 className="mt-3 text-xl font-semibold">Sua Biblioteca está pronta</h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--serene-muted)]">
                Adicione o primeiro livro quando quiser. A organização começa simples e cresce
                apenas quando ajudar.
              </p>
            </div>
          ) : visibleBooks.length === 0 ? (
            <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 text-sm text-[var(--serene-muted)]">
              Nenhum livro encontrado nesse filtro.
            </div>
          ) : activeFilter === "lido" ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Histórico de leitura
                </h2>
                {historicalReadBooks.length > 0 ? (
                  renderBookGrid(historicalReadBooks)
                ) : (
                  <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 text-sm text-[var(--serene-muted)]">
                    Nenhum livro histórico neste filtro.
                  </p>
                )}
              </section>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Lido no SERENE
                </h2>
                {sereneReadBooks.length > 0 ? (
                  renderBookGrid(sereneReadBooks)
                ) : (
                  <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 text-sm text-[var(--serene-muted)]">
                    Nenhum livro concluído no SERENE neste filtro.
                  </p>
                )}
              </section>
            </div>
          ) : (
            renderBookGrid(visibleBooks)
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
            <h2 className="text-base font-semibold">Categorias manuais</h2>
            {categories.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--serene-muted)]">
                Você ainda não criou categorias. Seus livros continuam organizados normalmente na
                Biblioteca. Crie categorias apenas se quiser separar seus livros do seu jeito.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-1 text-sm"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: category.color ?? "var(--serene-accent)" }}
                    />
                    {category.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
            <h2 className="text-base font-semibold">Criar categoria</h2>
            <div className="mt-3 grid gap-3">
              <input
                className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {categoryColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Cor ${color}`}
                    onClick={() => setNewCategoryColor(color)}
                    className={[
                      "size-7 rounded-full border",
                      newCategoryColor === color
                        ? "border-[var(--serene-fg)]"
                        : "border-[var(--serene-border)]",
                    ].join(" ")}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleCreateCategory()}
                className="rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
              >
                Criar categoria
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
