export interface ComposeDraft {
  id?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyToMessageId?: string;
  attachments?: ComposeAttachment[];
}

export interface StoredDraft {
  id: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  threadId: string;
  inReplyToMessageId: string;
  updatedAt: number;
  attachments: ComposeAttachment[];
}

export interface AddressSuggestion {
  email: string;
  name: string;
}

export interface ComposeAttachment {
  path: string;
  filename: string;
  size: number;
  mimeType: string;
}
