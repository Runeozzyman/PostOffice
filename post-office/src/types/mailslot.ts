export type MailslotIcon =
  | "box"
  | "briefcase"
  | "home"
  | "heart"
  | "star"
  | "tag"
  | "send"
  | "bookmark";

export interface Mailslot {
  id: string;
  title: string;
  color: string;
  icon: MailslotIcon;
  createdAt: number;
  sortOrder: number;
}

export interface MailslotFiling {
  memberIds: string[];
  senderRuleIds: string[];
  domainRuleIds: string[];
}

export const MAX_MAILSLOTS = 12;
