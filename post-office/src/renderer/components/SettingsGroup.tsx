import type { ReactNode } from "react";

interface SettingsGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function SettingsGroup({
  title,
  description,
  children,
}: SettingsGroupProps) {
  return (
    <section>
      <div className="mb-2 px-1">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        )}
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}
