import { useEffect, useState } from "react";
import ComposeButton from "../components/ComposeButton";
import RefreshButton from "../components/RefreshButton";
import EmailListPanel from "../components/EmailListPanel";
import InboxMailslotTabs from "../components/InboxMailslotTabs";
import MailboxChromeToggle from "../components/MailboxChromeToggle";
import MailboxFold from "../components/MailboxFold";
import { useMailSync } from "../context/MailSyncContext";
import { useMailboxChrome } from "../hooks/useMailboxChrome";
import { MAILSLOTS_CHANGED_EVENT } from "../helpers/mailslotEvents";
import { notifyEmailsChanged } from "../helpers/emailEvents";
import type { Mailslot } from "../../types/mailslot";

interface InboxProps {
  keyboardActive: boolean;
  onOpenMailslot: (id: string) => void;
}

export default function Inbox({ keyboardActive, onOpenMailslot }: InboxProps) {
  const { syncing, storedThisRun, error } = useMailSync();
  const { collapsed, toggleCollapsed, setSearchSlot, searchPortalEl } =
    useMailboxChrome();
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const hasMailslots = mailslots.length > 0;

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
    <div className="skin-page flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-4">
        <h1 className="max-w-[7.5rem] shrink-0 truncate text-lg font-semibold text-ink">
          Inbox
        </h1>
        <div ref={setSearchSlot} className="min-w-0 flex-1" />
        {hasMailslots && (
          <MailboxChromeToggle
            collapsed={collapsed}
            onToggle={toggleCollapsed}
          />
        )}
        <RefreshButton />
        <ComposeButton />
      </div>
      {hasMailslots && (
        <MailboxFold collapsed={collapsed}>
          <InboxMailslotTabs
            mailslots={mailslots}
            onOpen={(mailslot) => onOpenMailslot(mailslot.id)}
            onFileEmail={(emailId, mailslotId) => {
              void fileEmail(emailId, mailslotId);
            }}
          />
        </MailboxFold>
      )}
      {error && (
        <p className="shrink-0 bg-surface px-4 py-2 text-sm text-danger">{error}</p>
      )}
      {fileError && (
        <p className="shrink-0 bg-surface px-4 py-2 text-sm text-danger">{fileError}</p>
      )}
      {syncing && (
        <p className="shrink-0 bg-surface px-4 py-2 text-sm text-ink-muted">
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
          searchPortalEl={searchPortalEl}
          hideSearchRow
        />
      </div>
    </div>
  );
}
