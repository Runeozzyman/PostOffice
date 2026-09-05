import { google } from "googleapis";
import { configureGmailSession, getAuthenticatedClient, rethrowIfGmailAuthFailed, setGmailRefreshToken } from "../auth/gmailSession";
import { initDatabase } from "../db/database";
import { setUserDataPath } from "../db/paths";
import {
  applyEmailMailslotMembership,
  backfillSenderFields,
  getEmail,
  getEmailLabels,
  getMailslotFiling,
  getStoredAttachment,
  listInboxPage,
  rebuildAddressContactsCache,
  searchAddressSuggestions,
  setEmailLabels,
} from "../db/emails";
import {
  applyMailslotRules,
  createMailslot,
  deleteMailslot,
  listMailslots,
  updateMailslot,
} from "../db/mailslots";
import { deleteDraft, getDraft, listDrafts, saveDraft } from "../db/drafts";
import { withRestored, withStarred, withTrashed } from "../helpers/emailLabels";
import {
  enqueueGmailLabelSync,
  nextLabelGeneration,
} from "../services/gmailBackground";
import { clearGmailProfileCache, getGmailAddress } from "../services/gmailProfile";
import { sendGmailMessage } from "../services/gmailSend";
import { setGmailStarred } from "../services/gmailStar";
import { syncInboxEmails, syncNewInboxEmails } from "../services/gmailSync";
import { trashGmailMessage, untrashGmailMessage } from "../services/gmailTrash";
import { listGmailSignatures, clearGmailSignatureCache } from "../services/gmailSignatures";
import type { ComposeDraft } from "../types/compose";
import type { Email } from "../types/email";
import type { MailFromWorker, MailMethod, MailRequest, MailToWorker } from "./mailProtocol";

interface ParentPort {
  on: (event: "message", listener: (event: { data: unknown }) => void) => void;
  postMessage: (message: unknown) => void;
}

function parentPort(): ParentPort {
  const port = (
    process as NodeJS.Process & {
      parentPort?: ParentPort;
    }
  ).parentPort;

  if (!port) {
    throw new Error("Mail worker must run as an Electron utility process.");
  }

  return port;
}

