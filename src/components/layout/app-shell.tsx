"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { BrainLoader } from "@/components/ui/brain-loader";
import { cn } from "@/lib/utils";
import {
  OPEN_ANNOTATION_SHORTCUT_EVENT,
  isEditableShortcutTarget,
} from "@/lib/shortcuts";
import { useAppState } from "@/components/providers/app-state-provider";
import { ActiveReadingIndicator } from "@/features/reading-minimize/active-reading-indicator";
import { FloatingReadingCard } from "@/features/reading-minimize/floating-reading-card";
import { useActiveReadingSession } from "@/features/reading-minimize/use-active-reading-session";
import {
  FeedbackModal,
  OPEN_FEEDBACK_EVENT,
} from "@/features/feedback/feedback-modal";
import { screenFromPathname } from "@/features/feedback/feedback-services";
import type { ReadingCloseBehavior, ThemePreference } from "@/lib/supabase/types";

const mainNavigation = [
  { label: "Início", href: "/" },
  { label: "Biblioteca", href: "/biblioteca" },
  { label: "Anotações", href: "/anotacoes" },
  { label: "Mente", href: "/mente" },
];

const menuNavigation = [
  { label: "Configurações", href: "/configuracoes" },
  { label: "Lixeira", href: "/lixeira" },
  { label: "Exportar", href: "/exportar" },
  { label: "Atalhos", href: "/atalhos" },
  { label: "Perfil", href: "/perfil" },
];

type AppShellProps = {
  children: React.ReactNode;
};

function hasPrivateBetaAccess(profile: ReturnType<typeof useAppState>["profile"]) {
  if (!profile) {
    return false;
  }

  return profile.access_status === "active" && (profile.role === "admin" || profile.is_beta_tester);
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const {
    actionLoading,
    authLoading,
    envReady,
    pressureFreeModeEnabled,
    profile,
    readingCloseBehavior,
    setReadingCloseBehavior,
    setPressureFreeModeEnabled,
    setReducedMotionEnabled,
    setThemePreference,
    signOut,
    themePreference,
    reducedMotionEnabled,
    user,
  } = useAppState();
  const privateBetaReady = hasPrivateBetaAccess(profile);
  const isAdmin = profile?.role === "admin" && profile.access_status === "active";
  const activeReadingState = useActiveReadingSession(
    privateBetaReady ? user?.id ?? null : null,
    pathname,
  );
  const activeReading = activeReadingState.activeReading;
  const isFullReadingScreen =
    Boolean(activeReading) && pathname === `/leitura/${activeReading?.book.id}`;

  useEffect(() => {
    function handleOpenFeedback() {
      setFeedbackOpen(true);
    }

    window.addEventListener(OPEN_FEEDBACK_EVENT, handleOpenFeedback);

    return () => {
      window.removeEventListener(OPEN_FEEDBACK_EVENT, handleOpenFeedback);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "n") {
        event.preventDefault();
        if (isEditableShortcutTarget(event.target)) {
          return;
        }

        window.dispatchEvent(new CustomEvent(OPEN_ANNOTATION_SHORTCUT_EVENT));

        if (pathname !== "/" && pathname !== "/anotacoes" && !pathname.startsWith("/leitura/")) {
          setMenuOpen(false);
          router.push("/anotacoes?nova=1");
        }
        return;
      }

      if (isEditableShortcutTarget(event.target)) {
        return;
      }

      const shortcutRoutes: Record<string, string> = {
        "1": "/",
        "2": "/biblioteca",
        "3": "/anotacoes",
        "4": "/mente",
        ",": "/configuracoes",
      };
      const nextRoute = shortcutRoutes[key];

      if (nextRoute) {
        event.preventDefault();
        setMenuOpen(false);
        router.push(nextRoute);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, pathname, router]);

  return (
    <div className="min-h-screen bg-[var(--serene-bg)] text-[var(--serene-fg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-bg)_88%,white_12%)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-xs font-semibold tracking-wide">
              S
            </div>
            <div>
              <p className="text-sm font-semibold">SERENE</p>
              <p className="text-xs text-[var(--serene-muted)]">
                {pressureFreeModeEnabled ? "Modo sem pressão ativo" : "Leitura com presença"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authLoading ? (
              <BrainLoader className="size-9" />
            ) : user ? (
              <>
                <button
                  type="button"
                  className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs"
                  onClick={() => void signOut()}
                  disabled={actionLoading}
                >
                  Sair
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs"
                  aria-label="Abrir menu"
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                  Menu
                </button>
              </>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs"
                aria-label="Abrir menu"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                Menu
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition",
                pathname === item.href
                  ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                  : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {activeReading && (
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6">
            <ActiveReadingIndicator
              activeReading={activeReading}
              onRestore={activeReadingState.restore}
            />
          </div>
        )}
      </header>

      {menuOpen && (
        <aside className="mx-auto mt-3 w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {menuNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    pathname === item.href
                      ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                      : "border-[var(--serene-border)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/beta"
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    pathname === "/beta"
                      ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                      : "border-[var(--serene-border)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  Beta
                </Link>
              )}
            </div>

            {user && privateBetaReady && (
              <button
                type="button"
                onClick={() => {
                  setFeedbackOpen(true);
                  setMenuOpen(false);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm"
              >
                <MessageSquare className="size-4" />
                Enviar feedback
              </button>
            )}

            <div className="mt-4 grid gap-3 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 md:grid-cols-4">
              <label className="grid gap-1 text-xs">
                Tema
                <select
                  className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-2 py-1 text-sm"
                  value={themePreference}
                  onChange={(event) =>
                    void setThemePreference(event.target.value as ThemePreference)
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Fechar leitura
                <select
                  className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-2 py-1 text-sm"
                  value={readingCloseBehavior}
                  onChange={(event) =>
                    void setReadingCloseBehavior(event.target.value as ReadingCloseBehavior)
                  }
                >
                  <option value="minimize">Minimizar</option>
                  <option value="close">Encerrar sessao</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={reducedMotionEnabled}
                  onChange={(event) => void setReducedMotionEnabled(event.target.checked)}
                />
                Reduzir movimento
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={pressureFreeModeEnabled}
                  onChange={(event) => void setPressureFreeModeEnabled(event.target.checked)}
                />
                Modo sem pressão
              </label>
            </div>

            {!envReady && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Variáveis Supabase ainda não configuradas no ambiente.
              </p>
            )}
            {user && (
              <p className="mt-3 text-xs text-[var(--serene-muted)]">
                Conectado como {profile?.name ?? user.email ?? "usuário"}.
              </p>
            )}
          </div>
        </aside>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {user && profile && !privateBetaReady ? (
          <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Beta privada
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Seu acesso está sendo preparado</h1>
            <p className="mt-3 text-sm text-[var(--serene-muted)]">
              Esta conta já é individual, mas ainda precisa ser liberada para a beta. Quando o
              acesso estiver ativo, seus livros, anotações e sessões ficarão isolados no seu perfil.
            </p>
            <p className="mt-4 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-sm">
              Status atual: {profile.access_status}.
            </p>
          </section>
        ) : (
          children
        )}
      </main>

      {activeReading?.session.is_minimized && !isFullReadingScreen && (
        <FloatingReadingCard
          activeReading={activeReading}
          onRestore={activeReadingState.restore}
        />
      )}

      {feedbackOpen && user && privateBetaReady && (
        <FeedbackModal
          defaultScreen={screenFromPathname(pathname)}
          userId={user.id}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}
