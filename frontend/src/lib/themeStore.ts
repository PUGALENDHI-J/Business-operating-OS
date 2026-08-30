import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePref = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "trinityai-theme" }
  )
);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** Resolves the effective light/dark mode and applies the `.dark` class to <html>. */
export function applyResolvedTheme(theme: ThemePref) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

let initialized = false;
/** Call once at app startup: applies the current theme and keeps it in sync with store + OS changes. */
export function initTheme() {
  if (initialized) return;
  initialized = true;
  applyResolvedTheme(useThemeStore.getState().theme);
  useThemeStore.subscribe((s) => applyResolvedTheme(s.theme));
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().theme === "system") applyResolvedTheme("system");
  });
}
