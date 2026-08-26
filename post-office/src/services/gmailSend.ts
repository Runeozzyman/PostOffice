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
}

function asError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
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

function buildRawMessage(input: SendEmailInput) {
  const headers = [
    `To: ${input.to.trim()}`,
    input.cc?.trim() ? `Cc: ${input.cc.trim()}` : null,
    input.bcc?.trim() ? `Bcc: ${input.bcc.trim()}` : null,
    `Subject: ${encodeHeader(input.subject.trim() || "(no subject)")}`,
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

  try {
    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: toBase64Url(buildRawMessage(input)),
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
