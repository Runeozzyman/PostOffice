import { app } from "electron";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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
}

export function initDatabase(): DatabaseSync {
  const dbPath = path.join(app.getPath("userData"), "postoffice.db");
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
