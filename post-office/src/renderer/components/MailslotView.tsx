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
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-sm text-gray-600 hover:text-gray-900"
        >
          Back to mailslots
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: mailslot.color }}
            >
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-gray-900">
                {mailslot.title}
              </h1>
              <p className="text-sm text-gray-500">
                Mail matching this slot’s rules.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FiEdit2 size={14} />
            Edit
          </button>
        </div>
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