function send(message: MailFromWorker) {
  parentPort().postMessage(message);
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

let mailboxSyncInFlight = false;
let inboxPollTimer: ReturnType<typeof setInterval> | null = null;
const INBOX_POLL_MS = 20_000;

async function runInboxSync(mode: "full" | "poll") {
  if (mode === "poll" && mailboxSyncInFlight) {
    return 0;
  }

  while (mailboxSyncInFlight) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  mailboxSyncInFlight = true;
  try {
    const onStored = (email: Email) => {
      send({ kind: "event", event: "email-stored", payload: email });
    };

    const stored =
      mode === "full"
        ? await syncInboxEmails(onStored, (progress) => {
            send({
              kind: "event",
              event: "sync-progress",
              payload: progress,
            });
          })
        : await syncNewInboxEmails(onStored);

    if (stored > 0) {
      rebuildAddressContactsCache();
    }

    return stored;
  } finally {
    mailboxSyncInFlight = false;
  }
}

function startInboxPoll() {
  if (inboxPollTimer) {
    return;
  }

  inboxPollTimer = setInterval(() => {
    void runInboxSync("poll").catch((error: unknown) => {
      console.warn("Background inbox poll failed.", error);
    });
  }, INBOX_POLL_MS);
}

async function handle(method: MailMethod, payload: unknown): Promise<unknown> {
  switch (method) {
    case "listEmails":
      return listInboxPage(
        payload as {
          page: number;
          pageSize: number;
          query?: string;
          mailslotId?: string;
          mailbox?: "inbox" | "starred" | "sent" | "trash";
        }
      );
    case "syncEmails": {
      await runInboxSync("full");
      return;
    }
    case "listMailslots":
      return listMailslots();
    case "createMailslot": {
      const input = payload as {
        title: string;
        color: string;
        icon: Parameters<typeof createMailslot>[0]["icon"];
      };
      return createMailslot(input);
    }
    case "updateMailslot": {
      const input = payload as {
        id: string;
        title: string;
        color: string;
        icon: Parameters<typeof updateMailslot>[0]["icon"];
      };
      return updateMailslot(input);
    }
    case "deleteMailslot":
      deleteMailslot(payload as string);
      return true;
    case "getMailslotFiling":
      return getMailslotFiling(payload as string);
    case "applyEmailMailslots": {
      const input = payload as {
        emailId: string;
        selectedSlotId: string | null;
      };
      applyEmailMailslotMembership(input.emailId, input.selectedSlotId);
      return true;
    }
    case "applyMailslotRules": {
      applyMailslotRules(
        payload as {
          matchType: "email" | "domain";
          pattern: string;
          selectedSlotId: string | null;
        }
      );
      return true;
    }
    case "getEmail":
      return getEmail(payload as string);
    case "trashEmail": {
      const id = payload as string;
      const previous = getEmailLabels(id);

      if (!previous) {
        throw new Error("Email was not found in the local database.");
      }

      setEmailLabels(id, withTrashed(previous));
      const gen = nextLabelGeneration(id);
      enqueueGmailLabelSync(id, gen, previous, () => trashGmailMessage(id), (error) => {
        send({
          kind: "event",
          event: "email-action-failed",
          payload: { email: getEmail(id), message: error.message },
        });
      });
      return true;
    }
    case "untrashEmail": {
      const id = payload as string;
      const previous = getEmailLabels(id);

      if (!previous) {
        throw new Error("Email was not found in the local database.");
      }

      setEmailLabels(id, withRestored(previous));
      const gen = nextLabelGeneration(id);
      enqueueGmailLabelSync(
        id,
        gen,
        previous,
        () => untrashGmailMessage(id),
        (error) => {
          send({
            kind: "event",
            event: "email-action-failed",
            payload: { email: getEmail(id), message: error.message },
          });
        }
      );
      return true;
    }
    case "setEmailStarred": {
      const input = payload as { id: string; starred: boolean };
      const previous = getEmailLabels(input.id);

      if (!previous) {
        throw new Error("Email was not found in the local database.");
      }

      setEmailLabels(input.id, withStarred(previous, input.starred));
      const gen = nextLabelGeneration(input.id);
      enqueueGmailLabelSync(
        input.id,
        gen,
        previous,
        () => setGmailStarred(input.id, input.starred),
        (error) => {
          send({
            kind: "event",
            event: "email-action-failed",
            payload: { email: getEmail(input.id), message: error.message },
          });
        }
      );
      return true;
    }
    case "sendEmail": {
      await sendGmailMessage(
        payload as Parameters<typeof sendGmailMessage>[0]
      );
      rebuildAddressContactsCache();
      return true;
    }
    case "listDrafts":
      return listDrafts();
    case "getDraft":
      return typeof payload === "string" ? getDraft(payload) : null;
    case "saveDraft": {
      const input = payload as ComposeDraft;
      return saveDraft({
        id: input?.id,
        to: input?.to ?? "",
        cc: input?.cc,
        bcc: input?.bcc,
        subject: input?.subject ?? "",
        body: input?.body ?? "",
        threadId: input?.threadId,
        inReplyToMessageId: input?.inReplyToMessageId,
        attachments: input?.attachments,
      });
    }
    case "deleteDraft":
      if (typeof payload === "string" && payload) {
        deleteDraft(payload);
      }
      return true;
    case "suggestAddresses":
      return searchAddressSuggestions(
        typeof payload === "string" ? payload : ""
      );
    case "getAccountEmail":
      return getGmailAddress();
    case "loadAttachment": {
      const input = payload as { messageId: string; attachmentId: string };
      const stored = getStoredAttachment(input.messageId, input.attachmentId);

      if (!stored) {
        throw new Error("Attachment was not found.");
      }

      let bytes = stored.data;

      if (!bytes) {
        const auth = await getAuthenticatedClient();

        if (!auth) {
          throw new Error("User is not authenticated.");
        }

        try {
          const gmail = google.gmail({ version: "v1", auth });
          const response = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: input.messageId,
            id: input.attachmentId,
          });

          if (!response.data.data) {
            throw new Error("Gmail did not return attachment data.");
          }

          bytes = Buffer.from(
            response.data.data.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
          );
        } catch (error) {
          rethrowIfGmailAuthFailed(error);
        }
      }

      return {
        filename: stored.filename,
        mimeType: stored.mimeType,
        dataBase64: Buffer.from(bytes).toString("base64"),
      };
    }
    case "listSignatures":
      return listGmailSignatures();
    case "setRefreshToken":
      setGmailRefreshToken(typeof payload === "string" ? payload : null);
      clearGmailProfileCache();
      clearGmailSignatureCache();
      return true;
    default: {
      const exhaustive: never = method;
      throw new Error(`Unknown mail method: ${exhaustive}`);
    }
  }
}

const port = parentPort();

port.on("message", (event) => {
  const message = event.data as MailToWorker;

  if (message?.kind === "init") {
    try {
      setUserDataPath(message.init.userDataPath);
      configureGmailSession({
        refreshToken: message.init.refreshToken,
      });
      initDatabase();
      backfillSenderFields();
      rebuildAddressContactsCache();
      startInboxPoll();
      send({ kind: "ready" });
    } catch (error) {
      send({ kind: "fatal", error: asErrorMessage(error) });
    }
    return;
  }

  if (message?.kind !== "request") {
    return;
  }

  const request = message as MailRequest;

  void handle(request.method, request.payload)
    .then((result) => {
      send({
        kind: "response",
        id: request.id,
        ok: true,
        result,
      });
    })
    .catch((error: unknown) => {
      send({
        kind: "response",
        id: request.id,
        ok: false,
        error: asErrorMessage(error),
      });
    });
});
