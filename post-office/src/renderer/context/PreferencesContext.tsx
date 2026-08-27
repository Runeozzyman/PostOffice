import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeClass,
  readStoredTheme,
  storeTheme,
  type Theme,
} from "../helpers/theme";
import {
  applyTypography,
  clampFontSize,
  readStoredFont,
  readStoredFontSize,
  storeFont,
  storeFontSize,
  type AppFontId,
} from "../helpers/typography";

interface PreferencesContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  font: AppFontId;
  setFont: (font: AppFontId) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
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
  const [font, setFontState] = useState<AppFontId>(() => readStoredFont());
  const [fontSize, setFontSizeState] = useState<number>(() => {
    const initialFont = readStoredFont();
    const initialSize = readStoredFontSize();
    applyTypography(initialFont, initialSize);
    return initialSize;
  });
  const fontRef = useRef(font);
  const fontSizeRef = useRef(fontSize);
  fontRef.current = font;
  fontSizeRef.current = fontSize;

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

  const setFont = useCallback((next: AppFontId) => {
    applyTypography(next, fontSizeRef.current);
    storeFont(next);
    setFontState(next);
  }, []);

  const setFontSize = useCallback((next: number) => {
    const size = clampFontSize(next);
    applyTypography(fontRef.current, size);
    storeFontSize(size);
    setFontSizeState(size);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, font, setFont, fontSize, setFontSize }),
    [theme, setTheme, font, setFont, fontSize, setFontSize]
  );

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
