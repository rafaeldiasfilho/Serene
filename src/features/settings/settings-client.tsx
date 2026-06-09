"use client";

import Link from "next/link";
import {
  Bell,
  Brush,
  Check,
  Keyboard,
  LayoutGrid,
  Lock,
  MessageSquare,
  Minimize2,
  Moon,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  Wind,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import { OPEN_FEEDBACK_EVENT } from "@/features/feedback/feedback-modal";
import {
  applyPrivateBookSafetyDefaults,
  createSettingsAnnotationColor,
  defaultMuralPreferences,
  defaultQuickExportPrivacy,
  deleteSettingsAnnotationColor,
  getPrivacySafetyCounts,
  getUserSetting,
  listSettingsAnnotationColors,
  normalizeMuralPreferences,
  normalizeQuickExportPrivacy,
  setDefaultAnnotationColor,
  updateSettingsAnnotationColor,
  upsertUserSetting,
  type AnnotationColorRow,
  type MuralPreferences,
  type PrivacySafetyCounts,
  type QuickExportPrivacySetting,
} from "@/features/settings/settings-services";
import type { ReadingCloseBehavior, ThemePreference } from "@/lib/supabase/types";
import { ACTION_ERROR_MESSAGE, LOAD_ERROR_MESSAGE, SAVE_ERROR_MESSAGE, userFacingError } from "@/lib/user-facing-error";

type ColorDraft = {
  name: string;
  color_hex: string;
  applies_to: string;
};

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    value: "light",
    label: "Claro",
    description: "Uma leitura aberta, com fundo mais luminoso.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Menos brilho para sessões longas ou noturnas.",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Segue a preferência do seu dispositivo.",
    icon: Monitor,
  },
];

const closeBehaviorOptions: Array<{
  value: ReadingCloseBehavior;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "minimize",
    label: "Minimizar",
    description: "A leitura fica guardada em um cartão discreto para voltar depois.",
    icon: Minimize2,
  },
  {
    value: "close",
    label: "Encerrar sessão",
    description: "Fechar a leitura conclui a sessão atual.",
    icon: XCircle,
  },
];

function draftFromColor(color: AnnotationColorRow): ColorDraft {
  return {
    name: color.name ?? "",
    color_hex: color.color_hex,
    applies_to: color.applies_to ?? "",
  };
}

function buildColorDrafts(colors: AnnotationColorRow[]) {
  return Object.fromEntries(colors.map((color) => [color.id, draftFromColor(color)]));
}

function normalizeHex(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

function SettingsSection({
  children,
  description,
  eyebrow,
  title,
  icon: Icon,
}: {
  children: ReactNode;
  description?: string;
  eyebrow: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-5 shadow-[var(--serene-shadow-soft)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-accent)_12%,var(--serene-surface)_88%)] text-[var(--serene-accent)] shadow-[var(--serene-shadow-soft)]">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={[
        "flex items-start justify-between gap-4 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)] transition",
        disabled ? "opacity-60" : "cursor-pointer hover:border-[var(--serene-accent)]",
      ].join(" ")}
    >
      <span>
        <span className="block text-sm font-semibold text-[var(--serene-fg)]">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--serene-muted)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={[
          "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition",
          checked
            ? "border-[var(--serene-accent)] bg-[var(--serene-accent)]"
            : "border-[var(--serene-border)] bg-[var(--serene-surface)]",
        ].join(" ")}
      >
        <span
          className={[
            "size-4 rounded-full bg-white shadow-[var(--serene-shadow-soft)] transition",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </label>
  );
}

