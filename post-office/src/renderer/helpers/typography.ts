export const FONT_SIZE_STORAGE_KEY = "postoffice.fontSize";
export const FONT_STORAGE_KEY = "postoffice.font";

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 16;

export const APP_FONTS = [
  {
    id: "default",
    label: "Default",
    family: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  {
    id: "segoe",
    label: "Segoe UI",
    family: '"Segoe UI", system-ui, sans-serif',
  },
  {
    id: "calibri",
    label: "Calibri",
    family: 'Calibri, Carlito, "Segoe UI", sans-serif',
  },
  {
    id: "georgia",
    label: "Georgia",
    family: "Georgia, serif",
  },
  {
    id: "palatino",
    label: "Palatino",
    family: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  },
  {
    id: "verdana",
    label: "Verdana",
    family: "Verdana, Geneva, sans-serif",
  },
  {
    id: "trebuchet",
    label: "Trebuchet",
    family: '"Trebuchet MS", "Segoe UI", sans-serif',
  },
] as const;

export type AppFontId = (typeof APP_FONTS)[number]["id"];

export function isAppFontId(value: string | null): value is AppFontId {
  return APP_FONTS.some((font) => font.id === value);
}

export function fontFamilyForId(id: AppFontId) {
  return APP_FONTS.find((font) => font.id === id)?.family ?? APP_FONTS[0].family;
}

export function clampFontSize(value: number) {
  if (!Number.isFinite(value)) {
    return FONT_SIZE_DEFAULT;
  }

  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
}

export function readStoredFontSize() {
  try {
    const raw = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (!raw) {
      return FONT_SIZE_DEFAULT;
    }
    return clampFontSize(Number(raw));
  } catch {
    return FONT_SIZE_DEFAULT;
  }
}

export function readStoredFont(): AppFontId {
  try {
    const raw = localStorage.getItem(FONT_STORAGE_KEY);
    return isAppFontId(raw) ? raw : "default";
  } catch {
    return "default";
  }
}

export function storeFontSize(size: number) {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(clampFontSize(size)));
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function storeFont(font: AppFontId) {
  try {
    localStorage.setItem(FONT_STORAGE_KEY, font);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function applyTypography(font: AppFontId, fontSize: number) {
  const root = document.documentElement;
  root.style.setProperty("--app-font", fontFamilyForId(font));
  root.style.setProperty("--app-font-size", `${clampFontSize(fontSize)}px`);
}
