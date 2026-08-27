import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { notifyEmailsChanged } from "../helpers/emailEvents";

interface MailSyncValue {
  syncing: boolean;
  storedThisRun: number;
  error: string | null;
  refresh: () => void;
}

const MailSyncContext = createContext<MailSyncValue | undefined>(undefined);

export function MailSyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false);
  const [storedThisRun, setStoredThisRun] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refresh = useCallback(() => {
    if (syncingRef.current) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    setStoredThisRun(0);
    setError(null);

    void window.electronAPI
      .syncEmails()
      .then(() => {
        notifyEmailsChanged();
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not refresh mail."
        );
      })
      .finally(() => {
        syncingRef.current = false;
        setSyncing(false);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onSyncProgress((progress) => {
      setStoredThisRun(progress.storedThisRun);
    });

    refresh();

    return unsubscribe;
  }, [refresh]);

  const value = useMemo(
    () => ({
      syncing,
      storedThisRun,
      error,
      refresh,
    }),
    [syncing, storedThisRun, error, refresh]
  );

  return (
    <MailSyncContext.Provider value={value}>{children}</MailSyncContext.Provider>
  );
}

export function useMailSync() {
  const context = useContext(MailSyncContext);

  if (!context) {
    throw new Error("useMailSync must be used within MailSyncProvider.");
  }

  return context;
}
