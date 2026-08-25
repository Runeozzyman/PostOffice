import type { Email } from "../../types/email";
import { formatListDate } from "../../helpers/formatListDate";

interface EmailRowProps {
  email: Email;
  onOpen: (email: Email) => void;
  animationIndex?: number;
}

function displayName(from: string) {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match?.[1]?.trim() || from;
}


export default function EmailRow({
  email,
  onOpen,
  animationIndex = 0,
}: EmailRowProps) {
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
      }}
      className="email-row-pop flex cursor-pointer items-baseline gap-4 px-4 py-3 border-b border-gray-200 hover:bg-gray-50"
    >
      <span className="w-40 shrink-0 truncate text-sm font-medium text-gray-900">
        {displayName(email.from)}
      </span>
      <div className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium text-gray-900">{email.subject || "(no subject)"}</span>
        <span className="text-gray-500"> — {email.snippet}</span>
      </div>
      <time className="shrink-0 text-xs text-gray-500">{formatListDate(email.date)}</time>
    </article>
  );
}