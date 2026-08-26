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
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-sm text-gray-600 hover:cursor-pointer hover:text-gray-900"
        >
          Back
        </button>
        <h1 className="min-w-0 truncate text-lg font-semibold text-gray-900">
          {email.subject || "(no subject)"}
        </h1>
      </div>
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-700">{email.from}</p>
        <p className="text-sm text-gray-500">To: {email.to || "—"}</p>
        <p className="text-xs text-gray-500">{formatListDate(email.date)}</p>
      </div>

      {email.attachments.length > 0 && (
        <div className="shrink-0 border-b border-gray-200 px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Attachments
          </p>
          <ul className="space-y-2">
            {email.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-gray-800">
                  {attachment.filename}
                  <span className="text-gray-500">
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
                  className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingId === attachment.id ? "Saving…" : "Save"}
                </button>
              </li>
            ))}
          </ul>
          {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
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
          <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-800">
            {email.bodyText || email.snippet || "No content"}
          </pre>
        )}
      </div>
    </div>
  );
}
