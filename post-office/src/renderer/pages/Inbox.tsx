import { useEffect, useState } from "react";
import type { Email } from "../../types/email";
import EmailRow from "../components/EmailRow";

export default function Inbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI
      .fetchEmails()
      .then(setEmails)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (emails.length === 0) return <p className="p-4 text-gray-500">Loading…</p>;

  return (
    <div className="h-full overflow-y-auto bg-white">
      {emails.map((email) => (
        <EmailRow key={email.id} email={email} />
      ))}
    </div>
  );
}