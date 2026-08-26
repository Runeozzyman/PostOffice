import EmailListPanel from "../components/EmailListPanel";

export default function Starred() {
  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4">
        <h1 className="text-lg font-semibold text-gray-900">Starred</h1>
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          mailbox="starred"
          showMailslotColor
          searchPlaceholder="Search starred…"
          emptyMessage="No starred messages yet."
        />
      </div>
    </div>
  );
}
