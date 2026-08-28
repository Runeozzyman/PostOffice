import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { getAuthenticatedClient } from "../auth/gmailSession";
import {
  existingEmailIds,
  replaceEmails,
  type UpsertEmailInput,
} from "../db/emails";
import type { Email } from "../types/email";
import { batchGetMessages } from "./gmailBatch";
import { parseGmailMessage } from "./gmailPayload";

const LIST_PAGE_SIZE = 500;
const WRITE_BATCH_SIZE = 20;

export interface SyncProgress {
  storedThisRun: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}

function toListEmail(email: UpsertEmailInput): Email {
  return {
    id: email.id,
    threadId: email.threadId,
    from: email.from,
    to: email.to,
    subject: email.subject,
    date: email.date,
    snippet: email.snippet,
    internalDate: email.internalDate,
    labels: email.labels,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getMessagesInOrder(auth: OAuth2Client, ids: string[]) {
  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  try {
    const fetched = await batchGetMessages(auth, ids);
    const byId = new Map(
      fetched
        .filter((message) => message.id)
        .map((message) => [message.id as string, message])
    );

    return ids
      .map((id) => byId.get(id))
      .filter((message): message is NonNullable<typeof message> =>
        Boolean(message)
      );
  } catch (error) {
    console.warn(
      "Gmail batch fetch failed, falling back to individual gets.",
      error
    );

    const messages = [];

    for (const id of ids) {
      const response = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      if (response.data.id) {
        messages.push(response.data);
      }
    }

    return messages;
  }
}

async function storeMessages(
  auth: OAuth2Client,
  ids: string[],
  onStored?: (email: Email) => void,
  onProgress?: (progress: SyncProgress) => void,
  storedThisRun = { count: 0 }
) {
  for (const batchIds of chunk(ids, WRITE_BATCH_SIZE)) {
    const messages = await getMessagesInOrder(auth, batchIds);

    for (const message of messages) {
      const parsed = parseGmailMessage(message);

      if (!parsed.id) {
        continue;
      }

      replaceEmails([parsed]);
      storedThisRun.count += 1;
      onStored?.(toListEmail(parsed));
      onProgress?.({ storedThisRun: storedThisRun.count });
    }

    await sleep(0);
  }
}

export async function syncInboxEmails(
  onStored?: (email: Email) => void,
  onProgress?: (progress: SyncProgress) => void
): Promise<number> {
  const auth = await getAuthenticatedClient();

  if (!auth) {
    throw new Error("User is not authenticated.");
  }

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const storedThisRun = { count: 0 };
  let pageToken: string | undefined;
  let listed = 0;

  console.log("Starting mailbox sync from newest messages.");

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: LIST_PAGE_SIZE,
      pageToken,
    });

    const pageIds = (response.data.messages ?? [])
      .map((message) => message.id)
      .filter((id): id is string => Boolean(id));

    listed += pageIds.length;

    const alreadyStored = existingEmailIds(pageIds);
    const missingIds = pageIds.filter((id) => !alreadyStored.has(id));

    if (missingIds.length > 0) {
      await storeMessages(
        auth,
        missingIds,
        onStored,
        onProgress,
        storedThisRun
      );
    }

    pageToken = response.data.nextPageToken ?? undefined;
    console.log(
      `Listed ${listed} message ids, stored ${storedThisRun.count} new messages.`
    );

    // Gmail lists newest-first. A page with nothing new means we have
    // caught up to mail already in the database; older pages can be skipped.
    if (pageIds.length === 0 || missingIds.length === 0) {
      break;
    }
  } while (pageToken);

  console.log(`Mailbox sync finished. Stored ${storedThisRun.count} new messages.`);
  return storedThisRun.count;
}
