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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm">
      <section
        className="serene-soft-in max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-accent)_12%,var(--serene-surface)_88%)] text-[var(--serene-accent)] shadow-[var(--serene-shadow-inner)]">
              <MessageSquare className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                Beta privada
              </p>
              <h2 id="feedback-title" className="text-lg font-semibold">
                Enviar feedback
              </h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--serene-muted)]">
                Ideias, incômodos e pequenos ajustes ajudam o SERENE a ficar mais confortável.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
            aria-label="Fechar feedback"
          >
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)]">
            <p className="text-sm font-medium">Obrigado. Seu feedback ficou guardado com cuidado.</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--serene-muted)]">
              Uma frase já pode revelar um caminho melhor para a leitura.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)]"
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
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
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
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
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
              <span className="text-xs leading-relaxed text-[var(--serene-muted)]">
                Pode ser bug, sugestão, sensação confusa ou algo que ficou especialmente bom.
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-32 resize-y rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                placeholder={`${selectedTypeLabel}: descreva em poucas palavras.`}
                maxLength={1200}
              />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm">Sensação geral</legend>
              <p className="text-xs text-[var(--serene-muted)]">
                Opcional. Ajuda a entender o peso emocional da experiência.
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating((current) => (current === value ? null : value))}
                    className={[
                      "grid size-9 place-items-center rounded-full border text-sm shadow-[var(--serene-shadow-soft)] transition",
                      rating === value
                        ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] hover:text-[var(--serene-fg)]",
                    ].join(" ")}
                    aria-pressed={rating === value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="rounded-2xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:opacity-60"
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
