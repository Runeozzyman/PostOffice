import {
  contrastingOn,
  mixHex,
  normalizeHex,
  relativeLuminance,
} from "./color";

export const THEME_STORAGE_KEY = "postoffice.theme";
export const THEME_COLOR_STORAGE_KEY = "postoffice.themeColor";
export const DEFAULT_CUSTOM_THEME_COLOR = "#2563eb";

const THEME_CSS_VARS = [
  "--page",
  "--surface",
  "--muted",
  "--hover",
  "--line",
  "--line-strong",
  "--ink",
  "--ink-secondary",
  "--ink-muted",
  "--ink-subtle",
  "--ink-faint",
  "--on-ink",
  "--accent",
  "--on-accent",
  "--danger",
  "--danger-soft",
] as const;

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
  {
    id: "mint",
    label: "Mint",
    colorScheme: "light",
    swatch: "#176b51",
  },
  {
    id: "paper",
    label: "Paper",
    colorScheme: "light",
    swatch: "#f0e4bc",
  },
  {
    id: "purple",
    label: "Purple",
    colorScheme: "dark",
    swatch: "#a78bfa",
  },
  {
    id: "pink",
    label: "Pink",
    colorScheme: "light",
    swatch: "#c45c7a",
  },
  {
    id: "sky",
    label: "Sky",
    colorScheme: "light",
    swatch: "#1e56c8",
  },
  {
    id: "brown",
    label: "Brown",
    colorScheme: "light",
    swatch: "#6b4423",
  },
  {
    id: "custom",
    label: "Custom",
    colorScheme: "light",
    swatch: DEFAULT_CUSTOM_THEME_COLOR,
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

export function readStoredThemeColor(): string {
  try {
    return (
      normalizeHex(localStorage.getItem(THEME_COLOR_STORAGE_KEY) ?? "") ??
      DEFAULT_CUSTOM_THEME_COLOR
    );
  } catch {
    return DEFAULT_CUSTOM_THEME_COLOR;
  }
}

export function storeThemeColor(color: string) {
  const next = normalizeHex(color) ?? DEFAULT_CUSTOM_THEME_COLOR;
  try {
    localStorage.setItem(THEME_COLOR_STORAGE_KEY, next);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
  return next;
}

function clearCustomThemeVars(root: HTMLElement) {
  for (const name of THEME_CSS_VARS) {
    root.style.removeProperty(name);
  }
}

export function themeVarsFromHex(hex: string) {
  const seed = normalizeHex(hex) ?? DEFAULT_CUSTOM_THEME_COLOR;
  const luminance = relativeLuminance(seed);
  const darkChrome = luminance < 0.18;

  if (darkChrome) {
    const accent = mixHex(seed, "#ffffff", 0.28);
    const surface = mixHex(seed, "#10141c", 0.55);
    return {
      colorScheme: "dark" as const,
      "--page": mixHex(seed, "#0c0f14", 0.7),
      "--surface": surface,
      "--muted": mixHex(seed, "#0c0f14", 0.62),
      "--hover": mixHex(seed, "#ffffff", 0.12),
      "--line": mixHex(seed, "#ffffff", 0.16),
      "--line-strong": mixHex(seed, "#ffffff", 0.28),
      "--ink": mixHex(seed, "#ffffff", 0.86),
      "--ink-secondary": mixHex(seed, "#ffffff", 0.68),
      "--ink-muted": mixHex(seed, "#ffffff", 0.52),
      "--ink-subtle": mixHex(seed, "#ffffff", 0.38),
      "--ink-faint": mixHex(seed, "#ffffff", 0.22),
      "--on-ink": surface,
      "--accent": accent,
      "--on-accent": contrastingOn(accent),
      "--danger": "#f87171",
      "--danger-soft": mixHex(seed, "#3a1f22", 0.45),
    };
  }

  const accent = luminance > 0.55 ? mixHex(seed, "#000000", 0.28) : seed;
  const surface = mixHex(seed, "#ffffff", 0.86);

  return {
    colorScheme: "light" as const,
    "--page": mixHex(seed, "#ffffff", 0.72),
    "--surface": surface,
    "--muted": mixHex(seed, "#ffffff", 0.8),
    "--hover": mixHex(seed, "#ffffff", 0.7),
    "--line": mixHex(seed, "#000000", 0.14),
    "--line-strong": mixHex(seed, "#000000", 0.26),
    "--ink": mixHex(seed, "#0a0a0a", 0.82),
    "--ink-secondary": mixHex(seed, "#1f1f1f", 0.55),
    "--ink-muted": mixHex(seed, "#1f1f1f", 0.4),
    "--ink-subtle": mixHex(seed, "#1f1f1f", 0.28),
    "--ink-faint": mixHex(seed, "#ffffff", 0.45),
    "--on-ink": surface,
    "--accent": accent,
    "--on-accent": contrastingOn(accent),
    "--danger": "#dc2626",
    "--danger-soft": mixHex(seed, "#ffffff", 0.78),
  };
}

export function applyThemeClass(theme: ThemeId, customColor?: string) {
  const root = document.documentElement;
  const option = APP_THEMES.find((item) => item.id === theme) ?? APP_THEMES[0];

  for (const item of APP_THEMES) {
    root.classList.remove(`theme-${item.id}`);
  }
  root.classList.remove("dark");
  root.classList.add(`theme-${option.id}`);

  if (option.id === "custom") {
    const vars = themeVarsFromHex(customColor ?? readStoredThemeColor());
    for (const [name, value] of Object.entries(vars)) {
      if (name === "colorScheme") {
        continue;
      }
      root.style.setProperty(name, value);
    }
    if (vars.colorScheme === "dark") {
      root.classList.add("dark");
    }
    return;
  }

  clearCustomThemeVars(root);

  if (option.colorScheme === "dark") {
    root.classList.add("dark");
  }
}
