export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  internalDate: number;
  labels: string[];
  mailslotColor?: string | null;
  mailslotTitle?: string | null;
}

export interface EmailPage {
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EmailDetail extends Email {
  bodyText: string;
  bodyHtml: string;
  attachments: EmailAttachment[];
}
