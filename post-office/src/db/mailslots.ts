import { randomUUID } from "node:crypto";
import type { Mailslot, MailslotIcon } from "../types/mailslot";
import { MAX_MAILSLOTS } from "../types/mailslot";
import { getDb } from "./database";

interface MailslotRecord {
  id: string;
  title: string;
  color: string;
  icon: string;
  created_at: number;
  sort_order: number;
}

function asRows<T>(rows: unknown): T[] {
  return rows as T[];
}

function asRow<T>(row: unknown): T | undefined {
  return row as T | undefined;
}

const ICONS: MailslotIcon[] = [
  "box",
  "briefcase",
  "home",
  "heart",
  "star",
  "tag",
  "send",
  "bookmark",
];

function toMailslot(row: MailslotRecord): Mailslot {
  return {
    id: row.id,
    title: row.title,
    color: row.color,
    icon: ICONS.includes(row.icon as MailslotIcon)
      ? (row.icon as MailslotIcon)
      : "box",
    createdAt: row.created_at,
    sortOrder: row.sort_order,
  };
}

export function listMailslots(): Mailslot[] {
  const rows = getDb()
    .prepare(
      `
      SELECT id, title, color, icon, created_at, sort_order
      FROM mailslots
      ORDER BY sort_order ASC, created_at ASC
    `
    )
    .all();

  return asRows<MailslotRecord>(rows).map(toMailslot);
}

export function getMailslot(id: string): Mailslot | null {
  const row = asRow<MailslotRecord>(
    getDb()
      .prepare(
        `
        SELECT id, title, color, icon, created_at, sort_order
        FROM mailslots
        WHERE id = ?
      `
      )
      .get(id)
  );

  return row ? toMailslot(row) : null;
}

export function createMailslot(input: {
  title: string;
  color: string;
  icon: MailslotIcon;
}): Mailslot {
  const title = input.title.trim();

  if (!title) {
    throw new Error("A mailslot title is required.");
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
    throw new Error("A valid colour is required.");
  }

  const db = getDb();
  const existing = asRow<{ count: number }>(
    db.prepare(`SELECT COUNT(*) AS count FROM mailslots`).get()
  );

  if (Number(existing?.count ?? 0) >= MAX_MAILSLOTS) {
    throw new Error(`You can have up to ${MAX_MAILSLOTS} mailslots.`);
  }
  const maxOrder = asRow<{ max_order: number | null }>(
    db.prepare(`SELECT MAX(sort_order) AS max_order FROM mailslots`).get()
  );
  const sortOrder = Number(maxOrder?.max_order ?? -1) + 1;
  const mailslot: Mailslot = {
    id: randomUUID(),
    title,
    color: input.color.toLowerCase(),
    icon: ICONS.includes(input.icon) ? input.icon : "box",
    createdAt: Date.now(),
    sortOrder,
  };

  db.prepare(
    `
    INSERT INTO mailslots (id, title, color, icon, created_at, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    mailslot.id,
    mailslot.title,
    mailslot.color,
    mailslot.icon,
    mailslot.createdAt,
    mailslot.sortOrder
  );

  return mailslot;
}

export function updateMailslot(input: {
  id: string;
  title: string;
  color: string;
  icon: MailslotIcon;
}): Mailslot {
  const title = input.title.trim();

  if (!title) {
    throw new Error("A mailslot title is required.");
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
    throw new Error("A valid colour is required.");
  }

  const existing = getMailslot(input.id);

  if (!existing) {
    throw new Error("Mailslot was not found.");
  }

  const icon = ICONS.includes(input.icon) ? input.icon : "box";
  const color = input.color.toLowerCase();

  getDb()
    .prepare(
      `
      UPDATE mailslots
      SET title = ?, color = ?, icon = ?
      WHERE id = ?
    `
    )
    .run(title, color, icon, input.id);

  return {
    ...existing,
    title,
    color,
    icon,
  };
}

export function deleteMailslot(id: string) {
  if (!getMailslot(id)) {
    throw new Error("Mailslot was not found.");
  }

  getDb().prepare(`DELETE FROM mailslots WHERE id = ?`).run(id);
}

export function addMailslotRule(input: {
  mailslotId: string;
  matchType: "email" | "domain";
  pattern: string;
}) {
  const pattern = input.pattern.trim().toLowerCase();

  if (!pattern) {
    throw new Error("A sender pattern is required.");
  }

  if (!getMailslot(input.mailslotId)) {
    throw new Error("Mailslot was not found.");
  }

  getDb()
    .prepare(
      `
      INSERT OR IGNORE INTO mailslot_rules (id, mailslot_id, match_type, pattern)
      VALUES (?, ?, ?, ?)
    `
    )
    .run(randomUUID(), input.mailslotId, input.matchType, pattern);
}

export function removeMailslotRule(input: {
  mailslotId: string;
  matchType: "email" | "domain";
  pattern: string;
}) {
  getDb()
    .prepare(
      `
      DELETE FROM mailslot_rules
      WHERE mailslot_id = ? AND match_type = ? AND pattern = ?
    `
    )
    .run(input.mailslotId, input.matchType, input.pattern.trim().toLowerCase());
}

export function applyMailslotRules(input: {
  matchType: "email" | "domain";
  pattern: string;
  selectedSlotId: string | null;
}) {
  const pattern = input.pattern.trim().toLowerCase();

  getDb()
    .prepare(
      `
      DELETE FROM mailslot_rules
      WHERE match_type = ? AND pattern = ?
    `
    )
    .run(input.matchType, pattern);

  if (input.selectedSlotId) {
    addMailslotRule({
      mailslotId: input.selectedSlotId,
      matchType: input.matchType,
      pattern,
    });
  }
}
