export const ANIMATIONS_STORAGE_KEY = "postoffice.animations";

export function readStoredAnimationsEnabled(): boolean {
  try {
    return localStorage.getItem(ANIMATIONS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function storeAnimationsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function applyMotionClass(animationsEnabled: boolean) {
  document.documentElement.classList.toggle(
    "reduce-motion",
    !animationsEnabled
  );
}
