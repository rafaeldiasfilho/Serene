"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import {
  loadBetaOverview,
  type BetaOverview,
  type BetaUserRow,
} from "@/features/beta-admin/beta-admin-services";

function formatDate(value: string | null) {
  if (!value) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function userLabel(user: BetaUserRow | undefined, fallbackId: string) {
  if (!user) {
    return fallbackId.slice(0, 8);
  }

  return user.name ?? user.email ?? user.id.slice(0, 8);
}

export function BetaAdminClient() {
  const { authLoading, envReady, profile, profileState, user } = useAppState();
  const [overview, setOverview] = useState<BetaOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewAdmin = profile?.role === "admin" && profile.access_status === "active";

  const refresh = useCallback(async () => {
    if (!canViewAdmin) {
      setOverview(null);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await loadBetaOverview();
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      setOverview(null);
      return;
    }

    setOverview(result.data);
  }, [canViewAdmin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const usersById = useMemo(() => {
    return new Map((overview?.betaUsers ?? []).map((betaUser) => [betaUser.id, betaUser]));
  }, [overview?.betaUsers]);

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para acessar a beta.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Verificando acesso interno...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (!canViewAdmin) {
    return (
      <section className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
        <h1 className="text-xl font-semibold">Area interna</h1>
        <p className="mt-2 text-sm text-[var(--serene-muted)]">
          Esta visao fica disponivel apenas para administradores da beta.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Beta privada
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Visão interna</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Um resumo simples para acompanhar usuários, uso real e feedback sem pesar o SERENE.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </button>
      </header>

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {loading ? (
        <section className="grid min-h-56 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Reunindo sinais da beta...</p>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Beta users", overview?.betaUsers.length ?? 0],
              ["Livros", overview?.totalBooks ?? 0],
              ["Notas", overview?.totalNotes ?? 0],
              ["Sessões", overview?.totalReadingSessions ?? 0],
              ["Feedbacks", overview?.feedbackCount ?? 0],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[var(--serene-accent)]" />
              <h2 className="text-lg font-semibold">Usuários beta</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {(overview?.betaUsers ?? []).length === 0 ? (
                <p className="text-sm text-[var(--serene-muted)]">
                  Nenhum usuário marcado como beta tester ainda.
                </p>
              ) : (
                overview?.betaUsers.map((betaUser) => (
                  <div
                    key={betaUser.id}
                    className="grid gap-2 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 md:grid-cols-[1fr_auto_auto]"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {betaUser.name ?? betaUser.email ?? betaUser.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-[var(--serene-muted)]">
                        {betaUser.email ?? "Sem e-mail"}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--serene-muted)]">
                      Status: {betaUser.access_status}
                    </p>
                    <p className="text-xs text-[var(--serene-muted)]">
                      Visto: {formatDate(betaUser.last_seen_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
            <h2 className="text-lg font-semibold">Últimos feedbacks</h2>
            <div className="mt-4 grid gap-3">
              {(overview?.latestFeedback ?? []).length === 0 ? (
                <p className="text-sm text-[var(--serene-muted)]">Ainda não há feedback enviado.</p>
              ) : (
                overview?.latestFeedback.map((feedback) => (
                  <article
                    key={feedback.id}
                    className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--serene-muted)]">
                      <span>{feedback.type}</span>
                      <span>{feedback.screen}</span>
                      <span>{userLabel(usersById.get(feedback.user_id), feedback.user_id)}</span>
                      <span>{formatDate(feedback.created_at)}</span>
                      {feedback.rating && <span>Nota {feedback.rating}/5</span>}
                    </div>
                    <p className="mt-2 text-sm">{feedback.message}</p>
                    <p className="mt-2 text-xs text-[var(--serene-muted)]">
                      Status: {feedback.status}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
