"use client";

import { BookOpen, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";

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
    <section className="serene-rise mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-lift)]">
        <div className="bg-[linear-gradient(135deg,var(--serene-surface),var(--serene-surface-soft))] p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <BrainLoader className="size-14 shrink-0" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)]">
                <Sparkles className="size-3.5 text-[var(--serene-accent)]" />
                Entrada
              </div>
              <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--serene-fg)]">
                Entre no seu santuário de leitura
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--serene-muted)]">
                Acesse com calma. Seus livros, notas e sessões ficam organizados no seu espaço
                individual da beta privada.
              </p>
            </div>
          </div>

          <div className="literary mt-5 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--serene-muted)] shadow-[var(--serene-shadow-inner)]">
            Um lugar quieto para voltar ao livro certo e guardar o que a leitura deixou em você.
          </div>
        </div>

        <form className="grid gap-4 p-6 sm:p-7" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-fg)]">
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4 text-[var(--serene-accent)]" />
              E-mail
            </span>
            <input
              type="email"
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 text-sm text-[var(--serene-fg)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent)]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="voce@email.com"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-fg)]">
            <span className="inline-flex items-center gap-2">
              <Lock className="size-4 text-[var(--serene-accent)]" />
              Senha
            </span>
            <input
              type="password"
              className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 text-sm text-[var(--serene-fg)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent)]"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Sua senha"
            />
          </label>

          {(localError || authError) && (
            <p className="serene-soft-in rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
              {localError ?? authError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-xs leading-relaxed text-[var(--serene-muted)]">
              <ShieldCheck className="size-4 text-[var(--serene-accent)]" />
              Acesso protegido da beta privada.
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--serene-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--serene-shadow-lift)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={actionLoading}
            >
              <BookOpen className="size-4" />
              {actionLoading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
