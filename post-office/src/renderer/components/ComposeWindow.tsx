import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  FiMaximize2,
  FiMinimize2,
  FiMinus,
  FiPaperclip,
  FiX,
} from "react-icons/fi";
import { useCompose } from "../context/ComposeContext";
import { notifyDraftsChanged } from "../helpers/draftEvents";
import { notifyEmailsChanged } from "../helpers/emailEvents";
import { GMAIL_MAX_ATTACHMENT_BYTES } from "../../helpers/gmailLimits";
import type { ComposeAttachment, GmailSignature } from "../../types/compose";
import { splitQuotedBody } from "../../helpers/splitQuotedBody";
import AddressField from "./AddressField";

const emptyDraft = {
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
};

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ComposeWindow() {
  const {
    mode,
    sessionId,
    seed,
    registerPersist,
    setActiveDraftId,
    minimize,
    restore,
    fullscreen,
    close,
  } = useCompose();
  const [draft, setDraft] = useState(emptyDraft);
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [inReplyToMessageId, setInReplyToMessageId] = useState<
    string | undefined
  >();
  const [draftId, setDraftId] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<GmailSignature[]>([]);
  const [signatureId, setSignatureId] = useState("");
  const ignoreSavesRef = useRef(false);
  const latestRef = useRef({
    draft: emptyDraft,
    attachments: [] as ComposeAttachment[],
    threadId: undefined as string | undefined,
    inReplyToMessageId: undefined as string | undefined,
    draftId: "",
  });

  latestRef.current = {
    draft,
    attachments,
    threadId,
    inReplyToMessageId,
    draftId,
  };

  const persist = useCallback(
    async (options?: { notify?: boolean }) => {
      if (ignoreSavesRef.current) {
        return;
      }

      const current = latestRef.current;
      const empty =
        !current.draft.to.trim() &&
        !current.draft.cc.trim() &&
        !current.draft.bcc.trim() &&
        !current.draft.subject.trim() &&
        !current.draft.body.trim() &&
        current.attachments.length === 0;

      if (empty && !current.draftId) {
        return;
      }

      const saved = await window.electronAPI.saveDraft({
        id: current.draftId || undefined,
        to: current.draft.to,
        cc: current.draft.cc,
        bcc: current.draft.bcc,
        subject: current.draft.subject,
        body: current.draft.body,
        threadId: current.threadId,
        inReplyToMessageId: current.inReplyToMessageId,
        attachments: current.attachments,
      });

      const nextId = saved?.id ?? "";
      if (nextId !== current.draftId) {
        setDraftId(nextId);
        setActiveDraftId(nextId);
      }

      if (saved) {
        const pathsChanged =
          saved.attachments.length !== current.attachments.length ||
          saved.attachments.some(
            (item, index) => item.path !== current.attachments[index]?.path
          );
        if (pathsChanged) {
          setAttachments(saved.attachments);
        }
      }

      const created = !current.draftId && Boolean(nextId);
      const removed = Boolean(current.draftId) && !nextId;
      if (options?.notify !== false || created || removed) {
        notifyDraftsChanged();
      }
    },
    [setActiveDraftId]
  );

  useEffect(() => {
    registerPersist(() => persist({ notify: true }));
    return () => registerPersist(null);
  }, [persist, registerPersist]);

  useEffect(() => {
    if (mode === "closed") {
      ignoreSavesRef.current = false;
      setDraft(emptyDraft);
      setAttachments([]);
      setThreadId(undefined);
      setInReplyToMessageId(undefined);
      setDraftId("");
      setShowCc(false);
      setSending(false);
      setDragging(false);
      setError(null);
      setSignatures([]);
      setSignatureId("");
    }
  }, [mode]);

  useEffect(() => {
    if (sessionId === 0) {
      return;
    }

    ignoreSavesRef.current = false;
    setDraft({
      to: seed?.to ?? "",
      cc: seed?.cc ?? "",
      bcc: seed?.bcc ?? "",
      subject: seed?.subject ?? "",
      body: seed?.body ?? "",
    });
    setAttachments(seed?.attachments ?? []);
    setThreadId(seed?.threadId);
    setInReplyToMessageId(seed?.inReplyToMessageId);
    setDraftId(seed?.id ?? "");
    setShowCc(Boolean(seed?.cc || seed?.bcc));
    setSending(false);
    setDragging(false);
    setError(null);

    void window.electronAPI
      .listSignatures()
      .then((result) => {
        setSignatures(result);
        const preferred =
          result.find((item) => item.isDefault) ??
          result.find((item) => item.isPrimary) ??
          result[0];
        setSignatureId(preferred?.id ?? "");
      })
      .catch(() => {
        setSignatures([]);
        setSignatureId("");
      });
  }, [sessionId, seed]);

  useEffect(() => {
    if (mode === "closed" || sessionId === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persist({ notify: false }).catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not save this draft."
        );
      });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [
    attachments,
    draft,
    inReplyToMessageId,
    mode,
    persist,
    sessionId,
    threadId,
  ]);

  if (mode === "closed") {
    return null;
  }

  const selectedSignature = signatures.find((item) => item.id === signatureId);

  const insertSignatureAtEnd = () => {
    if (!selectedSignature) {
      return;
    }

    const { before, after } = splitQuotedBody(draft.body);
    setDraft((current) => ({
      ...current,
      body: [before.trimEnd(), selectedSignature.text, after.trimStart()]
        .filter(Boolean)
        .join("\n\n"),
    }));
    setSignatureId("");
  };

  const requestClose = () => {
    void persist({ notify: true })
      .then(() => {
        close();
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not save this draft."
        );
      });
  };

  const addAttachments = (incoming: ComposeAttachment[]) => {
    if (incoming.length === 0) {
      return;
    }

    setAttachments((current) => {
      const existing = new Set(current.map((item) => item.path));
      const next = [
        ...current,
        ...incoming.filter((item) => !existing.has(item.path)),
      ];
      const total = next.reduce((sum, item) => sum + item.size, 0);

      if (total > GMAIL_MAX_ATTACHMENT_BYTES) {
        setError("Attachments are over Gmail’s 25 MB limit.");
        return current;
      }

      setError(null);
      return next;
    });
  };

  const pickFiles = async () => {
    const picked = await window.electronAPI.pickComposeAttachments();
    addAttachments(picked);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    const files = [...event.dataTransfer.files];
    const paths = files
      .map((file) => {
        try {
          return window.electronAPI.getPathForFile(file);
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    if (paths.length === 0) {
      setError("Could not attach those files.");
      return;
    }

    const items = await window.electronAPI.composeAttachmentsFromPaths(paths);
    addAttachments(items);
  };

  const send = async () => {
    if (!draft.to.trim()) {
      setError("Add at least one recipient.");
      return;
    }

    const total = attachments.reduce((sum, item) => sum + item.size, 0);

    if (total > GMAIL_MAX_ATTACHMENT_BYTES) {
      setError("Attachments are over Gmail’s 25 MB limit.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      await window.electronAPI.sendEmail({
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        body: draft.body,
        threadId,
        inReplyToMessageId,
        attachments,
        signatureText: selectedSignature?.text,
        signatureHtml: selectedSignature?.html,
      });
      ignoreSavesRef.current = true;
      try {
        if (latestRef.current.draftId) {
          await window.electronAPI.deleteDraft(latestRef.current.draftId);
        }
      } catch {
        // The message was sent; keep compose from recreating the draft.
      }
      notifyEmailsChanged();
      notifyDraftsChanged();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this message.");
    } finally {
      setSending(false);
    }
  };

  const title = draft.subject.trim() || "New message";

  const chrome = (
    <div className="flex h-11 shrink-0 items-center gap-1 bg-ink px-2 text-on-ink">
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-2 text-left text-sm font-medium"
        onClick={mode === "minimized" ? restore : undefined}
      >
        {title}
      </button>
      <button
        type="button"
        aria-label={mode === "minimized" ? "Restore" : "Minimize"}
        onClick={mode === "minimized" ? restore : minimize}
        className="rounded p-1.5 hover:bg-white/10"
      >
        <FiMinus size={14} />
      </button>
      <button
        type="button"
        aria-label={mode === "fullscreen" ? "Exit full screen" : "Full screen"}
        onClick={fullscreen}
        className="rounded p-1.5 hover:bg-white/10"
      >
        {mode === "fullscreen" ? (
          <FiMinimize2 size={14} />
        ) : (
          <FiMaximize2 size={14} />
        )}
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={requestClose}
        className="rounded p-1.5 hover:bg-white/10"
      >
        <FiX size={14} />
      </button>
    </div>
  );

  const fields = (
    <div className="relative flex min-h-0 flex-1 flex-col bg-surface">
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-ink/40 bg-surface/80 text-sm font-medium text-ink">
          Drop files to attach
        </div>
      )}
      <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
        <span className="w-10 shrink-0 text-ink-muted">To</span>
        <AddressField
          value={draft.to}
          placeholder="Recipient"
          onChange={(to) => setDraft((current) => ({ ...current, to }))}
        />
        {!showCc && (
          <button
            type="button"
            onClick={() => setShowCc(true)}
            className="shrink-0 text-xs text-ink-muted hover:text-ink"
          >
            Cc/Bcc
          </button>
        )}
      </label>
      {showCc && (
        <>
          <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
            <span className="w-10 shrink-0 text-ink-muted">Cc</span>
            <AddressField
              value={draft.cc}
              onChange={(cc) => setDraft((current) => ({ ...current, cc }))}
            />
          </label>
          <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
            <span className="w-10 shrink-0 text-ink-muted">Bcc</span>
            <AddressField
              value={draft.bcc}
              onChange={(bcc) => setDraft((current) => ({ ...current, bcc }))}
            />
          </label>
        </>
      )}
      <label className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm">
        <span className="w-10 shrink-0 text-ink-muted">Subj</span>
        <input
          value={draft.subject}
          onChange={(event) =>
            setDraft((current) => ({ ...current, subject: event.target.value }))
          }
          className="min-w-0 flex-1 bg-transparent text-ink outline-none"
          placeholder="Subject"
        />
      </label>
      <textarea
        value={draft.body}
        onChange={(event) =>
          setDraft((current) => ({ ...current, body: event.target.value }))
        }
        className="min-h-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-ink outline-none"
        placeholder="Write your message…"
      />
      {selectedSignature && (
        <div className="shrink-0 border-t border-dashed border-line px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
            Signature
          </p>
          <p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-ink-muted">
            {selectedSignature.text}
          </p>
        </div>
      )}
      {attachments.length > 0 && (
        <ul className="flex max-h-28 shrink-0 flex-wrap gap-2 overflow-auto border-t border-line px-3 py-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.path}
              className="flex max-w-full items-center gap-1.5 rounded-md border border-line bg-hover px-2 py-1 text-xs text-ink"
            >
              <span className="min-w-0 truncate">{attachment.filename}</span>
              <span className="shrink-0 text-ink-muted">
                {formatBytes(attachment.size)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${attachment.filename}`}
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((item) => item.path !== attachment.path)
                  )
                }
                className="rounded p-0.5 text-ink-muted hover:text-ink"
              >
                <FiX size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="shrink-0 px-3 pb-2 text-sm text-danger">{error}</p>
      )}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Attach files"
            onClick={() => void pickFiles()}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-secondary hover:bg-hover hover:text-ink"
          >
            <FiPaperclip size={16} />
            Attach
          </button>
          <label className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink-secondary">
            <span className="shrink-0">Signature</span>
            <select
              value={signatureId}
              onChange={(event) => setSignatureId(event.target.value)}
              className="max-w-40 truncate rounded-md border border-line bg-surface px-2 py-1 text-ink outline-none"
            >
              <option value="">None</option>
              {signatures.map((signature) => (
                <option key={signature.id} value={signature.id}>
                  {signature.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!selectedSignature}
            onClick={insertSignatureAtEnd}
            className="rounded-md px-2 py-1.5 text-sm text-ink-secondary hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            Insert
          </button>
        </div>
        <button
          type="button"
          disabled={sending}
          onClick={() => void send()}
          className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-on-ink hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`compose-shell compose-shell--${mode}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) {
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        void onDrop(event);
      }}
    >
      {chrome}
      {fields}
    </div>
  );
}
