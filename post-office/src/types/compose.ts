export interface ComposeDraft {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyToMessageId?: string;
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
