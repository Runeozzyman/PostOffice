import { FiEdit2 } from "react-icons/fi";
import type { Mailslot } from "../../types/mailslot";
import { mailslotIcon } from "../helpers/mailslotOptions";

interface MailslotCardProps {
  mailslot: Mailslot;
  onOpen: (mailslot: Mailslot) => void;
  onEdit: (mailslot: Mailslot) => void;
  animationIndex?: number;
}

export default function MailslotCard({
  mailslot,
  onOpen,
  onEdit,
  animationIndex = 0,
}: MailslotCardProps) {
  const Icon = mailslotIcon(mailslot.icon);

  return (
    <div
      style={{
        backgroundColor: mailslot.color,
        animationDelay: `${Math.min(animationIndex, 12) * 40}ms`,
      }}
      className="mailslot-pop relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl p-3 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onOpen(mailslot)}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`Open ${mailslot.title}`}
      />
      <button
        type="button"
        aria-label={`Edit ${mailslot.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onEdit(mailslot);
        }}
        className="absolute right-3 top-3 z-10 rounded-lg bg-black/20 p-1.5 text-white hover:bg-black/35"
      >
        <FiEdit2 size={14} />
      </button>
      <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Icon size={36} className="shrink-0" />
        <span className="line-clamp-2 text-lg font-semibold leading-tight">
          {mailslot.title}
        </span>
      </div>
    </div>
  );
}
