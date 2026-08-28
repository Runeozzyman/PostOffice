import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/gmailSession";

let cachedAddress: string | null | undefined;

export function clearGmailProfileCache() {
  cachedAddress = undefined;
}

export async function getGmailAddress(): Promise<string | null> {
  if (cachedAddress !== undefined) {
    return cachedAddress;
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    cachedAddress = null;
    return null;
  }

  const gmail = google.gmail({ version: "v1", auth });
  const profile = await gmail.users.getProfile({ userId: "me" });
  cachedAddress = profile.data.emailAddress ?? null;
  return cachedAddress;
}
