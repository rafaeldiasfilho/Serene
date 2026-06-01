"use client";

import { FormEvent, useState } from "react";

import { BrainLoader } from "@/components/ui/brain-loader";
import { useAppState } from "@/components/providers/app-state-provider";

export function AuthPanel() {
  const { actionLoading, authError, signInWithPassword } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Preencha e-mail e senha.");
      return;
    }

    await signInWithPassword(email, password);
  }

  return (
    <section className="mx-auto grid w-full max-w-lg gap-5 rounded-3xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
      <div className="flex items-center gap-3">
        <BrainLoader className="size-12" />
        <div>
          <h2 className="text-base font-semibold">Entrar no SERENE</h2>
          <p className="text-sm text-[var(--serene-muted)]">
            Acesso individual da beta privada, com seus livros e notas separados dos demais.
          </p>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm">
          E-mail
          <input
            type="email"
            className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none ring-[var(--serene-accent)] focus:ring-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Senha
          <input
            type="password"
            className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none ring-[var(--serene-accent)] focus:ring-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={actionLoading}
          >
            {actionLoading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>

      {(localError || authError) && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {localError ?? authError}
        </p>
      )}
    </section>
  );
}
