import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/gmailSession";
import { formatSignatureHtml, formatSignatureText } from "../helpers/signatureHtml";
import type { GmailSignature } from "../types/compose";

let cache: GmailSignature[] | null = null;

export function clearGmailSignatureCache() {
  cache = null;
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export async function listGmailSignatures(): Promise<GmailSignature[]> {
  if (cache) {
    return cache;
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    throw new Error("User is not authenticated.");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth });
    const response = await gmail.users.settings.sendAs.list({
      userId: "me",
    });

    const signatures = (response.data.sendAs ?? [])
      .map((alias) => {
        const htmlRaw = alias.signature?.trim() ?? "";
        const html = htmlRaw ? formatSignatureHtml(htmlRaw) : "";
        const text = htmlRaw ? formatSignatureText(htmlRaw) : "";

        if (!html && !text) {
          return null;
        }

        const email = alias.sendAsEmail ?? "";
        return {
          id: email || alias.displayName || "signature",
          email,
          name: alias.displayName?.trim() || email,
          html,
          text,
          isDefault: Boolean(alias.isDefault),
          isPrimary: Boolean(alias.isPrimary),
        } satisfies GmailSignature;
      })
      .filter((item): item is GmailSignature => Boolean(item));

    signatures.sort((left, right) => {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

    cache = signatures;
    return signatures;
  } catch (error) {
    const message = asError(error).message;

    if (
      message.includes("insufficient") ||
      message.includes("insufficientPermissions") ||
      message.includes("403")
    ) {
      throw new Error(
        "Google blocked reading signatures. Sign out, sign in, and accept access to Gmail settings."
      );
    }

    throw asError(error);
  }
}
