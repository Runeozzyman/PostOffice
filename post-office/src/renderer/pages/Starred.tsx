import ComposeButton from "../components/ComposeButton";
import RefreshButton from "../components/RefreshButton";
import EmailListPanel from "../components/EmailListPanel";

export default function Starred({
  keyboardActive = false,
}: {
  keyboardActive?: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-ink">Starred</h1>
        <RefreshButton />
        <ComposeButton />
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailbox="starred"
          showMailslotColor
          keyboardActive={keyboardActive}
          searchPlaceholder="Search starred…"
          emptyMessage="No starred messages yet."
        />
      </div>
    </div>
  );
}
