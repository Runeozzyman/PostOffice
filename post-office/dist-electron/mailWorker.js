import { n as require_src, t as mimeFromFilename } from "./mimeFromFilename-HyEp37jY.js";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
//#region src/auth/gmailSession.ts
var import_src = require_src();
var credentialsPath = "";
var refreshToken = null;
var cachedClient = null;
var cachedRefreshToken = null;
function configureGmailSession(options) {
	credentialsPath = options.credentialsPath;
	setGmailRefreshToken(options.refreshToken);
}
function setGmailRefreshToken(token) {
	refreshToken = token;
	cachedClient = null;
	cachedRefreshToken = null;
}
async function getAuthenticatedClient() {
	if (!refreshToken) {
		cachedClient = null;
		cachedRefreshToken = null;
		return null;
	}
	if (cachedClient && cachedRefreshToken === refreshToken) return cachedClient;
	const { client_id, client_secret } = JSON.parse(fs.readFileSync(credentialsPath, "utf-8")).installed;
	const oauth2Client = new import_src.google.auth.OAuth2(client_id, client_secret);
	oauth2Client.setCredentials({ refresh_token: refreshToken });
	cachedClient = oauth2Client;
	cachedRefreshToken = refreshToken;
	return oauth2Client;
}
//#endregion
//#region src/db/paths.ts
var userDataPath = "";
function setUserDataPath(next) {
	userDataPath = next;
}
function getUserDataPath() {
	if (!userDataPath) throw new Error("User data path has not been configured.");
	return userDataPath;
}
//#endregion
//#region src/db/database.ts
function asRows$3(rows) {
	return rows;
}
var db = null;
function getDb() {
	if (!db) throw new Error("Database has not been initialized.");
	return db;
}
function tableColumns(database, table) {
	const columns = asRows$3(database.prepare(`PRAGMA table_info(${table})`).all());
	return new Set(columns.map((row) => row.name));
}
function migrate(database) {
	const columns = tableColumns(database, "emails");
	if (!columns.has("body_text")) database.exec(`ALTER TABLE emails ADD COLUMN body_text TEXT NOT NULL DEFAULT ''`);
	if (!columns.has("body_html")) database.exec(`ALTER TABLE emails ADD COLUMN body_html TEXT NOT NULL DEFAULT ''`);
	if (!columns.has("internal_date")) database.exec(`ALTER TABLE emails ADD COLUMN internal_date INTEGER NOT NULL DEFAULT 0`);
	if (!columns.has("labels")) database.exec(`ALTER TABLE emails ADD COLUMN labels TEXT NOT NULL DEFAULT '["INBOX"]'`);
	if (!columns.has("from_email")) database.exec(`ALTER TABLE emails ADD COLUMN from_email TEXT NOT NULL DEFAULT ''`);
	if (!columns.has("from_domain")) database.exec(`ALTER TABLE emails ADD COLUMN from_domain TEXT NOT NULL DEFAULT ''`);
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
}
function collapseExclusiveMailslots(database) {
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
function initDatabase() {
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
//#endregion
//#region src/helpers/parseFrom.ts
function parseFrom(fromHeader) {
	const trimmed = fromHeader.trim();
	const email = (trimmed.match(/<([^>]+)>/)?.[1] ?? trimmed).trim().toLowerCase();
	const at = email.lastIndexOf("@");
	return {
		email,
		domain: at >= 0 ? email.slice(at + 1).replace(/\.+$/, "") : "",
		displayName: trimmed.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() || email
	};
}
function splitAddressParts(header) {
	const parts = [];
	let current = "";
	let quoted = false;
	let angles = 0;
	for (const character of header) {
		if (character === "\"" && angles === 0) quoted = !quoted;
		if (!quoted) {
			if (character === "<") angles += 1;
			else if (character === ">" && angles > 0) angles -= 1;
		}
		if (character === "," && !quoted && angles === 0) {
			if (current.trim()) parts.push(current.trim());
			current = "";
			continue;
		}
		current += character;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
}
function parseAddressList(header) {
	return splitAddressParts(header).map((part) => parseFrom(part)).filter((address) => address.email.includes("@"));
}
//#endregion
//#region src/db/emails.ts
function parseLabels(value) {
	if (!value) return ["INBOX"];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((label) => typeof label === "string") : ["INBOX"];
	} catch {
		return ["INBOX"];
	}
}
function asRows$2(rows) {
	return rows;
}
function asRow$2(row) {
	return row;
}
function toEmail(row) {
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
		mailslotTitle: row.mailslot_title ?? null
	};
}
function existingEmailIds(ids) {
	if (ids.length === 0) return /* @__PURE__ */ new Set();
	const placeholders = ids.map(() => "?").join(",");
	const rows = asRows$2(getDb().prepare(`SELECT id FROM emails WHERE id IN (${placeholders})`).all(...ids));
	return new Set(rows.map((row) => row.id));
}
function replaceEmails(emails) {
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
	const deleteAttachments = db.prepare(`DELETE FROM attachments WHERE email_id = ?`);
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
			upsertEmail.run(email.id, email.threadId, email.from, email.to, email.subject, email.date, email.snippet, email.bodyText, email.bodyHtml, email.internalDate, JSON.stringify(email.labels), sender.email, sender.domain);
			deleteAttachments.run(email.id);
			const dataById = new Map((email.attachmentData ?? []).map((item) => [item.id, item.data]));
			for (const attachment of email.attachments) insertAttachment.run(attachment.id, email.id, attachment.filename, attachment.mimeType, attachment.size, dataById.get(attachment.id) ?? null);
		}
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}
function escapeLike(value) {
	return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}
