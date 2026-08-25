import type { gmail_v1 } from "googleapis";
import type { EmailAttachment } from "../types/email";
import type { UpsertEmailInput } from "../db/emails";

function getHeader(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string
): string {
  return (
    headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function decodeBase64Url(data: string): Buffer {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function walkParts(
  part: gmail_v1.Schema$MessagePart | undefined,
  collected: {
    text: string[];
    html: string[];
    attachments: (EmailAttachment & { data: Buffer | null })[];
  }
) {
  if (!part) {
    return;
  }

  const mimeType = part.mimeType ?? "";
  const filename = part.filename ?? "";
  const body = part.body;

  if (filename) {
    const id = body?.attachmentId ?? `inline-${collected.attachments.length}`;
    const data = body?.data ? decodeBase64Url(body.data) : null;

    collected.attachments.push({
      id,
      filename,
      mimeType: mimeType || "application/octet-stream",
      size: body?.size ?? data?.length ?? 0,
      data,
    });
  } else if (mimeType === "text/plain" && body?.data) {
    collected.text.push(decodeBase64Url(body.data).toString("utf8"));
  } else if (mimeType === "text/html" && body?.data) {
    collected.html.push(decodeBase64Url(body.data).toString("utf8"));
  }

  for (const child of part.parts ?? []) {
    walkParts(child, collected);
  }
}

export function parseGmailMessage(
  message: gmail_v1.Schema$Message
): UpsertEmailInput {
  const headers = message.payload?.headers ?? [];
  const collected = {
    text: [] as string[],
    html: [] as string[],
    attachments: [] as (EmailAttachment & { data: Buffer | null })[],
  };

  walkParts(message.payload, collected);

  const attachments = collected.attachments.map((attachment) => ({
    id: attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
  }));

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    snippet: message.snippet ?? "",
    bodyText: collected.text.join("\n"),
    bodyHtml: collected.html.join("\n"),
    attachments,
    internalDate: Number(message.internalDate ?? 0),
    labels: message.labelIds ?? [],
    attachmentData: collected.attachments.map((attachment) => ({
      id: attachment.id,
      data: attachment.data,
    })),
  };
}
