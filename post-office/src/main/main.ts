import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
} from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

import {
  getAuthenticatedClient,
  signInWithGoogle,
  signOutWithGoogle,
} from "../auth/google";
import { sendGmailMessage } from "../services/gmailSend";
import { clearGmailProfileCache, getGmailAddress } from "../services/gmailProfile";
import { trashGmailMessage, untrashGmailMessage } from "../services/gmailTrash";
import { setGmailStarred } from "../services/gmailStar";
import {
  enqueueGmailLabelSync,
  nextLabelGeneration,
} from "../services/gmailBackground";
import { withRestored, withStarred, withTrashed } from "../helpers/emailLabels";
import { syncInboxEmails } from "../services/gmailSync";
import { initDatabase } from "../db/database";
import { getEmail, getEmailLabels, getStoredAttachment, listInboxPage, applyEmailMailslotMembership, backfillSenderFields, getMailslotFiling, rebuildAddressContactsCache, searchAddressSuggestions, setEmailLabels } from "../db/emails";
import {
  applyMailslotRules,
  createMailslot,
  deleteMailslot,
  listMailslots,
  updateMailslot,
} from "../db/mailslots";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.setName("post-office");
app.setPath("userData", path.join(app.getPath("appData"), "post-office"));

function isAppUrl(url: string) {
  return (
    url.startsWith("http://localhost:5173") || url.startsWith("file:")
  );
}

function openExternalIfSafe(url: string) {
  if (isAppUrl(url)) {
    return false;
  }

  if (
    url.startsWith("https:") ||
    url.startsWith("http:") ||
    url.startsWith("mailto:")
  ) {
    void shell.openExternal(url);
    return true;
  }

  return false;
}

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    icon: path.join(__dirname, "../src/assets/icon.png"),
    title: "PostOffice",

    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfSafe(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) {
      return;
    }

    event.preventDefault();
    openExternalIfSafe(url);
  });

  window.loadURL("http://localhost:5173");
};

ipcMain.handle(
  "list-emails",
  async (
    _event,
    options: { page: number; pageSize: number; query?: string; mailslotId?: string; mailbox?: "inbox" | "starred" | "sent" | "trash" }
  ) => {
    return listInboxPage(options);
  }
);

let mailboxSyncInFlight = false;

ipcMain.handle("sync-emails", async (event) => {
  if (mailboxSyncInFlight) {
    return;
  }

  mailboxSyncInFlight = true;

  try {
    return await syncInboxEmails(
      (email) => {
        event.sender.send("email-stored", email);
      },
      (progress) => {
        event.sender.send("sync-progress", progress);
      }
    );
  } finally {
    rebuildAddressContactsCache();
    mailboxSyncInFlight = false;
  }
});

ipcMain.handle("list-mailslots", async () => {
  return listMailslots();
});

ipcMain.handle(
  "create-mailslot",
  async (
    _event,
    payload: { title: string; color: string; icon: string }
  ) => {
    return createMailslot({
      title: payload.title,
      color: payload.color,
      icon: payload.icon as Parameters<typeof createMailslot>[0]["icon"],
    });
  }
);

ipcMain.handle(
  "update-mailslot",
  async (
    _event,
    payload: { id: string; title: string; color: string; icon: string }
  ) => {
    return updateMailslot({
      id: payload.id,
      title: payload.title,
      color: payload.color,
      icon: payload.icon as Parameters<typeof updateMailslot>[0]["icon"],
    });
  }
);

ipcMain.handle("delete-mailslot", async (_event, id: string) => {
  deleteMailslot(id);
  return true;
});

ipcMain.handle(
  "get-mailslot-filing",
  async (_event, emailId: string) => {
    return getMailslotFiling(emailId);
  }
);

ipcMain.handle(
  "apply-email-mailslots",
  async (
    _event,
    payload: { emailId: string; selectedSlotId: string | null }
  ) => {
    applyEmailMailslotMembership(payload.emailId, payload.selectedSlotId);
    return true;
  }
);

