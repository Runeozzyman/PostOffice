import type { Email, EmailAttachment, EmailDetail, EmailPage } from "../types/email";
import { parseFrom } from "../helpers/parseFrom";
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
  from_email?: string;
  from_domain?: string;
  mailslot_color?: string | null;
  mailslot_title?: string | null;
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
    mailslotColor: row.mailslot_color ?? null,
    mailslotTitle: row.mailslot_title ?? null,
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
      labels,
      from_email,
      from_domain
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      const sender = parseFrom(email.from);
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
        JSON.stringify(email.labels),
        sender.email,
        sender.domain
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

const INBOX_FILTER = `emails.labels LIKE '%"INBOX"%'`;
const STARRED_FILTER = `emails.labels LIKE '%"STARRED"%'`;
const SENT_FILTER = `emails.labels LIKE '%"SENT"%'`;

function mailboxFilter(mailbox: "inbox" | "starred" | "sent") {
  if (mailbox === "starred") {
    return STARRED_FILTER;
  }

  if (mailbox === "sent") {
    return SENT_FILTER;
  }

  return INBOX_FILTER;
}
const LIST_COLUMNS = `
  emails.id,
  emails.thread_id,
  emails."from",
  emails."to",
  emails.subject,
  emails.date,
  emails.snippet,
  emails.internal_date,
  emails.labels
`;

const MAILSLOT_SELECT = `
  (
    SELECT m.color
    FROM mailslots m
    WHERE ${emailMatchesSlot("m.id", "emails")}
    ORDER BY m.sort_order ASC, m.created_at ASC
    LIMIT 1
  ) AS mailslot_color,
  (
    SELECT m.title
    FROM mailslots m
    WHERE ${emailMatchesSlot("m.id", "emails")}
    ORDER BY m.sort_order ASC, m.created_at ASC
    LIMIT 1
  ) AS mailslot_title
`;

function emailMatchesSlot(slotIdSql: string, emailTable: string) {
  return `
    (
      NOT EXISTS (
        SELECT 1 FROM mailslot_email_exclusions x
        WHERE x.mailslot_id = ${slotIdSql}
          AND x.email_id = ${emailTable}.id
      )
      AND (
        EXISTS (
          SELECT 1 FROM mailslot_emails me
          WHERE me.mailslot_id = ${slotIdSql}
            AND me.email_id = ${emailTable}.id
        )
        OR EXISTS (
          SELECT 1 FROM mailslot_rules r
          WHERE r.mailslot_id = ${slotIdSql}
            AND r.match_type = 'email'
            AND r.pattern = ${emailTable}.from_email
        )
        OR EXISTS (
          SELECT 1 FROM mailslot_rules r
          WHERE r.mailslot_id = ${slotIdSql}
            AND r.match_type = 'domain'
            AND (
              ${emailTable}.from_domain = r.pattern
              OR ${emailTable}.from_domain LIKE ('%.' || r.pattern)
            )
        )
      )
    )
  `;
}

