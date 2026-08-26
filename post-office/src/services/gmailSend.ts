import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/google";
import { replaceEmails } from "../db/emails";
import { parseGmailMessage } from "./gmailPayload";

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyToMessageId?: string;
}

function asError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

function getHeader(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string
) {
  return (
    headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7e]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function buildRawMessage(
  input: SendEmailInput,
  reply?: { inReplyTo: string; references: string }
) {
  const headers = [
    `To: ${input.to.trim()}`,
    input.cc?.trim() ? `Cc: ${input.cc.trim()}` : null,
    input.bcc?.trim() ? `Bcc: ${input.bcc.trim()}` : null,
    `Subject: ${encodeHeader(input.subject.trim() || "(no subject)")}`,
    reply?.inReplyTo ? `In-Reply-To: ${reply.inReplyTo}` : null,
    reply?.references ? `References: ${reply.references}` : null,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ].filter((line): line is string => Boolean(line));

  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

export async function sendGmailMessage(input: SendEmailInput) {
  const to = input.to.trim();

  if (!to) {
    throw new Error("Add at least one recipient.");
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    throw new Error("User is not authenticated.");
  }

  const gmail = google.gmail({ version: "v1", auth });

  let replyHeaders: { inReplyTo: string; references: string } | undefined;
  let threadId = input.threadId?.trim() || undefined;

  if (input.inReplyToMessageId?.trim()) {
    try {
      const original = await gmail.users.messages.get({
        userId: "me",
        id: input.inReplyToMessageId.trim(),
        format: "metadata",
        metadataHeaders: ["Message-ID", "References"],
      });
      const headers = original.data.payload?.headers ?? [];
      const messageId = getHeader(headers, "Message-ID");
      const references = [getHeader(headers, "References"), messageId]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (messageId) {
        replyHeaders = { inReplyTo: messageId, references };
      }

      threadId = original.data.threadId || threadId;
    } catch {
      // Send anyway; Gmail can still thread by threadId when present.
    }
  }

  try {
    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: toBase64Url(buildRawMessage(input, replyHeaders)),
        ...(threadId ? { threadId } : {}),
      },
    });

    const id = sent.data.id;

    if (!id) {
      return;
    }

    const full = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    replaceEmails([parseGmailMessage(full.data)]);
  } catch (error) {
    const message = asError(error).message;

    if (message.includes("insufficient") || message.includes("403")) {
      throw new Error(
        "Google blocked sending mail. Sign out, sign in, and accept the prompt to send email."
      );
    }

    throw asError(error);
  }
}
