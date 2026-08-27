import { FiRefreshCw } from "react-icons/fi";
import { useMailSync } from "../context/MailSyncContext";

export default function RefreshButton() {
  const { syncing, refresh } = useMailSync();

  return (
    <button
      type="button"
      aria-label="Refresh mail"
      disabled={syncing}
      onClick={refresh}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink disabled:opacity-50"
    >
      <FiRefreshCw size={18} className={syncing ? "animate-spin" : ""} />
    </button>
  );
}
