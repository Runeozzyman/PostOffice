import ComposeButton from "../components/ComposeButton";
import RefreshButton from "../components/RefreshButton";
import EmailListPanel from "../components/EmailListPanel";

export default function Trash() {
  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-ink">Trash</h1>
        <RefreshButton />
        <ComposeButton />
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailbox="trash"
          showMailslotColor={false}
          searchPlaceholder="Search trash…"
          emptyMessage="Trash is empty."
        />
      </div>
    </div>
  );
}
