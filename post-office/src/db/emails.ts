import type { Email, EmailAttachment, EmailDetail, EmailPage } from "../types/email";
import { getDb } from "./database";

interface EmailListRecord {
  id: string;
  thread_id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  internal_date: number;
  labels: string;
}

interface EmailRecord extends EmailListRecord {
  body_text: string;
  body_html: string;
}

interface AttachmentRecord {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
}

export interface StoredAttachment extends EmailAttachment {
  data: Buffer | null;
}

export interface UpsertEmailInput extends EmailDetail {
  internalDate: number;
  labels: string[];
  attachmentData?: { id: string; data: Buffer | null }[];
}

function parseLabels(value: string | undefined): string[] {
  if (!value) {
    return ["INBOX"];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((label): label is string => typeof label === "string")
      : ["INBOX"];
  } catch {
    return ["INBOX"];
  }
}

function asRows<T>(rows: unknown): T[] {
  return rows as T[];
}

function asRow<T>(row: unknown): T | undefined {
  return row as T | undefined;
}

function toEmail(row: EmailListRecord): Email {
  return {
    id: row.id,
    threadId: row.thread_id,
    from: row.from,
    to: row.to,
    subject: row.subject,
    date: row.date,
    snippet: row.snippet,
    internalDate: row.internal_date,
    labels: parseLabels(row.labels),
  };
}

export function listEmailIds(): Set<string> {
  const rows = asRows<{ id: string }>(
    getDb().prepare(`SELECT id FROM emails`).all()
  );

  return new Set(rows.map((row) => row.id));
}

export function replaceEmails(emails: UpsertEmailInput[]): void {
  const db = getDb();

  const upsertEmail = db.prepare(`
    INSERT OR REPLACE INTO emails (
      id,
      thread_id,
      "from",
      "to",
      subject,
      date,
      snippet,
      body_text,
      body_html,
      internal_date,
      labels
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteAttachments = db.prepare(
    `DELETE FROM attachments WHERE email_id = ?`
  );

  const insertAttachment = db.prepare(`
    INSERT INTO attachments (
      id,
      email_id,
      filename,
      mime_type,
      size,
      data
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");

  try {
    for (const email of emails) {
      upsertEmail.run(
        email.id,
        email.threadId,
        email.from,
        email.to,
        email.subject,
        email.date,
        email.snippet,
        email.bodyText,
        email.bodyHtml,
        email.internalDate,
        JSON.stringify(email.labels)
      );

      deleteAttachments.run(email.id);

      const dataById = new Map(
        (email.attachmentData ?? []).map((item) => [item.id, item.data])
      );

      for (const attachment of email.attachments) {
        insertAttachment.run(
          attachment.id,
          email.id,
          attachment.filename,
          attachment.mimeType,
          attachment.size,
          dataById.get(attachment.id) ?? null
        );
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function escapeLike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

const INBOX_FILTER = `labels LIKE '%"INBOX"%'`;
const LIST_COLUMNS = `
  id,
  thread_id,
  "from",
  "to",
  subject,
  date,
  snippet,
  internal_date,
  labels
`;

export function listInboxPage(options: {
  page: number;
  pageSize: number;
  query?: string;
}): EmailPage {
  const pageSize = Math.max(1, options.pageSize);
  const search = options.query?.trim() ?? "";
  const params: (string | number)[] = [];

  let where = INBOX_FILTER;

  if (search) {
    const like = `%${escapeLike(search)}%`;
    where += `
      AND (
        "from" LIKE ? ESCAPE '\\'
        OR "to" LIKE ? ESCAPE '\\'
        OR subject LIKE ? ESCAPE '\\'
        OR snippet LIKE ? ESCAPE '\\'
        OR body_text LIKE ? ESCAPE '\\'
      )
    `;
    params.push(like, like, like, like, like);
  }

  const countRow = asRow<{ count: number }>(
    getDb().prepare(`SELECT COUNT(*) AS count FROM emails WHERE ${where}`).get(...params)
  );
  const total = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(Math.max(1, options.page), pageCount);
  const offset = (page - 1) * pageSize;

  const rows = getDb()
    .prepare(
      `
      SELECT ${LIST_COLUMNS}
      FROM emails
      WHERE ${where}
      ORDER BY internal_date DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, pageSize, offset);

  return {
    emails: asRows<EmailListRecord>(rows).map(toEmail),
    total,
    page,
    pageSize,
  };
}

export function listEmails(): Email[] {
  return listInboxPage({ page: 1, pageSize: 100 }).emails;
}

export function getEmail(id: string): EmailDetail | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        id,
        thread_id,
        "from",
        "to",
        subject,
        date,
        snippet,
        body_text,
        body_html,
        internal_date,
        labels
      FROM emails
      WHERE id = ?
    `
    )
    .get(id);
  const emailRow = asRow<EmailRecord>(row);

  if (!emailRow) {
    return null;
  }

  const attachments = getDb()
    .prepare(
      `
      SELECT id, filename, mime_type, size
      FROM attachments
      WHERE email_id = ?
      ORDER BY filename
    `
    )
    .all(id);

  return {
    ...toEmail(emailRow),
    bodyText: emailRow.body_text,
    bodyHtml: emailRow.body_html,
    attachments: asRows<AttachmentRecord>(attachments).map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mime_type,
      size: attachment.size,
    })),
  };
}

export function getStoredAttachment(
  emailId: string,
  attachmentId: string
): StoredAttachment | null {
  const row = getDb()
    .prepare(
      `
      SELECT id, filename, mime_type, size, data
      FROM attachments
      WHERE email_id = ? AND id = ?
    `
    )
    .get(emailId, attachmentId);
  const stored = asRow<AttachmentRecord & { data: Buffer | Uint8Array | null }>(
    row
  );

  if (!stored) {
    return null;
  }

  return {
    id: stored.id,
    filename: stored.filename,
    mimeType: stored.mime_type,
    size: stored.size,
    data: stored.data ? Buffer.from(stored.data) : null,
  };
}
