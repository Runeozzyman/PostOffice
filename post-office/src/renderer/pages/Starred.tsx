import EmailListPanel from "../components/EmailListPanel";

export default function Starred() {
  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="shrink-0 border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Starred</h1>
        <p className="text-sm text-gray-500">
          Messages you’ve starred in this account.
        </p>
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
