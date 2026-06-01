"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Profile,
  ProfileAccessStatus,
  ProfileRole,
  ReadingCloseBehavior,
  ThemePreference,
} from "@/lib/supabase/types";

type ProfileState = "idle" | "loading" | "ready" | "missing" | "error";
type ProfileSelect = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "name"
  | "email"
  | "avatar_url"
  | "role"
  | "is_beta_tester"
  | "access_status"
  | "theme_preference"
  | "reduced_motion_enabled"
  | "reading_close_behavior"
  | "pressure_free_mode_enabled"
  | "created_at"
  | "last_seen_at"
>;

type AppStateContextValue = {
  envReady: boolean;
  authLoading: boolean;
  profileState: ProfileState;
  actionLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  authError: string | null;
  profileError: string | null;
  themePreference: ThemePreference;
  readingCloseBehavior: ReadingCloseBehavior;
  reducedMotionEnabled: boolean;
  pressureFreeModeEnabled: boolean;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  setReadingCloseBehavior: (value: ReadingCloseBehavior) => Promise<void>;
  setReducedMotionEnabled: (value: boolean) => Promise<void>;
  setPressureFreeModeEnabled: (value: boolean) => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "serene_theme_preference";
const REDUCED_MOTION_STORAGE_KEY = "serene_reduced_motion_enabled";
const PRESSURE_FREE_MODE_STORAGE_KEY = "serene_pressure_free_mode_enabled";

function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedValue === "light" || storedValue === "dark" || storedValue === "system") {
    return storedValue;
  }

  return "system";
}

function getStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(key);
  if (storedValue === "true") {
    return true;
  }
  if (storedValue === "false") {
    return false;
  }
  return fallback;
}

function mapProfile(data: ProfileSelect): Profile {
  const row = data;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url,
    role: row.role,
    is_beta_tester: row.is_beta_tester,
    access_status: row.access_status,
    theme_preference: row.theme_preference,
    reduced_motion_enabled: row.reduced_motion_enabled,
    reading_close_behavior: row.reading_close_behavior,
    pressure_free_mode_enabled: row.pressure_free_mode_enabled,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
  };
}

function readUserMetadataString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeProfileRole(value: string | null | undefined): ProfileRole {
  return value === "admin" ? "admin" : "reader";
}

function normalizeAccessStatus(value: string | null | undefined): ProfileAccessStatus {
  if (value === "active" || value === "paused" || value === "suspended") {
    return value;
  }
  return "pending";
}

