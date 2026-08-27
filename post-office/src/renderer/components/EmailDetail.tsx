import { useState } from "react";
import { FiCornerUpLeft, FiRotateCcw, FiShare2, FiStar, FiTrash2, FiUsers} from "react-icons/fi";
import { IoArrowBackSharp } from "react-icons/io5";
import type { EmailDetail as EmailDetailType, MailboxView } from "../../types/email";
import { formatListDate } from "../../helpers/formatListDate";
import { htmlWithOpenableLinks } from "../../helpers/htmlWithOpenableLinks";
import {
  buildForwardDraft,
  buildReplyDraft,
} from "../../helpers/composeMessage";
import { useCompose } from "../context/ComposeContext";

interface EmailDetailProps {
  email: EmailDetailType;
  mailbox: MailboxView;
  onBack: () => void;
  onTrashAction: (email: EmailDetailType) => void;
  onStar: (email: EmailDetailType) => void;
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

export default function EmailDetail({
  email,
  mailbox,
  onBack,
  onTrashAction,
  onStar,
}: EmailDetailProps) {
  const { openCompose } = useCompose();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inTrash = mailbox === "trash";
  const starred = email.labels.includes("STARRED");

  const reply = async (replyAll: boolean) => {
    const accountEmail = await window.electronAPI.getAccountEmail();
    openCompose(
      buildReplyDraft(email, { replyAll, accountEmail, mailbox })
    );
  };

  const moveTrash = () => {
    onTrashAction(email);
  };

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
      <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-sm text-ink-secondary hover:cursor-pointer hover:text-ink"
        >
          <IoArrowBackSharp size={20}/>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">
          {email.subject || "(no subject)"}
        </h1>
        <button
          type="button"
          aria-label={starred ? "Unstar" : "Star"}
          aria-pressed={starred}
          onClick={() => onStar(email)}
          className={`shrink-0 rounded-md p-2 ${
            starred
              ? "text-amber-400 hover:bg-hover"
              : "text-ink-subtle hover:bg-hover hover:text-ink-secondary"
          }`}
        >
          <FiStar size={18} className={starred ? "fill-current" : ""} />
        </button>
        <div className="flex max-w-[28rem] shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void reply(false)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover"
          >
            <FiCornerUpLeft size={14} />
            Reply
          </button>
          <button
            type="button"
            onClick={() => void reply(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover"
          >
            <FiUsers size={14} />
            Reply all
          </button>
          <button
            type="button"
            onClick={() => openCompose(buildForwardDraft(email))}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover"
          >
            <FiShare2 size={14} />
            Forward
          </button>
          <button
            type="button"
            onClick={moveTrash}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover"
          >
            {inTrash ? <FiRotateCcw size={14} /> : <FiTrash2 size={14} />}
            {inTrash ? "Restore" : "Trash"}
          </button>
        </div>
      </div>
      <div className="shrink-0 border-b border-line px-4 py-3">
        <p className="text-sm text-ink-secondary">{email.from}</p>
        <p className="text-sm text-ink-muted">To: {email.to || "—"}</p>
        <p className="text-xs text-ink-muted">{formatListDate(email.date)}</p>
        {saveError && <p className="mt-2 text-xs text-danger">{saveError}</p>}
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
