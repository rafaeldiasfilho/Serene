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
  listManualCategories,
  listShelves,
  removeBookFromShelf,
  removeCategoryFromBook,
  softDeleteBook,
  softDeleteShelf,
  updateBook,
  updateShelf,
  type BookInsert,
  type BookManualCategoryRow,
  type BookRow,
  type BookShelfRow,
  type BookUpdate,
  type ManualCategoryRow,
  type ShelfRow,
  type ShelfUpdate,
} from "@/features/books/book-services";

export type BookWithCategories = BookRow & {
  annotationCount: number;
  categories: ManualCategoryRow[];
  shelves: ShelfRow[];
};

export type ShelfWithBooks = ShelfRow & {
  annotationCount: number;
  bookCount: number;
  books: BookWithCategories[];
};

export function useBookLibrary(userId: string | null) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<ManualCategoryRow[]>([]);
  const [relations, setRelations] = useState<BookManualCategoryRow[]>([]);
  const [shelves, setShelves] = useState<ShelfRow[]>([]);
  const [shelfRelations, setShelfRelations] = useState<BookShelfRow[]>([]);
  const [annotationBookIds, setAnnotationBookIds] = useState<Array<string | null>>([]);
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
    ] = await Promise.all([
      listBooks(userId),
      listManualCategories(userId),
      listBookManualCategories(userId),
      listShelves(userId),
      listBookShelves(userId),
      listAnnotationBookLinks(userId),
    ]);

    if (
      booksResult.error ||
      categoriesResult.error ||
      relationsResult.error ||
      shelvesResult.error ||
      shelfRelationsResult.error ||
      annotationLinksResult.error
    ) {
      setError(
        booksResult.error?.message ??
          categoriesResult.error?.message ??
          relationsResult.error?.message ??
          shelvesResult.error?.message ??
          shelfRelationsResult.error?.message ??
          annotationLinksResult.error?.message ??
          "Nao foi possivel carregar a Biblioteca.",
      );
      setLoading(false);
      return;
    }

    setBooks(booksResult.data ?? []);
    setCategories(categoriesResult.data ?? []);
    setRelations(relationsResult.data ?? []);
    setShelves(shelvesResult.data ?? []);
    setShelfRelations(shelfRelationsResult.data ?? []);
    setAnnotationBookIds((annotationLinksResult.data ?? []).map((link) => link.book_id));
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

    return books.map((book) => ({
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
    }));
  }, [annotationBookIds, books, categories, relations, shelfRelations, shelves]);

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
        return { ok: false, message: result.error?.message ?? "Nao foi possivel salvar o livro." };
      }

      const relationResult = await assignCategoriesToBook(userId, result.data.id, categoryIds);
      if (relationResult.error) {
        return {
          ok: false,
          message: relationResult.error.message,
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
        return { ok: false, message: result.error.message };
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
