import { useEffect, useState } from "react";
import ComposeButton from "../components/ComposeButton";
import RefreshButton from "../components/RefreshButton";
import EmailListPanel from "../components/EmailListPanel";
import InboxMailslotTabs from "../components/InboxMailslotTabs";
import { useMailSync } from "../context/MailSyncContext";
import { MAILSLOTS_CHANGED_EVENT } from "../helpers/mailslotEvents";
import { notifyEmailsChanged } from "../helpers/emailEvents";
import type { Mailslot } from "../../types/mailslot";

interface InboxProps {
  keyboardActive: boolean;
  onOpenMailslot: (id: string) => void;
}

export default function Inbox({ keyboardActive, onOpenMailslot }: InboxProps) {
  const { syncing, storedThisRun, error } = useMailSync();
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await window.electronAPI.listMailslots();
        if (!cancelled) {
          setMailslots(rows);
        }
      } catch {
        // Inbox still works without tabs.
      }
    };

    void load();
    window.addEventListener(MAILSLOTS_CHANGED_EVENT, load);

    return () => {
      cancelled = true;
      window.removeEventListener(MAILSLOTS_CHANGED_EVENT, load);
    };
  }, []);

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
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-ink">Inbox</h1>
        <RefreshButton />
        <ComposeButton />
      </div>
      <InboxMailslotTabs
        mailslots={mailslots}
        onOpen={(mailslot) => onOpenMailslot(mailslot.id)}
        onFileEmail={(emailId, mailslotId) => {
          void fileEmail(emailId, mailslotId);
        }}
      />
      {error && (
        <p className="shrink-0 px-4 py-2 text-sm text-danger">{error}</p>
      )}
      {fileError && (
        <p className="shrink-0 px-4 py-2 text-sm text-danger">{fileError}</p>
      )}
      {syncing && (
        <p className="shrink-0 px-4 py-2 text-sm text-ink-muted">
          Checking for new mail…
          {storedThisRun > 0 ? ` ${storedThisRun} new messages stored.` : ""}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <EmailListPanel
          showMailslotColor
          keyboardActive={keyboardActive}
          canDragToMailslot
          emptyMessage="No messages in inbox."
        />
      </div>
    </div>
  );
}
