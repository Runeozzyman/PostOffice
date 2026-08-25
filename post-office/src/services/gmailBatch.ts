import type { OAuth2Client } from "google-auth-library";
import type { gmail_v1 } from "googleapis";

const BATCH_ENDPOINT = "https://www.googleapis.com/batch/gmail/v1";

function extractBoundary(contentType: string | undefined): string | null {
  if (!contentType) {
    return null;
  }

  const match = contentType.match(/boundary="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

function parseBatchResponse(raw: string, boundary: string): unknown[] {
  const delimiter = `--${boundary}`;
  const parts = raw.split(delimiter).filter((part) => {
    const trimmed = part.trim();
    return trimmed.length > 0 && trimmed !== "--";
  });

  return parts.map((part) => {
    const jsonStart = part.indexOf("{");
    const jsonEnd = part.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error("Gmail batch response part was not JSON.");
    }

    return JSON.parse(part.slice(jsonStart, jsonEnd + 1));
  });
}

function isGmailMessage(value: unknown): value is gmail_v1.Schema$Message {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    !("error" in value)
  );
}

export async function batchGetMessages(
  auth: OAuth2Client,
  ids: string[]
): Promise<gmail_v1.Schema$Message[]> {
  if (ids.length === 0) {
    return [];
  }

  const boundary = `batch_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const body =
    ids
      .map((id, index) => {
        const path = `/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`;

        return [
          `--${boundary}`,
          "Content-Type: application/http",
          `Content-ID: <item${index}>`,
          "",
          `GET ${path}`,
          "",
        ].join("\r\n");
      })
      .join("\r\n") + `\r\n--${boundary}--\r\n`;

  const response = await auth.request({
    url: BATCH_ENDPOINT,
    method: "POST",
    headers: {
      "Content-Type": `multipart/mixed; boundary="${boundary}"`,
    },
    data: body,
    responseType: "text",
  });

  const headerMap = response.headers as unknown as {
    get?: (name: string) => string | undefined;
    [key: string]: unknown;
  };
  const contentType =
    headerMap.get?.("content-type") ??
    headerMap["content-type"] ??
    headerMap["Content-Type"];
  const responseBoundary =
    extractBoundary(
      typeof contentType === "string" ? contentType : String(contentType ?? "")
    ) ?? boundary;

  const parsed = parseBatchResponse(String(response.data), responseBoundary);
  const messages = parsed.filter(isGmailMessage);

  if (messages.length === 0) {
    throw new Error("Gmail batch request returned no messages.");
  }

  return messages;
}
