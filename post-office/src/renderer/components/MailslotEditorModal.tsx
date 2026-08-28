import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Mailslot, MailslotIcon } from "../../types/mailslot";
import { MAILSLOT_ICONS } from "../helpers/mailslotOptions";
import { notifyMailslotsChanged } from "../helpers/mailslotEvents";
import ColorPicker from "./ColorPicker";

interface MailslotEditorModalProps {
  mailslot?: Mailslot;
  onClose: () => void;
  onSaved: (mailslot: Mailslot) => void;
  onDeleted?: (id: string) => void;
}

export default function MailslotEditorModal({
  mailslot,
  onClose,
  onSaved,
  onDeleted,
}: MailslotEditorModalProps) {
  const editing = Boolean(mailslot);
  const [title, setTitle] = useState(mailslot?.title ?? "");
  const [color, setColor] = useState(mailslot?.color ?? "#2563eb");
  const [icon, setIcon] = useState<MailslotIcon>(mailslot?.icon ?? "box");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      titleRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const submit = async () => {
    const trimmed = title.trim();

    if (!trimmed) {
      setError("Give this mailslot a title.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = mailslot
        ? await window.electronAPI.updateMailslot({
            id: mailslot.id,
            title: trimmed,
            color,
            icon,
          })
        : await window.electronAPI.createMailslot({
            title: trimmed,
            color,
            icon,
          });
      notifyMailslotsChanged();
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editing
            ? "Could not update mailslot."
            : "Could not create mailslot."
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!mailslot) {
      return;
    }

    const confirmed = window.confirm(
      `Delete “${mailslot.title}”? Emails stay in your inbox; they will just no longer be filtered into this mailslot.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await window.electronAPI.deleteMailslot(mailslot.id);
      notifyMailslotsChanged();
      onDeleted?.(mailslot.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete mailslot."
      );
      setDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">
          {editing ? "Edit mailslot" : "New mailslot"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {editing
            ? "Changes to name, colour, and icon apply to every email in this slot."
            : "Create a separate inbox with its own name and colour."}
        </p>

        <label className="relative z-10 mt-4 block text-sm font-medium text-ink-secondary">
          Title
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Work, Receipts, Family…"
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
          />
        </label>

        <p className="mt-4 text-sm font-medium text-ink-secondary">Colour</p>
        <p className="mt-1 text-xs text-ink-muted">
          Drag the cursor on the pad, or pick a preset below.
        </p>
        <div className="mt-2">
          <ColorPicker color={color} onChange={setColor} />
        </div>

        <p className="mt-4 text-sm font-medium text-ink-secondary">Icon</p>
        <div className="mt-2 grid grid-cols-8 gap-2">
          {MAILSLOT_ICONS.map((item) => {
            const Icon = item.icon;
            const selected = icon === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setIcon(item.id)}
                className={`flex h-9 items-center justify-center rounded-md border ${
                  selected
                    ? "border-ink bg-hover text-ink"
                    : "border-line text-ink-muted hover:bg-hover"
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-2">
          {editing ? (
            <button
              type="button"
              disabled={deleting || saving}
              onClick={() => void remove()}
              className="rounded-md px-3 py-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-ink-secondary hover:bg-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => void submit()}
              className="rounded-md bg-accent px-3 py-2 text-sm text-on-accent hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? editing
                  ? "Saving…"
                  : "Creating…"
                : editing
                  ? "Save"
                  : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
