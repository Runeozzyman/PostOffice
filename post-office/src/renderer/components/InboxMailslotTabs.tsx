import { useState } from "react";
import { MAX_MAILSLOTS, mailslotShortcutKey, type Mailslot } from "../../types/mailslot";
import { EMAIL_DRAG_TYPE } from "../helpers/emailDrag";
import { mailslotIcon } from "../helpers/mailslotOptions";

interface InboxMailslotTabsProps {
  mailslots: Mailslot[];
  activeId?: string | null;
  onOpen: (mailslot: Mailslot) => void;
  onFileEmail: (emailId: string, mailslotId: string) => void;
}

export default function InboxMailslotTabs({
  mailslots,
  activeId = null,
  onOpen,
  onFileEmail,
}: InboxMailslotTabsProps) {
  const [overId, setOverId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const visible = mailslots.slice(0, MAX_MAILSLOTS);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-line px-4 py-2">
      {visible.map((mailslot, index) => {
        const Icon = mailslotIcon(mailslot.icon);
        const shortcut = mailslotShortcutKey(index);
        const lit =
          overId === mailslot.id ||
          hoveredId === mailslot.id ||
          activeId === mailslot.id;

        return (
          <button
            key={mailslot.id}
            type="button"
            title={
              shortcut
                ? `${mailslot.title} (${shortcut})`
                : mailslot.title
            }
            onClick={() => onOpen(mailslot)}
            onMouseEnter={() => setHoveredId(mailslot.id)}
            onMouseLeave={() =>
              setHoveredId((current) =>
                current === mailslot.id ? null : current
              )
            }
            onDragEnter={(event) => {
              event.preventDefault();
              setOverId(mailslot.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setOverId(mailslot.id);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return;
              }
              setOverId((current) =>
                current === mailslot.id ? null : current
              );
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOverId(null);

              const emailId =
                event.dataTransfer.getData(EMAIL_DRAG_TYPE) ||
                event.dataTransfer.getData("text/plain");

              if (emailId) {
                onFileEmail(emailId, mailslot.id);
              }
            }}
            className="flex max-w-[12rem] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm font-medium text-ink transition-[background-color,border-color,box-shadow] duration-150"
            style={{
              borderColor: lit ? mailslot.color : "var(--line-strong)",
              backgroundColor: lit
                ? `${mailslot.color}24`
                : `${mailslot.color}14`,
              boxShadow: lit ? `0 0 0 1px ${mailslot.color}` : undefined,
            }}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-150"
              style={
                lit
                  ? {
                      backgroundColor: mailslot.color,
                      color: "#fff",
                      boxShadow: `0 0 10px ${mailslot.color}`,
                    }
                  : {
                      backgroundColor: "var(--muted)",
                      color: "var(--ink-muted)",
                    }
              }
            >
              <Icon size={11} />
            </span>
            <span className="min-w-0 truncate">{mailslot.title}</span>
            {shortcut && (
              <span className="shrink-0 text-[10px] font-semibold text-ink-subtle">
                {shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
