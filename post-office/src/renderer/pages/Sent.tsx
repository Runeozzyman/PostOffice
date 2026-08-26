import EmailListPanel from "../components/EmailListPanel";

export default function Sent() {
  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h1 className="text-lg font-semibold text-ink">Sent</h1>
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailbox="sent"
          showMailslotColor={false}
          searchPlaceholder="Search sent mail…"
          emptyMessage="No sent messages yet."
        />
      </div>
    </div>
  );
}
