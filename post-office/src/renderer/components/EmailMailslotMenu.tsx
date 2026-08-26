import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronLeft, FiChevronRight } from "react-icons/fi";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filing, setFiling] = useState<MailslotFiling | null>(null);
  const [slots, setSlots] = useState<Mailslot[]>(mailslots);
  const sender = parseFrom(fromHeader);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("actions");
      setAction(null);
      setSelectedIds([]);
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

  const chooseAction = (next: FilingAction) => {
    const ids =
      next === "email"
        ? (filing?.memberIds ?? [])
        : next === "sender"
          ? (filing?.senderRuleIds ?? [])
          : (filing?.domainRuleIds ?? []);
    setAction(next);
    setSelectedIds(ids);
    setStep("slots");
    onStepChange("slots");
  };

  const toggleSlot = (slotId: string) => {
    setSelectedIds((current) =>
      current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId]
    );
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
          selectedSlotIds: selectedIds,
        });
      } else {
        await window.electronAPI.applyMailslotRules({
          matchType: action === "sender" ? "email" : "domain",
          pattern: action === "sender" ? sender.email : sender.domain,
          selectedSlotIds: selectedIds,
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
      className="fixed z-50 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-lg"
      style={{ top: position.top, left: position.left }}
      onClick={(event) => event.stopPropagation()}
    >
      {step === "actions" ? (
        <div className="flex flex-col py-1">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Add to mailslot
          </p>
          <button
            type="button"
            disabled={busy || !filing}
            onClick={() => chooseAction("email")}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
          >
            <span className="font-semibold">This email</span>
            <FiChevronRight className="shrink-0 text-gray-400" size={16} />
          </button>
          <button
            type="button"
            disabled={busy || !filing || !sender.email}
            onClick={() => chooseAction("sender")}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 disabled:text-gray-400"
          >
            <span className="min-w-0">
              <span className="font-semibold">All from</span>{" "}
              <span className="text-gray-600">{sender.email}</span>
            </span>
            <FiChevronRight className="shrink-0 text-gray-400" size={16} />
          </button>
          {sender.domain && !isPublicEmailDomain(sender.domain) && (
            <button
              type="button"
              disabled={busy || !filing}
              onClick={() => chooseAction("domain")}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
            >
              <span className="min-w-0">
                <span className="font-semibold">Everyone at</span>{" "}
                <span className="text-gray-600">{sender.domain}</span>
              </span>
              <FiChevronRight className="shrink-0 text-gray-400" size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 border-b border-gray-100 px-1 py-1">
            <button
              type="button"
              onClick={goToActions}
              className="rounded p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            >
              <FiChevronLeft size={16} />
            </button>
            <p className="min-w-0 truncate text-sm font-semibold text-gray-900">
              {title}
            </p>
          </div>
          {slots.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">
              Create a mailslot first.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {slots.map((mailslot) => {
                const checked = selectedIds.includes(mailslot.id);
                const currentlyIn = currentIds.includes(mailslot.id);

                return (
                  <button
                    key={mailslot.id}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleSlot(mailslot.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {checked && <FiCheck size={12} />}
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: mailslot.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-gray-800">
                      {mailslot.title}
                    </span>
                    {currentlyIn && (
                      <span className="shrink-0 text-xs text-gray-400">
                        In slot
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || slots.length === 0}
              onClick={() => void confirm()}
              className="rounded-md bg-gray-900 px-2 py-1 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
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
