import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeClass,
  readStoredTheme,
  storeTheme,
  type Theme,
} from "../helpers/theme";

interface PreferencesContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = readStoredTheme();
    applyThemeClass(initial);
    return initial;
  });

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!reduceMotion) {
      root.classList.add("theme-transition");
      window.setTimeout(() => {
        root.classList.remove("theme-transition");
      }, 320);
    }

    applyThemeClass(next);
    storeTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider.");
  }

  return context;
}
