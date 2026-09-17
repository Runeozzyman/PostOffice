import MailboxListPage from "../components/MailboxListPage";

export default function Starred({
  keyboardActive = false,
}: {
  keyboardActive?: boolean;
}) {
  return (
    <MailboxListPage
      title="Starred"
      mailbox="starred"
      showMailslotColor
      keyboardActive={keyboardActive}
      searchPlaceholder="Search starred…"
      emptyMessage="No starred messages yet."
    />
  );
}
