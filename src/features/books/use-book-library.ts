"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  assignCategoriesToBook,
  createBook,
  createManualCategory,
  listBookManualCategories,
  listBooks,
  listManualCategories,
  removeCategoryFromBook,
  softDeleteBook,
  updateBook,
  type BookInsert,
  type BookManualCategoryRow,
  type BookRow,
  type BookUpdate,
  type ManualCategoryRow,
} from "@/features/books/book-services";

export type BookWithCategories = BookRow & {
  categories: ManualCategoryRow[];
};

export function useBookLibrary(userId: string | null) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<ManualCategoryRow[]>([]);
  const [relations, setRelations] = useState<BookManualCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBooks([]);
      setCategories([]);
      setRelations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [booksResult, categoriesResult, relationsResult] = await Promise.all([
      listBooks(userId),
      listManualCategories(userId),
      listBookManualCategories(userId),
    ]);

    if (booksResult.error || categoriesResult.error || relationsResult.error) {
      setError(
        booksResult.error?.message ??
          categoriesResult.error?.message ??
          relationsResult.error?.message ??
          "Não foi possível carregar a Biblioteca.",
      );
      setLoading(false);
      return;
    }

    setBooks(booksResult.data ?? []);
    setCategories(categoriesResult.data ?? []);
    setRelations(relationsResult.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const booksWithCategories = useMemo<BookWithCategories[]>(() => {
    return books.map((book) => ({
      ...book,
      categories: relations
        .filter((relation) => relation.book_id === book.id)
        .map((relation) => categories.find((category) => category.id === relation.category_id))
        .filter((category): category is ManualCategoryRow => Boolean(category)),
    }));
  }, [books, categories, relations]);

  const saveBook = useCallback(
    async (
      bookId: string | null,
      payload: Omit<BookInsert, "user_id"> | BookUpdate,
      categoryIds: string[],
    ) => {
      if (!userId) {
        return { ok: false, message: "Usuário não autenticado." };
      }

      const result = bookId
        ? await updateBook(bookId, userId, payload as BookUpdate)
        : await createBook({ ...(payload as Omit<BookInsert, "user_id">), user_id: userId });

      if (result.error || !result.data) {
        return { ok: false, message: result.error?.message ?? "Não foi possível salvar o livro." };
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
        return { ok: false, message: "Usuário não autenticado." };
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

  const deleteBook = useCallback(
    async (bookId: string) => {
      if (!userId) {
        return { ok: false, message: "Usuário não autenticado." };
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

  const removeCategory = useCallback(
    async (bookId: string, categoryId: string) => {
      if (!userId) {
        return { ok: false, message: "Usuário não autenticado." };
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

  return {
    books: booksWithCategories,
    categories,
    loading,
    error,
    refresh,
    saveBook,
    addCategory,
    deleteBook,
    removeCategory,
  };
}
