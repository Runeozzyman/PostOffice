import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type Ref } from "react";
import { FiMoreHorizontal, FiRotateCcw, FiStar, FiTrash2 } from "react-icons/fi";
import type { Email, MailboxView } from "../../types/email";
import type { Mailslot } from "../../types/mailslot";
import { formatListDate } from "../../helpers/formatListDate";
import { parseFrom } from "../../helpers/parseFrom";
import { EMAIL_DRAG_TYPE } from "../helpers/emailDrag";
import EmailMailslotMenu from "./EmailMailslotMenu";

interface EmailRowProps {
  email: Email;
  mailslots: Mailslot[];
  mailbox?: MailboxView;
  showMailslotColor: boolean;
  focused?: boolean;
  rowRef?: Ref<HTMLElement | null>;
  canDrag?: boolean;
  onOpen: (email: Email) => void;
  onFiled: () => void;
  onTrashAction: (email: Email) => void;
  onStar: (email: Email) => void;
  animationIndex?: number;
}

function displayAddress(value: string) {
  return parseFrom(value).displayName;
}

export default function EmailRow({
  email,
  mailslots,
  mailbox = "inbox",
  showMailslotColor,
  focused = false,
  rowRef,
  canDrag = false,
  onOpen,
  onFiled,
  onTrashAction,
  onStar,
  animationIndex = 0,
}: EmailRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuStep, setMenuStep] = useState<"actions" | "slots">("actions");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      return;
    }

    const updatePosition = () => {
      const button = buttonRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();

      if (!button) {
        return;
      }

      const menuHeight = menu?.height ?? 240;
      const menuWidth = menu?.width ?? 288;
      const gap = 4;
      const spaceBelow = window.innerHeight - button.bottom;
      const openUp = spaceBelow < menuHeight + gap;

      setMenuPosition({
        top: openUp
          ? Math.max(8, button.top - menuHeight - gap)
          : button.bottom + gap,
        left: Math.max(8, button.right - menuWidth),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen, mailslots.length, menuStep]);

  useEffect(() => {
    if (!menuOpen) {
      setMenuStep("actions");
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | Element;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target) ||
        (target instanceof Element && target.closest('[role="dialog"]'))
      ) {
        return;
      }

      setMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const color = showMailslotColor ? email.mailslotColor : null;
  const inTrash = mailbox === "trash";
  const starred = email.labels.includes("STARRED");

  const moveTrash = (event: MouseEvent) => {
    event.stopPropagation();
    onTrashAction(email);
  };

  return (
    <article
      ref={rowRef}
      role="button"
      tabIndex={0}
      draggable={canDrag}
      aria-selected={focused}
      onClick={() => onOpen(email)}
      onDragStart={(event) => {
        if (!canDrag) {
          event.preventDefault();
          return;
        }

        const target = event.target;
        if (
          target instanceof Element &&
          target.closest("button, a, input, textarea")
        ) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.setData(EMAIL_DRAG_TYPE, email.id);
        event.dataTransfer.setData("text/plain", email.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(email);
        }
      }}
      style={{
        animationDelay: `${Math.min(animationIndex, 16) * 28}ms`,
        borderLeft: color ? `4px solid ${color}` : undefined,
        backgroundColor: focused
          ? "var(--hover)"
          : color
            ? `${color}14`
            : undefined,
      }}
      className={`email-row-pop flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-hover ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${focused ? "bg-hover" : ""}`}
    >
      <button
        type="button"
        aria-label={starred ? "Unstar" : "Star"}
        aria-pressed={starred}
        onClick={(event) => {
          event.stopPropagation();
          onStar(email);
        }}
        className={`shrink-0 rounded-md p-1 ${
          starred
            ? "text-amber-400 hover:text-amber-300"
            : "text-ink-subtle hover:bg-hover hover:text-ink-secondary"
        }`}
      >
        <FiStar size={16} className={starred ? "fill-current" : ""} />
      </button>
      <span className="w-40 shrink-0 truncate text-sm font-medium text-ink">
        {mailbox === "sent"
          ? displayAddress(email.to) || email.to
          : displayAddress(email.from)}
      </span>
      <div className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium text-ink">
          {email.subject || "(no subject)"}
        </span>
        <span className="text-ink-muted"> — {email.snippet}</span>
      </div>
      {showMailslotColor && email.mailslotTitle && (
        <span
          className="hidden shrink-0 truncate text-xs font-medium sm:inline"
          style={{ color: color ?? undefined }}
        >
          {email.mailslotTitle}
        </span>
      )}
      <time className="shrink-0 text-xs text-ink-muted">
        {formatListDate(email.date)}
      </time>
      <div className="relative flex shrink-0 items-center">
        <button
          type="button"
          disabled={busy}
          aria-label={inTrash ? "Restore from trash" : "Move to trash"}
          onClick={(event) => {
            moveTrash(event);
          }}
          className="rounded-md p-1 text-ink-subtle hover:bg-hover hover:text-ink-secondary disabled:opacity-50"
        >
          {inTrash ? <FiRotateCcw size={16} /> : <FiTrash2 size={16} />}
        </button>
        <button
          ref={buttonRef}
          type="button"
          aria-label="File to mailslot"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="rounded-md p-1 text-ink-subtle hover:bg-hover hover:text-ink-secondary"
        >
          <FiMoreHorizontal size={16} />
        </button>
        <EmailMailslotMenu
          emailId={email.id}
          fromHeader={email.from}
          mailslots={mailslots}
          open={menuOpen}
          busy={busy}
          position={menuPosition}
          menuRef={menuRef}
          onBusy={setBusy}
          onClose={() => setMenuOpen(false)}
          onFiled={onFiled}
          onStepChange={setMenuStep}
        />
      </div>
    </article>
  );
}
