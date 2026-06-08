"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Edit3,
  LibraryBig,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { BookCard } from "@/features/books/book-card";
import { BookForm } from "@/features/books/book-form";
import { BookIntakeDialog } from "@/features/books/book-intake-dialog";
import {
  useBookLibrary,
  type BookWithCategories,
  type ShelfWithBooks,
} from "@/features/books/use-book-library";
import type { BookInsert } from "@/features/books/book-services";
import { ProgressUpdateDialog } from "@/features/reading-progress/progress-update-dialog";
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

const allBooksShelfId = "todos-os-livros";

type AutoShelfRule = {
  id: string;
  name: string;
  description: string;
  color: string;
  keywords: string[];
};

type AutoShelf = {
  id: string;
  name: string;
  description: string;
  color: string;
  books: BookWithCategories[];
};

const automaticShelfRules: AutoShelfRule[] = [
  {
    id: "filosofia",
    name: "Filosofia",
    description: "Perguntas, sentido, etica e modo de viver.",
    color: "#7EA6A1",
    keywords: ["filosofia", "estoic", "virtude", "sentido", "etica", "aurelio", "platao"],
  },
  {
    id: "financas",
    name: "Financas",
    description: "Dinheiro, patrimonio, investimentos e decisoes financeiras.",
    color: "#C7A35A",
    keywords: ["financa", "dinheiro", "invest", "patrimonio", "mercado", "ativo", "riqueza"],
  },
  {
    id: "psicologia",
    name: "Psicologia",
    description: "Emocoes, mente, comportamento e autoconsciencia.",
    color: "#B7ABC6",
    keywords: ["psicologia", "mente", "mental", "emoc", "comport", "trauma", "terapia"],
  },
  {
    id: "literatura",
    name: "Literatura",
    description: "Romances, narrativas, simbolos e imaginacao.",
    color: "#D28F84",
    keywords: ["literatura", "romance", "conto", "poesia", "narrativa", "ficcao", "classico"],
  },
  {
    id: "matematica",
    name: "Matematica",
    description: "Numeros, logica, padroes e raciocinio.",
    color: "#7C9BB0",
    keywords: ["matematica", "numero", "calculo", "logica", "estatistica", "probabilidade"],
  },
  {
    id: "desenvolvimento-pessoal",
    name: "Desenvolvimento pessoal",
    description: "Habitos, identidade, foco e crescimento sem pressa.",
    color: "#8A9CCF",
    keywords: ["habito", "desenvolvimento", "identidade", "disciplina", "foco", "crescimento"],
  },
  {
    id: "estudos",
    name: "Estudos",
    description: "Aprendizado, pesquisa, metodo e livros de consulta.",
    color: "#8DAA6A",
    keywords: ["estudo", "aprender", "aprendizado", "metodo", "pesquisa", "aula", "curso"],
  },
];