export function listInboxPage(options: {
  page: number;
  pageSize: number;
  query?: string;
  mailslotId?: string;
  mailbox?: "inbox" | "starred" | "sent";
}): EmailPage {
  const pageSize = Math.max(1, options.pageSize);
  const search = options.query?.trim() ?? "";
  const params: (string | number)[] = [];
  const mailbox = options.mailslotId ? "inbox" : (options.mailbox ?? "inbox");

  let where = mailboxFilter(mailbox);

  if (options.mailslotId) {
    where += ` AND ${emailMatchesSlot("?", "emails")}`;
    params.push(
      options.mailslotId,
      options.mailslotId,
      options.mailslotId,
      options.mailslotId
    );
  }

  if (search) {
    const like = `%${escapeLike(search)}%`;
    where += `
      AND (
        emails."from" LIKE ? ESCAPE '\\'
        OR emails."to" LIKE ? ESCAPE '\\'
        OR emails.subject LIKE ? ESCAPE '\\'
        OR emails.snippet LIKE ? ESCAPE '\\'
        OR emails.body_text LIKE ? ESCAPE '\\'
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
      SELECT
        ${LIST_COLUMNS},
        ${MAILSLOT_SELECT}
      FROM emails
      WHERE ${where}
      ORDER BY emails.internal_date DESC
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

export function assignEmailToMailslot(emailId: string, mailslotId: string) {
  const db = getDb();
  db.prepare(
    `
    INSERT OR IGNORE INTO mailslot_emails (mailslot_id, email_id)
    VALUES (?, ?)
  `
  ).run(mailslotId, emailId);
  db.prepare(
    `
    DELETE FROM mailslot_email_exclusions
    WHERE mailslot_id = ? AND email_id = ?
  `
  ).run(mailslotId, emailId);
}

export function excludeEmailFromMailslot(emailId: string, mailslotId: string) {
  const db = getDb();
  db.prepare(
    `
    DELETE FROM mailslot_emails
    WHERE mailslot_id = ? AND email_id = ?
  `
  ).run(mailslotId, emailId);
  db.prepare(
    `
    INSERT OR IGNORE INTO mailslot_email_exclusions (mailslot_id, email_id)
    VALUES (?, ?)
  `
  ).run(mailslotId, emailId);
}

export function applyEmailMailslotMembership(
  emailId: string,
  selectedSlotIds: string[]
) {
  const current = new Set(getMailslotFiling(emailId).memberIds);

  for (const slotId of selectedSlotIds) {
    if (!current.has(slotId)) {
      assignEmailToMailslot(emailId, slotId);
    }
  }

  for (const slotId of current) {
    if (!selectedSlotIds.includes(slotId)) {
      excludeEmailFromMailslot(emailId, slotId);
    }
  }
}

export function getMailslotFiling(emailId: string): {
  memberIds: string[];
  senderRuleIds: string[];
  domainRuleIds: string[];
} {
  const db = getDb();
  const emailRow = asRow<{ from_email: string; from_domain: string }>(
    db
      .prepare(`SELECT from_email, from_domain FROM emails WHERE id = ?`)
      .get(emailId)
  );
  const fromEmail = emailRow?.from_email ?? "";
  const fromDomain = emailRow?.from_domain ?? "";

  const members = asRows<{ id: string }>(
    db
      .prepare(
        `
        SELECT m.id
        FROM mailslots m
        JOIN emails e ON e.id = ?
        WHERE ${emailMatchesSlot("m.id", "e")}
      `
      )
      .all(emailId)
  );

  const senderRules = asRows<{ id: string }>(
    db
      .prepare(
        `
        SELECT mailslot_id AS id
        FROM mailslot_rules
        WHERE match_type = 'email' AND pattern = ?
      `
      )
      .all(fromEmail)
  );

  const domainRules = asRows<{ id: string }>(
    db
      .prepare(
        `
        SELECT mailslot_id AS id
        FROM mailslot_rules
        WHERE match_type = 'domain'
          AND (
            pattern = ?
            OR ? LIKE ('%.' || pattern)
          )
      `
      )
      .all(fromDomain, fromDomain)
  );

  return {
    memberIds: members.map((row) => row.id),
    senderRuleIds: senderRules.map((row) => row.id),
    domainRuleIds: domainRules.map((row) => row.id),
  };
}

export function backfillSenderFields() {
  const db = getDb();
  const rows = asRows<{ id: string; from: string }>(
    db.prepare(`SELECT id, "from" FROM emails WHERE from_email = ''`).all()
  );

  if (rows.length === 0) {
    return;
  }

  const update = db.prepare(
    `UPDATE emails SET from_email = ?, from_domain = ? WHERE id = ?`
  );

  db.exec("BEGIN");
  try {
    for (const row of rows) {
      const sender = parseFrom(row.from);
      update.run(sender.email, sender.domain, row.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
