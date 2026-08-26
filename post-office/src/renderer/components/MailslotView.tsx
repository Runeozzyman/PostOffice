import { useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import type { Mailslot } from "../../types/mailslot";
import { mailslotIcon } from "../helpers/mailslotOptions";
import EmailListPanel from "./EmailListPanel";
import MailslotEditorModal from "./MailslotEditorModal";

interface MailslotViewProps {
  mailslot: Mailslot;
  onBack: () => void;
  onUpdated: (mailslot: Mailslot) => void;
  onDeleted: (id: string) => void;
}

export default function MailslotView({
  mailslot,
  onBack,
  onUpdated,
  onDeleted,
}: MailslotViewProps) {
  const [editing, setEditing] = useState(false);
  const Icon = mailslotIcon(mailslot.icon);

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4">
        <button
          type="button"
          onClick={onBack}
          className="mr-3 shrink-0 text-sm text-gray-600 hover:text-gray-900"
        >
          Back
        </button>
        <span
          className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: mailslot.color }}
        >
          <Icon size={16} />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900">
          {mailslot.title}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FiEdit2 size={14} />
          Edit
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailslotId={mailslot.id}
          showMailslotColor={false}
          emptyMessage="No messages in this mailslot yet. File mail from the inbox menu."
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
