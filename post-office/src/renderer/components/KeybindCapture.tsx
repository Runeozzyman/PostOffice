import { useEffect, useState } from "react";
import {
  formatKeybind,
  isBlockedCaptureKey,
  normalizeKey,
} from "../helpers/keybinds";

interface KeybindCaptureProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (key: string) => string | null;
}

export default function KeybindCapture({
  label,
  value,
  disabled = false,
  onChange,
}: KeybindCaptureProps) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listening) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setListening(false);
        setError(null);
        return;
      }

      if (event.key === "Backspace") {
        const conflict = onChange("");
        setError(conflict);
        setListening(false);
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        setError("Modifier keys are not supported.");
        return;
      }

      if (isBlockedCaptureKey(event.key)) {
        setError("That key cannot be used.");
        return;
      }

      const conflict = onChange(normalizeKey(event.key));
      setError(conflict);
      setListening(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [listening, onChange]);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <p className="min-w-0 text-sm text-ink">{label}</p>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${formatKeybind(value)}`}
          onClick={() => {
            if (disabled) {
              return;
            }
            setError(null);
            setListening(true);
          }}
          className={`min-w-[5.5rem] rounded-md border px-2 py-1 text-center text-xs font-medium tabular-nums disabled:opacity-50 ${
            listening
              ? "border-accent bg-hover text-ink"
              : "border-line-strong text-ink-secondary hover:bg-hover hover:text-ink"
          }`}
        >
          {listening ? "Press a key" : formatKeybind(value)}
        </button>
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>
    </div>
  );
}
