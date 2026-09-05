import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getUserDataPath } from "./paths";

function asRows<T>(rows: unknown): T[] {
  return rows as T[];
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    throw new Error("Database has not been initialized.");
  }
  return db;
}

function tableColumns(database: DatabaseSync, table: string): Set<string> {
  const columns = asRows<{ name: string }>(
    database.prepare(`PRAGMA table_info(${table})`).all()
  );

  return new Set(columns.map((row) => row.name));
}

function migrate(database: DatabaseSync) {
  const columns = tableColumns(database, "emails");

  if (!columns.has("body_text")) {
    database.exec(
      `ALTER TABLE emails ADD COLUMN body_text TEXT NOT NULL DEFAULT ''`
    );
  }

  if (!columns.has("body_html")) {
    database.exec(
      `ALTER TABLE emails ADD COLUMN body_html TEXT NOT NULL DEFAULT ''`
    );
  }

  if (!columns.has("internal_date")) {
    database.exec(
      `ALTER TABLE emails ADD COLUMN internal_date INTEGER NOT NULL DEFAULT 0`
    );
  }

  if (!columns.has("labels")) {
    database.exec(
      `ALTER TABLE emails ADD COLUMN labels TEXT NOT NULL DEFAULT '["INBOX"]'`
    );
  }

  if (!columns.has("from_email")) {
    database.exec(
      `ALTER TABLE emails ADD COLUMN from_email TEXT NOT NULL DEFAULT ''`
    );
  }

  if (!columns.has("from_domain")) {
    database.exec(
      `ALTER TABLE emails ADD COLUMN from_domain TEXT NOT NULL DEFAULT ''`
    );
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS emails_internal_date
    ON emails (internal_date DESC)
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT NOT NULL,
      email_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      data BLOB,
      PRIMARY KEY (email_id, id),
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS mailslots (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'box',
      created_at INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS mailslot_rules (
      id TEXT PRIMARY KEY,
      mailslot_id TEXT NOT NULL,
      match_type TEXT NOT NULL,
      pattern TEXT NOT NULL,
      UNIQUE (mailslot_id, match_type, pattern),
      FOREIGN KEY (mailslot_id) REFERENCES mailslots(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS mailslot_emails (
      mailslot_id TEXT NOT NULL,
      email_id TEXT NOT NULL,
      PRIMARY KEY (mailslot_id, email_id),
      FOREIGN KEY (mailslot_id) REFERENCES mailslots(id) ON DELETE CASCADE,
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS mailslot_email_exclusions (
      mailslot_id TEXT NOT NULL,
      email_id TEXT NOT NULL,
      PRIMARY KEY (mailslot_id, email_id),
      FOREIGN KEY (mailslot_id) REFERENCES mailslots(id) ON DELETE CASCADE,
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS emails_from_email ON emails (from_email)
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS emails_from_domain ON emails (from_domain)
  `);

  collapseExclusiveMailslots(database);

  database.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      "to" TEXT NOT NULL DEFAULT '',
      cc TEXT NOT NULL DEFAULT '',
      bcc TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      thread_id TEXT NOT NULL DEFAULT '',
      in_reply_to_message_id TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS draft_attachments (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      stored_path TEXT NOT NULL,
      FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

function collapseExclusiveMailslots(database: DatabaseSync) {
  database.exec(`
    DELETE FROM mailslot_emails
    WHERE rowid IN (
      SELECT me.rowid
      FROM mailslot_emails me
      JOIN mailslots m ON m.id = me.mailslot_id
      WHERE EXISTS (
        SELECT 1
        FROM mailslot_emails other
        JOIN mailslots om ON om.id = other.mailslot_id
        WHERE other.email_id = me.email_id
          AND (
            om.sort_order < m.sort_order
            OR (om.sort_order = m.sort_order AND om.created_at < m.created_at)
            OR (
              om.sort_order = m.sort_order
              AND om.created_at = m.created_at
              AND om.id < m.id
            )
          )
      )
    )
  `);

  database.exec(`
    DELETE FROM mailslot_rules
    WHERE rowid IN (
      SELECT rule.rowid
      FROM mailslot_rules rule
      JOIN mailslots m ON m.id = rule.mailslot_id
      WHERE EXISTS (
        SELECT 1
        FROM mailslot_rules other
        JOIN mailslots om ON om.id = other.mailslot_id
        WHERE other.match_type = rule.match_type
          AND other.pattern = rule.pattern
          AND (
            om.sort_order < m.sort_order
            OR (om.sort_order = m.sort_order AND om.created_at < m.created_at)
            OR (
              om.sort_order = m.sort_order
              AND om.created_at = m.created_at
              AND om.id < m.id
            )
          )
      )
    )
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS mailslot_emails_email_id
    ON mailslot_emails (email_id)
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS mailslot_rules_pattern
    ON mailslot_rules (match_type, pattern)
  `);
}

export function initDatabase(): DatabaseSync {
  const dbPath = path.join(getUserDataPath(), "postoffice.db");
  db = new DatabaseSync(dbPath);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      subject TEXT NOT NULL,
      date TEXT NOT NULL,
      snippet TEXT NOT NULL
    )
  `);

  migrate(db);

  return db;
}
