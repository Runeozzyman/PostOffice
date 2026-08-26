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
      className="mailslot-pop relative flex aspect-square min-w-0 flex-col justify-between rounded-2xl p-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onOpen(mailslot)}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`Open ${mailslot.title}`}
      />
      <div className="relative z-10 flex items-start justify-between">
        <Icon size={28} className="pointer-events-none shrink-0" />
        <button
          type="button"
          aria-label={`Edit ${mailslot.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(mailslot);
          }}
          className="rounded-lg bg-black/20 p-1.5 text-white hover:bg-black/35"
        >
          <FiEdit2 size={14} />
        </button>
      </div>
      <span className="pointer-events-none relative z-10 line-clamp-2 text-base font-semibold leading-tight">
        {mailslot.title}
      </span>
    </div>
  );
}
