import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/google";

function asError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export async function setGmailStarred(id: string, starred: boolean) {
  const auth = await getAuthenticatedClient();

  if (!auth) {
    throw new Error("User is not authenticated.");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: starred
        ? { addLabelIds: ["STARRED"] }
        : { removeLabelIds: ["STARRED"] },
    });
  } catch (error) {
    const message = asError(error).message;

    if (
      message.includes("insufficient") ||
      message.includes("insufficientPermissions") ||
      message.includes("403")
    ) {
      throw new Error(
        "Google blocked starring this message. Sign out, sign in, and accept the prompt to view and edit mail."
      );
    }

    throw asError(error);
  }
}
