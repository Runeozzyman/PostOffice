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

import {
  CREDENTIALS_PATH,
  signInWithGoogle,
  signOutWithGoogle,
} from "../auth/google";
import { loadRefreshToken } from "../auth/tokenStorage";
import { mimeFromFilename } from "../helpers/mimeFromFilename";
import type { ComposeAttachment, ComposeDraft } from "../types/compose";
import { callMail, onMailEvent, startMailRuntime, stopMailRuntime } from "./mailRuntime";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.setName("post-office");
app.setPath("userData", path.join(app.getPath("appData"), "post-office"));

function composeAttachmentFromPath(filePath: string): ComposeAttachment | null {
  try {
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
      return null;
    }

    const filename = path.basename(filePath);
    return {
      path: filePath,
      filename,
      size: stat.size,
      mimeType: mimeFromFilename(filename),
    };
  } catch {
    return null;
  }
}

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

function broadcast(channel: string, payload: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

onMailEvent((message) => {
  if (message.kind !== "event") {
    return;
  }

  if (message.event === "email-stored") {
    broadcast("email-stored", message.payload);
    return;
  }

  if (message.event === "sync-progress") {
    broadcast("sync-progress", message.payload);
    return;
  }

  broadcast("email-action-failed", message.payload);
});

ipcMain.handle(
  "list-emails",
  async (
    _event,
    options: {
      page: number;
      pageSize: number;
      query?: string;
      mailslotId?: string;
      mailbox?: "inbox" | "starred" | "sent" | "trash";
    }
  ) => {
    return callMail("listEmails", options);
  }
);

ipcMain.handle("sync-emails", async () => {
  return callMail("syncEmails");
});

ipcMain.handle("list-mailslots", async () => {
  return callMail("listMailslots");
});

ipcMain.handle(
  "create-mailslot",
  async (
    _event,
    payload: { title: string; color: string; icon: string }
  ) => {
    return callMail("createMailslot", payload);
  }
);

ipcMain.handle(
  "update-mailslot",
  async (
    _event,
    payload: { id: string; title: string; color: string; icon: string }
  ) => {
    return callMail("updateMailslot", payload);
  }
);

ipcMain.handle("delete-mailslot", async (_event, id: string) => {
  return callMail("deleteMailslot", id);
});

ipcMain.handle("get-mailslot-filing", async (_event, emailId: string) => {
  return callMail("getMailslotFiling", emailId);
});

ipcMain.handle(
  "apply-email-mailslots",
  async (
    _event,
    payload: { emailId: string; selectedSlotId: string | null }
  ) => {
    return callMail("applyEmailMailslots", payload);
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
    return callMail("applyMailslotRules", payload);
  }
);

ipcMain.handle("get-email", async (_event, id: string) => {
  return callMail("getEmail", id);
});

ipcMain.handle("trash-email", async (_event, id: string) => {
  return callMail("trashEmail", id);
});

ipcMain.handle("untrash-email", async (_event, id: string) => {
  return callMail("untrashEmail", id);
});

ipcMain.handle(
  "set-email-starred",
  async (_event, payload: { id: string; starred: boolean }) => {
    return callMail("setEmailStarred", payload);
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
      attachments?: ComposeAttachment[];
    }
  ) => {
    return callMail("sendEmail", payload);
  }
);

ipcMain.handle("pick-compose-attachments", async (event) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, {
        properties: ["openFile", "multiSelections"],
        title: "Attach files",
      })
    : await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        title: "Attach files",
      });

  if (result.canceled) {
    return [] as ComposeAttachment[];
  }

  return result.filePaths
    .map((filePath) => composeAttachmentFromPath(filePath))
    .filter((item): item is ComposeAttachment => Boolean(item));
});

ipcMain.handle(
  "compose-attachments-from-paths",
  async (_event, filePaths: string[]) => {
    if (!Array.isArray(filePaths)) {
      return [] as ComposeAttachment[];
    }

    return filePaths
      .map((filePath) => composeAttachmentFromPath(filePath))
      .filter((item): item is ComposeAttachment => Boolean(item));
  }
);

ipcMain.handle("list-drafts", async () => {
  return callMail("listDrafts");
});

ipcMain.handle("get-draft", async (_event, id: string) => {
  return callMail("getDraft", id);
});

ipcMain.handle("save-draft", async (_event, payload: ComposeDraft) => {
  return callMail("saveDraft", payload);
});

ipcMain.handle("delete-draft", async (_event, id: string) => {
  return callMail("deleteDraft", id);
});

ipcMain.handle("suggest-addresses", async (_event, query: string) => {
  return callMail("suggestAddresses", typeof query === "string" ? query : "");
});

ipcMain.handle("get-account-email", async () => {
  return callMail("getAccountEmail");
});

ipcMain.handle("list-signatures", async () => {
  return callMail("listSignatures");
});

ipcMain.handle(
  "save-attachment",
  async (
    event,
    payload: { messageId: string; attachmentId: string; filename: string }
  ) => {
    const stored = await callMail("loadAttachment", {
      messageId: payload.messageId,
      attachmentId: payload.attachmentId,
    });

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

    fs.writeFileSync(result.filePath, Buffer.from(stored.dataBase64, "base64"));
    return { canceled: false };
  }
);

ipcMain.handle("google-sign-out", async () => {
  signOutWithGoogle();
  await callMail("setRefreshToken", null);
  return true;
});

ipcMain.handle("check-auth", async () => {
  return loadRefreshToken() !== null;
});

ipcMain.handle("google-sign-in", async () => {
  await signInWithGoogle();
  await callMail("setRefreshToken", loadRefreshToken());
  return true;
});

app.whenReady().then(async () => {
  await startMailRuntime({
    userDataPath: app.getPath("userData"),
    credentialsPath: CREDENTIALS_PATH,
    refreshToken: loadRefreshToken(),
  });
  createWindow();
});

app.on("before-quit", () => {
  stopMailRuntime();
});
