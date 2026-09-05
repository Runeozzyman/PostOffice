import ComposeButton from "../components/ComposeButton";
import RefreshButton from "../components/RefreshButton";
import EmailListPanel from "../components/EmailListPanel";

export default function Sent({
  keyboardActive = false,
}: {
  keyboardActive?: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-ink">Sent</h1>
        <RefreshButton />
        <ComposeButton />
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailbox="sent"
          showMailslotColor={false}
          keyboardActive={keyboardActive}
          searchPlaceholder="Search sent mail…"
          emptyMessage="No sent messages yet."
        />
      </div>
    </div>
  );
}
