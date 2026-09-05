import { useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import type { Mailslot } from "../../types/mailslot";
import { mailslotIcon } from "../helpers/mailslotOptions";
import { notifyEmailsChanged } from "../helpers/emailEvents";
import ComposeButton from "./ComposeButton";
import RefreshButton from "./RefreshButton";
import EmailListPanel from "./EmailListPanel";
import InboxMailslotTabs from "./InboxMailslotTabs";
import MailslotEditorModal from "./MailslotEditorModal";

interface MailslotViewProps {
  mailslot: Mailslot;
  mailslots: Mailslot[];
  keyboardActive?: boolean;
  onOpenMailslot: (id: string) => void;
  onBack: () => void;
  onUpdated: (mailslot: Mailslot) => void;
  onDeleted: (id: string) => void;
}

export default function MailslotView({
  mailslot,
  mailslots,
  keyboardActive = false,
  onOpenMailslot,
  onBack,
  onUpdated,
  onDeleted,
}: MailslotViewProps) {
  const [editing, setEditing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const Icon = mailslotIcon(mailslot.icon);

  const fileEmail = async (emailId: string, mailslotId: string) => {
    try {
      await window.electronAPI.applyEmailMailslots({
        emailId,
        selectedSlotId: mailslotId,
      });
      setFileError(null);
      notifyEmailsChanged();
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "Could not file this message."
      );
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <button
          type="button"
          onClick={onBack}
          className="mr-3 shrink-0 text-sm text-ink-secondary hover:text-ink"
        >
          Back
        </button>
        <span
          className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: mailslot.color }}
        >
          <Icon size={16} />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">
          {mailslot.title}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover"
        >
          <FiEdit2 size={14} />
          Edit
        </button>
        <RefreshButton />
        <ComposeButton />
      </div>

      <InboxMailslotTabs
        mailslots={mailslots}
        activeId={mailslot.id}
        onOpen={(slot) => onOpenMailslot(slot.id)}
        onFileEmail={(emailId, mailslotId) => {
          void fileEmail(emailId, mailslotId);
        }}
      />
      {fileError && (
        <p className="shrink-0 px-4 py-2 text-sm text-danger">{fileError}</p>
      )}

      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailslotId={mailslot.id}
          showMailslotColor={false}
          keyboardActive={keyboardActive}
          canDragToMailslot
          emptyMessage="No messages in this mailslot yet. File mail from the inbox menu or drag a message onto a mailslot tab."
        />
      </div>

      {editing && (
        <MailslotEditorModal
          mailslot={mailslot}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
          onDeleted={(id) => {
            setEditing(false);
            onDeleted(id);
          }}
        />
      )}
    </div>
  );
}
