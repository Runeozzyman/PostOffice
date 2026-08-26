import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";
import type { Email, MailboxView } from "../../types/email";
import type { Mailslot } from "../../types/mailslot";
import { formatListDate } from "../../helpers/formatListDate";
import { parseFrom } from "../../helpers/parseFrom";
import EmailMailslotMenu from "./EmailMailslotMenu";

interface EmailRowProps {
  email: Email;
  mailslots: Mailslot[];
  mailbox?: MailboxView;
  showMailslotColor: boolean;
  onOpen: (email: Email) => void;
  onFiled: () => void;
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
  onOpen,
  onFiled,
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

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(email)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(email);
        }
      }}
      style={{
        animationDelay: `${Math.min(animationIndex, 16) * 28}ms`,
        borderLeft: color ? `4px solid ${color}` : undefined,
        backgroundColor: color ? `${color}14` : undefined,
      }}
      className="email-row-pop flex cursor-pointer items-baseline gap-4 border-b border-line px-4 py-3 hover:bg-hover"
    >
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
      <div className="relative shrink-0">
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
