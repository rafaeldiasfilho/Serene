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
  Moon,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  Wind,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type ColorDraft = {
  name: string;
  color_hex: string;
  applies_to: string;
};

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

const closeBehaviorOptions: Array<{ value: ReadingCloseBehavior; label: string }> = [
  { value: "minimize", label: "Minimizar leitura ao fechar" },
  { value: "close", label: "Encerrar leitura ao fechar" },
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
  eyebrow,
  title,
  icon: Icon,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            {eyebrow}
          </p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
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
    <label className="flex items-start justify-between gap-4 border-t border-[var(--serene-border)] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-[var(--serene-muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
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

    const [
      muralResult,
      quickExportResult,
      colorsResult,
      privacyCountsResult,
    ] = await Promise.all([
      getUserSetting(user.id, "mural_preferences"),
      getUserSetting(user.id, "quick_export_privacy"),
      listSettingsAnnotationColors(user.id),
      getPrivacySafetyCounts(user.id),
    ]);

    if (
      muralResult.error ||
      quickExportResult.error ||
      colorsResult.error ||
      privacyCountsResult.error
    ) {
      setError(
        muralResult.error?.message ??
          quickExportResult.error?.message ??
          colorsResult.error?.message ??
          privacyCountsResult.error?.message ??
          "Nao foi possivel carregar as configuracoes.",
      );
      setLoading(false);
      return;
    }

    const colorRows = colorsResult.data ?? [];
    setMuralPreferences(normalizeMuralPreferences(muralResult.data?.value ?? null));
    setQuickExportPrivacy(
      normalizeQuickExportPrivacy(quickExportResult.data?.value ?? null),
    );
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

    return `${colors.length} cores disponiveis para anotacoes.`;
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
      setFeedback(result.error.message);
      await loadSettings();
      return;
    }

    setFeedback("Preferencias do Mural salvas.");
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
      setFeedback(result.error.message);
      await loadSettings();
      return;
    }

    setFeedback("Privacidade das exportacoes rapidas salva.");
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
    setFeedback(value ? "Movimento reduzido ativado." : "Movimento padrao restaurado.");
  }

  async function handlePressureFreeMode(value: boolean) {
    setSavingKey("pressure_free");
    await setPressureFreeModeEnabled(value);
    setSavingKey(null);
    setFeedback(value ? "Modo sem pressao ativado." : "Modo sem pressao desativado.");
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
      setFeedback("Use uma cor hexadecimal valida, como #DDEAFE.");
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
      setFeedback(result.error.message);
      return;
    }

    setFeedback("Cor de anotacao salva.");
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
      setFeedback(result.error.message);
      return;
    }

    setFeedback("Cor padrao atualizada.");
    await loadSettings();
  }

  async function handleDeleteColor(color: AnnotationColorRow) {
    if (!user || color.is_default) {
      return;
    }

    const confirmed = window.confirm(
      "Remover esta cor personalizada? Anotacoes existentes continuam com as cores ja salvas.",
    );
    if (!confirmed) {
      return;
    }

    setSavingKey(`delete-${color.id}`);
    const result = await deleteSettingsAnnotationColor(color.id, user.id);
    setSavingKey(null);

    if (result.error) {
      setFeedback(result.error.message);
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
      setFeedback("Use uma cor hexadecimal valida, como #DDEAFE.");
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
      setFeedback(result.error.message);
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
      setFeedback(updateResult.error?.message ?? settingResult.error?.message ?? "Falha ao salvar.");
      return;
    }

    setQuickExportPrivacy({ include_private_content: false });
    setFeedback("Livros privados protegidos dos atalhos publicos e exportacoes rapidas.");
    await loadSettings();
  }

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para carregar as configuracoes.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Abrindo suas preferencias...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (profileState === "error") {
    return (
      <section className="rounded-lg border border-rose-300 bg-rose-50 p-5 text-rose-800">
        <h1 className="text-xl font-semibold">Nao foi possivel carregar o perfil</h1>
        <p className="mt-2 text-sm">{profileError ?? "Tente novamente em instantes."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--serene-muted)]">
            Configuracoes
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Controle com calma</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Preferencias essenciais para conforto, leitura, Mural e privacidade.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </button>
      </header>

      {feedback && (
        <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {loading ? (
        <section className="grid min-h-56 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Organizando preferencias...</p>
          </div>
        </section>
      ) : (
        <div className="grid gap-5">
          <SettingsSection eyebrow="Aparência" title="Leitura visual" icon={Monitor}>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = themePreference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void handleThemeChange(option.value)}
                    className={[
                      "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      active
                        ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                        : "border-[var(--serene-border)] bg-[var(--serene-surface-soft)] text-[var(--serene-muted)]",
                    ].join(" ")}
                    disabled={savingKey === "theme"}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <ToggleRow
              checked={reducedMotionEnabled}
              label="Reduzir movimento"
              description="Suaviza animacoes decorativas e transicoes longas."
              disabled={savingKey === "reduced_motion"}
              onChange={(value) => void handleReducedMotion(value)}
            />
          </SettingsSection>

          <SettingsSection eyebrow="Leitura" title="Ritmo e fechamento" icon={Wind}>
            <ToggleRow
              checked={pressureFreeModeEnabled}
              label="Modo sem pressao"
              description="Evita mensagens com tom de cobranca, sequencia ou pressao. O SERENE respeita seu ritmo."
              disabled={savingKey === "pressure_free"}
              onChange={(value) => void handlePressureFreeMode(value)}
            />
            <label className="mt-3 grid gap-1 text-sm">
              Ao fechar a leitura
              <select
                value={readingCloseBehavior}
                onChange={(event) =>
                  void handleReadingCloseBehavior(event.target.value as ReadingCloseBehavior)
                }
                className="max-w-sm rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 outline-none"
                disabled={savingKey === "reading_close_behavior"}
              >
                {closeBehaviorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </SettingsSection>

          <SettingsSection eyebrow="Mural" title="Espaco de ideias" icon={LayoutGrid}>
            <ToggleRow
              checked={muralPreferences.show_suggestions}
              label="Mostrar sugestoes de baloes"
              description="Quando desligado, o Mural fica limpo e nao cria novas sugestoes automaticas."
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
              description="Mantem uma referencia discreta para organizar anotacoes sem pesar a tela."
              disabled={savingKey === "mural_preferences"}
              onChange={(value) =>
                void persistMuralPreferences({
                  ...muralPreferences,
                  calm_grid_enabled: value,
                })
              }
            />
            <div className="mt-3 grid gap-2 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-xs text-[var(--serene-muted)] md:grid-cols-2">
              <p>Maximo de sugestoes por sessao: {muralPreferences.max_suggestions_per_session}</p>
              <p>Posicoes estaveis na sessao: sim</p>
              <p>Sugestoes sorteadas por sessao: sim</p>
              <p>Abrir com anotacoes existentes: sim</p>
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Anotações" title="Cores" icon={Brush}>
            <p className="text-sm text-[var(--serene-muted)]">{colorCountText}</p>
            <div className="mt-4 grid gap-3">
              {colors.map((color) => {
                const draft = colorDrafts[color.id] ?? draftFromColor(color);
                return (
                  <div
                    key={color.id}
                    className="grid gap-3 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 md:grid-cols-[auto_1fr_160px_160px_auto]"
                  >
                    <span
                      className="size-9 rounded-full border border-[var(--serene-border)]"
                      style={{ backgroundColor: draft.color_hex }}
                    />
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setColorDrafts((current) => ({
                          ...current,
                          [color.id]: { ...draft, name: event.target.value },
                        }))
                      }
                      className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
                      placeholder="Nome"
                    />
                    <input
                      value={draft.color_hex}
                      onChange={(event) =>
                        setColorDrafts((current) => ({
                          ...current,
                          [color.id]: { ...draft, color_hex: event.target.value },
                        }))
                      }
                      className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm uppercase outline-none"
                    />
                    <select
                      value={draft.applies_to}
                      onChange={(event) =>
                        setColorDrafts((current) => ({
                          ...current,
                          [color.id]: { ...draft, applies_to: event.target.value },
                        }))
                      }
                      className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Todas</option>
                      <option value="highlight">Marca-texto</option>
                      <option value="note">Notas</option>
                      <option value="reflection">Reflexoes</option>
                      <option value="post_it">Post-it</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveColor(color)}
                        disabled={savingKey === `color-${color.id}`}
                        className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)]"
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
                          "rounded-full border px-3 py-2 text-xs",
                          color.is_default
                            ? "border-[var(--serene-accent)] bg-[var(--serene-accent)] text-white"
                            : "border-[var(--serene-border)] text-[var(--serene-muted)]",
                        ].join(" ")}
                      >
                        Padrao
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteColor(color)}
                        disabled={color.is_default || savingKey === `delete-${color.id}`}
                        className="grid size-9 place-items-center rounded-full border border-[var(--serene-border)] text-[var(--serene-muted)] disabled:opacity-40"
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

            <div className="mt-4 grid gap-3 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 md:grid-cols-[1fr_160px_160px_auto]">
              <input
                value={newColorName}
                onChange={(event) => setNewColorName(event.target.value)}
                className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
                placeholder="Nova cor"
              />
              <input
                value={newColorHex}
                onChange={(event) => setNewColorHex(event.target.value)}
                className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm uppercase outline-none"
              />
              <select
                value={newColorAppliesTo}
                onChange={(event) => setNewColorAppliesTo(event.target.value)}
                className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2 text-sm outline-none"
              >
                <option value="">Todas</option>
                <option value="highlight">Marca-texto</option>
                <option value="note">Notas</option>
                <option value="reflection">Reflexoes</option>
                <option value="post_it">Post-it</option>
              </select>
              <button
                type="button"
                onClick={() => void handleAddColor()}
                disabled={savingKey === "new_color"}
                className="rounded-full bg-[var(--serene-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Adicionar
              </button>
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Privacidade" title="Conteudo reservado" icon={Lock}>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Livros privados
                </p>
                <p className="mt-1 text-2xl font-semibold">{privacyCounts?.privateBooks ?? 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Anotações privadas
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {privacyCounts?.privateAnnotations ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--serene-muted)]">
                  Exportacao rapida
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {quickExportPrivateExcluded ? "Privados ficam fora" : "Privados podem entrar"}
                </p>
              </div>
            </div>

            <ToggleRow
              checked={quickExportPrivacy.include_private_content}
              label="Incluir privados em exportacoes rapidas"
              description="Desligado por padrao para manter livros e anotacoes privadas fora dos atalhos de exportacao."
              disabled={savingKey === "quick_export_privacy"}
              onChange={(value) =>
                void persistQuickExportPrivacy({ include_private_content: value })
              }
            />

            {(privacyCounts?.privateBooksInQuickExports ?? 0) > 0 && (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {privacyCounts?.privateBooksInQuickExports} livro(s) privado(s) ainda marcado(s)
                para exportacoes rapidas.
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleApplyPrivateDefaults()}
              disabled={savingKey === "privacy_defaults"}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
            >
              <ShieldCheck className="size-4" />
              Aplicar padrao seguro aos privados
            </button>
            <p className="mt-3 text-xs text-[var(--serene-muted)]">
              Manter este conteudo mais reservado tambem pode ocultar dos resumos e sugestoes,
              dependendo das flags do livro.
            </p>
          </SettingsSection>

          <SettingsSection eyebrow="Notificações" title="Lembretes tranquilos" icon={Bell}>
            <ToggleRow
              checked={false}
              label="Lembretes de leitura"
              description="Preparado para uma fase futura, sem interromper a leitura atual."
              disabled
              onChange={() => undefined}
            />
            <p className="mt-3 text-xs text-[var(--serene-muted)]">
              Livros marcados para nao aparecer em notificacoes e resumos serao respeitados quando
              lembretes reais forem ativados.
            </p>
          </SettingsSection>

          <SettingsSection eyebrow="Atalhos" title="Comandos" icon={Keyboard}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--serene-muted)]">
                A lista de atalhos fica em uma tela separada para nao pesar estas preferencias.
              </p>
              <Link
                href="/atalhos"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
              >
                <Keyboard className="size-4" />
                Ver atalhos
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Beta" title="Feedback" icon={MessageSquare}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--serene-muted)]">
                Compartilhe algo que travou, confundiu ou ficou bom. Uma frase ja ajuda.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT))}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
              >
                <MessageSquare className="size-4" />
                Enviar feedback
              </button>
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Conta" title="Perfil e acesso" icon={User}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--serene-muted)]">
                Dados de perfil continuam em uma area propria, separados das preferencias de leitura.
              </p>
              <Link
                href="/perfil"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
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
