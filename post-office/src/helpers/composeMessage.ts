import type { ComposeDraft } from "../types/compose";
import type { EmailDetail, MailboxView } from "../types/email";
import { joinAddresses, parseAddressList, parseFrom } from "./parseFrom";

function withPrefix(subject: string, prefix: "Re" | "Fwd") {
  const trimmed = subject.trim();
  const pattern = prefix === "Re" ? /^(re:\s*)+/i : /^((fwd|fw):\s*)+/i;

  if (pattern.test(trimmed)) {
    return trimmed || `${prefix}:`;
  }

  return `${prefix}: ${trimmed || "(no subject)"}`;
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function originalBody(email: EmailDetail) {
  return (
    email.bodyText.trim() ||
    htmlToText(email.bodyHtml) ||
    email.snippet.trim()
  );
}

function quoteOriginal(email: EmailDetail) {
  const quoted = originalBody(email)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return `\n\nOn ${email.date}, ${email.from} wrote:\n\n${quoted}`;
}

function isOutgoing(email: EmailDetail, mailbox?: MailboxView) {
  if (mailbox === "sent") {
    return true;
  }

  return email.labels.includes("SENT") && !email.labels.includes("INBOX");
}

export function buildReplyDraft(
  email: EmailDetail,
  options: {
    replyAll?: boolean;
    accountEmail?: string | null;
    mailbox?: MailboxView;
  }
): ComposeDraft {
  const from = parseFrom(email.from);
  const recipients = parseAddressList(email.to);
  const account = options.accountEmail?.toLowerCase() ?? "";
  const outgoing = isOutgoing(email, options.mailbox);

  const primary = outgoing
    ? recipients
    : [{ email: from.email, displayName: from.displayName }];
  const primaryEmails = new Set(primary.map((address) => address.email));

  const extras = options.replyAll
    ? (outgoing ? [] : recipients).filter(
        (address) =>
          address.email !== account && !primaryEmails.has(address.email)
      )
    : [];

  const to = joinAddresses(
    primary.filter((address) => address.email !== account).length > 0
      ? primary.filter((address) => address.email !== account)
      : primary
  );

  return {
    to,
    cc: extras.length > 0 ? joinAddresses(extras) : undefined,
    subject: withPrefix(email.subject, "Re"),
    body: quoteOriginal(email),
    threadId: email.threadId,
    inReplyToMessageId: email.id,
  };
}

export function buildForwardDraft(email: EmailDetail): ComposeDraft {
  const body = originalBody(email);

  return {
    to: "",
    subject: withPrefix(email.subject, "Fwd"),
    body: `\n\n---------- Forwarded message ----------\nFrom: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject || "(no subject)"}\nTo: ${email.to || "—"}\n\n${body}`,
  };
}
