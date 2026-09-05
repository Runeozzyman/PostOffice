import { useEffect, useRef, useState } from "react";
import { MAILSLOT_COLORS } from "../helpers/mailslotOptions";
import { hexToHsv, hsvToHex, normalizeHex } from "../helpers/color";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

function formatHexInput(hex: string) {
  return hex.replace("#", "").toUpperCase();
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [liveColor, setLiveColor] = useState(color);
  const [hexInput, setHexInput] = useState(formatHexInput(color));
  const hsv = hexToHsv(liveColor);
  const [hue, setHue] = useState(hsv.h || 0);
  const hueRef = useRef(hue);
  const hsvRef = useRef(hsv);
  const liveColorRef = useRef(liveColor);
  const draggingRef = useRef(false);
  const hexFocusedRef = useRef(false);
  const padRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);

  hueRef.current = hue;
  hsvRef.current = hsv;
  liveColorRef.current = liveColor;

  useEffect(() => {
    if (draggingRef.current) {
      return;
    }

    setLiveColor(color);
    liveColorRef.current = color;
    const next = hexToHsv(color);
    if (next.s > 0.01) {
      setHue(next.h);
    }
    if (!hexFocusedRef.current) {
      setHexInput(formatHexInput(color));
    }
  }, [color]);

  const preview = (next: string) => {
    setLiveColor(next);
    liveColorRef.current = next;
    if (!hexFocusedRef.current) {
      setHexInput(formatHexInput(next));
    }
  };

  const commit = (next: string) => {
    preview(next);
    const parsed = hexToHsv(next);
    if (parsed.s > 0.01) {
      setHue(parsed.h);
    }
    onChange(next);
  };

  const colorFromPad = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) {
      return;
    }

    const bounds = pad.getBoundingClientRect();
    const s = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const v = Math.min(
      1,
      Math.max(0, 1 - (clientY - bounds.top) / bounds.height)
    );
    preview(hsvToHex(hueRef.current, s, v));
  };

  const colorFromHue = (clientX: number) => {
    const bar = hueBarRef.current;
    if (!bar) {
      return;
    }

    const bounds = bar.getBoundingClientRect();
    const nextHue = Math.min(
      360,
      Math.max(0, ((clientX - bounds.left) / bounds.width) * 360)
    );
    setHue(nextHue);
    preview(hsvToHex(nextHue, hsvRef.current.s, hsvRef.current.v));
  };

  const finishDrag = () => {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    onChange(liveColorRef.current);
  };

  const commitHexInput = () => {
    const next = normalizeHex(hexInput);
    if (next) {
      commit(next);
      setHexInput(formatHexInput(next));
      return;
    }

    setHexInput(formatHexInput(liveColorRef.current));
  };

  return (
    <div>
      <div
        ref={padRef}
        className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-md"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))`,
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          colorFromPad(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          colorFromPad(event.clientX, event.clientY);
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: liveColor,
          }}
        />
      </div>
      <div
        ref={hueBarRef}
        className="relative mt-3 h-3 w-full cursor-ew-resize rounded-full"
        style={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          colorFromHue(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          colorFromHue(event.clientX);
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        tabIndex={0}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface shadow"
          style={{ left: `${(hue / 360) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
        <span
          className="h-4 w-4 rounded-full border border-line"
          style={{ backgroundColor: liveColor }}
        />
        <span className="font-mono">#</span>
        <input
          type="text"
          value={hexInput}
          spellCheck={false}
          aria-label="Hex colour"
          maxLength={6}
          onFocus={() => {
            hexFocusedRef.current = true;
          }}
          onChange={(event) =>
            setHexInput(event.target.value.replace("#", "").toUpperCase())
          }
          onBlur={() => {
            hexFocusedRef.current = false;
            commitHexInput();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="w-20 rounded border border-line bg-surface px-1 py-0.5 font-mono uppercase text-ink-secondary"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {MAILSLOT_COLORS.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={value}
            onClick={() => commit(value)}
            style={{ backgroundColor: value }}
            className={`h-8 w-8 rounded-full ${
              liveColor.toLowerCase() === value
                ? "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