var INBOX_FILTER = `emails.labels LIKE '%"INBOX"%'`;
var STARRED_FILTER = `emails.labels LIKE '%"STARRED"%'`;
var SENT_FILTER = `emails.labels LIKE '%"SENT"%'`;
var TRASH_FILTER = `emails.labels LIKE '%"TRASH"%'`;
var NOT_TRASH = `emails.labels NOT LIKE '%"TRASH"%'`;
function mailboxFilter(mailbox) {
	if (mailbox === "trash") return TRASH_FILTER;
	return `(${mailbox === "starred" ? STARRED_FILTER : mailbox === "sent" ? SENT_FILTER : INBOX_FILTER}) AND ${NOT_TRASH}`;
}
var LIST_COLUMNS = `
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
var MAILSLOT_SELECT = `
  (
    SELECT m.color
    FROM mailslots m
    WHERE m.id = ${winningMailslotId("emails")}
  ) AS mailslot_color,
  (
    SELECT m.title
    FROM mailslots m
    WHERE m.id = ${winningMailslotId("emails")}
  ) AS mailslot_title
`;
function emailMatchesSlot(slotIdSql, emailTable) {
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
function winningMailslotId(emailTable) {
	return `
    (
      SELECT m.id
      FROM mailslots m
      WHERE ${emailMatchesSlot("m.id", emailTable)}
      ORDER BY m.sort_order ASC, m.created_at ASC
      LIMIT 1
    )
  `;
}
function listInboxPage(options) {
	const pageSize = Math.max(1, options.pageSize);
	const search = options.query?.trim() ?? "";
	const params = [];
	let where = mailboxFilter(options.mailslotId ? "inbox" : options.mailbox ?? "inbox");
	if (options.mailslotId) {
		where += ` AND ${winningMailslotId("emails")} = ?`;
		params.push(options.mailslotId);
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
	const countRow = asRow$2(getDb().prepare(`SELECT COUNT(*) AS count FROM emails WHERE ${where}`).get(...params));
	const total = Number(countRow?.count ?? 0);
	const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
	const page = Math.min(Math.max(1, options.page), pageCount);
	const offset = (page - 1) * pageSize;
	return {
		emails: asRows$2(getDb().prepare(`
      SELECT
        ${LIST_COLUMNS},
        ${MAILSLOT_SELECT}
      FROM emails
      WHERE ${where}
      ORDER BY emails.internal_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset)).map(toEmail),
		total,
		page,
		pageSize
	};
}
function getEmail(id) {
	const emailRow = asRow$2(getDb().prepare(`
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
    `).get(id));
	if (!emailRow) return null;
	const attachments = getDb().prepare(`
      SELECT id, filename, mime_type, size
      FROM attachments
      WHERE email_id = ?
      ORDER BY filename
    `).all(id);
	return {
		...toEmail(emailRow),
		bodyText: emailRow.body_text,
		bodyHtml: emailRow.body_html,
		attachments: asRows$2(attachments).map((attachment) => ({
			id: attachment.id,
			filename: attachment.filename,
			mimeType: attachment.mime_type,
			size: attachment.size
		}))
	};
}
function getEmailLabels(id) {
	const row = asRow$2(getDb().prepare(`SELECT labels FROM emails WHERE id = ?`).get(id));
	if (!row) return null;
	return parseLabels(row.labels);
}
function setEmailLabels(id, labels) {
	if (getDb().prepare(`UPDATE emails SET labels = ? WHERE id = ?`).run(JSON.stringify(labels), id).changes === 0) throw new Error("Email was not found in the local database.");
}
function getStoredAttachment(emailId, attachmentId) {
	const stored = asRow$2(getDb().prepare(`
      SELECT id, filename, mime_type, size, data
      FROM attachments
      WHERE email_id = ? AND id = ?
    `).get(emailId, attachmentId));
	if (!stored) return null;
	return {
		id: stored.id,
		filename: stored.filename,
		mimeType: stored.mime_type,
		size: stored.size,
		data: stored.data ? Buffer.from(stored.data) : null
	};
}
function assignEmailToMailslot(emailId, mailslotId) {
	const db = getDb();
	db.prepare(`
    INSERT OR IGNORE INTO mailslot_emails (mailslot_id, email_id)
    VALUES (?, ?)
  `).run(mailslotId, emailId);
	db.prepare(`
    DELETE FROM mailslot_email_exclusions
    WHERE mailslot_id = ? AND email_id = ?
  `).run(mailslotId, emailId);
}
function excludeEmailFromMailslot(emailId, mailslotId) {
	const db = getDb();
	db.prepare(`
    DELETE FROM mailslot_emails
    WHERE mailslot_id = ? AND email_id = ?
  `).run(mailslotId, emailId);
	db.prepare(`
    INSERT OR IGNORE INTO mailslot_email_exclusions (mailslot_id, email_id)
    VALUES (?, ?)
  `).run(mailslotId, emailId);
}
function applyEmailMailslotMembership(emailId, selectedSlotId) {
	const slots = asRows$2(getDb().prepare(`SELECT id FROM mailslots`).all());
	for (const slot of slots) if (slot.id !== selectedSlotId) excludeEmailFromMailslot(emailId, slot.id);
	if (selectedSlotId) assignEmailToMailslot(emailId, selectedSlotId);
}
function getMailslotFiling(emailId) {
	const db = getDb();
	const emailRow = asRow$2(db.prepare(`SELECT from_email, from_domain FROM emails WHERE id = ?`).get(emailId));
	const fromEmail = emailRow?.from_email ?? "";
	const fromDomain = emailRow?.from_domain ?? "";
	const memberRow = asRow$2(db.prepare(`
        SELECT ${winningMailslotId("e")} AS id
        FROM emails e
        WHERE e.id = ?
      `).get(emailId));
	const senderRules = asRows$2(db.prepare(`
        SELECT mailslot_id AS id
        FROM mailslot_rules
        WHERE match_type = 'email' AND pattern = ?
        LIMIT 1
      `).all(fromEmail));
	const domainRules = asRows$2(db.prepare(`
        SELECT mailslot_id AS id
        FROM mailslot_rules r
        JOIN mailslots m ON m.id = r.mailslot_id
        WHERE r.match_type = 'domain'
          AND (
            r.pattern = ?
            OR ? LIKE ('%.' || r.pattern)
          )
        ORDER BY m.sort_order ASC, m.created_at ASC
        LIMIT 1
      `).all(fromDomain, fromDomain));
	return {
		memberIds: memberRow?.id ? [memberRow.id] : [],
		senderRuleIds: senderRules.map((row) => row.id),
		domainRuleIds: domainRules.map((row) => row.id)
	};
}
function backfillSenderFields() {
	const db = getDb();
	const rows = asRows$2(db.prepare(`SELECT id, "from" FROM emails WHERE from_email = ''`).all());
	if (rows.length === 0) return;
	const update = db.prepare(`UPDATE emails SET from_email = ?, from_domain = ? WHERE id = ?`);
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
var addressContactsCache = null;
function rebuildAddressContactsCache() {
	const db = getDb();
	const senders = asRows$2(db.prepare(`
        SELECT from_email, "from", MAX(internal_date) AS last
        FROM emails
        WHERE from_email != ''
        GROUP BY from_email
        ORDER BY last DESC
        LIMIT 80
      `).all());
	const recipients = asRows$2(db.prepare(`
        SELECT "to" AS "to", internal_date AS last
        FROM emails
        WHERE "to" != ''
        ORDER BY internal_date DESC
        LIMIT 120
      `).all());
	const best = /* @__PURE__ */ new Map();
	const consider = (email, name, last) => {
		const key = email.toLowerCase().trim();
		if (!key.includes("@")) return;
		const existing = best.get(key);
		const display = name && name.toLowerCase() !== key ? name : existing?.name ?? "";
		if (!existing || last > existing.last) {
			best.set(key, {
				email: key,
				name: display,
				last
			});
			return;
		}
		if (!existing.name && display) existing.name = display;
	};
	for (const row of senders) {
		const parsed = parseFrom(row.from);
		consider(row.from_email || parsed.email, parsed.displayName, row.last);
	}
	for (const row of recipients) for (const address of parseAddressList(row.to)) consider(address.email, address.displayName, row.last);
	addressContactsCache = [...best.values()].sort((left, right) => right.last - left.last);
}
function searchAddressSuggestions(query) {
	if (!addressContactsCache) rebuildAddressContactsCache();
	const contacts = addressContactsCache ?? [];
	const needle = query.trim().toLowerCase();
	return (needle ? contacts.filter((entry) => entry.email.includes(needle) || entry.name.toLowerCase().includes(needle)) : contacts).slice(0, 8).map((entry) => ({
		email: entry.email,
		name: entry.name
	}));
}
//#endregion
//#region src/db/mailslots.ts
function asRows$1(rows) {
	return rows;
}
function asRow$1(row) {
	return row;
}
var ICONS = [
	"box",
	"briefcase",
	"home",
	"heart",
	"star",
	"tag",
	"send",
	"bookmark"
];
function toMailslot(row) {
	return {
		id: row.id,
		title: row.title,
		color: row.color,
		icon: ICONS.includes(row.icon) ? row.icon : "box",
		createdAt: row.created_at,
		sortOrder: row.sort_order
	};
}
function listMailslots() {
	return asRows$1(getDb().prepare(`
      SELECT id, title, color, icon, created_at, sort_order
      FROM mailslots
      ORDER BY sort_order ASC, created_at ASC
    `).all()).map(toMailslot);
}
function getMailslot(id) {
	const row = asRow$1(getDb().prepare(`
        SELECT id, title, color, icon, created_at, sort_order
        FROM mailslots
        WHERE id = ?
      `).get(id));
	return row ? toMailslot(row) : null;
}
function createMailslot(input) {
	const title = input.title.trim();
	if (!title) throw new Error("A mailslot title is required.");
	if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) throw new Error("A valid colour is required.");
	const db = getDb();
	const maxOrder = asRow$1(db.prepare(`SELECT MAX(sort_order) AS max_order FROM mailslots`).get());
	const sortOrder = Number(maxOrder?.max_order ?? -1) + 1;
	const mailslot = {
		id: randomUUID(),
		title,
		color: input.color.toLowerCase(),
		icon: ICONS.includes(input.icon) ? input.icon : "box",
		createdAt: Date.now(),
		sortOrder
	};
	db.prepare(`
    INSERT INTO mailslots (id, title, color, icon, created_at, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(mailslot.id, mailslot.title, mailslot.color, mailslot.icon, mailslot.createdAt, mailslot.sortOrder);
	return mailslot;
}
function updateMailslot(input) {
	const title = input.title.trim();
	if (!title) throw new Error("A mailslot title is required.");
	if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) throw new Error("A valid colour is required.");
	const existing = getMailslot(input.id);
	if (!existing) throw new Error("Mailslot was not found.");
	const icon = ICONS.includes(input.icon) ? input.icon : "box";
	const color = input.color.toLowerCase();
	getDb().prepare(`
      UPDATE mailslots
      SET title = ?, color = ?, icon = ?
      WHERE id = ?
    `).run(title, color, icon, input.id);
	return {
		...existing,
		title,
		color,
		icon
	};
}
function deleteMailslot(id) {
	if (!getMailslot(id)) throw new Error("Mailslot was not found.");
	getDb().prepare(`DELETE FROM mailslots WHERE id = ?`).run(id);
}
function addMailslotRule(input) {
	const pattern = input.pattern.trim().toLowerCase();
	if (!pattern) throw new Error("A sender pattern is required.");
	if (!getMailslot(input.mailslotId)) throw new Error("Mailslot was not found.");
	getDb().prepare(`
      INSERT OR IGNORE INTO mailslot_rules (id, mailslot_id, match_type, pattern)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), input.mailslotId, input.matchType, pattern);
}
function applyMailslotRules(input) {
	const pattern = input.pattern.trim().toLowerCase();
	getDb().prepare(`
      DELETE FROM mailslot_rules
      WHERE match_type = ? AND pattern = ?
    `).run(input.matchType, pattern);
	if (input.selectedSlotId) addMailslotRule({
		mailslotId: input.selectedSlotId,
		matchType: input.matchType,
		pattern
	});
}
//#endregion
//#region src/db/drafts.ts
function asRows(rows) {
	return rows;
}
function asRow(row) {
	return row;
}
function draftsRoot() {
	return path.join(getUserDataPath(), "draft-files");
}
function draftFolder(id) {
	return path.join(draftsRoot(), id);
}
function listAttachments(draftId) {
	return asRows(getDb().prepare(`
        SELECT id, filename, mime_type, size, stored_path
        FROM draft_attachments
        WHERE draft_id = ?
        ORDER BY filename
      `).all(draftId)).map((row) => ({
		path: row.stored_path,
		filename: row.filename,
		size: row.size,
		mimeType: row.mime_type
	}));
}
function toDraft(row) {
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
		attachments: listAttachments(row.id)
	};
}
function isDraftEmpty(input) {
	return !input.to.trim() && !input.cc.trim() && !input.bcc.trim() && !input.subject.trim() && !input.body.trim() && input.attachments.length === 0;
}
function listDrafts() {
	return asRows(getDb().prepare(`
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
      `).all()).map(toDraft);
}
function getDraft(id) {
	const row = asRow(getDb().prepare(`
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
      `).get(id));
	return row ? toDraft(row) : null;
}
function deleteDraft(id) {
	getDb().prepare(`DELETE FROM drafts WHERE id = ?`).run(id);
	const folder = draftFolder(id);
	if (fs.existsSync(folder)) fs.rmSync(folder, {
		recursive: true,
		force: true
	});
}
function saveDraft(input) {
	const attachments = input.attachments ?? [];
	if (isDraftEmpty({
		to: input.to,
		cc: input.cc ?? "",
		bcc: input.bcc ?? "",
		subject: input.subject,
		body: input.body,
		attachments
	})) {
		if (input.id) deleteDraft(input.id);
		return null;
	}
	const id = input.id || randomUUID();
	const updatedAt = Date.now();
	const folder = draftFolder(id);
	fs.mkdirSync(folder, { recursive: true });
	const db = getDb();
	const existing = asRows(db.prepare(`SELECT id, filename, mime_type, size, stored_path FROM draft_attachments WHERE draft_id = ?`).all(id));
	const keepPaths = /* @__PURE__ */ new Set();
	const nextAttachments = [];
	const resolvedFolder = path.resolve(folder);
	for (const attachment of attachments) {
		const alreadyStored = path.resolve(attachment.path).startsWith(resolvedFolder + path.sep);
		let storedPath = attachment.path;
		if (!alreadyStored) {
			if (!fs.existsSync(attachment.path)) throw new Error(`Attachment is no longer available: ${attachment.filename}`);
			const unique = `${randomUUID()}-${attachment.filename.replace(/[\\/]/g, "_")}`;
			storedPath = path.join(folder, unique);
			fs.copyFileSync(attachment.path, storedPath);
		}
		keepPaths.add(path.resolve(storedPath));
		const size = fs.existsSync(storedPath) ? fs.statSync(storedPath).size : attachment.size;
		nextAttachments.push({
			path: storedPath,
			filename: attachment.filename,
			size,
			mimeType: attachment.mimeType
		});
	}
	for (const row of existing) {
		const resolvedStored = path.resolve(row.stored_path);
		if (!keepPaths.has(resolvedStored) && fs.existsSync(row.stored_path)) fs.unlinkSync(row.stored_path);
	}
	db.exec("BEGIN");
	try {
		db.prepare(`
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
    `).run(id, input.to, input.cc ?? "", input.bcc ?? "", input.subject, input.body, input.threadId ?? "", input.inReplyToMessageId ?? "", updatedAt);
		db.prepare(`DELETE FROM draft_attachments WHERE draft_id = ?`).run(id);
		const insert = db.prepare(`
      INSERT INTO draft_attachments (id, draft_id, filename, mime_type, size, stored_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
		for (const attachment of nextAttachments) insert.run(randomUUID(), id, attachment.filename, attachment.mimeType, attachment.size, attachment.path);
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
	return getDraft(id);
}
//#endregion
//#region src/helpers/emailLabels.ts
function withStarred(labels, starred) {
	const next = labels.filter((label) => label !== "STARRED");
	return starred ? [...next, "STARRED"] : next;
}
function withTrashed(labels) {
	return [...labels.filter((label) => label !== "INBOX" && label !== "TRASH"), "TRASH"];
}
function withRestored(labels) {
	const next = labels.filter((label) => label !== "TRASH");
	return next.includes("INBOX") ? next : [...next, "INBOX"];
}
//#endregion
//#region src/services/gmailBackground.ts
var chains = /* @__PURE__ */ new Map();
var generation = /* @__PURE__ */ new Map();
function nextLabelGeneration(id) {
	const value = (generation.get(id) ?? 0) + 1;
	generation.set(id, value);
	return value;
}
function enqueueGmailLabelSync(id, gen, previousLabels, work, onFailure) {
	const run = async () => {
		try {
			await work();
		} catch (error) {
			if (generation.get(id) !== gen) return;
			setEmailLabels(id, previousLabels);
			onFailure(error instanceof Error ? error : new Error(String(error)));
		}
	};
	const next = (chains.get(id) ?? Promise.resolve()).then(run, run);
	chains.set(id, next);
	next.finally(() => {
		if (chains.get(id) === next) chains.delete(id);
	});
}
//#endregion
//#region src/services/gmailProfile.ts
var cachedAddress;
function clearGmailProfileCache() {
	cachedAddress = void 0;
}
async function getGmailAddress() {
	if (cachedAddress !== void 0) return cachedAddress;
	const auth = await getAuthenticatedClient();
	if (!auth) {
		cachedAddress = null;
		return null;
	}
	cachedAddress = (await import_src.google.gmail({
		version: "v1",
		auth
	}).users.getProfile({ userId: "me" })).data.emailAddress ?? null;
	return cachedAddress;
}
//#endregion
//#region src/services/gmailPayload.ts
function getHeader$1(headers, name) {
	return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}
function decodeBase64Url(data) {
	const padded = data.replace(/-/g, "+").replace(/_/g, "/");
	return Buffer.from(padded, "base64");
}
function walkParts(part, collected) {
	if (!part) return;
	const mimeType = part.mimeType ?? "";
	const filename = part.filename ?? "";
	const body = part.body;
	if (filename) {
		const id = body?.attachmentId ?? `inline-${collected.attachments.length}`;
		const data = body?.data ? decodeBase64Url(body.data) : null;
		collected.attachments.push({
			id,
			filename,
			mimeType: mimeType || "application/octet-stream",
			size: body?.size ?? data?.length ?? 0,
			data
		});
	} else if (mimeType === "text/plain" && body?.data) collected.text.push(decodeBase64Url(body.data).toString("utf8"));
	else if (mimeType === "text/html" && body?.data) collected.html.push(decodeBase64Url(body.data).toString("utf8"));
	for (const child of part.parts ?? []) walkParts(child, collected);
}
function parseGmailMessage(message) {
	const headers = message.payload?.headers ?? [];
	const collected = {
		text: [],
		html: [],
		attachments: []
	};
	walkParts(message.payload, collected);
	const attachments = collected.attachments.map((attachment) => ({
		id: attachment.id,
		filename: attachment.filename,
		mimeType: attachment.mimeType,
		size: attachment.size
	}));
	return {
		id: message.id ?? "",
		threadId: message.threadId ?? "",
		from: getHeader$1(headers, "From"),
		to: getHeader$1(headers, "To"),
		subject: getHeader$1(headers, "Subject"),
		date: getHeader$1(headers, "Date"),
		snippet: message.snippet ?? "",
		bodyText: collected.text.join("\n"),
		bodyHtml: collected.html.join("\n"),
		attachments,
		internalDate: Number(message.internalDate ?? 0),
		labels: message.labelIds ?? [],
		attachmentData: collected.attachments.map((attachment) => ({
			id: attachment.id,
			data: attachment.data
		}))
	};
}
//#endregion
//#region src/services/gmailSend.ts
function asError$2(error) {
	if (error instanceof Error) return error;
	return new Error(String(error));
}
function getHeader(headers, name) {
	return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}
function encodeHeader(value) {
	if (/^[\x20-\x7e]*$/.test(value)) return value;
	return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
function toBase64Url(value) {
	return (typeof value === "string" ? Buffer.from(value, "utf8") : value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function wrapBase64(value) {
	return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}
function filenameParam(name) {
	if (/^[\x20-\x7e]*$/.test(name) && !name.includes("\"")) return `filename="${name.replaceAll("\\", "\\\\")}"`;
	return `filename*=UTF-8''${encodeURIComponent(name)}`;
}
function loadAttachments(items) {
	const loaded = [];
	let total = 0;
	for (const item of items) {
		const filePath = item.path;
		if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error(`Could not read attachment “${item.filename}”.`);
		const data = fs.readFileSync(filePath);
		total += data.length;
		if (total > 26214400) throw new Error("Attachments are over Gmail’s 25 MB limit. Remove a file and try again.");
		loaded.push({
			filename: item.filename || path.basename(filePath),
			mimeType: item.mimeType || mimeFromFilename(item.filename || filePath),
			data
		});
	}
	return loaded;
}
function buildRawMessage(input, reply) {
	const attachments = loadAttachments(input.attachments ?? []);
	const headers = [
		`To: ${input.to.trim()}`,
		input.cc?.trim() ? `Cc: ${input.cc.trim()}` : null,
		input.bcc?.trim() ? `Bcc: ${input.bcc.trim()}` : null,
		`Subject: ${encodeHeader(input.subject.trim() || "(no subject)")}`,
		reply?.inReplyTo ? `In-Reply-To: ${reply.inReplyTo}` : null,
		reply?.references ? `References: ${reply.references}` : null,
		"MIME-Version: 1.0"
	].filter((line) => Boolean(line));
	if (attachments.length === 0) return Buffer.from(`${headers.join("\r\n")}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${input.body}`, "utf8");
	const boundary = `po_${randomBytes(12).toString("hex")}`;
	const parts = [`${headers.join("\r\n")}\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n`, `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${input.body}\r\n`];
	for (const attachment of attachments) parts.push(`--${boundary}\r\nContent-Type: ${attachment.mimeType}; name="${attachment.filename.replaceAll("\"", "")}"\r\nContent-Disposition: attachment; ${filenameParam(attachment.filename)}\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrapBase64(attachment.data.toString("base64"))}\r\n`);
	parts.push(`--${boundary}--\r\n`);
	return Buffer.concat(parts.map((part) => Buffer.from(part, "utf8")));
}
async function sendGmailMessage(input) {
	if (!input.to.trim()) throw new Error("Add at least one recipient.");
	const auth = await getAuthenticatedClient();
	if (!auth) throw new Error("User is not authenticated.");
	const gmail = import_src.google.gmail({
		version: "v1",
		auth
	});
	let replyHeaders;
	let threadId = input.threadId?.trim() || void 0;
	if (input.inReplyToMessageId?.trim()) try {
		const original = await gmail.users.messages.get({
			userId: "me",
			id: input.inReplyToMessageId.trim(),
			format: "metadata",
			metadataHeaders: ["Message-ID", "References"]
		});
		const headers = original.data.payload?.headers ?? [];
		const messageId = getHeader(headers, "Message-ID");
		const references = [getHeader(headers, "References"), messageId].filter(Boolean).join(" ").trim();
		if (messageId) replyHeaders = {
			inReplyTo: messageId,
			references
		};
		threadId = original.data.threadId || threadId;
	} catch {}
	try {
		const id = (await gmail.users.messages.send({
			userId: "me",
			requestBody: {
				raw: toBase64Url(buildRawMessage(input, replyHeaders)),
				...threadId ? { threadId } : {}
			}
		})).data.id;
		if (!id) return;
		replaceEmails([parseGmailMessage((await gmail.users.messages.get({
			userId: "me",
			id,
			format: "full"
		})).data)]);
	} catch (error) {
		const message = asError$2(error).message;
		if (message.includes("insufficient") || message.includes("403")) throw new Error("Google blocked sending mail. Sign out, sign in, and accept the prompt to send email.");
		throw asError$2(error);
	}
}
//#endregion
//#region src/services/gmailStar.ts
function asError$1(error) {
	if (error instanceof Error) return error;
	return new Error(String(error));
}
async function setGmailStarred(id, starred) {
	const auth = await getAuthenticatedClient();
	if (!auth) throw new Error("User is not authenticated.");
	try {
		await import_src.google.gmail({
			version: "v1",
			auth
		}).users.messages.modify({
			userId: "me",
			id,
			requestBody: starred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] }
		});
	} catch (error) {
		const message = asError$1(error).message;
		if (message.includes("insufficient") || message.includes("insufficientPermissions") || message.includes("403")) throw new Error("Google blocked starring this message. Sign out, sign in, and accept the prompt to view and edit mail.");
		throw asError$1(error);
	}
}
//#endregion
//#region src/services/gmailBatch.ts
var BATCH_ENDPOINT = "https://www.googleapis.com/batch/gmail/v1";
function extractBoundary(contentType) {
	if (!contentType) return null;
	return contentType.match(/boundary="?([^";]+)"?/i)?.[1] ?? null;
}
function parseBatchResponse(raw, boundary) {
	const delimiter = `--${boundary}`;
	return raw.split(delimiter).filter((part) => {
		const trimmed = part.trim();
		return trimmed.length > 0 && trimmed !== "--";
	}).map((part) => {
		const jsonStart = part.indexOf("{");
		const jsonEnd = part.lastIndexOf("}");
		if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) throw new Error("Gmail batch response part was not JSON.");
		return JSON.parse(part.slice(jsonStart, jsonEnd + 1));
	});
}
function isGmailMessage(value) {
	return typeof value === "object" && value !== null && "id" in value && !("error" in value);
}
async function batchGetMessages(auth, ids) {
	if (ids.length === 0) return [];
	const boundary = `batch_${Date.now()}_${Math.random().toString(16).slice(2)}`;
	const body = ids.map((id, index) => {
		const path = `/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`;
		return [
			`--${boundary}`,
			"Content-Type: application/http",
			`Content-ID: <item${index}>`,
			"",
			`GET ${path}`,
			""
		].join("\r\n");
	}).join("\r\n") + `\r\n--${boundary}--\r\n`;
	const response = await auth.request({
		url: BATCH_ENDPOINT,
		method: "POST",
		headers: { "Content-Type": `multipart/mixed; boundary="${boundary}"` },
		data: body,
		responseType: "text"
	});
	const headerMap = response.headers;
	const contentType = headerMap.get?.("content-type") ?? headerMap["content-type"] ?? headerMap["Content-Type"];
	const responseBoundary = extractBoundary(typeof contentType === "string" ? contentType : String(contentType ?? "")) ?? boundary;
	const messages = parseBatchResponse(String(response.data), responseBoundary).filter(isGmailMessage);
	if (messages.length === 0) throw new Error("Gmail batch request returned no messages.");
	return messages;
}
//#endregion
//#region src/services/gmailSync.tsx
var LIST_PAGE_SIZE = 500;
var WRITE_BATCH_SIZE = 20;
function chunk(items, size) {
	const groups = [];
	for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
	return groups;
}
function toListEmail(email) {
	return {
		id: email.id,
		threadId: email.threadId,
		from: email.from,
		to: email.to,
		subject: email.subject,
		date: email.date,
		snippet: email.snippet,
		internalDate: email.internalDate,
		labels: email.labels
	};
}
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getMessagesInOrder(auth, ids) {
	const gmail = import_src.google.gmail({
		version: "v1",
		auth
	});
	try {
		const fetched = await batchGetMessages(auth, ids);
		const byId = new Map(fetched.filter((message) => message.id).map((message) => [message.id, message]));
		return ids.map((id) => byId.get(id)).filter((message) => Boolean(message));
	} catch (error) {
		console.warn("Gmail batch fetch failed, falling back to individual gets.", error);
		const messages = [];
		for (const id of ids) {
			const response = await gmail.users.messages.get({
				userId: "me",
				id,
				format: "full"
			});
			if (response.data.id) messages.push(response.data);
		}
		return messages;
	}
}
async function storeMessages(auth, ids, onStored, onProgress, storedThisRun = { count: 0 }) {
	for (const batchIds of chunk(ids, WRITE_BATCH_SIZE)) {
		const messages = await getMessagesInOrder(auth, batchIds);
		for (const message of messages) {
			const parsed = parseGmailMessage(message);
			if (!parsed.id) continue;
			replaceEmails([parsed]);
			storedThisRun.count += 1;
			onStored?.(toListEmail(parsed));
			onProgress?.({ storedThisRun: storedThisRun.count });
		}
		await sleep(0);
	}
}
async function syncInboxEmails(onStored, onProgress) {
	const auth = await getAuthenticatedClient();
	if (!auth) throw new Error("User is not authenticated.");
	const gmail = import_src.google.gmail({
		version: "v1",
		auth
	});
	const storedThisRun = { count: 0 };
	let pageToken;
	let listed = 0;
	console.log("Starting mailbox sync from newest messages.");
	do {
		const response = await gmail.users.messages.list({
			userId: "me",
			maxResults: LIST_PAGE_SIZE,
			pageToken
		});
		const pageIds = (response.data.messages ?? []).map((message) => message.id).filter((id) => Boolean(id));
		listed += pageIds.length;
		const alreadyStored = existingEmailIds(pageIds);
		const missingIds = pageIds.filter((id) => !alreadyStored.has(id));
		if (missingIds.length > 0) await storeMessages(auth, missingIds, onStored, onProgress, storedThisRun);
		pageToken = response.data.nextPageToken ?? void 0;
		console.log(`Listed ${listed} message ids, stored ${storedThisRun.count} new messages.`);
		if (pageIds.length === 0 || missingIds.length === 0) break;
	} while (pageToken);
	console.log(`Mailbox sync finished. Stored ${storedThisRun.count} new messages.`);
	return storedThisRun.count;
}
//#endregion
//#region src/services/gmailTrash.ts
function asError(error) {
	if (error instanceof Error) return error;
	return new Error(String(error));
}
function rethrowTrashError(error) {
	const message = asError(error).message;
	if (message.includes("insufficient") || message.includes("insufficientPermissions") || message.includes("403")) throw new Error("Google blocked moving this message. Sign out, sign in, and accept the prompt to view and edit mail. If that prompt does not appear, open myaccount.google.com/permissions, remove PostOffice, then sign in again.");
	throw asError(error);
}
async function gmailClient() {
	const auth = await getAuthenticatedClient();
	if (!auth) throw new Error("User is not authenticated.");
	return import_src.google.gmail({
		version: "v1",
		auth
	});
}
async function trashGmailMessage(id) {
	try {
		await (await gmailClient()).users.messages.trash({
			userId: "me",
			id
		});
	} catch (error) {
		rethrowTrashError(error);
	}
}
async function untrashGmailMessage(id) {
	try {
		await (await gmailClient()).users.messages.modify({
			userId: "me",
			id,
			requestBody: {
				addLabelIds: ["INBOX"],
				removeLabelIds: ["TRASH"]
			}
		});
	} catch (error) {
		rethrowTrashError(error);
	}
}
//#endregion
//#region src/main/mailWorker.ts
function parentPort() {
	const port = process.parentPort;
	if (!port) throw new Error("Mail worker must run as an Electron utility process.");
	return port;
}
function send(message) {
	parentPort().postMessage(message);
}
function asErrorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
var mailboxSyncInFlight = false;
async function handle(method, payload) {
	switch (method) {
		case "listEmails": return listInboxPage(payload);
		case "syncEmails":
			if (mailboxSyncInFlight) return;
			mailboxSyncInFlight = true;
			try {
				if (await syncInboxEmails((email) => {
					send({
						kind: "event",
						event: "email-stored",
						payload: email
					});
				}, (progress) => {
					send({
						kind: "event",
						event: "sync-progress",
						payload: progress
					});
				}) > 0) rebuildAddressContactsCache();
				return;
			} finally {
				mailboxSyncInFlight = false;
			}
		case "listMailslots": return listMailslots();
		case "createMailslot": return createMailslot(payload);
		case "updateMailslot": return updateMailslot(payload);
		case "deleteMailslot":
			deleteMailslot(payload);
			return true;
		case "getMailslotFiling": return getMailslotFiling(payload);
		case "applyEmailMailslots": {
			const input = payload;
			applyEmailMailslotMembership(input.emailId, input.selectedSlotId);
			return true;
		}
		case "applyMailslotRules":
			applyMailslotRules(payload);
			return true;
		case "getEmail": return getEmail(payload);
		case "trashEmail": {
			const id = payload;
			const previous = getEmailLabels(id);
			if (!previous) throw new Error("Email was not found in the local database.");
			setEmailLabels(id, withTrashed(previous));
			enqueueGmailLabelSync(id, nextLabelGeneration(id), previous, () => trashGmailMessage(id), (error) => {
				send({
					kind: "event",
					event: "email-action-failed",
					payload: {
						email: getEmail(id),
						message: error.message
					}
				});
			});
			return true;
		}
		case "untrashEmail": {
			const id = payload;
			const previous = getEmailLabels(id);
			if (!previous) throw new Error("Email was not found in the local database.");
			setEmailLabels(id, withRestored(previous));
			enqueueGmailLabelSync(id, nextLabelGeneration(id), previous, () => untrashGmailMessage(id), (error) => {
				send({
					kind: "event",
					event: "email-action-failed",
					payload: {
						email: getEmail(id),
						message: error.message
					}
				});
			});
			return true;
		}
		case "setEmailStarred": {
			const input = payload;
			const previous = getEmailLabels(input.id);
			if (!previous) throw new Error("Email was not found in the local database.");
			setEmailLabels(input.id, withStarred(previous, input.starred));
			const gen = nextLabelGeneration(input.id);
			enqueueGmailLabelSync(input.id, gen, previous, () => setGmailStarred(input.id, input.starred), (error) => {
				send({
					kind: "event",
					event: "email-action-failed",
					payload: {
						email: getEmail(input.id),
						message: error.message
					}
				});
			});
			return true;
		}
		case "sendEmail":
			await sendGmailMessage(payload);
			rebuildAddressContactsCache();
			return true;
		case "listDrafts": return listDrafts();
		case "getDraft": return typeof payload === "string" ? getDraft(payload) : null;
		case "saveDraft": {
			const input = payload;
			return saveDraft({
				id: input?.id,
				to: input?.to ?? "",
				cc: input?.cc,
				bcc: input?.bcc,
				subject: input?.subject ?? "",
				body: input?.body ?? "",
				threadId: input?.threadId,
				inReplyToMessageId: input?.inReplyToMessageId,
				attachments: input?.attachments
			});
		}
		case "deleteDraft":
			if (typeof payload === "string" && payload) deleteDraft(payload);
			return true;
		case "suggestAddresses": return searchAddressSuggestions(typeof payload === "string" ? payload : "");
		case "getAccountEmail": return getGmailAddress();
		case "loadAttachment": {
			const input = payload;
			const stored = getStoredAttachment(input.messageId, input.attachmentId);
			if (!stored) throw new Error("Attachment was not found.");
			let bytes = stored.data;
			if (!bytes) {
				const auth = await getAuthenticatedClient();
				if (!auth) throw new Error("User is not authenticated.");
				const response = await import_src.google.gmail({
					version: "v1",
					auth
				}).users.messages.attachments.get({
					userId: "me",
					messageId: input.messageId,
					id: input.attachmentId
				});
				if (!response.data.data) throw new Error("Gmail did not return attachment data.");
				bytes = Buffer.from(response.data.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
			}
			return {
				filename: stored.filename,
				dataBase64: Buffer.from(bytes).toString("base64")
			};
		}
		case "setRefreshToken":
			setGmailRefreshToken(typeof payload === "string" ? payload : null);
			clearGmailProfileCache();
			return true;
		default: throw new Error(`Unknown mail method: ${method}`);
	}
}
parentPort().on("message", (event) => {
	const message = event.data;
	if (message?.kind === "init") {
		try {
			setUserDataPath(message.init.userDataPath);
			configureGmailSession({
				credentialsPath: message.init.credentialsPath,
				refreshToken: message.init.refreshToken
			});
			initDatabase();
			backfillSenderFields();
			rebuildAddressContactsCache();
			send({ kind: "ready" });
		} catch (error) {
			send({
				kind: "fatal",
				error: asErrorMessage(error)
			});
		}
		return;
	}
	if (message?.kind !== "request") return;
	const request = message;
	handle(request.method, request.payload).then((result) => {
		send({
			kind: "response",
			id: request.id,
			ok: true,
			result
		});
	}).catch((error) => {
		send({
			kind: "response",
			id: request.id,
			ok: false,
			error: asErrorMessage(error)
		});
	});
});
//#endregion
export {};
