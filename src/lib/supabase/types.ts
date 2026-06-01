export type ThemePreference = "light" | "dark" | "system";
export type ReadingCloseBehavior = "minimize" | "close";
export type ProfileRole = "reader" | "admin";
export type ProfileAccessStatus = "pending" | "active" | "paused" | "suspended";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  is_beta_tester: boolean;
  access_status: ProfileAccessStatus;
  theme_preference: ThemePreference;
  reduced_motion_enabled: boolean;
  reading_close_behavior: ReadingCloseBehavior;
  pressure_free_mode_enabled: boolean;
  created_at: string;
  last_seen_at: string | null;
};
