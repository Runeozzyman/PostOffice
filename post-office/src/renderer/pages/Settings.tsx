import { useEffect, useState } from "react";
import SettingsGroup from "../components/SettingsGroup";
import SettingsToggle from "../components/SettingsToggle";
import SignOutButton from "../components/SignOutButton";
import { usePreferences } from "../context/PreferencesContext";
import { APP_THEMES } from "../helpers/theme";
import {
  APP_FONTS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
} from "../helpers/typography";

export default function Settings() {
  const {
    theme,
    setTheme,
    animationsEnabled,
    setAnimationsEnabled,
    font,
    setFont,
    fontSize,
    setFontSize,
  } = usePreferences();
  const [sliderSize, setSliderSize] = useState(fontSize);
  const [inputSize, setInputSize] = useState(String(fontSize));

  useEffect(() => {
    setSliderSize(fontSize);
    setInputSize(String(fontSize));
  }, [fontSize]);

  const commitFontSize = (value: number) => {
    if (!Number.isFinite(value)) {
      setSliderSize(fontSize);
      setInputSize(String(fontSize));
      return;
    }

    setFontSize(value);
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="text-lg font-semibold text-ink">Settings</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-6">
          <SettingsGroup
            title="Appearance"
            description="How PostOffice looks on this device."
          >
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-ink">Theme</p>
              <p className="mb-3 text-sm text-ink-muted">
                Choose a colour palette for the app chrome.
              </p>
              <div className="flex flex-wrap gap-3">
                {APP_THEMES.map((option) => {
                  const selected = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      aria-pressed={selected}
                      aria-label={option.label}
                      title={option.label}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={`h-8 w-8 rounded-full border-2 ${
                          selected
                            ? "border-accent"
                            : "border-line-strong hover:border-ink-subtle"
                        }`}
                        style={{ backgroundColor: option.swatch }}
                      />
                      <span
                        className={`text-xs ${
                          selected ? "text-ink" : "text-ink-muted"
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup
            title="Personalization"
            description="Text size, typeface, and motion on this device."
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Disable animations</p>
                <p className="text-sm text-ink-muted">
                  Skip the inbox row cascade and mailslot tile entrance.
                </p>
              </div>
              <SettingsToggle
                label="Disable animations"
                checked={!animationsEnabled}
                onChange={(disabled) => setAnimationsEnabled(!disabled)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Text size</p>
                <p className="text-sm text-ink-muted">
                  Scale app text from {FONT_SIZE_MIN} to {FONT_SIZE_MAX} pixels.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <input
                  type="range"
                  min={FONT_SIZE_MIN}
                  max={FONT_SIZE_MAX}
                  step={1}
                  value={sliderSize}
                  aria-label="Text size"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSliderSize(value);
                    setInputSize(String(value));
                  }}
                  onPointerUp={(event) =>
                    commitFontSize(Number(event.currentTarget.value))
                  }
                  onKeyUp={(event) =>
                    commitFontSize(Number(event.currentTarget.value))
                  }
                  className="w-36 accent-accent"
                />
                <input
                  type="number"
                  min={FONT_SIZE_MIN}
                  max={FONT_SIZE_MAX}
                  value={inputSize}
                  onChange={(event) => setInputSize(event.target.value)}
                  onBlur={() => commitFontSize(Number(inputSize))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className="w-14 text-right text-sm tabular-nums text-ink-secondary border border-line rounded px-1 py-0.5"
                  aria-label="Font size"
                /> 
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-ink">Font</p>
              <p className="mb-3 text-sm text-ink-muted">
                Choose a typeface for the app chrome. Email HTML still uses the
                sender’s styles.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {APP_FONTS.map((option) => {
                  const selected = font === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFont(option.id)}
                      aria-pressed={selected}
                      style={{ fontFamily: option.family }}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "border-ink bg-hover text-ink"
                          : "border-line text-ink-secondary hover:bg-hover hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup
            title="Mail"
            description="Reading and filing preferences will live here."
          >
            <p className="px-4 py-3 text-sm text-ink-muted">Coming soon.</p>
          </SettingsGroup>

          <SettingsGroup
            title="Notifications"
            description="Alerts for new mail and sync status."
          >
            <p className="px-4 py-3 text-sm text-ink-muted">Coming soon.</p>
          </SettingsGroup>

          <SettingsGroup title="Account">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Google account</p>
                <p className="text-sm text-ink-muted">
                  Sign out of this device. Local mail stays until you sign in
                  again.
                </p>
              </div>
              <SignOutButton />
            </div>
          </SettingsGroup>
        </div>
      </div>
    </div>
  );
}
