import ComposeButton from "./ComposeButton";
import RefreshButton from "./RefreshButton";
import EmailListPanel from "./EmailListPanel";
import { useMailboxSearchSlot } from "../hooks/useMailboxChrome";
import type { MailboxView } from "../../types/email";

export default function MailboxListPage({
  title,
  mailbox,
  showMailslotColor,
  keyboardActive = false,
  searchPlaceholder,
  emptyMessage,
}: {
  title: string;
  mailbox: MailboxView;
  showMailslotColor: boolean;
  keyboardActive?: boolean;
  searchPlaceholder: string;
  emptyMessage: string;
}) {
  const { setSearchSlot, searchPortalEl } = useMailboxSearchSlot();

  return (
    <div className="skin-page flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-4">
        <h1 className="max-w-[7.5rem] shrink-0 truncate text-lg font-semibold text-ink">
          {title}
        </h1>
        <div ref={setSearchSlot} className="min-w-0 flex-1" />
        <RefreshButton />
        <ComposeButton />
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailbox={mailbox}
          showMailslotColor={showMailslotColor}
          keyboardActive={keyboardActive}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          searchPortalEl={searchPortalEl}
          hideSearchRow
        />
      </div>
    </div>
  );
}
