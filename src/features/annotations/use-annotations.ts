"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createAnnotation,
  listAnnotationColors,
  listAnnotations,
  listBooksForAnnotations,
  softDeleteAnnotation,
  updateAnnotation,
  type AnnotationColorRow,
  type AnnotationInsert,
  type AnnotationRow,
  type AnnotationUpdate,
  type AnnotationBookRow,
} from "@/features/annotations/annotation-services";
import {
  fallbackAnnotationColors,
} from "@/features/annotations/annotation-definitions";
import type { AnnotationReviewStatus } from "@/lib/supabase/database.types";

export type AnnotationColorOption = {
  id: string;
  color_hex: string;
  name: string | null;
  applies_to: string | null;
  is_default: boolean;
};

type MutationResult = {
  ok: boolean;
  message: string | null;
};

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

export function useAnnotations(userId: string | null) {
  const [annotations, setAnnotations] = useState<AnnotationRow[]>([]);
  const [books, setBooks] = useState<AnnotationBookRow[]>([]);
  const [colors, setColors] = useState<AnnotationColorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAnnotations([]);
      setBooks([]);
      setColors(mapColorRows([]));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [annotationsResult, booksResult, colorsResult] = await Promise.all([
      listAnnotations(userId),
      listBooksForAnnotations(userId),
      listAnnotationColors(userId),
    ]);

    if (annotationsResult.error || booksResult.error || colorsResult.error) {
      setError(
        annotationsResult.error?.message ??
          booksResult.error?.message ??
          colorsResult.error?.message ??
          "Nao foi possivel carregar as anotacoes.",
      );
      setLoading(false);
      return;
    }

    setAnnotations(annotationsResult.data ?? []);
    setBooks(booksResult.data ?? []);
    setColors(mapColorRows(colorsResult.data ?? []));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refresh]);

  const createAnnotationEntry = useCallback(
    async (payload: Omit<AnnotationInsert, "user_id">): Promise<MutationResult> => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      setSaving(true);
      const result = await createAnnotation({ ...payload, user_id: userId });
      setSaving(false);

      if (result.error) {
        return { ok: false, message: result.error.message };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const editAnnotationEntry = useCallback(
    async (annotationId: string, payload: AnnotationUpdate): Promise<MutationResult> => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      setSaving(true);
      const result = await updateAnnotation(annotationId, userId, payload);
      setSaving(false);

      if (result.error) {
        return { ok: false, message: result.error.message };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const deleteAnnotationEntry = useCallback(
    async (annotationId: string): Promise<MutationResult> => {
      if (!userId) {
        return { ok: false, message: "Usuario nao autenticado." };
      }

      setSaving(true);
      const result = await softDeleteAnnotation(annotationId, userId);
      setSaving(false);

      if (result.error) {
        return { ok: false, message: result.error.message };
      }

      await refresh();
      return { ok: true, message: null };
    },
    [refresh, userId],
  );

  const setFavorite = useCallback(
    async (annotation: AnnotationRow, isFavorite: boolean) => {
      return editAnnotationEntry(annotation.id, { is_favorite: isFavorite });
    },
    [editAnnotationEntry],
  );

  const setPrivacy = useCallback(
    async (annotation: AnnotationRow, isPrivate: boolean) => {
      return editAnnotationEntry(annotation.id, { is_private: isPrivate });
    },
    [editAnnotationEntry],
  );

  const setReviewStatus = useCallback(
    async (annotation: AnnotationRow, reviewStatus: AnnotationReviewStatus) => {
      return editAnnotationEntry(annotation.id, { review_status: reviewStatus });
    },
    [editAnnotationEntry],
  );

  const booksById = useMemo(() => {
    return new Map(books.map((book) => [book.id, book]));
  }, [books]);

  return {
    annotations,
    books,
    booksById,
    colors,
    loading,
    saving,
    error,
    refresh,
    createAnnotationEntry,
    editAnnotationEntry,
    deleteAnnotationEntry,
    setFavorite,
    setPrivacy,
    setReviewStatus,
  };
}
