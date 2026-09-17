import type { ComposeDraft } from "../types/compose";
import type { EmailDetail, MailboxView } from "../types/email";
import { escapeHtml } from "./composeHtml";
import { sanitizeEmailHtml } from "./emailHtml";
import { joinAddresses, parseAddressList, parseFrom } from "./parseFrom";

function withPrefix(subject: string, prefix: "Re" | "Fwd") {
  const trimmed = subject.trim();
  const pattern = prefix === "Re" ? /^(re:\s*)+/i : /^((fwd|fw):\s*)+/i;

  if (pattern.test(trimmed)) {
    return trimmed || `${prefix}:`;
  }

  return `${prefix}: ${trimmed || "(no subject)"}`;
}

function originalHtml(email: EmailDetail) {
  if (email.bodyHtml.trim()) {
    return sanitizeEmailHtml(email.bodyHtml);
  }

  const text =
    email.bodyText.trim() || email.snippet.trim() || "No content";
  return escapeHtml(text).replaceAll("\n", "<br>");
}

function quoteOriginal(email: EmailDetail) {
  return `<div><br></div><div class="gmail_quote"><div dir="ltr" class="gmail_attr">On ${escapeHtml(email.date)}, ${escapeHtml(email.from)} wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">${originalHtml(email)}</blockquote></div>`;
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
  const body = originalHtml(email);

  return {
    to: "",
    subject: withPrefix(email.subject, "Fwd"),
    body: `<div><br></div><div>---------- Forwarded message ----------<br>From: ${escapeHtml(email.from)}<br>Date: ${escapeHtml(email.date)}<br>Subject: ${escapeHtml(email.subject || "(no subject)")}<br>To: ${escapeHtml(email.to || "—")}<br></div><div><br></div>${body}`,
  };
}
