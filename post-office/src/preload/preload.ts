import { contextBridge, ipcRenderer } from "electron";
import type { Email, EmailDetail, EmailPage } from "../types/email";
import type { Mailslot, MailslotFiling, MailslotIcon } from "../types/mailslot";

console.log("PRELOAD SCRIPT LOADED");

contextBridge.exposeInMainWorld("electronAPI", {
  signInWithGoogle: () =>
    ipcRenderer.invoke("google-sign-in"),

  checkAuth: () =>
    ipcRenderer.invoke("check-auth"),

  signOut: () =>
    ipcRenderer.invoke("google-sign-out"),

  listEmails: (options: {
    page: number;
    pageSize: number;
    query?: string;
    mailslotId?: string;
  }): Promise<EmailPage> =>
    ipcRenderer.invoke("list-emails", options),

  syncEmails: (): Promise<Email[]> =>
    ipcRenderer.invoke("sync-emails"),

  onEmailStored: (callback: (email: Email) => void) => {
    const listener = (_event: unknown, email: Email) => {
      callback(email);
    };

    ipcRenderer.on("email-stored", listener);

    return () => {
      ipcRenderer.removeListener("email-stored", listener);
    };
  },

  onSyncProgress: (
    callback: (progress: { storedThisRun: number }) => void
  ) => {
    const listener = (
      _event: unknown,
      progress: { storedThisRun: number }
    ) => {
      callback(progress);
    };

    ipcRenderer.on("sync-progress", listener);

    return () => {
      ipcRenderer.removeListener("sync-progress", listener);
    };
  },

  listMailslots: (): Promise<Mailslot[]> =>
    ipcRenderer.invoke("list-mailslots"),

  createMailslot: (payload: {
    title: string;
    color: string;
    icon: MailslotIcon;
  }): Promise<Mailslot> => ipcRenderer.invoke("create-mailslot", payload),

  updateMailslot: (payload: {
    id: string;
    title: string;
    color: string;
    icon: MailslotIcon;
  }): Promise<Mailslot> => ipcRenderer.invoke("update-mailslot", payload),

  deleteMailslot: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("delete-mailslot", id),

  getMailslotFiling: (emailId: string): Promise<MailslotFiling> =>
    ipcRenderer.invoke("get-mailslot-filing", emailId),

  applyEmailMailslots: (payload: {
    emailId: string;
    selectedSlotIds: string[];
  }): Promise<boolean> =>
    ipcRenderer.invoke("apply-email-mailslots", payload),

  applyMailslotRules: (payload: {
    matchType: "email" | "domain";
    pattern: string;
    selectedSlotIds: string[];
  }): Promise<boolean> =>
    ipcRenderer.invoke("apply-mailslot-rules", payload),

  getEmail: (id: string): Promise<EmailDetail | null> =>
    ipcRenderer.invoke("get-email", id),

  saveAttachment: (payload: {
    messageId: string;
    attachmentId: string;
    filename: string;
  }): Promise<{ canceled: boolean }> =>
    ipcRenderer.invoke("save-attachment", payload),
});
