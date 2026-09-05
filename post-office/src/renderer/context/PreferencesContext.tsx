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
  readStoredThemeColor,
  storeTheme,
  storeThemeColor,
  type Theme,
} from "../helpers/theme";
import {
  applyMotionClass,
  readStoredAnimationsEnabled,
  storeAnimationsEnabled,
} from "../helpers/motion";
import {
  applyTypography,
  clampFontSize,
  readStoredFont,
  readStoredFontSize,
  storeFont,
  storeFontSize,
  type AppFontId,
} from "../helpers/typography";
import {
  readStoredKeybinds,
  readStoredShortcutsEnabled,
  storeKeybinds,
  storeShortcutsEnabled,
  type AppKeybinds,
} from "../helpers/keybinds";

interface PreferencesContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  font: AppFontId;
  setFont: (font: AppFontId) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
  keybinds: AppKeybinds;
  setKeybinds: (keybinds: AppKeybinds) => void;
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
  const [themeColor, setThemeColorState] = useState(() =>
    readStoredThemeColor()
  );
  const themeRef = useRef(theme);
  const themeColorRef = useRef(themeColor);
  themeRef.current = theme;
  themeColorRef.current = themeColor;
  const [animationsEnabled, setAnimationsEnabledState] = useState(() => {
    const initial = readStoredAnimationsEnabled();
    applyMotionClass(initial);
    return initial;
  });
  const animationsEnabledRef = useRef(animationsEnabled);
  animationsEnabledRef.current = animationsEnabled;
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
  const [shortcutsEnabled, setShortcutsEnabledState] = useState(() =>
    readStoredShortcutsEnabled()
  );
  const [keybinds, setKeybindsState] = useState<AppKeybinds>(() =>
    readStoredKeybinds()
  );

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    const reduceMotion =
      !animationsEnabledRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
      root.classList.add("theme-transition");
      window.setTimeout(() => {
        root.classList.remove("theme-transition");
      }, 320);
    }

    applyThemeClass(next, themeColorRef.current);
    storeTheme(next);
    setThemeState(next);
  }, []);

  const setThemeColor = useCallback((color: string) => {
    const next = storeThemeColor(color);
    themeColorRef.current = next;
    setThemeColorState(next);
    applyThemeClass("custom", next);
    if (themeRef.current !== "custom") {
      storeTheme("custom");
      setThemeState("custom");
    }
  }, []);

  const setAnimationsEnabled = useCallback((enabled: boolean) => {
    applyMotionClass(enabled);
    storeAnimationsEnabled(enabled);
    setAnimationsEnabledState(enabled);
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

  const setShortcutsEnabled = useCallback((enabled: boolean) => {
    storeShortcutsEnabled(enabled);
    setShortcutsEnabledState(enabled);
  }, []);

  const setKeybinds = useCallback((next: AppKeybinds) => {
    storeKeybinds(next);
    setKeybindsState(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themeColor,
      setThemeColor,
      animationsEnabled,
      setAnimationsEnabled,
      font,
      setFont,
      fontSize,
      setFontSize,
      shortcutsEnabled,
      setShortcutsEnabled,
      keybinds,
      setKeybinds,
    }),
    [
      theme,
      setTheme,
      themeColor,
      setThemeColor,
      animationsEnabled,
      setAnimationsEnabled,
      font,
      setFont,
      fontSize,
      setFontSize,
      shortcutsEnabled,
      setShortcutsEnabled,
      keybinds,
      setKeybinds,
    ]
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
