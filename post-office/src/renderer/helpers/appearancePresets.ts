import { APP_THEMES, isThemeId, type Theme } from "./theme";
import {
  clampFontSize,
  FONT_SIZE_DEFAULT,
  isAppFontId,
  type AppFontId,
} from "./typography";

export const APPEARANCE_PRESETS_STORAGE_KEY = "postoffice.appearancePresets";
export const APPEARANCE_PRESET_COUNT = 3;

export interface AppearanceSnapshot {
  theme: Theme;
  themeColor: string;
  font: AppFontId;
  fontSize: number;
}

export type AppearancePreset = AppearanceSnapshot | null;

function emptySlots(): AppearancePreset[] {
  return Array.from({ length: APPEARANCE_PRESET_COUNT }, () => null);
}

function parseSnapshot(value: unknown): AppearanceSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<AppearanceSnapshot>;
  if (!isThemeId(raw.theme ?? null) || !isAppFontId(raw.font ?? null)) {
    return null;
  }

  const themeColor =
    typeof raw.themeColor === "string" && raw.themeColor ? raw.themeColor : "";

  return {
    theme: raw.theme,
    themeColor,
    font: raw.font,
    fontSize: clampFontSize(
      typeof raw.fontSize === "number" ? raw.fontSize : FONT_SIZE_DEFAULT
    ),
  };
}

export function readStoredAppearancePresets(): AppearancePreset[] {
  try {
    const raw = localStorage.getItem(APPEARANCE_PRESETS_STORAGE_KEY);
    if (!raw) {
      return emptySlots();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return emptySlots();
    }

    return emptySlots().map((_, index) => parseSnapshot(parsed[index]));
  } catch {
    return emptySlots();
  }
}

export function storeAppearancePresets(presets: AppearancePreset[]) {
  try {
    localStorage.setItem(
      APPEARANCE_PRESETS_STORAGE_KEY,
      JSON.stringify(presets.slice(0, APPEARANCE_PRESET_COUNT))
    );
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function appearanceSwatch(preset: AppearanceSnapshot) {
  if (preset.theme === "custom" && preset.themeColor) {
    return preset.themeColor;
  }

  return (
    APP_THEMES.find((theme) => theme.id === preset.theme)?.swatch ??
    preset.themeColor
  );
}

export function appearanceMatches(
  preset: AppearanceSnapshot,
  current: AppearanceSnapshot
) {
  if (
    preset.theme !== current.theme ||
    preset.font !== current.font ||
    preset.fontSize !== current.fontSize
  ) {
    return false;
  }

  if (preset.theme === "custom") {
    return preset.themeColor.toLowerCase() === current.themeColor.toLowerCase();
  }

  return true;
}
