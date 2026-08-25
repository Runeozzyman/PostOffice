import type { Email, EmailDetail, EmailPage } from "../types/email";

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
      }) => Promise<EmailPage>;
      syncEmails: () => Promise<void>;
      onEmailStored: (callback: (email: Email) => void) => () => void;
      onSyncProgress: (
        callback: (progress: { storedThisRun: number }) => void
      ) => () => void;
      getEmail: (id: string) => Promise<EmailDetail | null>;
      saveAttachment: (payload: {
        messageId: string;
        attachmentId: string;
        filename: string;
      }) => Promise<{ canceled: boolean }>;
    };
  }
}
