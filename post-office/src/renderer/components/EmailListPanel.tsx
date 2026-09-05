import { useEffect, useMemo, useRef, useState } from "react";
import type { Email, EmailDetail as EmailDetailType, MailboxView } from "../../types/email";
import type { Mailslot } from "../../types/mailslot";
import { MAILSLOTS_CHANGED_EVENT } from "../helpers/mailslotEvents";
import {
  EMAIL_HIDDEN_EVENT,
  EMAIL_MUTATED_EVENT,
  EMAILS_CHANGED_EVENT,
  notifyEmailMutated,
} from "../helpers/emailEvents";
import {
  applyEmailToList,
  emailMatchesMailbox,
  withRestored,
  withStarred,
  withTrashed,
} from "../../helpers/emailLabels";
import { isTypingTarget } from "../helpers/keyboard";
import {
  readMailslotListCache,
  writeMailslotListCache,
  invalidateMailslotListCache,
} from "../helpers/mailslotListCache";
import EmailRow from "./EmailRow";
import EmailDetail from "./EmailDetail";

const PAGE_SIZE = 100;

interface EmailListPanelProps {
  mailslotId?: string;
  mailbox?: MailboxView;
  showMailslotColor: boolean;
  emptyMessage: string;
  searchPlaceholder?: string;
  keyboardActive?: boolean;
  canDragToMailslot?: boolean;
}

