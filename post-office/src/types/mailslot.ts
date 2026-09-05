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

export const MAX_MAILSLOTS = 10;

export function mailslotShortcutKey(index: number): string | null {
  if (index < 0 || index >= MAX_MAILSLOTS) {
    return null;
  }

  return index === 9 ? "0" : String(index + 1);
}

export function mailslotIndexFromKey(key: string): number | null {
  if (key >= "1" && key <= "9") {
    return Number(key) - 1;
  }

  if (key === "0") {
    return 9;
  }

  return null;
}
