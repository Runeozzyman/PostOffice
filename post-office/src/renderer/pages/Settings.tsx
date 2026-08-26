import SettingsGroup from "../components/SettingsGroup";
import SettingsToggle from "../components/SettingsToggle";
import SignOutButton from "../components/SignOutButton";
import { usePreferences } from "../context/PreferencesContext";

export default function Settings() {
  const { theme, setTheme } = usePreferences();

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
