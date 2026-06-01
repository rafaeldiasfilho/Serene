"use client";

import { Keyboard } from "lucide-react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";

const shortcuts = [
  { keys: "Ctrl/Cmd + 1", action: "Ir para Inicio" },
  { keys: "Ctrl/Cmd + 2", action: "Ir para Biblioteca" },
  { keys: "Ctrl/Cmd + 3", action: "Ir para Anotacoes" },
  { keys: "Ctrl/Cmd + 4", action: "Ir para Mente" },
  { keys: "Ctrl/Cmd + ,", action: "Abrir Configuracoes" },
  { keys: "Ctrl/Cmd + N", action: "Nova anotacao" },
  { keys: "Esc", action: "Fechar menu ou janela" },
  { keys: "Ctrl/Cmd + S", action: "Salvar anotacao aberta" },
  { keys: "Ctrl/Cmd + Enter", action: "Salvar anotacao aberta" },
  { keys: "P / R / M / F / I / D / A", action: "Trocar tipo na janela de anotacao" },
];

export function ShortcutsClient() {
  const { authLoading, envReady, profileState, user } = useAppState();

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para carregar os atalhos.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
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
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
          Atalhos
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Comandos tranquilos</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
          Atalhos ativos para navegar e criar anotacoes sem tirar as maos do teclado.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
            <Keyboard className="size-4" />
          </span>
          <h2 className="text-lg font-semibold">Lista de atalhos</h2>
        </div>

        <div className="mt-4 grid gap-2">
          {shortcuts.map((shortcut) => (
            <div
              key={`${shortcut.keys}-${shortcut.action}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm"
            >
              <span>{shortcut.action}</span>
              <kbd className="rounded-md border border-[var(--serene-border)] bg-[var(--serene-surface)] px-2 py-1 text-xs text-[var(--serene-muted)]">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
