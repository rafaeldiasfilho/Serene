"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  assignBooksToShelf,
  assignCategoriesToBook,
  assignShelvesToBook,
  createBook,
  createManualCategory,
  createShelf,
  listAnnotationBookLinks,
  listBookManualCategories,
  listBookShelves,
  listBooks,
  listEstimatedProgressEvents,
  listManualCategories,
  listReadingProgressEntriesForBooks,
  listReadingSessionBookStats,
  listShelves,
  removeBookFromShelf,
  removeCategoryFromBook,
  softDeleteBook,
  softDeleteShelf,
  updateBook,
  updateShelf,
  type BookInsert,
  type BookEstimatedProgressEventRow,
  type BookManualCategoryRow,
  type BookReadingProgressEntryRow,
  type BookReadingSessionStatsRow,
  type BookRow,
  type BookShelfRow,
  type BookUpdate,
  type ManualCategoryRow,
  type ShelfRow,
  type ShelfUpdate,
} from "@/features/books/book-services";
import { ACTION_ERROR_MESSAGE, LOAD_ERROR_MESSAGE, SAVE_ERROR_MESSAGE, userFacingError } from "@/lib/user-facing-error";

export type BookWithCategories = BookRow & {
  annotationCount: number;
  categories: ManualCategoryRow[];
  shelves: ShelfRow[];
  realReadingSeconds: number;
  estimatedOutsideSeconds: number;
  estimatedHistoricalSeconds: number;
  approximateTotalReadingSeconds: number;
  estimationBaseLabel: string;
};

export type ShelfWithBooks = ShelfRow & {
  annotationCount: number;
  bookCount: number;
  books: BookWithCategories[];
};

