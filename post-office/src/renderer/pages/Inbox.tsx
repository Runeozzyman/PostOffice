import ComposeButton from "../components/ComposeButton";
import RefreshButton from "../components/RefreshButton";
import EmailListPanel from "../components/EmailListPanel";
import { useMailSync } from "../context/MailSyncContext";

export default function Inbox() {
  const { syncing, storedThisRun, error } = useMailSync();

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-ink">Inbox</h1>
        <RefreshButton />
        <ComposeButton />
      </div>
      {error && (
        <p className="shrink-0 px-4 py-2 text-sm text-danger">{error}</p>
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
          emptyMessage="No messages in inbox."
        />
      </div>
    </div>
  );
}
