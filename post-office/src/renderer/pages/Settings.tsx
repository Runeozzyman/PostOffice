import SettingsGroup from "../components/SettingsGroup";
import SettingsToggle from "../components/SettingsToggle";
import SignOutButton from "../components/SignOutButton";
import { usePreferences } from "../context/PreferencesContext";
import {
  APP_FONTS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
} from "../helpers/typography";

export default function Settings() {
  const { theme, setTheme, font, setFont, fontSize, setFontSize } =
    usePreferences();

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
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Dark mode</p>
                <p className="text-sm text-ink-muted">
                  Use a darker palette across the app.
                </p>
              </div>
              <SettingsToggle
                label="Dark mode"
                checked={theme === "dark"}
                onChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </SettingsGroup>

          <SettingsGroup
            title="Personalization"
            description="Text size and typeface on this device."
          >
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
                  value={fontSize}
                  aria-label="Text size"
                  onChange={(event) => setFontSize(Number(event.target.value))}
                  className="w-36 accent-ink"
                />
                <span className="w-10 text-right text-sm tabular-nums text-ink-secondary">
                  {fontSize}
                </span>
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
