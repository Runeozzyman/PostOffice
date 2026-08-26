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
        selectedSlotIds: string[];
      }) => Promise<boolean>;
      applyMailslotRules: (payload: {
        matchType: "email" | "domain";
        pattern: string;
        selectedSlotIds: string[];
      }) => Promise<boolean>;
      saveAttachment: (payload: {
        messageId: string;
        attachmentId: string;
        filename: string;
      }) => Promise<{ canceled: boolean }>;
    };
  }
}
