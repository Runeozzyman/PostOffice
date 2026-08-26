import { useEffect, useRef, useState } from "react";
import { MAILSLOT_COLORS } from "../helpers/mailslotOptions";
import { hexToHsv, hsvToHex } from "../helpers/color";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const hsv = hexToHsv(color);
  const [hue, setHue] = useState(hsv.h || 0);
  const hueRef = useRef(hue);
  const hsvRef = useRef(hsv);
  const padRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);

  hueRef.current = hue;
  hsvRef.current = hsv;

  useEffect(() => {
    const next = hexToHsv(color);
    if (next.s > 0.01) {
      setHue(next.h);
    }
  }, [color]);

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
    onChange(hsvToHex(hueRef.current, s, v));
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
    onChange(hsvToHex(nextHue, hsvRef.current.s, hsvRef.current.v));
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
          event.currentTarget.setPointerCapture(event.pointerId);
          colorFromPad(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          colorFromPad(event.clientX, event.clientY);
        }}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: color,
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
          event.currentTarget.setPointerCapture(event.pointerId);
          colorFromHue(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          colorFromHue(event.clientX);
        }}
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
          style={{ backgroundColor: color }}
        />
        <span className="font-mono uppercase">{color}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {MAILSLOT_COLORS.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={value}
            onClick={() => onChange(value)}
            style={{ backgroundColor: value }}
            className={`h-8 w-8 rounded-full ${
              color.toLowerCase() === value ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
