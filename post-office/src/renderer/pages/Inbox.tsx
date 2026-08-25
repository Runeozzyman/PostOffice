import { useEffect, useMemo, useRef, useState } from "react";
import type { Email, EmailDetail as EmailDetailType } from "../../types/email";
import EmailRow from "../components/EmailRow";
import EmailDetail from "../components/EmailDetail";

const PAGE_SIZE = 100;

export default function Inbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [storedThisRun, setStoredThisRun] = useState(0);
  const [selected, setSelected] = useState<EmailDetailType | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const pageRef = useRef(page);
  const queryRef = useRef(query);

  pageRef.current = page;
  queryRef.current = query;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim());
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const skipQueryReset = useRef(true);

  useEffect(() => {
    if (skipQueryReset.current) {
      skipQueryReset.current = false;
      return;
    }

    setPage(1);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      try {
        const result = await window.electronAPI.listEmails({
          page,
          pageSize: PAGE_SIZE,
          query,
        });

        if (cancelled) {
          return;
        }

        setEmails(result.emails);
        setTotal(result.total);
        setPage(result.page);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load inbox."
          );
          setLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [page, query]);

  useEffect(() => {
    let cancelled = false;
    let reloadTimer: number | undefined;

    const unsubscribeStored = window.electronAPI.onEmailStored(() => {
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        void window.electronAPI
          .listEmails({
            page: pageRef.current,
            pageSize: PAGE_SIZE,
            query: queryRef.current,
          })
          .then((result) => {
            if (cancelled) {
              return;
            }

            setEmails(result.emails);
            setTotal(result.total);
            setPage(result.page);
          })
          .catch(() => undefined);
      }, 250);
    });

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
      window.clearTimeout(reloadTimer);
      unsubscribeStored();
      unsubscribeProgress();
    };
  }, []);

  const openEmail = async (email: Email) => {
    setOpeningId(email.id);
    setError(null);

    try {
      const detail = await window.electronAPI.getEmail(email.id);

      if (!detail) {
        throw new Error("Email was not found in the local database.");
      }

      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open email.");
    } finally {
      setOpeningId(null);
    }
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.min(pageCount, Math.max(1, nextPage)));
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) {
      return "0 messages";
    }

    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  if (selected) {
    return (
      <EmailDetail email={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search all mail…"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
        />
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {syncing && (
        <p className="px-4 py-2 text-sm text-gray-500">
          Syncing all missing mail…
          {storedThisRun > 0 ? ` ${storedThisRun} new messages stored.` : ""}
        </p>
      )}
      {openingId && (
        <p className="px-4 py-2 text-sm text-gray-500">Opening message…</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          <p className="p-4 text-gray-500">Loading inbox…</p>
        ) : emails.length === 0 ? (
          <p className="p-4 text-gray-500">
            {query ? "No messages match that search." : "No messages in inbox."}
          </p>
        ) : (
          emails.map((email, index) => (
            <EmailRow
              key={email.id}
              email={email}
              animationIndex={index}
              onOpen={openEmail}
            />
          ))
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(1)}
            className="rounded-md px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            First
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 10)}
            className="rounded-md px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            -10
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-md px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Previous
          </button>
        </div>

        <span className="text-center">
          Page {page} of {pageCount}
          <span className="block text-xs text-gray-400">{rangeLabel}</span>
        </span>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="rounded-md px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Next
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 10)}
            className="rounded-md px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            +10
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(pageCount)}
            className="rounded-md px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
