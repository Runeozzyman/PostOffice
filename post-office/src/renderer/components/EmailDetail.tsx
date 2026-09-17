import { useEffect, useMemo, useState } from "react";
import { FiCornerUpLeft, FiRotateCcw, FiShare2, FiStar, FiTrash2, FiUsers} from "react-icons/fi";
import { IoArrowBackSharp } from "react-icons/io5";
import type { EmailDetail as EmailDetailType, MailboxView } from "../../types/email";
import { formatListDate } from "../../helpers/formatListDate";
import { parseAddressList, parseFrom } from "../../helpers/parseFrom";
import { attachmentPreviewKind } from "../helpers/attachmentPreview";
import AttachmentPreview from "./AttachmentPreview";
import EmailHtmlFrame from "./EmailHtmlFrame";
import ProfileAvatar from "./ProfileAvatar";
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

function addressesFromHeader(header: string) {
  const listed = parseAddressList(header);
  if (listed.length > 0) {
    return listed;
  }

  const trimmed = header.trim();
  return trimmed ? [parseFrom(trimmed)] : [];
}

function AddressPeople({
  label,
  header,
  photos,
  tone,
}: {
  label?: string;
  header: string;
  photos: Record<string, string | null>;
  tone: "secondary" | "muted";
}) {
  const people = addressesFromHeader(header);
  const textClass =
    tone === "secondary" ? "text-ink-secondary" : "text-ink-muted";

  if (people.length === 0) {
    return (
      <p className={`text-sm ${textClass}`}>
        {label ? `${label} ` : ""}
        —
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {people.map((person, index) => (
        <div key={`${person.email}-${index}`} className="flex min-w-0 items-center gap-2">
          <ProfileAvatar
            email={person.email}
            name={person.displayName}
            photoUrl={photos[person.email]}
          />
          <p className={`min-w-0 truncate text-sm ${textClass}`}>
            {label && index === 0 ? `${label} ` : null}
            {person.displayName &&
            person.displayName.toLowerCase() !== person.email
              ? `${person.displayName} <${person.email}>`
              : person.email}
          </p>
        </div>
      ))}
    </div>
  );
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
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const inTrash = mailbox === "trash";
  const starred = email.labels.includes("STARRED");
  const listedAttachments = email.attachments.filter(
    (attachment) => !attachment.inline
  );
  const photoEmails = useMemo(() => {
    return [
      ...addressesFromHeader(email.from),
      ...addressesFromHeader(email.to),
    ].map((person) => person.email);
  }, [email.from, email.to]);

  useEffect(() => {
    let cancelled = false;

    void window.electronAPI
      .getProfilePhotos(photoEmails)
      .then((next) => {
        if (!cancelled) {
          setPhotos(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhotos({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email.id, photoEmails]);

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
    <div className="skin-page flex h-full min-w-0 flex-col bg-surface">
      <div className="z-10 flex min-h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <div className="shrink-0 border-b border-line px-4 py-3">
          <AddressPeople header={email.from} photos={photos} tone="secondary" />
          <div className="mt-1.5">
            <AddressPeople
              label="To:"
              header={email.to}
              photos={photos}
              tone="muted"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">{formatListDate(email.date)}</p>
          {saveError && <p className="mt-2 text-xs text-danger">{saveError}</p>}
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
        {email.bodyHtml ? (
          <EmailHtmlFrame
            messageId={email.id}
            html={email.bodyHtml}
            attachments={email.attachments}
          />
        ) : (
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm text-ink">
            {email.bodyText || email.snippet || "No content"}
          </pre>
        )}

        {listedAttachments.length > 0 && (
          <div className="shrink-0 border-t border-line bg-surface px-4 py-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Attachments
            </p>
            <ul className="space-y-4">
              {listedAttachments.map((attachment) => {
                const previewable = Boolean(
                  attachmentPreviewKind(attachment.mimeType, attachment.filename)
                );

                return (
                  <li key={attachment.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
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
                    </div>
                    {previewable && (
                      <AttachmentPreview
                        messageId={email.id}
                        attachment={attachment}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
