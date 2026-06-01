"use client";

export const READING_SESSION_CHANGED_EVENT = "serene:reading-session-changed";

export function notifyReadingSessionChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(READING_SESSION_CHANGED_EVENT));
}
