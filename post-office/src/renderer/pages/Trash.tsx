import MailboxListPage from "../components/MailboxListPage";

export default function Trash({
  keyboardActive = false,
}: {
  keyboardActive?: boolean;
}) {
  return (
    <MailboxListPage
      title="Trash"
      mailbox="trash"
      showMailslotColor={false}
      keyboardActive={keyboardActive}
      searchPlaceholder="Search trash…"
      emptyMessage="Trash is empty."
    />
  );
}
