export const THEME_STORAGE_KEY = "osrstool-theme";

export type Theme = "light" | "dark";

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : getSystemTheme();
}

export function applyTheme(theme: Theme, root?: HTMLElement): void {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedRoot = root ?? document.documentElement;
  resolvedRoot.classList.toggle("dark", theme === "dark");
  resolvedRoot.style.colorScheme = theme;
  resolvedRoot.dataset.theme = theme;
}