async function ensureProfileForUser(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  user: User,
) {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const fallbackName =
    readUserMetadataString(metadata?.name) ??
    readUserMetadataString(metadata?.full_name) ??
    null;

  return supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      name: fallbackName,
      role: "reader",
      is_beta_tester: false,
      access_status: "pending",
    })
    .select(
      "id,name,email,avatar_url,role,is_beta_tester,access_status,theme_preference,reduced_motion_enabled,reading_close_behavior,pressure_free_mode_enabled,created_at,last_seen_at",
    )
    .single();
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const envReady = hasSupabaseEnv();
  const supabase = useMemo(() => (envReady ? getSupabaseBrowserClient() : null), [envReady]);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(envReady);
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(getStoredThemePreference);
  const [readingCloseBehavior, setReadingCloseBehaviorState] = useState<ReadingCloseBehavior>(
    "minimize",
  );
  const [reducedMotionEnabled, setReducedMotionEnabledState] = useState(() =>
    getStoredBoolean(REDUCED_MOTION_STORAGE_KEY, false),
  );
  const [pressureFreeModeEnabled, setPressureFreeModeEnabledState] = useState(() =>
    getStoredBoolean(PRESSURE_FREE_MODE_STORAGE_KEY, true),
  );

  const user = session?.user ?? null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = themePreference;
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.reducedMotion = reducedMotionEnabled ? "true" : "false";
    window.localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(reducedMotionEnabled));
  }, [reducedMotionEnabled]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.pressureFreeMode = pressureFreeModeEnabled ? "true" : "false";
    window.localStorage.setItem(PRESSURE_FREE_MODE_STORAGE_KEY, String(pressureFreeModeEnabled));
  }, [pressureFreeModeEnabled]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError(error.message);
      }
      setSession(data.session ?? null);
      if (!data.session) {
        setProfile(null);
        setProfileState("idle");
        setProfileError(null);
        setReadingCloseBehaviorState("minimize");
      } else {
        setProfileState("loading");
        setProfileError(null);
      }
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      if (!nextSession) {
        setProfile(null);
        setProfileState("idle");
        setProfileError(null);
        setReadingCloseBehaviorState("minimize");
      } else {
        setProfileState("loading");
        setProfileError(null);
      }
      setAuthLoading(false);
      setAuthError(null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    let isMounted = true;

    void supabase
      .from("profiles")
      .select(
        "id,name,email,avatar_url,role,is_beta_tester,access_status,theme_preference,reduced_motion_enabled,reading_close_behavior,pressure_free_mode_enabled,created_at,last_seen_at",
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setProfile(null);
          setProfileState("error");
          setProfileError(error.message);
          return;
        }

        let profileData = data;

        if (!profileData) {
          const insertResult = await ensureProfileForUser(supabase, user);
          if (!isMounted) {
            return;
          }
          if (insertResult.error) {
            setProfile(null);
            setProfileState("missing");
            setProfileError(insertResult.error.message);
            return;
          }
          profileData = insertResult.data;
        }

        const mappedProfile = mapProfile({
          ...profileData,
          role: normalizeProfileRole(profileData.role),
          access_status: normalizeAccessStatus(profileData.access_status),
        });
        setProfile(mappedProfile);
        setProfileState("ready");

        setThemePreferenceState(mappedProfile.theme_preference);
        setReadingCloseBehaviorState(mappedProfile.reading_close_behavior);
        setReducedMotionEnabledState(mappedProfile.reduced_motion_enabled);
        setPressureFreeModeEnabledState(mappedProfile.pressure_free_mode_enabled);

        void supabase
          .from("profiles")
          .update({
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      });

    return () => {
      isMounted = false;
    };
  }, [supabase, user]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        setAuthError("Supabase não configurado no ambiente.");
        return false;
      }

      setActionLoading(true);
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setActionLoading(false);

      if (error) {
        setAuthError(error.message);
        return false;
      }

      return true;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setActionLoading(true);
    await supabase.auth.signOut();
    setActionLoading(false);
    setProfile(null);
    setProfileState("idle");
    setReadingCloseBehaviorState("minimize");
  }, [supabase]);

  const persistProfileUpdate = useCallback(
    async (update: Database["public"]["Tables"]["profiles"]["Update"]) => {
      if (!supabase || !user || !profile) {
        return;
      }
      await supabase
        .from("profiles")
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    },
    [profile, supabase, user],
  );

  const setThemePreference = useCallback(
    async (value: ThemePreference) => {
      setThemePreferenceState(value);
      await persistProfileUpdate({ theme_preference: value });
    },
    [persistProfileUpdate],
  );

  const setReadingCloseBehavior = useCallback(
    async (value: ReadingCloseBehavior) => {
      setReadingCloseBehaviorState(value);
      await persistProfileUpdate({ reading_close_behavior: value });
    },
    [persistProfileUpdate],
  );

  const setReducedMotionEnabled = useCallback(
    async (value: boolean) => {
      setReducedMotionEnabledState(value);
      await persistProfileUpdate({ reduced_motion_enabled: value });
    },
    [persistProfileUpdate],
  );

  const setPressureFreeModeEnabled = useCallback(
    async (value: boolean) => {
      setPressureFreeModeEnabledState(value);
      await persistProfileUpdate({ pressure_free_mode_enabled: value });
    },
    [persistProfileUpdate],
  );

  const contextValue = useMemo<AppStateContextValue>(
    () => ({
      envReady,
      authLoading,
      profileState,
      actionLoading,
      session,
      user,
      profile,
      authError,
      profileError,
      themePreference,
      readingCloseBehavior,
      reducedMotionEnabled,
      pressureFreeModeEnabled,
      signInWithPassword,
      signOut,
      setThemePreference,
      setReadingCloseBehavior,
      setReducedMotionEnabled,
      setPressureFreeModeEnabled,
    }),
    [
      actionLoading,
      authError,
      authLoading,
      envReady,
      pressureFreeModeEnabled,
      profile,
      profileError,
      profileState,
      readingCloseBehavior,
      reducedMotionEnabled,
      session,
      setReadingCloseBehavior,
      setPressureFreeModeEnabled,
      setReducedMotionEnabled,
      setThemePreference,
      signInWithPassword,
      signOut,
      themePreference,
      user,
    ],
  );

  return <AppStateContext.Provider value={contextValue}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider.");
  }
  return context;
}
