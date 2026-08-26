import { useEffect, useState } from "react";
import EmailListPanel from "../components/EmailListPanel";

export default function Inbox() {
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [storedThisRun, setStoredThisRun] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const unsubscribeProgress = window.electronAPI.onSyncProgress((progress) => {
      setStoredThisRun(progress.storedThisRun);
    });

    setSyncing(true);

    void window.electronAPI
      .syncEmails()
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSyncing(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribeProgress();
    };
  }, []);

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4">
        <h1 className="text-lg font-semibold text-gray-900">Inbox</h1>
      </div>
      {error && (
        <p className="shrink-0 px-4 py-2 text-sm text-red-600">{error}</p>
      )}
      {syncing && (
        <p className="shrink-0 px-4 py-2 text-sm text-gray-500">
          Syncing all missing mail…
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
