import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { ComposeAttachment, StoredDraft } from "../types/compose";
import { getDb } from "./database";

function asRows<T>(rows: unknown): T[] {
  return rows as T[];
}

function asRow<T>(row: unknown): T | undefined {
  return row as T | undefined;
}

interface DraftRecord {
  id: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  thread_id: string;
  in_reply_to_message_id: string;
  updated_at: number;
}

interface AttachmentRecord {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  stored_path: string;
}

function draftsRoot() {
  return path.join(app.getPath("userData"), "draft-files");
}

function draftFolder(id: string) {
  return path.join(draftsRoot(), id);
}

function listAttachments(draftId: string): ComposeAttachment[] {
  const rows = asRows<AttachmentRecord>(
    getDb()
      .prepare(
        `
        SELECT id, filename, mime_type, size, stored_path
        FROM draft_attachments
        WHERE draft_id = ?
        ORDER BY filename
      `
      )
      .all(draftId)
  );

  return rows.map((row) => ({
    path: row.stored_path,
    filename: row.filename,
    size: row.size,
    mimeType: row.mime_type,
  }));
}

function toDraft(row: DraftRecord): StoredDraft {
  return {
    id: row.id,
    to: row.to,
    cc: row.cc,
    bcc: row.bcc,
    subject: row.subject,
    body: row.body,
    threadId: row.thread_id,
    inReplyToMessageId: row.in_reply_to_message_id,
    updatedAt: row.updated_at,
    attachments: listAttachments(row.id),
  };
}

export function isDraftEmpty(input: {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: ComposeAttachment[];
}) {
  return (
    !input.to.trim() &&
    !input.cc.trim() &&
    !input.bcc.trim() &&
    !input.subject.trim() &&
    !input.body.trim() &&
    input.attachments.length === 0
  );
}

export function listDrafts(): StoredDraft[] {
  const rows = asRows<DraftRecord>(
    getDb()
      .prepare(
        `
        SELECT
          id,
          "to",
          cc,
          bcc,
          subject,
          body,
          thread_id,
          in_reply_to_message_id,
          updated_at
        FROM drafts
        ORDER BY updated_at DESC
      `
      )
      .all()
  );

  return rows.map(toDraft);
}

export function getDraft(id: string): StoredDraft | null {
  const row = asRow<DraftRecord>(
    getDb()
      .prepare(
        `
        SELECT
          id,
          "to",
          cc,
          bcc,
          subject,
          body,
          thread_id,
          in_reply_to_message_id,
          updated_at
        FROM drafts
        WHERE id = ?
      `
      )
      .get(id)
  );

  return row ? toDraft(row) : null;
}

export function deleteDraft(id: string) {
  getDb().prepare(`DELETE FROM drafts WHERE id = ?`).run(id);

  const folder = draftFolder(id);
  if (fs.existsSync(folder)) {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

export function saveDraft(input: {
  id?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyToMessageId?: string;
  attachments?: ComposeAttachment[];
}): StoredDraft | null {
  const attachments = input.attachments ?? [];
  const empty = isDraftEmpty({
    to: input.to,
    cc: input.cc ?? "",
    bcc: input.bcc ?? "",
    subject: input.subject,
    body: input.body,
    attachments,
  });

  if (empty) {
    if (input.id) {
      deleteDraft(input.id);
    }
    return null;
  }

  const id = input.id || randomUUID();
  const updatedAt = Date.now();
  const folder = draftFolder(id);
  fs.mkdirSync(folder, { recursive: true });

  const db = getDb();
  const existing = asRows<AttachmentRecord>(
    db
      .prepare(
        `SELECT id, filename, mime_type, size, stored_path FROM draft_attachments WHERE draft_id = ?`
      )
      .all(id)
  );
  const keepPaths = new Set<string>();
  const nextAttachments: ComposeAttachment[] = [];
  const resolvedFolder = path.resolve(folder);

  for (const attachment of attachments) {
    const resolvedIncoming = path.resolve(attachment.path);
    const alreadyStored = resolvedIncoming.startsWith(
      resolvedFolder + path.sep
    );

    let storedPath = attachment.path;
    if (!alreadyStored) {
      if (!fs.existsSync(attachment.path)) {
        throw new Error(
          `Attachment is no longer available: ${attachment.filename}`
        );
      }
      const unique = `${randomUUID()}-${attachment.filename.replace(/[\\/]/g, "_")}`;
      storedPath = path.join(folder, unique);
      fs.copyFileSync(attachment.path, storedPath);
    }

    keepPaths.add(path.resolve(storedPath));
    const size = fs.existsSync(storedPath)
      ? fs.statSync(storedPath).size
      : attachment.size;
    nextAttachments.push({
      path: storedPath,
      filename: attachment.filename,
      size,
      mimeType: attachment.mimeType,
    });
  }

  for (const row of existing) {
    const resolvedStored = path.resolve(row.stored_path);
    if (!keepPaths.has(resolvedStored) && fs.existsSync(row.stored_path)) {
      fs.unlinkSync(row.stored_path);
    }
  }

  db.exec("BEGIN");
  try {
    db.prepare(
      `
      INSERT INTO drafts (
        id, "to", cc, bcc, subject, body, thread_id, in_reply_to_message_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        "to" = excluded."to",
        cc = excluded.cc,
        bcc = excluded.bcc,
        subject = excluded.subject,
        body = excluded.body,
        thread_id = excluded.thread_id,
        in_reply_to_message_id = excluded.in_reply_to_message_id,
        updated_at = excluded.updated_at
    `
    ).run(
      id,
      input.to,
      input.cc ?? "",
      input.bcc ?? "",
      input.subject,
      input.body,
      input.threadId ?? "",
      input.inReplyToMessageId ?? "",
      updatedAt
    );

    db.prepare(`DELETE FROM draft_attachments WHERE draft_id = ?`).run(id);

    const insert = db.prepare(
      `
      INSERT INTO draft_attachments (id, draft_id, filename, mime_type, size, stored_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    );

    for (const attachment of nextAttachments) {
      insert.run(
        randomUUID(),
        id,
        attachment.filename,
        attachment.mimeType,
        attachment.size,
        attachment.path
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getDraft(id);
}
