"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => undefined,
});

/**
 * Provides a theme context (light/dark) to the entire app.
 * Reads the persisted preference from localStorage on mount and applies
 * the `dark` class to `document.documentElement`.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("light");

  // On mount, read localStorage and sync state with whatever the anti-flash
  // script may have already applied to <html>.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("md-manager:theme");
      if (stored === "dark") {
        applyDark();
      }
    } catch {
      // localStorage unavailable (private browsing, quota exceeded) — default to light
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyDark(): void {
    document.documentElement.classList.add("dark");
    setTheme("dark");
    try {
      localStorage.setItem("md-manager:theme", "dark");
    } catch {
      // ignore storage errors
    }
  }

  function applyLight(): void {
    document.documentElement.classList.remove("dark");
    setTheme("light");
    try {
      localStorage.setItem("md-manager:theme", "light");
    } catch {
      // ignore storage errors
    }
  }

  function toggle(): void {
    if (theme === "dark") {
      applyLight();
    } else {
      applyDark();
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook to access the current theme and toggle function. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
