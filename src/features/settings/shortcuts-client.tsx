"use client";

import { Compass, Keyboard, NotebookPen, X, type LucideIcon } from "lucide-react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";

const shortcutGroups: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  items: Array<{ keys: string; action: string }>;
}> = [
  {
    title: "Navegação",
    description: "Ir direto para as áreas principais sem perder o ritmo.",
    icon: Compass,
    items: [
      { keys: "Ctrl/Cmd + 1", action: "Início" },
      { keys: "Ctrl/Cmd + 2", action: "Biblioteca" },
      { keys: "Ctrl/Cmd + 3", action: "Anotações" },
      { keys: "Ctrl/Cmd + 4", action: "Mente" },
      { keys: "Ctrl/Cmd + ,", action: "Configurações" },
    ],
  },
  {
    title: "Anotações",
    description: "Criar, salvar e mudar o tipo de nota com menos atrito.",
    icon: NotebookPen,
    items: [
      { keys: "Ctrl/Cmd + N", action: "Nova anotação" },
      { keys: "Ctrl/Cmd + S", action: "Salvar anotação aberta" },
      { keys: "Ctrl/Cmd + Enter", action: "Salvar anotação aberta" },
      { keys: "P / R / M / F / I / D / A", action: "Trocar tipo na janela de anotação" },
    ],
  },
  {
    title: "Janelas",
    description: "Fechar sobreposições com calma e voltar ao ponto em que estava.",
    icon: X,
    items: [{ keys: "Esc", action: "Fechar menu ou janela aberta" }],
  },
];

export function ShortcutsClient() {
  const { authLoading, envReady, profileState, user } = useAppState();

  if (!envReady) {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-amber-300/80 bg-amber-50 p-5 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        Configure as variáveis Supabase para carregar os atalhos.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo atalhos...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <section className="serene-soft-in space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-6 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-accent)_13%,var(--serene-surface)_87%)] text-[var(--serene-accent)] shadow-[var(--serene-shadow-soft)]">
            <Keyboard className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Atalhos
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Comandos tranquilos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Pequenos caminhos para navegar e anotar sem quebrar a concentração da leitura.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {shortcutGroups.map((group) => (
          <article
            key={group.title}
            className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5 shadow-[var(--serene-shadow-soft)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
                <group.icon className="size-4" />
              </span>
              <div>
                <h2 className="font-semibold">{group.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--serene-muted)]">
                  {group.description}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {group.items.map((shortcut) => (
                <div
                  key={`${group.title}-${shortcut.keys}-${shortcut.action}`}
                  className="grid gap-2 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="text-[var(--serene-fg)]">{shortcut.action}</span>
                  <kbd className="justify-self-start rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2 py-1 text-xs font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-inner)] sm:justify-self-end">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="literary rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--serene-muted)]">
        Os atalhos existem para reduzir atrito, não para exigir memorização. Use apenas os que
        deixarem sua leitura mais confortável.
      </div>
    </section>
  );
}