type ShelfFormState =
  | {
      mode: "create";
      shelf: null;
    }
  | {
      mode: "edit";
      shelf: ShelfWithBooks;
    };

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
    background: `linear-gradient(145deg, hsl(${hue} 28% 58%), hsl(${secondHue} 23% 34%))`,
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getBookSignal(book: BookWithCategories) {
  return normalizeText(
    [
      book.title,
      book.author,
      book.description,
      book.publisher,
      book.language,
      book.isbn,
      ...(book.subjects ?? []),
      ...book.categories.map((category) => category.name),
      ...book.shelves.map((shelf) => shelf.name),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matchesBookSearch(book: BookWithCategories, query: string) {
  if (!query) {
    return true;
  }

  return getBookSignal(book).includes(query);
}

function matchesAutomaticShelf(book: BookWithCategories, rule: AutoShelfRule) {
  const signal = getBookSignal(book);
  return rule.keywords.some((keyword) => signal.includes(normalizeText(keyword)));
}

function buildAutomaticShelves(books: BookWithCategories[]): AutoShelf[] {
  const alphabeticBooks = sortBooks(books, "alfabetica");
  const shelves = automaticShelfRules.map<AutoShelf>((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    color: rule.color,
    books: alphabeticBooks.filter((book) => matchesAutomaticShelf(book, rule)),
  }));

  return [
    ...shelves.filter((shelf) => shelf.books.length > 0),
    {
      id: allBooksShelfId,
      name: "Todos os livros",
      description: "Entrada unica com tudo que esta guardado na Biblioteca.",
      color: "#9D958A",
      books: alphabeticBooks,
    },
  ];
}

function ShelfCoverPreview({ books }: { books: BookWithCategories[] }) {
  const previewBooks = books.slice(0, 4);

  return (
    <div className="relative flex min-h-20 items-end gap-1 overflow-hidden rounded-2xl border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_86%,var(--serene-surface-soft)_14%),var(--serene-surface-soft))] px-3 pb-3 pt-4">
      <span className="pointer-events-none absolute inset-x-3 bottom-2 h-1 rounded-full bg-[color-mix(in_oklab,var(--serene-accent)_36%,var(--serene-border)_64%)] opacity-45" />
      {previewBooks.length === 0 ? (
        <div className="relative grid h-16 w-11 place-items-center rounded-lg border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]">
          <BookOpen className="size-4" />
        </div>
      ) : (
        previewBooks.map((book, index) => (
          <div
            key={book.id}
            className="relative grid aspect-[2/3] w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-white/40 bg-[var(--serene-surface-soft)] text-center text-[8px] text-white shadow-[0_10px_22px_rgb(47_42_36_/_12%)]"
            style={{
              transform: `translateY(${index % 2 === 0 ? 0 : 4}px) rotate(${index % 2 === 0 ? -1 : 1}deg)`,
            }}
          >
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center px-1" style={getFallbackCover(book.title)}>
                <span className="line-clamp-3 text-white/90">{book.title}</span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function AutoShelfCard({
  active,
  shelf,
  onOpen,
}: {
  active: boolean;
  shelf: AutoShelf;
  onOpen: (shelf: AutoShelf) => void;
}) {
  return (
    <article
      className={[
        "serene-card-enter rounded-[1.55rem] border bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--serene-shadow-lift)]",
        active
          ? "border-[color-mix(in_oklab,var(--serene-accent)_62%,transparent)]"
          : "border-[var(--serene-border)]",
      ].join(" ")}
    >
      <ShelfCoverPreview books={shelf.books} />
      <div className="mt-4">
        <p
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: shelf.color }}
        >
          Estante automatica
        </p>
        <h3 className="literary mt-1 line-clamp-2 text-xl leading-snug">{shelf.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--serene-muted)]">
          {shelf.description}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--serene-muted)]">
        <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1">
          {shelf.books.length === 1 ? "1 livro" : `${shelf.books.length} livros`}
        </span>
        <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1">
          alfabetica
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpen(shelf)}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--serene-shadow-soft)]"
      >
        <BookOpen className="size-3.5" />
        Abrir
      </button>
    </article>
  );
}