export function SettingsClient() {
  const {
    authLoading,
    envReady,
    profileError,
    profileState,
    pressureFreeModeEnabled,
    readingCloseBehavior,
    reducedMotionEnabled,
    setPressureFreeModeEnabled,
    setReadingCloseBehavior,
    setReducedMotionEnabled,
    setThemePreference,
    themePreference,
    user,
  } = useAppState();

  const [muralPreferences, setMuralPreferences] =
    useState<MuralPreferences>(defaultMuralPreferences);
  const [quickExportPrivacy, setQuickExportPrivacy] =
    useState<QuickExportPrivacySetting>(defaultQuickExportPrivacy);
  const [privacyCounts, setPrivacyCounts] = useState<PrivacySafetyCounts | null>(null);
  const [colors, setColors] = useState<AnnotationColorRow[]>([]);
  const [colorDrafts, setColorDrafts] = useState<Record<string, ColorDraft>>({});
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#DDEAFE");
  const [newColorAppliesTo, setNewColorAppliesTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const quickExportPrivateExcluded = !quickExportPrivacy.include_private_content;

  const loadSettings = useCallback(async () => {
    if (!user) {
      setMuralPreferences(defaultMuralPreferences);
      setQuickExportPrivacy(defaultQuickExportPrivacy);
      setColors([]);
      setColorDrafts({});
      setPrivacyCounts(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [muralResult, quickExportResult, colorsResult, privacyCountsResult] =
      await Promise.all([
        getUserSetting(user.id, "mural_preferences"),
        getUserSetting(user.id, "quick_export_privacy"),
        listSettingsAnnotationColors(user.id),
        getPrivacySafetyCounts(user.id),
      ]);

    const firstError =
      muralResult.error ??
      quickExportResult.error ??
      colorsResult.error ??
      privacyCountsResult.error;

    if (firstError) {
      setError(userFacingError(firstError, LOAD_ERROR_MESSAGE, "Falha ao carregar configuracoes."));
      setLoading(false);
      return;
    }

    const colorRows = colorsResult.data ?? [];
    setMuralPreferences(normalizeMuralPreferences(muralResult.data?.value ?? null));
    setQuickExportPrivacy(normalizeQuickExportPrivacy(quickExportResult.data?.value ?? null));
    setColors(colorRows);
    setColorDrafts(buildColorDrafts(colorRows));
    setPrivacyCounts(privacyCountsResult.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSettings]);

  const colorCountText = useMemo(() => {
    if (colors.length === 0) {
      return "Nenhuma cor personalizada salva.";
    }

    return `${colors.length} cores disponíveis para anotações.`;
  }, [colors.length]);

  async function persistMuralPreferences(nextPreferences: MuralPreferences) {
    if (!user) {
      return;
    }

    setSavingKey("mural_preferences");
    setMuralPreferences(nextPreferences);
    const result = await upsertUserSetting(user.id, "mural_preferences", nextPreferences);
    setSavingKey(null);

    if (result.error) {
      setFeedback(userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao salvar preferencias do Mural."));
      await loadSettings();
      return;
    }

    setFeedback("Preferências do Mural salvas.");
  }

  async function persistQuickExportPrivacy(nextValue: QuickExportPrivacySetting) {
    if (!user) {
      return;
    }

    setSavingKey("quick_export_privacy");
    setQuickExportPrivacy(nextValue);
    const result = await upsertUserSetting(user.id, "quick_export_privacy", nextValue);
    setSavingKey(null);

    if (result.error) {
      setFeedback(userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao salvar privacidade de exportacao."));
      await loadSettings();
      return;
    }

    setFeedback("Privacidade das exportações rápidas salva.");
  }

  async function handleThemeChange(value: ThemePreference) {
    setSavingKey("theme");
    await setThemePreference(value);
    setSavingKey(null);
    setFeedback("Tema atualizado.");
  }

  async function handleReducedMotion(value: boolean) {
    setSavingKey("reduced_motion");
    await setReducedMotionEnabled(value);
    setSavingKey(null);
    setFeedback(value ? "Movimento reduzido ativado." : "Movimento padrão restaurado.");
  }

  async function handlePressureFreeMode(value: boolean) {
    setSavingKey("pressure_free");
    await setPressureFreeModeEnabled(value);
    setSavingKey(null);
    setFeedback(value ? "Modo sem pressão ativado." : "Modo sem pressão desativado.");
  }

  async function handleReadingCloseBehavior(value: ReadingCloseBehavior) {
    setSavingKey("reading_close_behavior");
    await setReadingCloseBehavior(value);
    setSavingKey(null);
    setFeedback("Comportamento de fechamento atualizado.");
  }

  async function handleSaveColor(color: AnnotationColorRow) {
    if (!user) {
      return;
    }

    const draft = colorDrafts[color.id];
    if (!draft) {
      return;
    }

    const normalizedColor = normalizeHex(draft.color_hex);
    if (!normalizedColor) {
      setFeedback("Use uma cor hexadecimal válida, como #DDEAFE.");
      return;
    }

    setSavingKey(`color-${color.id}`);
    const result = await updateSettingsAnnotationColor(color.id, user.id, {
      name: draft.name.trim() || null,
      color_hex: normalizedColor,
      applies_to: draft.applies_to || null,
    });
    setSavingKey(null);

    if (result.error) {
      setFeedback(userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao salvar cor de anotacao."));
      return;
    }

    setFeedback("Cor de anotação salva.");
    await loadSettings();
  }

  async function handleSetDefaultColor(color: AnnotationColorRow) {
    if (!user) {
      return;
    }

    setSavingKey(`default-${color.id}`);
    const result = await setDefaultAnnotationColor(color.id, user.id);
    setSavingKey(null);

    if (result.error) {
      setFeedback(userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao definir cor padrao."));
      return;
    }

    setFeedback("Cor padrão atualizada.");
    await loadSettings();
  }

  async function handleDeleteColor(color: AnnotationColorRow) {
    if (!user || color.is_default) {
      return;
    }

    const confirmed = window.confirm(
      "Remover esta cor personalizada? Anotações existentes continuam com as cores já salvas.",
    );
    if (!confirmed) {
      return;
    }

    setSavingKey(`delete-${color.id}`);
    const result = await deleteSettingsAnnotationColor(color.id, user.id);
    setSavingKey(null);

    if (result.error) {
      setFeedback(userFacingError(result.error, ACTION_ERROR_MESSAGE, "Falha ao remover cor personalizada."));
      return;
    }

    setFeedback("Cor personalizada removida.");
    await loadSettings();
  }

  async function handleAddColor() {
    if (!user) {
      return;
    }

    const normalizedColor = normalizeHex(newColorHex);
    if (!normalizedColor) {
      setFeedback("Use uma cor hexadecimal válida, como #DDEAFE.");
      return;
    }

    setSavingKey("new_color");
    const result = await createSettingsAnnotationColor(user.id, {
      name: newColorName.trim() || null,
      color_hex: normalizedColor,
      applies_to: newColorAppliesTo || null,
    });
    setSavingKey(null);

    if (result.error) {
      setFeedback(userFacingError(result.error, SAVE_ERROR_MESSAGE, "Falha ao adicionar cor personalizada."));
      return;
    }

    setNewColorName("");
    setNewColorHex("#DDEAFE");
    setNewColorAppliesTo("");
    setFeedback("Nova cor adicionada.");
    await loadSettings();
  }

  async function handleApplyPrivateDefaults() {
    if (!user) {
      return;
    }

    setSavingKey("privacy_defaults");
    const [updateResult, settingResult] = await Promise.all([
      applyPrivateBookSafetyDefaults(user.id),
      upsertUserSetting(user.id, "quick_export_privacy", { include_private_content: false }),
    ]);
    setSavingKey(null);

    if (updateResult.error || settingResult.error) {
      const firstSaveError = updateResult.error ?? settingResult.error;
      setFeedback(
        firstSaveError
          ? userFacingError(firstSaveError, SAVE_ERROR_MESSAGE, "Falha ao aplicar privacidade dos livros.")
          : "Não foi possível salvar essa alteração agora.",
      );
      return;
    }

    setQuickExportPrivacy({ include_private_content: false });
    setFeedback("Livros privados protegidos dos atalhos públicos e exportações rápidas.");
    await loadSettings();
  }

  if (!envReady) {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-amber-300/80 bg-amber-50 p-5 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        Configure as variáveis Supabase para carregar as configurações.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="serene-soft-in flex flex-col items-center gap-3 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] px-8 py-7 text-center shadow-[var(--serene-shadow-soft)]">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo suas preferências...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (profileState === "error") {
    return (
      <section className="serene-soft-in rounded-[2rem] border border-rose-300/80 bg-rose-50 p-5 text-rose-900 shadow-[var(--serene-shadow-soft)] dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100">
        <h1 className="text-xl font-semibold">Não foi possível carregar o perfil</h1>
        <p className="mt-2 text-sm">{profileError ?? "Tente novamente em instantes."}</p>
      </section>
    );
  }

  return (
    <section className="serene-soft-in space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-[var(--serene-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_94%,white_6%),var(--serene-surface))] p-6 shadow-[var(--serene-shadow-lift)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--serene-surface)_92%,black_8%),var(--serene-surface))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
              Configurações
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Controle com calma</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Ajustes essenciais para conforto visual, leitura, Mural e privacidade. Tudo fica aqui
              sem invadir o momento de ler.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
        </div>
      </header>

      {feedback && (
        <p className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-3 text-sm shadow-[var(--serene-shadow-soft)]">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      )}

      {loading ? (
        <section className="grid min-h-56 place-items-center rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] shadow-[var(--serene-shadow-soft)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Organizando preferências...</p>
          </div>
        </section>
      ) : (
        <div className="grid gap-5">
          <SettingsSection
            eyebrow="Aparência"
            title="Leitura visual"
            icon={Monitor}
            description="Escolha como a interface acompanha o ambiente e o seu cansaço visual."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = themePreference === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void handleThemeChange(option.value)}
                    className={[
                      "flex min-h-[8rem] flex-col items-start justify-between rounded-2xl border p-4 text-left shadow-[var(--serene-shadow-inner)] transition",
                      active
                        ? "border-[var(--serene-accent)] bg-[color-mix(in_oklab,var(--serene-accent)_13%,var(--serene-surface)_87%)] text-[var(--serene-fg)]"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] hover:border-[var(--serene-accent)]",
                    ].join(" ")}
                    disabled={savingKey === "theme"}
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="grid size-10 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-accent)]">
                        <Icon className="size-4" />
                      </span>
                      {active && (
                        <span className="rounded-full bg-[var(--serene-accent)] px-2 py-1 text-xs font-semibold text-white">
                          Atual
                        </span>
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--serene-fg)]">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <ToggleRow
                checked={reducedMotionEnabled}
                label="Reduzir movimento"
                description="Suaviza animações decorativas e transições longas."
                disabled={savingKey === "reduced_motion"}
                onChange={(value) => void handleReducedMotion(value)}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            eyebrow="Leitura"
            title="Ritmo e fechamento"
            icon={Wind}
            description="Defina como o SERENE se comporta quando você precisa sair da leitura."
          >
            <div className="grid gap-3">
              <ToggleRow
                checked={pressureFreeModeEnabled}
                label="Modo sem pressão"
                description="Evita mensagens com tom de cobrança, sequência ou pressão. O SERENE respeita seu ritmo."
                disabled={savingKey === "pressure_free"}
                onChange={(value) => void handlePressureFreeMode(value)}
              />

              <div>
                <p className="text-sm font-semibold">Ao fechar a leitura</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {closeBehaviorOptions.map((option) => {
                    const Icon = option.icon;
                    const active = readingCloseBehavior === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => void handleReadingCloseBehavior(option.value)}
                        disabled={savingKey === "reading_close_behavior"}
                        className={[
                          "flex items-start gap-3 rounded-2xl border p-4 text-left shadow-[var(--serene-shadow-inner)] transition",
                          active
                            ? "border-[var(--serene-accent)] bg-[color-mix(in_oklab,var(--serene-accent)_13%,var(--serene-surface)_87%)]"
                            : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)] hover:border-[var(--serene-accent)]",
                        ].join(" ")}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-accent)]">
                          <Icon className="size-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[var(--serene-fg)]">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-[var(--serene-muted)]">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            eyebrow="Mural"
            title="Espaço de ideias"
            icon={LayoutGrid}
            description="Preferências visuais para manter o Mural aberto, limpo e organizado."
          >
            <div className="grid gap-3">
              <ToggleRow
                checked={muralPreferences.show_suggestions}
                label="Mostrar sugestões de balões"
                description="Quando desligado, o Mural fica limpo e não cria novas sugestões automáticas."
                disabled={savingKey === "mural_preferences"}
                onChange={(value) =>
                  void persistMuralPreferences({
                    ...muralPreferences,
                    show_suggestions: value,
                  })
                }
              />
              <ToggleRow
                checked={muralPreferences.calm_grid_enabled}
                label="Grade visual suave"
                description="Mantém uma referência discreta para organizar anotações sem pesar a tela."
                disabled={savingKey === "mural_preferences"}
                onChange={(value) =>
                  void persistMuralPreferences({
                    ...muralPreferences,
                    calm_grid_enabled: value,
                  })
                }
              />
            </div>
            <div className="mt-4 grid gap-3 text-xs text-[var(--serene-muted)] md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
                <p className="font-semibold text-[var(--serene-fg)]">
                  {muralPreferences.max_suggestions_per_session}
                </p>
                <p className="mt-1">Sugestões por sessão</p>
              </div>
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
                <p className="font-semibold text-[var(--serene-fg)]">Sim</p>
                <p className="mt-1">Posições estáveis</p>
              </div>
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
                <p className="font-semibold text-[var(--serene-fg)]">Sim</p>
                <p className="mt-1">Sorteio por sessão</p>
              </div>
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
                <p className="font-semibold text-[var(--serene-fg)]">Sim</p>
                <p className="mt-1">Anotações existentes</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            eyebrow="Anotações"
            title="Cores"
            icon={Brush}
            description="Ajustes visuais para diferenciar notas sem transformar a tela em uma paleta pesada."
          >
            <p className="text-sm text-[var(--serene-muted)]">{colorCountText}</p>
            <div className="mt-4 grid gap-3">
              {colors.map((color) => {
                const draft = colorDrafts[color.id] ?? draftFromColor(color);
                return (
                  <div
                    key={color.id}
                    className="grid gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)] lg:grid-cols-[auto_minmax(0,1fr)_160px_160px_auto]"
                  >
                    <span
                      className="size-10 rounded-full border border-[var(--serene-border)] shadow-[var(--serene-shadow-soft)]"
                      style={{ backgroundColor: draft.color_hex }}
                    />
                    <label className="grid gap-1 text-xs text-[var(--serene-muted)]">
                      Nome
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setColorDrafts((current) => ({
                            ...current,
                            [color.id]: { ...draft, name: event.target.value },
                          }))
                        }
                        className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm text-[var(--serene-fg)] outline-none"
                        placeholder="Nome"
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--serene-muted)]">
                      Hex
                      <input
                        value={draft.color_hex}
                        onChange={(event) =>
                          setColorDrafts((current) => ({
                            ...current,
                            [color.id]: { ...draft, color_hex: event.target.value },
                          }))
                        }
                        className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm uppercase text-[var(--serene-fg)] outline-none"
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--serene-muted)]">
                      Uso
                      <select
                        value={draft.applies_to}
                        onChange={(event) =>
                          setColorDrafts((current) => ({
                            ...current,
                            [color.id]: { ...draft, applies_to: event.target.value },
                          }))
                        }
                        className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm text-[var(--serene-fg)] outline-none"
                      >
                        <option value="">Todas</option>
                        <option value="highlight">Marca-texto</option>
                        <option value="note">Notas</option>
                        <option value="reflection">Reflexões</option>
                        <option value="post_it">Post-it</option>
                      </select>
                    </label>
                    <div className="flex flex-wrap items-end gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveColor(color)}
                        disabled={savingKey === `color-${color.id}`}
                        className="grid size-10 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
                        aria-label="Salvar cor"
                        title="Salvar cor"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSetDefaultColor(color)}
                        disabled={color.is_default || savingKey === `default-${color.id}`}
                        className={[
                          "rounded-full border px-3 py-2 text-xs shadow-[var(--serene-shadow-soft)] transition",
                          color.is_default
                            ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                            : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:text-[var(--serene-fg)]",
                        ].join(" ")}
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteColor(color)}
                        disabled={color.is_default || savingKey === `delete-${color.id}`}
                        className="grid size-10 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)] disabled:opacity-40"
                        aria-label="Remover cor personalizada"
                        title="Remover cor personalizada"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)] lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
              <label className="grid gap-1 text-xs text-[var(--serene-muted)]">
                Nova cor
                <input
                  value={newColorName}
                  onChange={(event) => setNewColorName(event.target.value)}
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm text-[var(--serene-fg)] outline-none"
                  placeholder="Nova cor"
                />
              </label>
              <label className="grid gap-1 text-xs text-[var(--serene-muted)]">
                Hex
                <input
                  value={newColorHex}
                  onChange={(event) => setNewColorHex(event.target.value)}
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm uppercase text-[var(--serene-fg)] outline-none"
                />
              </label>
              <label className="grid gap-1 text-xs text-[var(--serene-muted)]">
                Uso
                <select
                  value={newColorAppliesTo}
                  onChange={(event) => setNewColorAppliesTo(event.target.value)}
                  className="rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm text-[var(--serene-fg)] outline-none"
                >
                  <option value="">Todas</option>
                  <option value="highlight">Marca-texto</option>
                  <option value="note">Notas</option>
                  <option value="reflection">Reflexões</option>
                  <option value="post_it">Post-it</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleAddColor()}
                disabled={savingKey === "new_color"}
                className="self-end rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--serene-shadow-soft)] disabled:opacity-60"
              >
                Adicionar
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            eyebrow="Privacidade"
            title="Conteúdo reservado"
            icon={Lock}
            description="Controles para manter livros e anotações privadas fora de caminhos rápidos quando necessário."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Livros privados
                </p>
                <p className="mt-1 text-2xl font-semibold">{privacyCounts?.privateBooks ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Anotações privadas
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {privacyCounts?.privateAnnotations ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 shadow-[var(--serene-shadow-inner)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Exportação rápida
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {quickExportPrivateExcluded ? "Privados ficam fora" : "Privados podem entrar"}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <ToggleRow
                checked={quickExportPrivacy.include_private_content}
                label="Incluir privados em exportações rápidas"
                description="Desligado por padrão para manter livros e anotações privadas fora dos atalhos de exportação."
                disabled={savingKey === "quick_export_privacy"}
                onChange={(value) =>
                  void persistQuickExportPrivacy({ include_private_content: value })
                }
              />
            </div>

            {(privacyCounts?.privateBooksInQuickExports ?? 0) > 0 && (
              <p className="mt-3 rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
                {privacyCounts?.privateBooksInQuickExports} livro(s) privado(s) ainda marcado(s)
                para exportações rápidas.
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleApplyPrivateDefaults()}
              disabled={savingKey === "privacy_defaults"}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
            >
              <ShieldCheck className="size-4" />
              Aplicar padrão seguro aos privados
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[var(--serene-muted)]">
              Manter este conteúdo mais reservado também pode ocultar dos resumos e sugestões,
              dependendo das flags do livro.
            </p>
          </SettingsSection>

          <SettingsSection
            eyebrow="Notificações"
            title="Lembretes tranquilos"
            icon={Bell}
            description="Preparado para um futuro em que lembretes respeitem o ritmo da leitura."
          >
            <ToggleRow
              checked={false}
              label="Lembretes de leitura"
              description="Preparado para uma fase futura, sem interromper a leitura atual."
              disabled
              onChange={() => undefined}
            />
            <p className="mt-3 text-xs leading-relaxed text-[var(--serene-muted)]">
              Livros marcados para não aparecer em notificações e resumos serão respeitados quando
              lembretes reais forem ativados.
            </p>
          </SettingsSection>

          <SettingsSection
            eyebrow="Atalhos"
            title="Comandos"
            icon={Keyboard}
            description="A lista completa fica separada para esta tela continuar leve."
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-[var(--serene-muted)]">
                Use atalhos quando eles reduzirem atrito. Não precisa decorar todos.
              </p>
              <Link
                href="/atalhos"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
              >
                <Keyboard className="size-4" />
                Ver atalhos
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection
            eyebrow="Beta"
            title="Feedback"
            icon={MessageSquare}
            description="Um canal discreto para registrar o que travou, confundiu ou ficou bom."
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-[var(--serene-muted)]">
                Uma frase já ajuda a deixar o SERENE mais confortável.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT))}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
              >
                <MessageSquare className="size-4" />
                Enviar feedback
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            eyebrow="Conta"
            title="Perfil e acesso"
            icon={User}
            description="Dados pessoais continuam separados das preferências de leitura."
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-[var(--serene-muted)]">
                O perfil guarda a identidade da conta; esta tela guarda o conforto de uso.
              </p>
              <Link
                href="/perfil"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-4 py-2 text-sm text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition hover:text-[var(--serene-fg)]"
              >
                <User className="size-4" />
                Abrir perfil
              </Link>
            </div>
          </SettingsSection>
        </div>
      )}
    </section>
  );
}
