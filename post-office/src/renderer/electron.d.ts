import type { ComposeAttachment, ComposeDraft, GmailSignature, StoredDraft } from "../types/compose";
import type { Email, EmailDetail, EmailPage } from "../types/email";
import type { Mailslot, MailslotFiling, MailslotIcon } from "../types/mailslot";

export {};

declare global {
  interface Window {
    electronAPI: {
      signInWithGoogle: () => Promise<void>;
      checkAuth: () => Promise<boolean>;
      signOut: () => Promise<boolean>;
      listEmails: (options: {
        page: number;
        pageSize: number;
        query?: string;
        mailslotId?: string;
        mailbox?: "inbox" | "starred" | "sent" | "trash";
      }) => Promise<EmailPage>;
      syncEmails: () => Promise<void>;
      onEmailStored: (callback: (email: Email) => void) => () => void;
      onSyncProgress: (
        callback: (progress: { storedThisRun: number }) => void
      ) => () => void;
      getEmail: (id: string) => Promise<EmailDetail | null>;
      trashEmail: (id: string) => Promise<boolean>;
      untrashEmail: (id: string) => Promise<boolean>;
      setEmailStarred: (payload: {
        id: string;
        starred: boolean;
      }) => Promise<boolean>;
      onEmailActionFailed: (
        callback: (payload: {
          email: Email | null;
          message: string;
        }) => void
      ) => () => void;
      listDrafts: () => Promise<StoredDraft[]>;
      getDraft: (id: string) => Promise<StoredDraft | null>;
      saveDraft: (payload: ComposeDraft) => Promise<StoredDraft | null>;
      deleteDraft: (id: string) => Promise<boolean>;
      sendEmail: (payload: {
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
      }) => Promise<boolean>;
      pickComposeAttachments: () => Promise<ComposeAttachment[]>;
      composeAttachmentsFromPaths: (
        filePaths: string[]
      ) => Promise<ComposeAttachment[]>;
      getPathForFile: (file: File) => string;
      suggestAddresses: (query: string) => Promise<
        { email: string; name: string }[]
      >;
      getAccountEmail: () => Promise<string | null>;
      listSignatures: () => Promise<GmailSignature[]>;
      listMailslots: () => Promise<Mailslot[]>;
      createMailslot: (payload: {
        title: string;
        color: string;
        icon: MailslotIcon;
      }) => Promise<Mailslot>;
      updateMailslot: (payload: {
        id: string;
        title: string;
        color: string;
        icon: MailslotIcon;
      }) => Promise<Mailslot>;
      deleteMailslot: (id: string) => Promise<boolean>;
      getMailslotFiling: (emailId: string) => Promise<MailslotFiling>;
      applyEmailMailslots: (payload: {
        emailId: string;
        selectedSlotId: string | null;
      }) => Promise<boolean>;
      applyMailslotRules: (payload: {
        matchType: "email" | "domain";
        pattern: string;
        selectedSlotId: string | null;
      }) => Promise<boolean>;
      saveAttachment: (payload: {
        messageId: string;
        attachmentId: string;
        filename: string;
      }) => Promise<{ canceled: boolean }>;
    };
  }
}