function ShelfCard({
  active,
  onDelete,
  onEdit,
  onManageBooks,
  onOpen,
  shelf,
}: {
  active: boolean;
  onDelete: (shelf: ShelfWithBooks) => void;
  onEdit: (shelf: ShelfWithBooks) => void;
  onManageBooks: (shelf: ShelfWithBooks) => void;
  onOpen: (shelf: ShelfWithBooks) => void;
  shelf: ShelfWithBooks;
}) {
  return (
    <article
      className={[
        "serene-card-enter rounded-[1.55rem] border bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--serene-shadow-lift)]",
        active ? "border-[color-mix(in_oklab,var(--serene-accent)_62%,transparent)]" : "border-[var(--serene-border)]",
      ].join(" ")}
    >
      <ShelfCoverPreview books={shelf.books} />
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
          Estante
        </p>
        <h3 className="literary mt-1 line-clamp-2 text-xl leading-snug">{shelf.name}</h3>
        {shelf.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--serene-muted)]">
            {shelf.description}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--serene-muted)]">
        <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1">
          {shelf.bookCount === 1 ? "1 livro" : `${shelf.bookCount} livros`}
        </span>
        <span className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-2.5 py-1">
          {shelf.annotationCount === 1 ? "1 memoria" : `${shelf.annotationCount} memorias`}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen(shelf)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--serene-shadow-soft)]"
        >
          <BookOpen className="size-3.5" />
          Abrir
        </button>
        <button
          type="button"
          onClick={() => onManageBooks(shelf)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_74%,transparent)] px-3 py-1.5 text-xs"
        >
          <Plus className="size-3.5" />
          Livros
        </button>
        <button
          type="button"
          onClick={() => onEdit(shelf)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_74%,transparent)] px-3 py-1.5 text-xs"
          aria-label={`Editar estante ${shelf.name}`}
        >
          <Edit3 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(shelf)}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_74%,transparent)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
          aria-label={`Remover estante ${shelf.name}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

export function BibliotecaClient() {
  const router = useRouter();
  const { authLoading, envReady, profileState, user } = useAppState();
  const {
    addCategory,
    addShelf,
    books,
    categories,
    deleteBook,
    deleteShelf,
    editShelf,
    error,
    loading,
    refresh,
    removeCategory,
    saveBook,
    setBookShelves,
    setShelfBooks,
    shelves,
  } = useBookLibrary(user?.id ?? null);

  const [activeFilter, setActiveFilter] = useState<FilterValue>("todos");
  const [orderBy, setOrderBy] = useState<OrderValue>("alfabetica");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBook, setEditingBook] = useState<BookWithCategories | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [bookDraft, setBookDraft] = useState<Omit<BookInsert, "user_id"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [progressBook, setProgressBook] = useState<BookWithCategories | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);
  const [activeAutoShelfId, setActiveAutoShelfId] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [shelfForm, setShelfForm] = useState<ShelfFormState | null>(null);
  const [shelfName, setShelfName] = useState("");
  const [shelfDescription, setShelfDescription] = useState("");
  const [managingBook, setManagingBook] = useState<BookWithCategories | null>(null);
  const [selectedShelfIds, setSelectedShelfIds] = useState<string[]>([]);
  const [quickShelfName, setQuickShelfName] = useState("");
  const [managingShelf, setManagingShelf] = useState<ShelfWithBooks | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const normalizedSearchQuery = useMemo(() => normalizeText(searchQuery.trim()), [searchQuery]);

  const searchedBooks = useMemo(
    () => books.filter((book) => matchesBookSearch(book, normalizedSearchQuery)),
    [books, normalizedSearchQuery],
  );

  const automaticShelves = useMemo(() => buildAutomaticShelves(searchedBooks), [searchedBooks]);

  const activeAutoShelf = useMemo(
    () => automaticShelves.find((shelf) => shelf.id === activeAutoShelfId) ?? null,
    [activeAutoShelfId, automaticShelves],
  );

  const visibleBooks = useMemo(() => {
    if (!activeAutoShelf) {
      return [];
    }

    const filteredBooks =
      activeFilter === "todos"
        ? activeAutoShelf.books
        : activeAutoShelf.books.filter((book) => book.status === activeFilter);
    return sortBooks(filteredBooks, activeAutoShelf.id === allBooksShelfId ? orderBy : "alfabetica");
  }, [activeAutoShelf, activeFilter, orderBy]);

  const activeShelf = useMemo(
    () => shelves.find((shelf) => shelf.id === activeShelfId) ?? null,
    [activeShelfId, shelves],
  );

  const visibleShelfBooks = useMemo(() => {
    if (!activeShelf) {
      return [];
    }

    const filteredBooks =
      activeFilter === "todos"
        ? activeShelf.books.filter((book) => matchesBookSearch(book, normalizedSearchQuery))
        : activeShelf.books.filter(
            (book) => book.status === activeFilter && matchesBookSearch(book, normalizedSearchQuery),
          );
    return sortBooks(filteredBooks, orderBy);
  }, [activeFilter, activeShelf, normalizedSearchQuery, orderBy]);

  const filterCounts = useMemo<Record<FilterValue, number>>(
    () => ({
      todos: books.length,
      lendo: books.filter((book) => book.status === "lendo").length,
      quero_ler: books.filter((book) => book.status === "quero_ler").length,
      pausado: books.filter((book) => book.status === "pausado").length,
      lido: books.filter((book) => book.status === "lido").length,
    }),
    [books],
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
    setBookDraft(null);
  }

  async function handleConfirmBookDraft(payload: Omit<BookInsert, "user_id">) {
    setSaving(true);
    setFeedback(null);
    const result = await saveBook(null, payload, []);
    setSaving(false);

    if (!result.ok) {
      setFeedback(result.message);
      return result;
    }

    setFeedback("Livro salvo com calma.");
    setIntakeOpen(false);
    setBookDraft(null);
    return result;
  }

  function handleEditBookDraft(payload: Omit<BookInsert, "user_id">) {
    setBookDraft(payload);
    setEditingBook(null);
    setIntakeOpen(false);
    setFormOpen(true);
    setFeedback(null);
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

  function openCreateShelfForm() {
    setShelfForm({ mode: "create", shelf: null });
    setShelfName("");
    setShelfDescription("");
    setFeedback(null);
  }

  function openEditShelfForm(shelf: ShelfWithBooks) {
    setShelfForm({ mode: "edit", shelf });
    setShelfName(shelf.name);
    setShelfDescription(shelf.description ?? "");
    setFeedback(null);
  }

  async function handleSaveShelf() {
    const name = shelfName.trim();
    if (!name) {
      setFeedback("Dê um nome para a estante.");
      return;
    }

    if (shelfForm?.mode === "edit") {
      const result = await editShelf(shelfForm.shelf.id, {
        name,
        description: shelfDescription.trim() || null,
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }

      setFeedback("Estante atualizada.");
      setShelfForm(null);
      setShelfName("");
      setShelfDescription("");
      return;
    }

    const result = await addShelf(name, shelfDescription);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setFeedback("Estante criada.");
    setShelfForm(null);
    setShelfName("");
    setShelfDescription("");
  }

  async function handleDeleteShelf(shelf: ShelfWithBooks) {
    const confirmed = window.confirm(
      `Remover a estante "${shelf.name}"? Os livros continuam na Biblioteca.`,
    );
    if (!confirmed) {
      return;
    }

    const result = await deleteShelf(shelf.id);
    if (result.ok && activeShelfId === shelf.id) {
      setActiveShelfId(null);
    }
    setFeedback(result.ok ? "Estante removida." : result.message);
  }

  function openBookShelfManager(book: BookWithCategories) {
    setManagingBook(book);
    setSelectedShelfIds(book.shelves.map((shelf) => shelf.id));
    setQuickShelfName("");
    setFeedback(null);
  }

  function openShelfBookManager(shelf: ShelfWithBooks) {
    setManagingShelf(shelf);
    setSelectedBookIds(shelf.books.map((book) => book.id));
    setFeedback(null);
  }

  function toggleSelectedShelf(shelfId: string) {
    setSelectedShelfIds((current) =>
      current.includes(shelfId)
        ? current.filter((id) => id !== shelfId)
        : [...current, shelfId],
    );
  }

  function toggleSelectedBook(bookId: string) {
    setSelectedBookIds((current) =>
      current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId],
    );
  }

  async function handleCreateShelfFromBookManager() {
    const name = quickShelfName.trim();
    if (!name) {
      setFeedback("Dê um nome para a nova estante.");
      return;
    }

    const result = await addShelf(name);
    if (!result.ok || !result.shelf) {
      setFeedback(result.message);
      return;
    }

    setSelectedShelfIds((current) => [...current, result.shelf.id]);
    setQuickShelfName("");
    setFeedback("Estante criada.");
  }

  async function handleSaveBookShelves() {
    if (!managingBook) {
      return;
    }

    const previousIds = managingBook.shelves.map((shelf) => shelf.id);
    const added = selectedShelfIds.some((id) => !previousIds.includes(id));
    const removed = previousIds.some((id) => !selectedShelfIds.includes(id));
    const result = await setBookShelves(managingBook.id, selectedShelfIds);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setManagingBook(null);
    if (added && !removed) {
      setFeedback("Livro adicionado a estante.");
    } else if (removed && !added) {
      setFeedback("Livro removido da estante.");
    } else {
      setFeedback("Estantes do livro atualizadas.");
    }
  }

  async function handleSaveShelfBooks() {
    if (!managingShelf) {
      return;
    }

    const previousIds = managingShelf.books.map((book) => book.id);
    const added = selectedBookIds.some((id) => !previousIds.includes(id));
    const removed = previousIds.some((id) => !selectedBookIds.includes(id));
    const result = await setShelfBooks(managingShelf.id, selectedBookIds);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setManagingShelf(null);
    if (added && !removed) {
      setFeedback("Livro adicionado a estante.");
    } else if (removed && !added) {
      setFeedback("Livro removido da estante.");
    } else {
      setFeedback("Livros da estante atualizados.");
    }
  }

  function openCreateForm() {
    setEditingBook(null);
    setBookDraft(null);
    setIntakeOpen(true);
    setFormOpen(false);
    setFeedback(null);
  }

  function openEditForm(book: BookWithCategories) {
    setEditingBook(book);
    setBookDraft(null);
    setFormOpen(true);
    setIntakeOpen(false);
    setFeedback(null);
  }

  function handleStartReading(book: BookWithCategories) {
    router.push(`/leitura/${book.id}?origem=biblioteca`);
  }

  function renderBookGrid(bookList: BookWithCategories[]) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bookList.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onStartReading={handleStartReading}
            onUpdateProgress={setProgressBook}
            onEdit={openEditForm}
            onManageShelves={openBookShelfManager}
            onSoftDelete={handleSoftDelete}
            onRemoveCategory={handleRemoveCategory}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-7">
      <div className="serene-soft-in rounded-2xl border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Biblioteca
          </p>
          <h1 className="literary mt-2 text-4xl leading-tight">Seus livros, organizados pelo SERENE</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
            A Biblioteca abre por estantes automaticas. Ajustes manuais continuam disponiveis, mas
            voce nao precisa organizar tudo antes de ler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-4 py-2 text-sm shadow-[var(--serene-shadow-soft)]"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
          >
            <Plus className="size-4" />
            Novo livro
          </button>
        </div>
      </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_84%,transparent)] p-4">
            <LibraryBig className="size-5 text-[var(--serene-accent)]" />
            <p className="literary mt-3 text-2xl">{books.length}</p>
            <p className="text-xs text-[var(--serene-muted)]">livros visiveis na Biblioteca</p>
          </div>
          <div className="rounded-xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_84%,transparent)] p-4">
            <BookOpen className="size-5 text-[var(--serene-accent)]" />
            <p className="literary mt-3 text-2xl">{filterCounts.lendo}</p>
            <p className="text-xs text-[var(--serene-muted)]">leituras em andamento</p>
          </div>
          <div className="rounded-xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_84%,transparent)] p-4">
            <Tags className="size-5 text-[var(--serene-accent)]" />
            <p className="literary mt-3 text-2xl">{automaticShelves.length}</p>
            <p className="text-xs text-[var(--serene-muted)]">estantes automaticas visiveis</p>
          </div>
        </div>
      </div>

      {feedback && (
        <p className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm shadow-[var(--serene-shadow-soft)]">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 shadow-[var(--serene-shadow-soft)]">
          {error}
        </p>
      )}

      <section className="serene-rise rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,var(--serene-surface-soft)_8%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Estantes automaticas
            </p>
            <h2 className="literary mt-2 text-3xl leading-tight">
              O SERENE separa os livros para voce
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--serene-muted)]">
              Cada livro pode aparecer em mais de uma estante. Abra uma area ou entre em Todos os
              livros quando quiser ver tudo em ordem.
            </p>
          </div>
          <label className="relative w-full max-w-sm text-sm text-[var(--serene-muted)]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--serene-muted)]" />
            <input
              className="w-full rounded-full border border-[var(--serene-border)] bg-[var(--serene-input)] py-2 pl-9 pr-3 text-[var(--serene-fg)] outline-none"
              placeholder="Buscar livro na Biblioteca"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>

        {searchQuery.trim() && (
          <p className="mt-4 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm text-[var(--serene-muted)]">
            Busca aplicada em toda a Biblioteca. Abra uma estante para ver os resultados.
          </p>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {automaticShelves.map((shelf) => (
            <AutoShelfCard
              key={shelf.id}
              active={activeAutoShelfId === shelf.id}
              shelf={shelf}
              onOpen={(item) => {
                setActiveAutoShelfId(item.id);
                setActiveShelfId(null);
              }}
            />
          ))}
        </div>
      </section>

      <section className="serene-rise rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,var(--serene-surface-soft)_8%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Ajustes manuais
            </p>
            <h2 className="literary mt-2 text-3xl leading-tight">Estantes pessoais, se voce quiser</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--serene-muted)]">
              Elas continuam aqui para organizacao manual. A estrutura principal da Biblioteca,
              agora, fica nas estantes automaticas acima.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateShelfForm}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
          >
            <Plus className="size-4" />
            Nova estante
          </button>
        </div>

        {shelfForm && (
          <div className="mt-5 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {shelfForm.mode === "edit" ? "Renomear estante" : "Criar estante"}
                </h3>
                <p className="mt-1 text-sm text-[var(--serene-muted)]">
                  Use nomes simples: Filosofia, Literatura, Livros para reler, Trabalho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShelfForm(null)}
                className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]"
                aria-label="Fechar formulario de estante"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto] md:items-end">
              <label className="grid gap-1 text-sm text-[var(--serene-muted)]">
                Nome
                <input
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-[var(--serene-fg)] outline-none"
                  placeholder="Filosofia"
                  value={shelfName}
                  onChange={(event) => setShelfName(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm text-[var(--serene-muted)]">
                Pequena nota opcional
                <input
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-[var(--serene-fg)] outline-none"
                  placeholder="Livros para voltar com calma."
                  value={shelfDescription}
                  onChange={(event) => setShelfDescription(event.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSaveShelf()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
              >
                <Check className="size-4" />
                Salvar
              </button>
            </div>
          </div>
        )}

        {shelves.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-5">
            <LibraryBig className="size-7 text-[var(--serene-accent)]" />
            <h3 className="literary mt-3 text-2xl">Nenhuma estante ainda</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Seus livros continuam na Biblioteca. Crie uma estante quando quiser separar uma
              area, uma intencao ou um caminho de leitura.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shelves.map((shelf) => (
              <ShelfCard
                key={shelf.id}
                active={activeShelfId === shelf.id}
                shelf={shelf}
                onOpen={(item) => {
                  setActiveShelfId(item.id);
                  setActiveAutoShelfId(null);
                }}
                onEdit={openEditShelfForm}
                onManageBooks={openShelfBookManager}
                onDelete={(item) => void handleDeleteShelf(item)}
              />
            ))}
          </div>
        )}
      </section>

      {formOpen && (
        <BookForm
          key={editingBook?.id ?? bookDraft?.title ?? "new-book"}
          book={editingBook}
          categories={categories}
          initialDraft={bookDraft}
          saving={saving}
          onCancel={() => {
            setFormOpen(false);
            setEditingBook(null);
            setBookDraft(null);
          }}
          onSubmit={handleSaveBook}
        />
      )}

      {intakeOpen && (
        <BookIntakeDialog
          saving={saving}
          onClose={() => {
            setIntakeOpen(false);
            setBookDraft(null);
          }}
          onConfirm={handleConfirmBookDraft}
          onEdit={handleEditBookDraft}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          {(activeAutoShelf || activeShelf) && (
          <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  activeFilter === filter.value
                    ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                    : "border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
                ].join(" ")}
              >
                {filter.label}
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[11px]">
                  {filterCounts[filter.value]}
                </span>
              </button>
            ))}
          </div>

          {(activeShelf || activeAutoShelf?.id === allBooksShelfId) && (
          <label className="mt-4 grid max-w-xs gap-1 text-sm text-[var(--serene-muted)]">
            Ordenar por
            <select
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-[var(--serene-fg)] outline-none"
              value={orderBy}
              onChange={(event) => setOrderBy(event.target.value as OrderValue)}
            >
              <option value="recentes">recentes</option>
              <option value="alfabetica">alfabética</option>
              <option value="status">status</option>
              <option value="autor">autor</option>
            </select>
          </label>
          )}
          </section>
          )}

          {loading ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
              <div className="flex flex-col items-center gap-3">
                <BrainLoader />
                <p className="text-sm text-[var(--serene-muted)]">Buscando seus livros...</p>
              </div>
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 shadow-[var(--serene-shadow-soft)]">
              <BookOpen className="size-8 text-[var(--serene-accent)]" />
              <h2 className="literary mt-3 text-2xl">Sua Biblioteca está pronta</h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--serene-muted)]">
                Adicione o primeiro livro quando quiser. A organização começa simples e cresce
                apenas quando ajudar.
              </p>
            </div>
          ) : activeAutoShelf ? (
            <section className="rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_88%,var(--serene-surface-soft)_12%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <button
                    type="button"
                    onClick={() => setActiveAutoShelfId(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                  >
                    <ArrowLeft className="size-3.5" />
                    Voltar para estantes automaticas
                  </button>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
                    Estante automatica
                  </p>
                  <h2 className="literary mt-2 text-3xl leading-tight">{activeAutoShelf.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
                    {activeAutoShelf.description}
                  </p>
                  <p className="mt-3 text-sm text-[var(--serene-muted)]">
                    {visibleBooks.length === 1 ? "1 livro" : `${visibleBooks.length} livros`}
                    {normalizedSearchQuery ? " encontrados na busca" : " em ordem alfabetica"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {visibleBooks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-5 text-sm text-[var(--serene-muted)]">
                    Nenhum livro nesta estante para a busca ou filtro atual.
                  </div>
                ) : (
                  renderBookGrid(visibleBooks)
                )}
              </div>
            </section>
          ) : activeShelf ? (
            <section className="rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_88%,var(--serene-surface-soft)_12%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <button
                    type="button"
                    onClick={() => setActiveShelfId(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1.5 text-xs text-[var(--serene-muted)]"
                  >
                    <ArrowLeft className="size-3.5" />
                    Voltar para Biblioteca
                  </button>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
                    Estante aberta
                  </p>
                  <h2 className="literary mt-2 text-3xl leading-tight">{activeShelf.name}</h2>
                  {activeShelf.description && (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
                      {activeShelf.description}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-[var(--serene-muted)]">
                    {activeShelf.bookCount === 1 ? "1 livro" : `${activeShelf.bookCount} livros`}
                    {" · "}
                    {activeShelf.annotationCount === 1
                      ? "1 memoria guardada"
                      : `${activeShelf.annotationCount} memorias guardadas`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openShelfBookManager(activeShelf)}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
                  >
                    <Plus className="size-4" />
                    Adicionar livros
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditShelfForm(activeShelf)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
                  >
                    <Edit3 className="size-4" />
                    Editar
                  </button>
                </div>
              </div>

              <div className="mt-5">
                {visibleShelfBooks.length > 0 ? (
                  renderBookGrid(visibleShelfBooks)
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-5 text-sm text-[var(--serene-muted)]">
                    Nenhum livro nesta estante para o filtro atual.
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 text-sm leading-relaxed text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
              Escolha uma estante automatica acima para ver os livros. A entrada Todos os livros
              mostra a Biblioteca inteira sem misturar a tela principal.
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
            <div className="flex items-center gap-2">
              <Tags className="size-4 text-[var(--serene-accent)]" />
              <h2 className="text-base font-semibold">Categorias manuais</h2>
            </div>
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
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-3 py-1 text-sm"
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

          <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
            <h2 className="text-base font-semibold">Criar categoria</h2>
            <div className="mt-3 grid gap-3">
              <input
                className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
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
                className="rounded-full border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] px-4 py-2 text-sm"
              >
                Criar categoria
              </button>
            </div>
          </div>
        </aside>
      </div>

      {managingBook && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <section className="serene-soft-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                  Estantes do livro
                </p>
                <h2 className="literary mt-2 text-2xl leading-tight">{managingBook.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
                  Escolha uma ou mais estantes. Isso nao altera status, leitura ou categorias.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingBook(null)}
                className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]"
                aria-label="Fechar estantes do livro"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {shelves.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 text-sm text-[var(--serene-muted)]">
                  Crie a primeira estante abaixo para guardar este livro em um caminho de leitura.
                </p>
              ) : (
                shelves.map((shelf) => (
                  <label
                    key={shelf.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]"
                  >
                    <span>
                      <span className="font-semibold text-[var(--serene-text)]">{shelf.name}</span>
                      <span className="mt-1 block text-xs text-[var(--serene-muted)]">
                        {shelf.bookCount === 1 ? "1 livro" : `${shelf.bookCount} livros`}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedShelfIds.includes(shelf.id)}
                      onChange={() => toggleSelectedShelf(shelf.id)}
                      className="size-4 accent-[var(--serene-accent)]"
                    />
                  </label>
                ))
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_76%,transparent)] p-4">
              <p className="text-sm font-semibold">Criar estante durante a escolha</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
                  placeholder="Livros para reler"
                  value={quickShelfName}
                  onChange={(event) => setQuickShelfName(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void handleCreateShelfFromBookManager()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
                >
                  <Plus className="size-4" />
                  Criar
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setManagingBook(null)}
                className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveBookShelves()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
              >
                <Check className="size-4" />
                Salvar estantes
              </button>
            </div>
          </section>
        </div>
      )}

      {managingShelf && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <section className="serene-soft-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-5 shadow-[var(--serene-shadow-lift)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                  Livros da estante
                </p>
                <h2 className="literary mt-2 text-2xl leading-tight">{managingShelf.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--serene-muted)]">
                  Marque os livros que pertencem a esta separacao manual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingShelf(null)}
                className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)]"
                aria-label="Fechar livros da estante"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {books.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 text-sm text-[var(--serene-muted)]">
                  Adicione livros a Biblioteca antes de preencher esta estante.
                </p>
              ) : (
                sortBooks(books, "alfabetica").map((book) => (
                  <label
                    key={book.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--serene-text)]">
                        {book.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--serene-muted)]">
                        {book.author ?? "Autor nao informado"}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedBookIds.includes(book.id)}
                      onChange={() => toggleSelectedBook(book.id)}
                      className="size-4 accent-[var(--serene-accent)]"
                    />
                  </label>
                ))
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setManagingShelf(null)}
                className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveShelfBooks()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
              >
                <Check className="size-4" />
                Salvar livros
              </button>
            </div>
          </section>
        </div>
      )}

      {progressBook && (
        <ProgressUpdateDialog
          userId={user.id}
          book={progressBook}
          onClose={() => setProgressBook(null)}
          onSaved={refresh}
        />
      )}
    </section>
  );
}
