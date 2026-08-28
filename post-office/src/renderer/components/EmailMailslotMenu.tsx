import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { Mailslot, MailslotFiling } from "../../types/mailslot";
import { isPublicEmailDomain, parseFrom } from "../../helpers/parseFrom";
import { MAILSLOTS_CHANGED_EVENT } from "../helpers/mailslotEvents";

type FilingAction = "email" | "sender" | "domain";

interface EmailMailslotMenuProps {
  emailId: string;
  fromHeader: string;
  mailslots: Mailslot[];
  open: boolean;
  busy: boolean;
  position: { top: number; left: number };
  menuRef: RefObject<HTMLDivElement | null>;
  onBusy: (busy: boolean) => void;
  onClose: () => void;
  onFiled: () => void;
  onStepChange: (step: "actions" | "slots") => void;
}

export default function EmailMailslotMenu({
  emailId,
  fromHeader,
  mailslots,
  open,
  busy,
  position,
  menuRef,
  onBusy,
  onClose,
  onFiled,
  onStepChange,
}: EmailMailslotMenuProps) {
  const [step, setStep] = useState<"actions" | "slots">("actions");
  const [action, setAction] = useState<FilingAction | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filing, setFiling] = useState<MailslotFiling | null>(null);
  const [slots, setSlots] = useState<Mailslot[]>(mailslots);
  const sender = parseFrom(fromHeader);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("actions");
      setAction(null);
      setSelectedId(null);
      loadedFor.current = null;
      return;
    }

    if (loadedFor.current === emailId) {
      return;
    }

    loadedFor.current = emailId;
    void window.electronAPI.getMailslotFiling(emailId).then(setFiling);
  }, [open, emailId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        const rows = await window.electronAPI.listMailslots();
        if (!cancelled) {
          setSlots(rows);
        }
      } catch {
        if (!cancelled) {
          setSlots(mailslots);
        }
      }
    };

    void loadSlots();
    window.addEventListener(MAILSLOTS_CHANGED_EVENT, loadSlots);

    return () => {
      cancelled = true;
      window.removeEventListener(MAILSLOTS_CHANGED_EVENT, loadSlots);
    };
  }, [open, mailslots]);

  if (!open) {
    return null;
  }

  const goToActions = () => {
    setStep("actions");
    onStepChange("actions");
  };

  const currentIds =
    action === "email"
      ? (filing?.memberIds ?? [])
      : action === "sender"
        ? (filing?.senderRuleIds ?? [])
        : (filing?.domainRuleIds ?? []);
  const currentId = currentIds[0] ?? null;

  const chooseAction = (next: FilingAction) => {
    const ids =
      next === "email"
        ? (filing?.memberIds ?? [])
        : next === "sender"
          ? (filing?.senderRuleIds ?? [])
          : (filing?.domainRuleIds ?? []);
    setAction(next);
    setSelectedId(ids[0] ?? null);
    setStep("slots");
    onStepChange("slots");
  };

  const chooseSlot = (slotId: string) => {
    setSelectedId((current) => (current === slotId ? null : slotId));
  };

  const confirm = async () => {
    if (!action) {
      return;
    }

    onBusy(true);
    try {
      if (action === "email") {
        await window.electronAPI.applyEmailMailslots({
          emailId,
          selectedSlotId: selectedId,
        });
      } else {
        await window.electronAPI.applyMailslotRules({
          matchType: action === "sender" ? "email" : "domain",
          pattern: action === "sender" ? sender.email : sender.domain,
          selectedSlotId: selectedId,
        });
      }

      onClose();
      onFiled();
    } finally {
      onBusy(false);
    }
  };

  const title =
    action === "email"
      ? "This email"
      : action === "sender"
        ? "This sender"
        : "This domain";

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 w-72 overflow-hidden rounded-lg border border-line bg-surface text-left shadow-lg"
      style={{ top: position.top, left: position.left }}
      onClick={(event) => event.stopPropagation()}
    >
      {step === "actions" ? (
        <div className="flex flex-col py-1">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Add to one mailslot
          </p>
          <button
            type="button"
            disabled={busy || !filing}
            onClick={() => chooseAction("email")}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-ink hover:bg-hover"
          >
            <span className="font-semibold">This email</span>
            <FiChevronRight className="shrink-0 text-ink-subtle" size={16} />
          </button>
          <button
            type="button"
            disabled={busy || !filing || !sender.email}
            onClick={() => chooseAction("sender")}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-ink hover:bg-hover disabled:text-ink-subtle"
          >
            <span className="min-w-0">
              <span className="font-semibold">All from</span>{" "}
              <span className="text-ink-secondary">{sender.email}</span>
            </span>
            <FiChevronRight className="shrink-0 text-ink-subtle" size={16} />
          </button>
          {sender.domain && !isPublicEmailDomain(sender.domain) && (
            <button
              type="button"
              disabled={busy || !filing}
              onClick={() => chooseAction("domain")}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-ink hover:bg-hover"
            >
              <span className="min-w-0">
                <span className="font-semibold">Everyone at</span>{" "}
                <span className="text-ink-secondary">{sender.domain}</span>
              </span>
              <FiChevronRight className="shrink-0 text-ink-subtle" size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 border-b border-line px-1 py-1">
            <button
              type="button"
              onClick={goToActions}
              className="rounded p-2 text-ink-muted hover:bg-hover hover:text-ink"
            >
              <FiChevronLeft size={16} />
            </button>
            <p className="min-w-0 truncate text-sm font-semibold text-ink">
              {title}
            </p>
          </div>
          {slots.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-muted">
              Create a mailslot first.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {slots.map((mailslot) => {
                const checked = selectedId === mailslot.id;
                const currentlyIn = currentId === mailslot.id;

                return (
                  <button
                    key={mailslot.id}
                    type="button"
                    disabled={busy}
                    onClick={() => chooseSlot(mailslot.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-hover"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        checked
                          ? "border-accent bg-accent text-on-accent"
                          : "border-line-strong bg-surface"
                      }`}
                    >
                      {checked && (
                        <span className="h-1.5 w-1.5 rounded-full bg-on-accent" />
                      )}
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: mailslot.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {mailslot.title}
                    </span>
                    {currentlyIn && (
                      <span className="shrink-0 text-xs text-ink-subtle">
                        In slot
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-line px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-ink-secondary hover:bg-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || slots.length === 0}
              onClick={() => void confirm()}
              className="rounded-md bg-accent px-2 py-1 text-sm text-on-accent hover:opacity-90 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
