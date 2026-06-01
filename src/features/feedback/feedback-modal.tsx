"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";

import type { FeedbackScreen, FeedbackType } from "@/lib/supabase/database.types";
import {
  feedbackScreens,
  feedbackTypes,
  submitFeedback,
} from "@/features/feedback/feedback-services";

export const OPEN_FEEDBACK_EVENT = "serene:open-feedback";

type FeedbackModalProps = {
  defaultScreen: FeedbackScreen;
  onClose: () => void;
  userId: string;
};

export function FeedbackModal({ defaultScreen, onClose, userId }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("Bug");
  const [screen, setScreen] = useState<FeedbackScreen>(defaultScreen);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedTypeLabel = useMemo(() => {
    return feedbackTypes.find((item) => item.value === type)?.label ?? type;
  }, [type]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("Escreva uma frase curta para orientar o time.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await submitFeedback({
      user_id: userId,
      type,
      screen,
      message: trimmedMessage,
      rating,
      status: "new",
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4 py-6">
      <section
        className="w-full max-w-lg rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                Beta privada
              </p>
              <h2 id="feedback-title" className="text-lg font-semibold">
                Enviar feedback
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)]"
            aria-label="Fechar feedback"
          >
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4">
            <p className="text-sm font-medium">Obrigado. Seu feedback ajuda a melhorar o SERENE.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Tipo
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as FeedbackType)}
                  className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                >
                  {feedbackTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                Tela
                <select
                  value={screen}
                  onChange={(event) => setScreen(event.target.value as FeedbackScreen)}
                  className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                >
                  {feedbackScreens.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              O que você percebeu?
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-28 resize-y rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                placeholder={`${selectedTypeLabel}: descreva em poucas palavras.`}
                maxLength={1200}
              />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm">Sensação geral</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating((current) => (current === value ? null : value))}
                    className={[
                      "grid size-9 place-items-center rounded-full border text-sm",
                      rating === value
                        ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)]",
                    ].join(" ")}
                    aria-pressed={rating === value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Send className="size-4" />
                {loading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
