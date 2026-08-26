import { useEffect, useState } from "react";
import {
  FiMaximize2,
  FiMinimize2,
  FiMinus,
  FiX,
} from "react-icons/fi";
import { useCompose } from "../context/ComposeContext";
import { notifyEmailsChanged } from "../helpers/emailEvents";

const emptyDraft = {
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
};

export default function ComposeWindow() {
  const { mode, minimize, restore, fullscreen, close } = useCompose();
  const [draft, setDraft] = useState(emptyDraft);
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "closed") {
      setDraft(emptyDraft);
      setShowCc(false);
      setSending(false);
      setError(null);
    }
  }, [mode]);

  if (mode === "closed") {
    return null;
  }

  const dirty =
    draft.to.trim() ||
    draft.cc.trim() ||
    draft.bcc.trim() ||
    draft.subject.trim() ||
    draft.body.trim();

  const requestClose = () => {
    if (
      dirty &&
      !window.confirm("Discard this message? It will not be saved.")
    ) {
      return;
    }

    close();
  };

  const send = async () => {
    if (!draft.to.trim()) {
      setError("Add at least one recipient.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      await window.electronAPI.sendEmail({
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        body: draft.body,
      });
      notifyEmailsChanged();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this message.");
    } finally {
      setSending(false);
    }
  };

  const title = draft.subject.trim() || "New message";

  const chrome = (
    <div className="flex h-11 shrink-0 items-center gap-1 bg-ink px-2 text-on-ink">
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-2 text-left text-sm font-medium"
        onClick={mode === "minimized" ? restore : undefined}
      >
        {title}
      </button>
      <button
        type="button"
        aria-label={mode === "minimized" ? "Restore" : "Minimize"}
        onClick={mode === "minimized" ? restore : minimize}
        className="rounded p-1.5 hover:bg-white/10"
      >
        <FiMinus size={14} />
      </button>
      <button
        type="button"
        aria-label={mode === "fullscreen" ? "Exit full screen" : "Full screen"}
        onClick={fullscreen}
        className="rounded p-1.5 hover:bg-white/10"
      >
        {mode === "fullscreen" ? (
          <FiMinimize2 size={14} />
        ) : (
          <FiMaximize2 size={14} />
        )}
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={requestClose}
        className="rounded p-1.5 hover:bg-white/10"
      >
        <FiX size={14} />
      </button>
    </div>
  );

  const fields = (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
        <span className="w-10 shrink-0 text-ink-muted">To</span>
        <input
          value={draft.to}
          onChange={(event) =>
            setDraft((current) => ({ ...current, to: event.target.value }))
          }
          className="min-w-0 flex-1 bg-transparent text-ink outline-none"
          placeholder="Recipient"
        />
        {!showCc && (
          <button
            type="button"
            onClick={() => setShowCc(true)}
            className="shrink-0 text-xs text-ink-muted hover:text-ink"
          >
            Cc/Bcc
          </button>
        )}
      </label>
      {showCc && (
        <>
          <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
            <span className="w-10 shrink-0 text-ink-muted">Cc</span>
            <input
              value={draft.cc}
              onChange={(event) =>
                setDraft((current) => ({ ...current, cc: event.target.value }))
              }
              className="min-w-0 flex-1 bg-transparent text-ink outline-none"
            />
          </label>
          <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
            <span className="w-10 shrink-0 text-ink-muted">Bcc</span>
            <input
              value={draft.bcc}
              onChange={(event) =>
                setDraft((current) => ({ ...current, bcc: event.target.value }))
              }
              className="min-w-0 flex-1 bg-transparent text-ink outline-none"
            />
          </label>
        </>
      )}
      <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
        <span className="w-10 shrink-0 text-ink-muted">Subj</span>
        <input
          value={draft.subject}
          onChange={(event) =>
            setDraft((current) => ({ ...current, subject: event.target.value }))
          }
          className="min-w-0 flex-1 bg-transparent text-ink outline-none"
          placeholder="Subject"
        />
      </label>
      <textarea
        value={draft.body}
        onChange={(event) =>
          setDraft((current) => ({ ...current, body: event.target.value }))
        }
        className="min-h-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-ink outline-none"
        placeholder="Write your message…"
      />
      {error && (
        <p className="shrink-0 px-3 pb-2 text-sm text-danger">{error}</p>
      )}
      <div className="flex shrink-0 items-center justify-end border-t border-line px-3 py-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => void send()}
          className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-on-ink hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`compose-shell compose-shell--${mode}`}>
      {chrome}
      {fields}
    </div>
  );
}
