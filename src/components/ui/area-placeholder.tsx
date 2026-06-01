"use client";

import { AlertTriangle, Mail, ShieldCheck, UserRound } from "lucide-react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";

type AreaPlaceholderProps = {
  title: string;
  description: string;
};

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "S";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function AreaPlaceholder({ title, description }: AreaPlaceholderProps) {
  const { authLoading, envReady, profile, profileError, profileState, user } = useAppState();
  const displayName = profile?.name ?? profile?.email ?? user?.email ?? "Leitor SERENE";
  const displayEmail = profile?.email ?? user?.email ?? "E-mail protegido na sua conta";
  const initials = getInitials(displayName);

  if (!envReady) {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-amber-300/80 bg-amber-50 p-6 text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-300/70 bg-white/60 dark:border-amber-700/60 dark:bg-amber-900/30">
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Configuração Supabase pendente</h1>
            <p className="mt-2 text-sm leading-relaxed">
              O SERENE já está pronto para abrir este espaço. Defina{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> para continuar.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (authLoading) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo seu espaço no SERENE...</p>
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
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Organizando seu perfil...</p>
        </div>
      </section>
    );
  }

  if (profileState === "missing") {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6 shadow-[var(--serene-shadow-soft)]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
            <UserRound className="size-4" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Perfil em preparação</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Sua conta está autenticada, mas o registro em <code>profiles</code> ainda não foi
              encontrado. O espaço permanece protegido enquanto essa configuração é concluída.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (profileState === "error") {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-rose-300/80 bg-rose-50 p-6 text-rose-900 shadow-[var(--serene-shadow-soft)] dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-rose-300/70 bg-white/60 dark:border-rose-700/60 dark:bg-rose-900/30">
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Não foi possível carregar o perfil</h1>
            <p className="mt-2 text-sm leading-relaxed">
              {profileError ?? "Tente novamente em instantes."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="serene-soft-in space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-6 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-[1.6rem] border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-accent)_14%,var(--serene-surface)_86%)] text-2xl font-semibold text-[var(--serene-accent)] shadow-[var(--serene-shadow-soft)]"
            aria-label={`Avatar de ${displayName}`}
          >
            {initials}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Perfil
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              {description}
            </p>
          </div>
        </div>

        <div className="literary mt-6 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--serene-fg)] shadow-[var(--serene-shadow-inner)]">
          Este é o seu canto dentro do SERENE: silencioso, pessoal e preparado para guardar a sua
          vida de leitura com cuidado.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
            <UserRound className="size-3.5" />
            Nome
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-[var(--serene-fg)]">
            {displayName}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
            <Mail className="size-3.5" />
            E-mail
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-[var(--serene-fg)]">
            {displayEmail}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-soft)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
            <ShieldCheck className="size-3.5" />
            Espaço
          </div>
          <p className="mt-2 text-sm font-semibold text-[var(--serene-fg)]">
            {profile?.access_status === "active" ? "Acesso ativo" : "Acesso em preparação"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 text-sm leading-relaxed text-[var(--serene-muted)]">
        Aqui aparecem apenas os dados que o SERENE já conhece. Preferências e ajustes continuam em
        suas áreas próprias, para manter este espaço simples.
      </div>
    </section>
  );
}
