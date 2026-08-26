import { useEffect, useId, useRef, useState } from "react";
import type { AddressSuggestion } from "../../types/compose";
import { formatAddress } from "../../helpers/parseFrom";

interface AddressFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function lastToken(value: string) {
  const comma = value.lastIndexOf(",");
  const prefix = comma >= 0 ? `${value.slice(0, comma + 1).trimEnd()} ` : "";
  const current = comma >= 0 ? value.slice(comma + 1).trimStart() : value;
  return { prefix, current };
}

export default function AddressField({
  value,
  onChange,
  placeholder,
}: AddressFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const token = lastToken(value).current;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void window.electronAPI.suggestAddresses(token).then((rows) => {
        if (!cancelled) {
          setSuggestions(rows);
          setActive(0);
        }
      });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, token]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const apply = (suggestion: AddressSuggestion) => {
    const { prefix } = lastToken(value);
    onChange(`${prefix}${formatAddress(suggestion.name, suggestion.email)}, `);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => (current + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(
              (current) =>
                (current - 1 + suggestions.length) % suggestions.length
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            apply(suggestions[active] ?? suggestions[0]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full bg-transparent text-ink outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full min-w-[16rem] overflow-auto rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.email} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => apply(suggestion)}
                className={`flex w-full flex-col px-3 py-1.5 text-left text-sm ${
                  index === active ? "bg-hover" : ""
                }`}
              >
                <span className="truncate text-ink">
                  {suggestion.name || suggestion.email}
                </span>
                {suggestion.name ? (
                  <span className="truncate text-xs text-ink-muted">
                    {suggestion.email}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
