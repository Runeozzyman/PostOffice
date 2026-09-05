import { useEffect, useMemo, useRef, useState } from "react";
import { FiPaperclip, FiTrash2 } from "react-icons/fi";
import ComposeButton from "../components/ComposeButton";
import { useCompose } from "../context/ComposeContext";
import { usePreferences } from "../context/PreferencesContext";
import { formatListDate } from "../../helpers/formatListDate";
import { DRAFTS_CHANGED_EVENT, notifyDraftsChanged } from "../helpers/draftEvents";
import { isTypingTarget } from "../helpers/keyboard";
import { matchesKeybind } from "../helpers/keybinds";
import type { StoredDraft } from "../../types/compose";

function draftSnippet(draft: StoredDraft) {
  const line = draft.body.replace(/\s+/g, " ").trim();
  return line || "No message text";
}

export default function Drafts({
  keyboardActive = false,
}: {
  keyboardActive?: boolean;
}) {
  const { openCompose, activeDraftId, close } = useCompose();
  const { shortcutsEnabled, keybinds } = usePreferences();
  const searchRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim().toLowerCase());
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadDrafts = async () => {
    const result = await window.electronAPI.listDrafts();
    setDrafts(result);
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;

    void loadDrafts().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Could not load drafts.");
        setLoading(false);
      }
    });

    const onChanged = () => {
      void loadDrafts().catch(() => undefined);
    };

    window.addEventListener(DRAFTS_CHANGED_EVENT, onChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(DRAFTS_CHANGED_EVENT, onChanged);
    };
  }, []);

  useEffect(() => {
    if (!keyboardActive) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const searchEl = searchRef.current;
      if (searchEl && event.target === searchEl) {
        event.preventDefault();
        searchEl.blur();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [keyboardActive]);

  useEffect(() => {
    if (!keyboardActive || !shortcutsEnabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (matchesKeybind(event, keybinds.search)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardActive, shortcutsEnabled, keybinds]);

  const visible = useMemo(() => {
    if (!query) {
      return drafts;
    }

    return drafts.filter((draft) => {
      const haystack = [
        draft.to,
        draft.cc,
        draft.bcc,
        draft.subject,
        draft.body,
        ...draft.attachments.map((item) => item.filename),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [drafts, query]);

  const removeDraft = async (id: string) => {
    if (activeDraftId === id) {
      close();
    }

    try {
      await window.electronAPI.deleteDraft(id);
      setDrafts((current) => current.filter((draft) => draft.id !== id));
      notifyDraftsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete draft.");
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-ink">Drafts</h1>
        <ComposeButton />
      </div>

      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <input
          ref={searchRef}
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search drafts…"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-line-strong"
        />
      </div>

      {error && <p className="px-4 py-2 text-sm text-danger">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && drafts.length === 0 ? (
          <p className="p-4 text-ink-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-ink-muted">
            {query ? "No drafts match that search." : "No drafts yet."}
          </p>
        ) : (
          visible.map((draft) => (
            <div
              key={draft.id}
              className="flex items-stretch border-b border-line"
            >
              <button
                type="button"
                onClick={() => openCompose(draft)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">
                      {draft.to.trim() || "(No recipient)"}
                    </p>
                    <p className="shrink-0 text-xs text-ink-muted">
                      {formatListDate(new Date(draft.updatedAt).toISOString())}
                    </p>
                  </div>
                  <p className="truncate text-sm text-ink">
                    {draft.subject.trim() || "(No subject)"}
                  </p>
                  <p className="truncate text-sm text-ink-muted">
                    {draftSnippet(draft)}
                  </p>
                </div>
                {draft.attachments.length > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-muted">
                    <FiPaperclip size={14} />
                    {draft.attachments.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label="Delete draft"
                onClick={() => void removeDraft(draft.id)}
                className="shrink-0 px-3 text-ink-muted hover:bg-hover hover:text-ink"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
