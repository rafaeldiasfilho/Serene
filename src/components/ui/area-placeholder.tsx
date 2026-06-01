"use client";

import { AuthPanel } from "@/components/auth/auth-panel";
import { BrainLoader } from "@/components/ui/brain-loader";
import { useAppState } from "@/components/providers/app-state-provider";

type AreaPlaceholderProps = {
  title: string;
  description: string;
};

export function AreaPlaceholder({ title, description }: AreaPlaceholderProps) {
  const { authLoading, envReady, profile, profileError, profileState, user } = useAppState();

  if (!envReady) {
    return (
      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-800">
        <h1 className="text-xl font-semibold">Configuração Supabase pendente</h1>
        <p className="mt-2 text-sm">
          Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          para continuar.
        </p>
      </section>
    );
  }

  if (authLoading) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Confirmando sua sessão...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (profileState === "loading") {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Carregando seu perfil...</p>
        </div>
      </section>
    );
  }

  if (profileState === "missing") {
    return (
      <section className="rounded-3xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
        <h1 className="text-xl font-semibold">Perfil ainda não preparado</h1>
        <p className="mt-2 text-sm text-[var(--serene-muted)]">
          Sua conta está autenticada, mas o registro em <code>profiles</code> não foi encontrado.
          Esta etapa será tratada com uma configuração leve, sem onboarding complexo.
        </p>
      </section>
    );
  }

  if (profileState === "error") {
    return (
      <section className="rounded-3xl border border-rose-300 bg-rose-50 p-6 text-rose-800">
        <h1 className="text-xl font-semibold">Não foi possível carregar o perfil</h1>
        <p className="mt-2 text-sm">{profileError ?? "Tente novamente em instantes."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
          SERENE
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--serene-muted)]">{description}</p>
      </div>
      <div className="rounded-3xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 text-sm text-[var(--serene-muted)]">
        <p>
          Perfil ativo:{" "}
          <strong className="text-[var(--serene-fg)]">{profile?.name ?? user.email ?? "Usuário"}</strong>
        </p>
        <p className="mt-1">Esta área está preparada para a próxima fase, mantendo a interface leve.</p>
      </div>
    </section>
  );
}
