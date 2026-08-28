import type { ComposeAttachment, ComposeDraft, GmailSignature, StoredDraft } from "../types/compose";
import type { Email, EmailDetail, EmailPage } from "../types/email";
import type { Mailslot, MailslotFiling, MailslotIcon } from "../types/mailslot";

export interface MailWorkerInit {
  userDataPath: string;
  refreshToken: string | null;
}

export type MailMethod =
  | "listEmails"
  | "syncEmails"
  | "listMailslots"
  | "createMailslot"
  | "updateMailslot"
  | "deleteMailslot"
  | "getMailslotFiling"
  | "applyEmailMailslots"
  | "applyMailslotRules"
  | "getEmail"
  | "trashEmail"
  | "untrashEmail"
  | "setEmailStarred"
  | "sendEmail"
  | "listDrafts"
  | "getDraft"
  | "saveDraft"
  | "deleteDraft"
  | "suggestAddresses"
  | "getAccountEmail"
  | "loadAttachment"
  | "listSignatures"
  | "setRefreshToken";

export interface MailRequest {
  kind: "request";
  id: number;
  method: MailMethod;
  payload: unknown;
}

export interface MailResponse {
  kind: "response";
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type MailEvent =
  | { kind: "ready" }
  | { kind: "fatal"; error: string }
  | { kind: "event"; event: "email-stored"; payload: Email }
  | {
      kind: "event";
      event: "sync-progress";
      payload: { storedThisRun: number };
    }
  | {
      kind: "event";
      event: "email-action-failed";
      payload: { email: Email | null; message: string };
    };

export type MailToWorker = MailRequest | { kind: "init"; init: MailWorkerInit };

export type MailFromWorker = MailResponse | MailEvent;

export interface MailMethodMap {
  listEmails: {
    payload: {
      page: number;
      pageSize: number;
      query?: string;
      mailslotId?: string;
      mailbox?: "inbox" | "starred" | "sent" | "trash";
    };
    result: EmailPage;
  };
  syncEmails: { payload: undefined; result: void };
  listMailslots: { payload: undefined; result: Mailslot[] };
  createMailslot: {
    payload: { title: string; color: string; icon: MailslotIcon | string };
    result: Mailslot;
  };
  updateMailslot: {
    payload: {
      id: string;
      title: string;
      color: string;
      icon: MailslotIcon | string;
    };
    result: Mailslot;
  };
  deleteMailslot: { payload: string; result: boolean };
  getMailslotFiling: { payload: string; result: MailslotFiling };
  applyEmailMailslots: {
    payload: { emailId: string; selectedSlotId: string | null };
    result: boolean;
  };
  applyMailslotRules: {
    payload: {
      matchType: "email" | "domain";
      pattern: string;
      selectedSlotId: string | null;
    };
    result: boolean;
  };
  getEmail: { payload: string; result: EmailDetail | null };
  trashEmail: { payload: string; result: boolean };
  untrashEmail: { payload: string; result: boolean };
  setEmailStarred: {
    payload: { id: string; starred: boolean };
    result: boolean;
  };
  sendEmail: {
    payload: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      threadId?: string;
      inReplyToMessageId?: string;
      attachments?: ComposeAttachment[];
      signatureText?: string;
      signatureHtml?: string;
    };
    result: boolean;
  };
  listDrafts: { payload: undefined; result: StoredDraft[] };
  getDraft: { payload: string; result: StoredDraft | null };
  saveDraft: { payload: ComposeDraft; result: StoredDraft | null };
  deleteDraft: { payload: string; result: boolean };
  suggestAddresses: {
    payload: string;
    result: { email: string; name: string }[];
  };
  getAccountEmail: { payload: undefined; result: string | null };
  loadAttachment: {
    payload: { messageId: string; attachmentId: string };
    result: { filename: string; mimeType: string; dataBase64: string };
  };
  listSignatures: { payload: undefined; result: GmailSignature[] };
  setRefreshToken: { payload: string | null; result: boolean };
}
