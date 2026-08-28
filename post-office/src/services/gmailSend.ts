import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/gmailSession";
import { replaceEmails } from "../db/emails";
import { GMAIL_MAX_ATTACHMENT_BYTES } from "../helpers/gmailLimits";
import { mimeFromFilename } from "../helpers/mimeFromFilename";
import { parseGmailMessage } from "./gmailPayload";
import { splitQuotedBody } from "../helpers/splitQuotedBody";
import { formatSignatureHtml } from "../helpers/signatureHtml";
import type { ComposeAttachment } from "../types/compose";

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyToMessageId?: string;
  attachments?: ComposeAttachment[];
  signatureText?: string;
  signatureHtml?: string;
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

function toBase64Url(value: string | Buffer) {
  const bytes = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return bytes
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function filenameParam(name: string) {
  if (/^[\x20-\x7e]*$/.test(name) && !name.includes('"')) {
    return `filename="${name.replaceAll("\\", "\\\\")}"`;
  }

  return `filename*=UTF-8''${encodeURIComponent(name)}`;
}

function loadAttachments(items: ComposeAttachment[]) {
  const loaded: { filename: string; mimeType: string; data: Buffer }[] = [];
  let total = 0;

  for (const item of items) {
    const filePath = item.path;

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Could not read attachment “${item.filename}”.`);
    }

    const data = fs.readFileSync(filePath);
    total += data.length;

    if (total > GMAIL_MAX_ATTACHMENT_BYTES) {
      throw new Error(
        "Attachments are over Gmail’s 25 MB limit. Remove a file and try again."
      );
    }

    loaded.push({
      filename: item.filename || path.basename(filePath),
      mimeType: item.mimeType || mimeFromFilename(item.filename || filePath),
      data,
    });
  }

  return loaded;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textToHtml(value: string) {
  return escapeHtml(value).replaceAll("\r\n", "\n").replaceAll("\n", "<br>\r\n");
}

function withSignatureParts(input: SendEmailInput) {
  const signatureText = input.signatureText?.trim() ?? "";
  const signatureHtml = input.signatureHtml?.trim() ?? "";
  const { before, after } = splitQuotedBody(input.body);
  const plainParts = [before.trimEnd(), signatureText, after.trimStart()].filter(
    Boolean
  );
  const plain = plainParts.join("\n\n");

  if (!signatureHtml && !signatureText) {
    return { plain, html: "" };
  }

  const htmlSignature = signatureHtml
    ? formatSignatureHtml(signatureHtml)
    : `<div class="gmail_signature" data-smartmail="gmail_signature" style="color:#777777">${textToHtml(signatureText)}</div>`;
  const html = [
    `<div dir="ltr">${textToHtml(before.trimEnd())}</div><div><br></div>`,
    htmlSignature,
    after.trim() ? `<div dir="ltr">${textToHtml(after.trim())}</div>` : "",
  ]
    .filter(Boolean)
    .join("\r\n");

  return { plain, html };
}

function mimeHeadersAndBody(headers: string[], body: string) {
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function mimeMultipart(subtype: "alternative" | "mixed", parts: string[]) {
  const boundary = `=_po_${subtype}_${randomBytes(12).toString("hex")}`;
  const inner = parts.map((part) => `--${boundary}\r\n${part}`).join("\r\n");
  return mimeHeadersAndBody(
    [`Content-Type: multipart/${subtype}; boundary="${boundary}"`],
    `${inner}\r\n--${boundary}--`
  );
}

function buildRawMessage(
  input: SendEmailInput,
  reply?: { inReplyTo: string; references: string }
) {
  const attachments = loadAttachments(input.attachments ?? []);
  const { plain, html } = withSignatureParts(input);
  const headers = [
    `To: ${input.to.trim()}`,
    input.cc?.trim() ? `Cc: ${input.cc.trim()}` : null,
    input.bcc?.trim() ? `Bcc: ${input.bcc.trim()}` : null,
    `Subject: ${encodeHeader(input.subject.trim() || "(no subject)")}`,
    reply?.inReplyTo ? `In-Reply-To: ${reply.inReplyTo}` : null,
    reply?.references ? `References: ${reply.references}` : null,
    "MIME-Version: 1.0",
  ].filter((line): line is string => Boolean(line));

  const textPart = mimeHeadersAndBody(
    ["Content-Type: text/plain; charset=UTF-8"],
    plain
  );
  const bodyEntity = html
    ? mimeMultipart("alternative", [
        textPart,
        mimeHeadersAndBody(["Content-Type: text/html; charset=UTF-8"], html),
      ])
    : textPart;

  if (attachments.length === 0) {
    return Buffer.from(`${headers.join("\r\n")}\r\n${bodyEntity}\r\n`, "utf8");
  }

  const attachmentParts = attachments.map((attachment) =>
    mimeHeadersAndBody(
      [
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename.replaceAll('"', "")}"`,
        `Content-Disposition: attachment; ${filenameParam(attachment.filename)}`,
        "Content-Transfer-Encoding: base64",
      ],
      wrapBase64(attachment.data.toString("base64"))
    )
  );

  const mixed = mimeMultipart("mixed", [bodyEntity, ...attachmentParts]);
  return Buffer.from(`${headers.join("\r\n")}\r\n${mixed}\r\n`, "utf8");
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
