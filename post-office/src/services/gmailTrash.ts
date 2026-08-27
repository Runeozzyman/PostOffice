import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/google";

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

export async function trashGmailMessage(id: string) {
  try {
    const gmail = await gmailClient();
    await gmail.users.messages.trash({
      userId: "me",
      id,
    });
  } catch (error) {
    rethrowTrashError(error);
  }
}

export async function untrashGmailMessage(id: string) {
  try {
    const gmail = await gmailClient();
    await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: ["INBOX"],
        removeLabelIds: ["TRASH"],
      },
    });
  } catch (error) {
    rethrowTrashError(error);
  }
}
