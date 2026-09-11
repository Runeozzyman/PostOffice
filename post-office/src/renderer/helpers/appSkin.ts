export function skinPayloadToObjectUrl(payload: {
  mime: string;
  data: Uint8Array;
}) {
  const bytes =
    payload.data instanceof Uint8Array
      ? payload.data
      : new Uint8Array(payload.data);

  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);

  return URL.createObjectURL(
    new Blob([copy], { type: payload.mime || "image/png" })
  );
}

export const SKIN_BLUR_STORAGE_KEY = "postoffice.skinBlur";
export const SKIN_BLUR_MIN = 0;
export const SKIN_BLUR_MAX = 40;
export const SKIN_BLUR_DEFAULT = 14;

export function applySkinClass(enabled: boolean) {
  document.documentElement.classList.toggle("has-skin", enabled);
}

export function clampSkinBlur(value: number) {
  if (!Number.isFinite(value)) {
    return SKIN_BLUR_DEFAULT;
  }
  return Math.min(SKIN_BLUR_MAX, Math.max(SKIN_BLUR_MIN, Math.round(value)));
}

export function readStoredSkinBlur() {
  try {
    const raw = localStorage.getItem(SKIN_BLUR_STORAGE_KEY);
    if (raw === null) {
      return SKIN_BLUR_DEFAULT;
    }
    return clampSkinBlur(Number(raw));
  } catch {
    return SKIN_BLUR_DEFAULT;
  }
}

export function storeSkinBlur(value: number) {
  const next = clampSkinBlur(value);
  try {
    localStorage.setItem(SKIN_BLUR_STORAGE_KEY, String(next));
  } catch {
    // Ignore quota / private-mode failures.
  }
  return next;
}

export function applySkinBlur(value: number) {
  document.documentElement.style.setProperty(
    "--skin-blur",
    `${clampSkinBlur(value)}px`
  );
}