export default function EmailListPanel({
  mailslotId,
  mailbox = "inbox",
  showMailslotColor,
  emptyMessage,
  searchPlaceholder = "Search mail…",
  keyboardActive = false,
  canDragToMailslot = false,
}: EmailListPanelProps) {
  const initialCached =
    mailslotId
      ? readMailslotListCache(mailslotId, 1, PAGE_SIZE, "")
      : undefined;
  const [emails, setEmails] = useState<Email[]>(initialCached?.emails ?? []);
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);
  const [total, setTotal] = useState(initialCached?.total ?? 0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialCached);
  const [selected, setSelected] = useState<EmailDetailType | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const focusedRowRef = useRef<HTMLElement | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim());
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setFocusedIndex(-1);
  }, [query, mailslotId, mailbox]);

  const loadPage = async (options?: { force?: boolean }) => {
    if (mailslotId && !options?.force) {
      const cached = readMailslotListCache(mailslotId, page, PAGE_SIZE, query);
      if (cached) {
        setEmails(cached.emails);
        setTotal(cached.total);
        setPage(cached.page);
        setLoading(false);
        setError(null);
        return;
      }
    }

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

    if (mailslotId) {
      writeMailslotListCache(mailslotId, result, query);
    }
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

    const load = async (options?: { force?: boolean }) => {
      try {
        if (!cancelled) {
          await loadPage(options);
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
      invalidateMailslotListCache();
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        if (!cancelled) {
          void loadPage({ force: true }).catch(() => undefined);
        }
      }, 250);
    });

    const onMailslotsChanged = () => {
      if (!cancelled) {
        void load({ force: true });
      }
    };

    const onEmailsChanged = () => {
      if (!cancelled) {
        void loadPage({ force: true }).catch(() => undefined);
      }
    };

    const onEmailHidden = (event: Event) => {
      const emailId = (event as CustomEvent<{ emailId: string }>).detail?.emailId;

      if (!emailId || cancelled) {
        return;
      }

      setEmails((current) => current.filter((email) => email.id !== emailId));
      setTotal((current) => Math.max(0, current - 1));
      setSelected((current) => (current?.id === emailId ? null : current));
    };

    const onEmailMutated = (event: Event) => {
      const email = (event as CustomEvent<{ email: Email }>).detail?.email;

      if (!email || cancelled) {
        return;
      }

      setEmails((current) => {
        const result = applyEmailToList(current, email, {
          mailbox,
          mailslotId,
          page,
          query,
          pageSize: PAGE_SIZE,
        });

        if (result.totalDelta !== 0) {
          queueMicrotask(() => {
            setTotal((total) => Math.max(0, total + result.totalDelta));
          });
        }

        return result.emails;
      });

      setSelected((current) => {
        if (current?.id !== email.id) {
          return current;
        }

        const stays = mailslotId
          ? !email.labels.includes("TRASH")
          : emailMatchesMailbox(email, mailbox);

        return stays ? { ...current, labels: email.labels } : null;
      });
    };

    window.addEventListener(MAILSLOTS_CHANGED_EVENT, onMailslotsChanged);
    window.addEventListener(EMAILS_CHANGED_EVENT, onEmailsChanged);
    window.addEventListener(EMAIL_HIDDEN_EVENT, onEmailHidden);
    window.addEventListener(EMAIL_MUTATED_EVENT, onEmailMutated);

    const unsubscribeFailed = window.electronAPI.onEmailActionFailed(
      ({ email, message }) => {
        if (cancelled) {
          return;
        }

        setError(message);

        if (email) {
          notifyEmailMutated(email);
        }
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(reloadTimer);
      unsubscribeStored();
      unsubscribeFailed();
      window.removeEventListener(MAILSLOTS_CHANGED_EVENT, onMailslotsChanged);
      window.removeEventListener(EMAILS_CHANGED_EVENT, onEmailsChanged);
      window.removeEventListener(EMAIL_HIDDEN_EVENT, onEmailHidden);
      window.removeEventListener(EMAIL_MUTATED_EVENT, onEmailMutated);
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
      setFocusedIndex(
        emails.findIndex((item) => item.id === email.id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open email.");
    } finally {
      setOpeningId(null);
    }
  };

  useEffect(() => {
    setFocusedIndex((current) => {
      if (emails.length === 0) {
        return -1;
      }
      if (current >= emails.length) {
        return emails.length - 1;
      }
      return current;
    });
  }, [emails]);

  useEffect(() => {
    focusedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, selected]);

  useEffect(() => {
    if (!keyboardActive) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key === "b" || event.key === "B") {
        if (selected) {
          event.preventDefault();
          setSelected(null);
        }
        return;
      }

      if (emails.length === 0) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;

        if (selected) {
          const currentIndex = emails.findIndex(
            (item) => item.id === selected.id
          );
          const nextIndex = Math.min(
            emails.length - 1,
            Math.max(0, (currentIndex < 0 ? 0 : currentIndex) + delta)
          );
          const next = emails[nextIndex];
          if (next && next.id !== selected.id) {
            void openEmail(next);
          }
          return;
        }

        setFocusedIndex((current) => {
          if (current < 0) {
            return delta > 0 ? 0 : emails.length - 1;
          }
          return Math.min(emails.length - 1, Math.max(0, current + delta));
        });
        return;
      }

      if (event.key === "Enter" && !selected && focusedIndex >= 0) {
        const email = emails[focusedIndex];
        if (email) {
          event.preventDefault();
          void openEmail(email);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardActive, emails, selected, focusedIndex]);

  useEffect(() => {
    if (!mailslotId || loading) {
      return;
    }

    writeMailslotListCache(
      mailslotId,
      {
        emails,
        total,
        page,
        pageSize: PAGE_SIZE,
      },
      query
    );
  }, [mailslotId, emails, total, page, query, loading]);

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

  const queueStar = (email: Email) => {
    const starred = !email.labels.includes("STARRED");
    notifyEmailMutated({
      ...email,
      labels: withStarred(email.labels, starred),
    });

    void window.electronAPI.setEmailStarred({ id: email.id, starred }).catch(
      (err: unknown) => {
        notifyEmailMutated(email);
        setError(
          err instanceof Error
            ? err.message
            : "Could not update the star on this message."
        );
      }
    );
  };

  const queueTrashAction = (email: Email) => {
    const restore = mailbox === "trash";
    invalidateMailslotListCache();
    notifyEmailMutated({
      ...email,
      labels: restore ? withRestored(email.labels) : withTrashed(email.labels),
    });

    void (restore
      ? window.electronAPI.untrashEmail(email.id)
      : window.electronAPI.trashEmail(email.id)
    ).catch((err: unknown) => {
      notifyEmailMutated(email);
      setError(
        err instanceof Error
          ? err.message
          : restore
            ? "Could not restore this message."
            : "Could not move this message to Trash."
      );
    });
  };

  if (selected) {
    return (
      <EmailDetail
        email={selected}
        mailbox={mailbox}
        onBack={() => setSelected(null)}
        onTrashAction={queueTrashAction}
        onStar={queueStar}
      />
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-line-strong"
        />
      </div>

      {error && <p className="px-4 py-2 text-sm text-danger">{error}</p>}
      {openingId && (
        <p className="px-4 py-2 text-sm text-ink-muted">Opening message…</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          <p className="p-4 text-ink-muted">Loading…</p>
        ) : emails.length === 0 ? (
          <p className="p-4 text-ink-muted">
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
              focused={index === focusedIndex}
              rowRef={index === focusedIndex ? focusedRowRef : undefined}
              canDrag={canDragToMailslot}
              onOpen={openEmail}
              onFiled={() => {
                void loadPage();
              }}
              onTrashAction={queueTrashAction}
              onStar={queueStar}
            />
          ))
        )}
      </div>

      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-t border-line px-4 text-sm text-ink-secondary">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(1)}
            className="rounded-md px-2 py-1 hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            First
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 10)}
            className="rounded-md px-2 py-1 hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            -10
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-md px-2 py-1 hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            Previous
          </button>
        </div>

        <span className="shrink-0 text-center leading-tight">
          Page {page} of {pageCount}
          <span className="block text-xs text-ink-subtle">{rangeLabel}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="rounded-md px-2 py-1 hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            Next
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 10)}
            className="rounded-md px-2 py-1 hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            +10
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(pageCount)}
            className="rounded-md px-2 py-1 hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
