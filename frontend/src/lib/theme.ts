"use client";

export type AppTheme = "light" | "dark";

export function getInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  const migrated = window.localStorage.getItem("riskguard-theme-v2");
  if (!migrated) {
    window.localStorage.setItem("theme", "light");
    window.localStorage.setItem("riskguard-theme-v2", "1");
    return "light";
  }
  const saved = window.localStorage.getItem("theme");
  return saved === "light" || saved === "dark" ? saved : "light";
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function persistTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("theme", theme);
}