function metadataNumber(metadata: BookEstimatedProgressEventRow["metadata"], key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metadataString(metadata: BookEstimatedProgressEventRow["metadata"], key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function estimatedHistoricalSecondsForBook(book: BookRow) {
  if (book.reading_origin !== "historico" && !book.read_before_serene) {
    return 0;
  }

  return book.estimated_reading_seconds ?? 0;
}

function estimationBaseLabel(book: BookRow) {
  switch (book.estimation_source) {
    case "user_book_pace":
    case "user_global_pace":
      return "Estimativa baseada no seu ritmo de leitura.";
    case "audiobook_duration":
      return "Estimativa baseada no audiobook deste livro.";
    case "manual_adjustment":
      return "Estimativa ajustada manualmente.";
    case "default_average":
      return "Estimativa baseada em media provisoria.";
    default:
      return book.audiobook_duration_minutes
        ? "Estimativa pode usar o audiobook deste livro."
        : "Estimativa baseada em media provisoria.";
  }
}

export function useBookLibrary(userId: string | null) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<ManualCategoryRow[]>([]);
  const [relations, setRelations] = useState<BookManualCategoryRow[]>([]);
  const [shelves, setShelves] = useState<ShelfRow[]>([]);
  const [shelfRelations, setShelfRelations] = useState<BookShelfRow[]>([]);
  const [annotationBookIds, setAnnotationBookIds] = useState<Array<string | null>>([]);
  const [sessionStats, setSessionStats] = useState<BookReadingSessionStatsRow[]>([]);
  const [progressEntries, setProgressEntries] = useState<BookReadingProgressEntryRow[]>([]);
  const [estimatedProgressEvents, setEstimatedProgressEvents] = useState<
    BookEstimatedProgressEventRow[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBooks([]);
      setCategories([]);
      setRelations([]);
      setShelves([]);
      setShelfRelations([]);
      setAnnotationBookIds([]);
      setSessionStats([]);
      setProgressEntries([]);
      setEstimatedProgressEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [
      booksResult,
      categoriesResult,
      relationsResult,
      shelvesResult,
      shelfRelationsResult,
      annotationLinksResult,
      sessionStatsResult,
      progressEntriesResult,
      estimatedProgressEventsResult,
    ] = await Promise.all([
      listBooks(userId),
      listManualCategories(userId),
      listBookManualCategories(userId),
      listShelves(userId),
      listBookShelves(userId),
      listAnnotationBookLinks(userId),
      listReadingSessionBookStats(userId),
      listReadingProgressEntriesForBooks(userId),
      listEstimatedProgressEvents(userId),
    ]);

    const firstError =
      booksResult.error ??
      categoriesResult.error ??
      relationsResult.error ??
      shelvesResult.error ??
      shelfRelationsResult.error ??
      annotationLinksResult.error ??
      sessionStatsResult.error ??
      progressEntriesResult.error ??
      estimatedProgressEventsResult.error;

    if (firstError) {
      setError(userFacingError(firstError, LOAD_ERROR_MESSAGE, "Falha ao carregar Biblioteca."));
      setLoading(false);
      return;
    }

    setBooks(booksResult.data ?? []);
    setCategories(categoriesResult.data ?? []);
    setRelations(relationsResult.data ?? []);
    setShelves(shelvesResult.data ?? []);
    setShelfRelations(shelfRelationsResult.data ?? []);
    setAnnotationBookIds((annotationLinksResult.data ?? []).map((link) => link.book_id));
    setSessionStats(sessionStatsResult.data ?? []);
    setProgressEntries(progressEntriesResult.data ?? []);
    setEstimatedProgressEvents(estimatedProgressEventsResult.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const booksWithCategories = useMemo<BookWithCategories[]>(() => {
    const annotationCountByBook = new Map<string, number>();
    annotationBookIds.forEach((bookId) => {
      if (!bookId) {
        return;
      }

      annotationCountByBook.set(bookId, (annotationCountByBook.get(bookId) ?? 0) + 1);
    });

    const realSecondsByBook = new Map<string, number>();
    sessionStats.forEach((session) => {
      realSecondsByBook.set(
        session.book_id,
        (realSecondsByBook.get(session.book_id) ?? 0) + (session.active_seconds ?? 0),
      );
    });

    const estimatedOutsideSecondsByBook = new Map<string, number>();
    progressEntries.forEach((entry) => {
      estimatedOutsideSecondsByBook.set(
        entry.book_id,
        (estimatedOutsideSecondsByBook.get(entry.book_id) ?? 0) +
          (entry.estimated_minutes ?? 0) * 60,
      );
    });
    estimatedProgressEvents.forEach((event) => {
      if (!event.book_id || metadataString(event.metadata, "progress_entry_id")) {
        return;
      }

      estimatedOutsideSecondsByBook.set(
        event.book_id,
        (estimatedOutsideSecondsByBook.get(event.book_id) ?? 0) +
          metadataNumber(event.metadata, "estimated_seconds"),
      );
    });

    return books.map((book) => {
      const realReadingSeconds = realSecondsByBook.get(book.id) ?? 0;
      const estimatedOutsideSeconds = estimatedOutsideSecondsByBook.get(book.id) ?? 0;
      const estimatedHistoricalSeconds = estimatedHistoricalSecondsForBook(book);

      return {
        ...book,
        annotationCount: annotationCountByBook.get(book.id) ?? 0,
        categories: relations
          .filter((relation) => relation.book_id === book.id)
          .map((relation) => categories.find((category) => category.id === relation.category_id))
          .filter((category): category is ManualCategoryRow => Boolean(category)),
        shelves: shelfRelations
          .filter((relation) => relation.book_id === book.id)
          .map((relation) => shelves.find((shelf) => shelf.id === relation.shelf_id))
          .filter((shelf): shelf is ShelfRow => Boolean(shelf)),
        realReadingSeconds,
        estimatedOutsideSeconds,
        estimatedHistoricalSeconds,
        approximateTotalReadingSeconds:
          realReadingSeconds + estimatedOutsideSeconds + estimatedHistoricalSeconds,
        estimationBaseLabel: estimationBaseLabel(book),
      };
    });
  }, [
    annotationBookIds,
    books,
    categories,
    estimatedProgressEvents,
    progressEntries,
    relations,
    sessionStats,
    shelfRelations,
    shelves,
  ]);

  const shelvesWithBooks = useMemo<ShelfWithBooks[]>(() => {
    return shelves.map((shelf) => {
      const shelfBooks = booksWithCategories.filter((book) =>
        shelfRelations.some((relation) => relation.shelf_id === shelf.id && relation.book_id === book.id),
      );

      return {
        ...shelf,
        annotationCount: shelfBooks.reduce((total, book) => total + book.annotationCount, 0),
        bookCount: shelfBooks.length,
        books: shelfBooks,
      };
    });
  }, [booksWithCategories, shelfRelations, shelves]);

  const saveBook = useCallback(
    async (
      bookId: string | null,
      payload: Omit<BookInsert, "user_id"> | BookUpdate,
      categoryIds: string[],
    ) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = bookId
        ? await updateBook(bookId, userId, payload as BookUpdate)
        : await createBook({ ...(payload as Omit<BookInsert, "user_id">), user_id: userId });

      if (result.error || !result.data) {
        return {
          ok: false,
          message: result.error
            ? userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao salvar livro.")
            : "Não foi possível salvar essa alteração agora.",
        };
      }

      const relationResult = await assignCategoriesToBook(userId, result.data.id, categoryIds);
      if (relationResult.error) {
        return {
          ok: false,
          message: userFacingError(
            relationResult.error,
            SAVE_ERROR_MESSAGE,
            "Falha ao vincular categorias ao livro.",
          ),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const addCategory = useCallback(
    async (name: string, color?: string) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await createManualCategory(userId, name, color);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao criar categoria."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const addShelf = useCallback(
    async (name: string, description?: string | null) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await createShelf({
        user_id: userId,
        name,
        description: description?.trim() ? description.trim() : null,
      });
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao criar estante."),
        };
      }

      await refresh();
      return { ok: true, message: null, shelf: result.data };
    },
    [refresh, userId],
  );

  const editShelf = useCallback(
    async (shelfId: string, payload: ShelfUpdate) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await updateShelf(shelfId, userId, payload);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao editar estante."),
        };
      }

      await refresh();
      return { ok: true, message: null, shelf: result.data };
    },
    [refresh, userId],
  );

  const deleteBook = useCallback(
    async (bookId: string) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await softDeleteBook(bookId, userId);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao mover livro para Lixeira."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const deleteShelf = useCallback(
    async (shelfId: string) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await softDeleteShelf(shelfId, userId);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao remover estante."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const removeCategory = useCallback(
    async (bookId: string, categoryId: string) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await removeCategoryFromBook(userId, bookId, categoryId);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao remover categoria."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const setBookShelves = useCallback(
    async (bookId: string, shelfIds: string[]) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await assignShelvesToBook(userId, bookId, shelfIds);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao atualizar estantes do livro."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const setShelfBooks = useCallback(
    async (shelfId: string, bookIds: string[]) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await assignBooksToShelf(userId, shelfId, bookIds);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao atualizar livros da estante."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const removeFromShelf = useCallback(
    async (bookId: string, shelfId: string) => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      const result = await removeBookFromShelf(userId, bookId, shelfId);
      if (result.error) {
        return {
          ok: false,
          message: userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao remover livro da estante."),
        };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  return {
    books: booksWithCategories,
    categories,
    shelves: shelvesWithBooks,
    loading,
    error,
    refresh,
    saveBook,
    addCategory,
    addShelf,
    editShelf,
    deleteBook,
    deleteShelf,
    removeCategory,
    setBookShelves,
    setShelfBooks,
    removeFromShelf,
  };
}
