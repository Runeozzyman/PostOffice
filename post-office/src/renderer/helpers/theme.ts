export const THEME_STORAGE_KEY = "postoffice.theme";

export const APP_THEMES = [
  {
    id: "light",
    label: "Light",
    colorScheme: "light",
    swatch: "#e6e2db",
  },
  {
    id: "dark",
    label: "Dark",
    colorScheme: "dark",
    swatch: "#12151a",
  },
] as const;

export type ThemeId = (typeof APP_THEMES)[number]["id"];
export type Theme = ThemeId;

export function isThemeId(value: string | null): value is ThemeId {
  return APP_THEMES.some((theme) => theme.id === value);
}

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(raw) ? raw : "light";
  } catch {
    return "light";
  }
}

export function storeTheme(theme: ThemeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function applyThemeClass(theme: ThemeId) {
  const root = document.documentElement;
  const option = APP_THEMES.find((item) => item.id === theme) ?? APP_THEMES[0];

  for (const item of APP_THEMES) {
    root.classList.remove(`theme-${item.id}`);
  }
  root.classList.remove("dark");
  root.classList.add(`theme-${option.id}`);

  if (option.colorScheme === "dark") {
    root.classList.add("dark");
  }
}
