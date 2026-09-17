import MailboxListPage from "../components/MailboxListPage";

export default function Sent({
  keyboardActive = false,
}: {
  keyboardActive?: boolean;
}) {
  return (
    <MailboxListPage
      title="Sent"
      mailbox="sent"
      showMailslotColor={false}
      keyboardActive={keyboardActive}
      searchPlaceholder="Search sent mail…"
      emptyMessage="No sent messages yet."
    />
  );
}
