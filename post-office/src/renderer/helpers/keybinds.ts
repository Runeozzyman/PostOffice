import { MAX_MAILSLOTS } from "../../types/mailslot";

export const SHORTCUTS_ENABLED_STORAGE_KEY = "postoffice.shortcutsEnabled";
export const KEYBINDS_STORAGE_KEY = "postoffice.keybinds";

export interface AppKeybinds {
  inbox: string;
  compose: string;
  back: string;
  nextMessage: string;
  prevMessage: string;
  openMessage: string;
  search: string;
  mailslots: string[];
}

export const DEFAULT_KEYBINDS: AppKeybinds = {
  inbox: "i",
  compose: "c",
  back: "b",
  nextMessage: "ArrowDown",
  prevMessage: "ArrowUp",
  openMessage: "Enter",
  search: "s",
  mailslots: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
};

export const KEYBIND_ROWS: {
  id: keyof Omit<AppKeybinds, "mailslots"> | `mailslot:${number}`;
  label: string;
}[] = [
  { id: "inbox", label: "Go to Inbox" },
  { id: "compose", label: "Compose" },
  { id: "back", label: "Back from message" },
  { id: "nextMessage", label: "Next message" },
  { id: "prevMessage", label: "Previous message" },
  { id: "openMessage", label: "Open focused message" },
  { id: "search", label: "Focus search" },
  ...Array.from({ length: MAX_MAILSLOTS }, (_, index) => ({
    id: `mailslot:${index}` as const,
    label: `Open mailslot ${index + 1}`,
  })),
];

const BLOCKED_KEYS = new Set([
  "Tab",
  "Escape",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "Dead",
  "Process",
  "Unidentified",
]);

export function normalizeKey(key: string) {
  if (key.length === 1) {
    return key.toLowerCase();
  }

  return key;
}

export function isBlockedCaptureKey(key: string) {
  return BLOCKED_KEYS.has(key);
}

export function formatKeybind(key: string) {
  if (!key) {
    return "None";
  }

  const labels: Record<string, string> = {
    ArrowDown: "Down",
    ArrowUp: "Up",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Enter: "Enter",
    " ": "Space",
    Backspace: "Backspace",
    Delete: "Delete",
  };

  if (labels[key]) {
    return labels[key];
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

export function matchesKeybind(event: KeyboardEvent, bind: string) {
  if (!bind) {
    return false;
  }

  return normalizeKey(event.key) === bind;
}

export function mailslotIndexFromKeybind(
  event: KeyboardEvent,
  mailslots: string[]
) {
  const key = normalizeKey(event.key);
  const index = mailslots.findIndex((bind) => bind === key);
  return index >= 0 ? index : null;
}

function cloneKeybinds(value: AppKeybinds): AppKeybinds {
  return {
    ...value,
    mailslots: [...value.mailslots],
  };
}

export function readStoredShortcutsEnabled(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_ENABLED_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function storeShortcutsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(
      SHORTCUTS_ENABLED_STORAGE_KEY,
      enabled ? "on" : "off"
    );
  } catch {
    // Ignore storage failures.
  }
}

export function readStoredKeybinds(): AppKeybinds {
  try {
    const raw = localStorage.getItem(KEYBINDS_STORAGE_KEY);

    if (!raw) {
      return cloneKeybinds(DEFAULT_KEYBINDS);
    }

    const parsed = JSON.parse(raw) as Partial<AppKeybinds>;
    const mailslots = Array.from({ length: MAX_MAILSLOTS }, (_, index) => {
      const value = parsed.mailslots?.[index];
      return typeof value === "string" && value
        ? normalizeKey(value)
        : DEFAULT_KEYBINDS.mailslots[index];
    });

    return {
      inbox:
        typeof parsed.inbox === "string"
          ? normalizeKey(parsed.inbox)
          : DEFAULT_KEYBINDS.inbox,
      compose:
        typeof parsed.compose === "string"
          ? normalizeKey(parsed.compose)
          : DEFAULT_KEYBINDS.compose,
      back:
        typeof parsed.back === "string"
          ? normalizeKey(parsed.back)
          : DEFAULT_KEYBINDS.back,
      nextMessage:
        typeof parsed.nextMessage === "string"
          ? parsed.nextMessage
          : DEFAULT_KEYBINDS.nextMessage,
      prevMessage:
        typeof parsed.prevMessage === "string"
          ? parsed.prevMessage
          : DEFAULT_KEYBINDS.prevMessage,
      openMessage:
        typeof parsed.openMessage === "string"
          ? parsed.openMessage
          : DEFAULT_KEYBINDS.openMessage,
      search:
        typeof parsed.search === "string"
          ? normalizeKey(parsed.search)
          : DEFAULT_KEYBINDS.search,
      mailslots,
    };
  } catch {
    return cloneKeybinds(DEFAULT_KEYBINDS);
  }
}

export function storeKeybinds(keybinds: AppKeybinds) {
  try {
    localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(keybinds));
  } catch {
    // Ignore storage failures.
  }
}

export function keybindConflict(
  keybinds: AppKeybinds,
  owner: string,
  key: string
): string | null {
  if (!key) {
    return null;
  }

  const named: [string, string][] = [
    ["inbox", keybinds.inbox],
    ["compose", keybinds.compose],
    ["back", keybinds.back],
    ["nextMessage", keybinds.nextMessage],
    ["prevMessage", keybinds.prevMessage],
    ["openMessage", keybinds.openMessage],
    ["search", keybinds.search],
  ];

  for (const [id, value] of named) {
    if (id !== owner && value === key) {
      return id;
    }
  }

  for (let index = 0; index < keybinds.mailslots.length; index += 1) {
    const id = `mailslot:${index}`;
    if (id !== owner && keybinds.mailslots[index] === key) {
      return id;
    }
  }

  return null;
}

export function withUpdatedKeybind(
  keybinds: AppKeybinds,
  owner: string,
  key: string
): AppKeybinds {
  const next = cloneKeybinds(keybinds);

  if (owner.startsWith("mailslot:")) {
    const index = Number(owner.slice("mailslot:".length));
    if (index >= 0 && index < next.mailslots.length) {
      next.mailslots[index] = key;
    }
    return next;
  }

  if (owner in next && owner !== "mailslots") {
    (next as unknown as Record<string, unknown>)[owner] = key;
  }

  return next;
}

export function getKeybind(keybinds: AppKeybinds, owner: string) {
  if (owner.startsWith("mailslot:")) {
    const index = Number(owner.slice("mailslot:".length));
    return keybinds.mailslots[index] ?? "";
  }

  if (owner === "mailslots") {
    return "";
  }

  return keybinds[owner as keyof Omit<AppKeybinds, "mailslots">] ?? "";
}
