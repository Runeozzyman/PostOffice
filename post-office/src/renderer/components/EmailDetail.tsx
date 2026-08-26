import { useState } from "react";
import type { EmailDetail as EmailDetailType } from "../../types/email";
import { formatListDate } from "../../helpers/formatListDate";
import { htmlWithOpenableLinks } from "../../helpers/htmlWithOpenableLinks";

interface EmailDetailProps {
  email: EmailDetailType;
  onBack: () => void;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailDetail({ email, onBack }: EmailDetailProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveAttachment = async (attachmentId: string, filename: string) => {
    setSaveError(null);
    setSavingId(attachmentId);

    try {
      await window.electronAPI.saveAttachment({
        messageId: email.id,
        attachmentId,
        filename,
      });
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save attachment."
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-sm text-ink-secondary hover:cursor-pointer hover:text-ink"
        >
          Back
        </button>
        <h1 className="min-w-0 truncate text-lg font-semibold text-ink">
          {email.subject || "(no subject)"}
        </h1>
      </div>
      <div className="shrink-0 border-b border-line px-4 py-3">
        <p className="text-sm text-ink-secondary">{email.from}</p>
        <p className="text-sm text-ink-muted">To: {email.to || "—"}</p>
        <p className="text-xs text-ink-muted">{formatListDate(email.date)}</p>
      </div>

      {email.attachments.length > 0 && (
        <div className="shrink-0 border-b border-line px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Attachments
          </p>
          <ul className="space-y-2">
            {email.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-ink">
                  {attachment.filename}
                  <span className="text-ink-muted">
                    {" "}
                    ({formatBytes(attachment.size)})
                  </span>
                </span>
                <button
                  type="button"
                  disabled={savingId === attachment.id}
                  onClick={() =>
                    saveAttachment(attachment.id, attachment.filename)
                  }
                  className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-ink-secondary hover:bg-hover disabled:opacity-50"
                >
                  {savingId === attachment.id ? "Saving…" : "Save"}
                </button>
              </li>
            ))}
          </ul>
          {saveError && <p className="mt-2 text-xs text-danger">{saveError}</p>}
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
        {email.bodyHtml ? (
          <iframe
            title="Email content"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={htmlWithOpenableLinks(email.bodyHtml)}
            className="h-full min-h-[24rem] w-full border-0 bg-white"
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm text-ink">
            {email.bodyText || email.snippet || "No content"}
          </pre>
        )}
      </div>
    </div>
  );
}
