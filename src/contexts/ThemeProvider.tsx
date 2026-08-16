import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyTheme,
  LEGACY_THEME_STORAGE_KEY,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";
import { ThemeContext } from "@/contexts/themeContext";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === "dark" ? "light" : "dark",
        ),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
