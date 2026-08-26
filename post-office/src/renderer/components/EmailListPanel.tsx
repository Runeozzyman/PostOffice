import { useEffect, useMemo, useState } from "react";
import type { Email, EmailDetail as EmailDetailType, MailboxView } from "../../types/email";
import type { Mailslot } from "../../types/mailslot";
import { MAILSLOTS_CHANGED_EVENT } from "../helpers/mailslotEvents";
import EmailRow from "./EmailRow";
import EmailDetail from "./EmailDetail";

const PAGE_SIZE = 100;

interface EmailListPanelProps {
  mailslotId?: string;
  mailbox?: MailboxView;
  showMailslotColor: boolean;
  emptyMessage: string;
  searchPlaceholder?: string;
}

export default function EmailListPanel({
  mailslotId,
  mailbox = "inbox",
  showMailslotColor,
  emptyMessage,
  searchPlaceholder = "Search mail…",
}: EmailListPanelProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmailDetailType | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim());
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [query, mailslotId, mailbox]);

  const loadPage = async () => {
    const result = await window.electronAPI.listEmails({
      page,
      pageSize: PAGE_SIZE,
      query,
      mailslotId,
      mailbox,
    });

    setEmails(result.emails);
    setTotal(result.total);
    setPage(result.page);
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;

    const refreshMailslots = async () => {
      try {
        const rows = await window.electronAPI.listMailslots();
        if (!cancelled) {
          setMailslots(rows);
        }
      } catch {
        // Email list can still load without slot metadata.
      }
    };

    void refreshMailslots();
    window.addEventListener(MAILSLOTS_CHANGED_EVENT, refreshMailslots);

    return () => {
      cancelled = true;
      window.removeEventListener(MAILSLOTS_CHANGED_EVENT, refreshMailslots);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let reloadTimer: number | undefined;

    const load = async () => {
      try {
        if (!cancelled) {
          await loadPage();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load messages."
          );
          setLoading(false);
        }
      }
    };

    void load();

    const unsubscribeStored = window.electronAPI.onEmailStored(() => {
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        if (!cancelled) {
          void loadPage().catch(() => undefined);
        }
      }, 250);
    });

    const onMailslotsChanged = () => {
      if (!cancelled) {
        void load();
      }
    };

    window.addEventListener(MAILSLOTS_CHANGED_EVENT, onMailslotsChanged);

    return () => {
      cancelled = true;
      window.clearTimeout(reloadTimer);
      unsubscribeStored();
      window.removeEventListener(MAILSLOTS_CHANGED_EVENT, onMailslotsChanged);
    };
  }, [page, query, mailslotId, mailbox]);

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
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
        />
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {openingId && (
        <p className="px-4 py-2 text-sm text-gray-500">Opening message…</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          <p className="p-4 text-gray-500">Loading…</p>
        ) : emails.length === 0 ? (
          <p className="p-4 text-gray-500">
            {query ? "No messages match that search." : emptyMessage}
          </p>
        ) : (
          emails.map((email, index) => (
            <EmailRow
              key={email.id}
              email={email}
              mailslots={mailslots}
              mailbox={mailbox}
              showMailslotColor={showMailslotColor}
              animationIndex={index}
              onOpen={openEmail}
              onFiled={() => {
                void loadPage();
              }}
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
