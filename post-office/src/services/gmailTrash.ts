import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/google";
import { setEmailLabels } from "../db/emails";

function asError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

function rethrowTrashError(error: unknown): never {
  const message = asError(error).message;

  if (
    message.includes("insufficient") ||
    message.includes("insufficientPermissions") ||
    message.includes("403")
  ) {
    throw new Error(
      "Google blocked moving this message. Sign out, sign in, and accept the prompt to view and edit mail. If that prompt does not appear, open myaccount.google.com/permissions, remove PostOffice, then sign in again."
    );
  }

  throw asError(error);
}

async function gmailClient() {
  const auth = await getAuthenticatedClient();

  if (!auth) {
    throw new Error("User is not authenticated.");
  }

  return google.gmail({ version: "v1", auth });
}

function withoutTrash(labels: string[]) {
  return labels.filter((label) => label !== "TRASH");
}

function withInbox(labels: string[]) {
  const next = withoutTrash(labels);
  return next.includes("INBOX") ? next : [...next, "INBOX"];
}

async function readLabels(
  gmail: Awaited<ReturnType<typeof gmailClient>>,
  id: string,
  fallback: string[]
) {
  try {
    const message = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "minimal",
    });
    const labels = message.data.labelIds ?? [];

    if (labels.length > 0) {
      return labels;
    }
  } catch {
    // Use the local fallback if Gmail omits labels on the mutation response.
  }

  return fallback;
}

export async function trashGmailMessage(id: string) {
  try {
    const gmail = await gmailClient();
    const response = await gmail.users.messages.trash({
      userId: "me",
      id,
    });
    const labels = await readLabels(
      gmail,
      id,
      response.data.labelIds?.length ? response.data.labelIds : ["TRASH"]
    );
    const next = labels.includes("TRASH") ? labels : [...labels, "TRASH"];
    setEmailLabels(id, next);
    return next;
  } catch (error) {
    rethrowTrashError(error);
  }
}

export async function untrashGmailMessage(id: string) {
  try {
    const gmail = await gmailClient();

    try {
      await gmail.users.messages.untrash({
        userId: "me",
        id,
      });
    } catch {
      // Already out of trash; still move it to Inbox below.
    }

    // Untrash only drops TRASH. Gmail does not always restore INBOX, so the
    // message would sit in All Mail and never match the inbox list query.
    const modified = await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: ["INBOX"],
        removeLabelIds: ["TRASH"],
      },
    });

    const labels = withInbox(
      await readLabels(
        gmail,
        id,
        modified.data.labelIds?.length ? modified.data.labelIds : ["INBOX"]
      )
    );
    setEmailLabels(id, labels);
    return labels;
  } catch (error) {
    rethrowTrashError(error);
  }
}
