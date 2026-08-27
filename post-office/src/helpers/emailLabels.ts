import type { Email, MailboxView } from "../types/email";

export function withStarred(labels: string[], starred: boolean) {
  const next = labels.filter((label) => label !== "STARRED");
  return starred ? [...next, "STARRED"] : next;
}

export function withTrashed(labels: string[]) {
  return [
    ...labels.filter((label) => label !== "INBOX" && label !== "TRASH"),
    "TRASH",
  ];
}

export function withRestored(labels: string[]) {
  const next = labels.filter((label) => label !== "TRASH");
  return next.includes("INBOX") ? next : [...next, "INBOX"];
}

export function emailMatchesMailbox(email: Email, mailbox: MailboxView) {
  const trashed = email.labels.includes("TRASH");

  if (mailbox === "trash") {
    return trashed;
  }

  if (trashed) {
    return false;
  }

  if (mailbox === "starred") {
    return email.labels.includes("STARRED");
  }

  if (mailbox === "sent") {
    return email.labels.includes("SENT");
  }

  return email.labels.includes("INBOX");
}

export function applyEmailToList(
  emails: Email[],
  email: Email,
  options: {
    mailbox: MailboxView;
    mailslotId?: string;
    page: number;
    query: string;
    pageSize: number;
  }
) {
  const belongs = options.mailslotId
    ? !email.labels.includes("TRASH")
    : emailMatchesMailbox(email, options.mailbox);
  const index = emails.findIndex((item) => item.id === email.id);

  if (options.mailslotId && index < 0) {
    return { emails, totalDelta: 0 };
  }

  if (index >= 0) {
    if (!belongs) {
      return {
        emails: emails.filter((item) => item.id !== email.id),
        totalDelta: -1,
      };
    }

    const next = [...emails];
    next[index] = {
      ...emails[index],
      labels: email.labels,
    };
    return { emails: next, totalDelta: 0 };
  }

  if (!belongs || options.page !== 1 || options.query) {
    return { emails, totalDelta: 0 };
  }

  const next = [...emails, email].sort(
    (left, right) => right.internalDate - left.internalDate
  );

  if (next.length > options.pageSize) {
    next.length = options.pageSize;
  }

  return { emails: next, totalDelta: 1 };
}
