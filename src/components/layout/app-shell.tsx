"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Brain,
  Download,
  Home,
  Keyboard,
  Library,
  LogOut,
  MessageSquare,
  Menu,
  Minimize2,
  Monitor,
  Moon,
  NotebookPen,
  Settings,
  Sun,
  Trash2,
  User,
  Wind,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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

const mainNavigation: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Início", href: "/", icon: Home },
  { label: "Biblioteca", href: "/biblioteca", icon: Library },
  { label: "Anotações", href: "/anotacoes", icon: NotebookPen },
  { label: "Mente", href: "/mente", icon: Brain },
];

const menuNavigation: Array<{ label: string; href: string; icon: LucideIcon; helper: string }> = [
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    helper: "Tema, conforto e leitura",
  },
  {
    label: "Lixeira",
    href: "/lixeira",
    icon: Trash2,
    helper: "Recuperar antes de apagar",
  },
  {
    label: "Exportar",
    href: "/exportar",
    icon: Download,
    helper: "Guardar seu caderno fora do SERENE",
  },
  {
    label: "Atalhos",
    href: "/atalhos",
    icon: Keyboard,
    helper: "Comandos tranquilos",
  },
  {
    label: "Perfil",
    href: "/perfil",
    icon: User,
    helper: "Conta e acesso",
  },
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
      <header className="sticky top-0 z-30 border-b border-[color-mix(in_oklab,var(--serene-border)_78%,transparent)] bg-[color-mix(in_oklab,var(--serene-bg)_88%,var(--serene-surface)_12%)]/95 shadow-[0_1px_0_rgb(255_255_255_/_28%)] backdrop-blur-xl dark:shadow-[0_1px_0_rgb(255_255_255_/_5%)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--serene-accent)_86%,white_14%),var(--serene-accent))] text-sm font-semibold tracking-wide text-white shadow-[var(--serene-shadow-soft)]">
              S
            </div>
            <div>
              <p className="text-sm font-semibold tracking-normal">SERENE</p>
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
                  className="hidden items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] sm:inline-flex"
                  onClick={() => void signOut()}
                  disabled={actionLoading}
                >
                  <LogOut className="size-3.5" />
                  Sair
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
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
                className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
                aria-label="Abrir menu"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                Menu
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:flex sm:px-6">
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs shadow-[var(--serene-shadow-soft)] transition",
                pathname === item.href
                  ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                  : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
              )}
            >
              <item.icon className="size-3.5" />
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
        <aside className="serene-soft-in mx-auto mt-3 w-full max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-4 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
            <div className="flex flex-col gap-1 border-b border-[var(--serene-border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
                  Menu
                </p>
                <p className="mt-1 text-sm text-[var(--serene-muted)]">
                  Ajustes, memória e detalhes ficam aqui, sem ocupar a leitura.
                </p>
              </div>
              {user && (
                <p className="text-xs text-[var(--serene-muted)]">
                  {profile?.name ?? user.email ?? "usuário"}
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {menuNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl border p-3 text-sm transition",
                    pathname === item.href
                      ? "border-[var(--serene-accent)] bg-[color-mix(in_oklab,var(--serene-accent)_12%,var(--serene-surface)_88%)] shadow-[var(--serene-shadow-soft)]"
                      : "border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,transparent)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border",
                      pathname === item.href
                        ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] group-hover:text-[var(--serene-fg)]",
                    )}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-[var(--serene-fg)]">{item.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--serene-muted)]">
                      {item.helper}
                    </span>
                  </span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/beta"
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3 text-sm transition",
                    pathname === "/beta"
                      ? "border-[var(--serene-accent)] bg-[color-mix(in_oklab,var(--serene-accent)_12%,var(--serene-surface)_88%)] shadow-[var(--serene-shadow-soft)]"
                      : "border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_82%,transparent)] text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)]">
                    <BookOpen className="size-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-[var(--serene-fg)]">Beta</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--serene-muted)]">
                      Acesso e acompanhamento
                    </span>
                  </span>
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
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] transition hover:text-[var(--serene-fg)]"
              >
                <MessageSquare className="size-4" />
                Enviar feedback
              </button>
            )}

            <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 md:grid-cols-4">
              <label className="grid gap-1 text-xs">
                <span className="inline-flex items-center gap-2 text-[var(--serene-muted)]">
                  {themePreference === "light" ? (
                    <Sun className="size-3.5" />
                  ) : themePreference === "dark" ? (
                    <Moon className="size-3.5" />
                  ) : (
                    <Monitor className="size-3.5" />
                  )}
                  Tema
                </span>
                <select
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-2 py-1.5 text-sm"
                  value={themePreference}
                  onChange={(event) =>
                    void setThemePreference(event.target.value as ThemePreference)
                  }
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="system">Sistema</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                <span className="inline-flex items-center gap-2 text-[var(--serene-muted)]">
                  {readingCloseBehavior === "close" ? (
                    <XCircle className="size-3.5" />
                  ) : (
                    <Minimize2 className="size-3.5" />
                  )}
                  Fechar leitura
                </span>
                <select
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-2 py-1.5 text-sm"
                  value={readingCloseBehavior}
                  onChange={(event) =>
                    void setReadingCloseBehavior(event.target.value as ReadingCloseBehavior)
                  }
                >
                  <option value="minimize">Minimizar</option>
                  <option value="close">Encerrar sessao ativa</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={reducedMotionEnabled}
                  onChange={(event) => void setReducedMotionEnabled(event.target.checked)}
                />
                <Wind className="size-3.5 text-[var(--serene-muted)]" />
                Reduzir movimento
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-xs">
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
          </div>
        </aside>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 sm:pb-8">
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color-mix(in_oklab,var(--serene-border)_78%,transparent)] bg-[color-mix(in_oklab,var(--serene-bg)_88%,var(--serene-surface)_12%)]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_34px_rgb(0_0_0_/_8%)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mainNavigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] transition",
                  active
                    ? "bg-[color-mix(in_oklab,var(--serene-accent)_12%,var(--serene-surface)_88%)] text-[var(--serene-fg)]"
                    : "text-[var(--serene-muted)] hover:bg-[var(--serene-surface-soft)]",
                )}
              >
                {active && (
                  <span className="absolute top-1 h-1 w-8 rounded-full bg-[var(--serene-accent)]" />
                )}
                <Icon className={cn("mt-1 size-5", active ? "text-[var(--serene-accent)]" : "")} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

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