ipcMain.handle(
  "apply-mailslot-rules",
  async (
    _event,
    payload: {
      matchType: "email" | "domain";
      pattern: string;
      selectedSlotId: string | null;
    }
  ) => {
    applyMailslotRules(payload);
    return true;
  }
);

function broadcast(channel: string, payload: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

function scheduleLabelSync(
  id: string,
  previousLabels: string[],
  work: () => Promise<void>
) {
  const gen = nextLabelGeneration(id);
  enqueueGmailLabelSync(id, gen, previousLabels, work, (error) => {
    const email = getEmail(id);
    broadcast("email-action-failed", {
      email,
      message: error.message,
    });
  });
}

ipcMain.handle("get-email", async (_event, id: string) => {
  return getEmail(id);
});

ipcMain.handle("trash-email", async (_event, id: string) => {
  const previous = getEmailLabels(id);

  if (!previous) {
    throw new Error("Email was not found in the local database.");
  }

  setEmailLabels(id, withTrashed(previous));
  scheduleLabelSync(id, previous, () => trashGmailMessage(id));
  return true;
});

ipcMain.handle("untrash-email", async (_event, id: string) => {
  const previous = getEmailLabels(id);

  if (!previous) {
    throw new Error("Email was not found in the local database.");
  }

  setEmailLabels(id, withRestored(previous));
  scheduleLabelSync(id, previous, () => untrashGmailMessage(id));
  return true;
});

ipcMain.handle(
  "set-email-starred",
  async (_event, payload: { id: string; starred: boolean }) => {
    const previous = getEmailLabels(payload.id);

    if (!previous) {
      throw new Error("Email was not found in the local database.");
    }

    setEmailLabels(payload.id, withStarred(previous, payload.starred));
    scheduleLabelSync(payload.id, previous, () =>
      setGmailStarred(payload.id, payload.starred)
    );
    return true;
  }
);

ipcMain.handle(
  "send-email",
  async (
    _event,
    payload: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      threadId?: string;
      inReplyToMessageId?: string;
    }
  ) => {
    await sendGmailMessage(payload);
    rebuildAddressContactsCache();
    return true;
  }
);

ipcMain.handle("suggest-addresses", async (_event, query: string) => {
  return searchAddressSuggestions(typeof query === "string" ? query : "");
});

ipcMain.handle("get-account-email", async () => {
  return getGmailAddress();
});

ipcMain.handle(
  "save-attachment",
  async (
    event,
    payload: { messageId: string; attachmentId: string; filename: string }
  ) => {
    const stored = getStoredAttachment(payload.messageId, payload.attachmentId);

    if (!stored) {
      throw new Error("Attachment was not found.");
    }

    let bytes = stored.data;

    if (!bytes) {
      const auth = await getAuthenticatedClient();

      if (!auth) {
        throw new Error("User is not authenticated.");
      }

      const gmail = google.gmail({
        version: "v1",
        auth,
      });

      const response = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: payload.messageId,
        id: payload.attachmentId,
      });

      if (!response.data.data) {
        throw new Error("Gmail did not return attachment data.");
      }

      bytes = Buffer.from(
        response.data.data.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      );
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    const result = browserWindow
      ? await dialog.showSaveDialog(browserWindow, {
          defaultPath: stored.filename || payload.filename,
        })
      : await dialog.showSaveDialog({
          defaultPath: stored.filename || payload.filename,
        });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, bytes);
    return { canceled: false };
  }
);

ipcMain.handle("google-sign-out", async () => {
  signOutWithGoogle();
  clearGmailProfileCache();
  return true;
});

ipcMain.handle("check-auth", async () => {
  const auth = await getAuthenticatedClient();

  return auth !== null;
});

ipcMain.handle("google-sign-in", async () => {
  return await signInWithGoogle();
});

app.whenReady().then(() => {
  initDatabase();
  backfillSenderFields();
  rebuildAddressContactsCache();
  createWindow();
});
