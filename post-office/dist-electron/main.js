import { n as require_src, t as mimeFromFilename } from "./mimeFromFilename-HyEp37jY.js";
import { BrowserWindow, app, dialog, ipcMain, safeStorage, shell, utilityProcess } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
//#region src/auth/tokenStorage.ts
var import_src = require_src();
function tokenPath() {
	return path.join(app.getPath("userData"), "google-token");
}
function saveRefreshToken(refreshToken) {
	if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure storage is not available.");
	const encryptedToken = safeStorage.encryptString(refreshToken);
	fs.writeFileSync(tokenPath(), encryptedToken);
	console.log("Refresh token securely stored.");
}
function loadRefreshToken() {
	const filePath = tokenPath();
	if (!fs.existsSync(filePath)) return null;
	if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure storage is not available.");
	try {
		return safeStorage.decryptString(fs.readFileSync(filePath));
	} catch {
		console.warn("Stored Google token could not be decrypted. Sign in again.");
		fs.unlinkSync(filePath);
		return null;
	}
}
function deleteRefreshToken() {
	const filePath = tokenPath();
	if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
	console.log("Refresh token deleted");
}
//#endregion
//#region src/auth/google.ts
var SCOPES = [
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/gmail.send",
	"https://www.googleapis.com/auth/gmail.settings.basic"
];
var CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
async function signInWithGoogle() {
	console.log("Starting Google OAuth...");
	const { client_id, client_secret } = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8")).installed;
	const server = http.createServer();
	await new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () => {
			resolve();
		});
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Failed to start OAuth callback server.");
	const redirectUri = `http://127.0.0.1:${address.port}`;
	console.log(`OAuth callback listening on ${redirectUri}`);
	const oauth2Client = new import_src.google.auth.OAuth2(client_id, client_secret, redirectUri);
	const authUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		prompt: "consent",
		scope: SCOPES
	});
	console.log("Opening Google authorization page...");
	await shell.openExternal(authUrl);
	const code = await new Promise((resolve, reject) => {
		server.on("request", (req, res) => {
			if (!req.url) return;
			const url = new URL(req.url, redirectUri);
			const code = url.searchParams.get("code");
			const error = url.searchParams.get("error");
			if (error) {
				res.end("Authorization failed. You can close this window.");
				server.close();
				reject(new Error(error));
				return;
			}
			if (code) {
				res.end("Authorization successful! You can close this window.");
				server.close();
				resolve(code);
			}
		});
	});
	console.log("Authorization code received!");
	const { tokens } = await oauth2Client.getToken(code);
	console.log("Tokens received");
	if (!tokens.refresh_token) throw new Error("Google did not issue a new sign-in token. Revoke PostOffice in your Google Account permissions, then sign in again and accept mail access.");
	saveRefreshToken(tokens.refresh_token);
	oauth2Client.setCredentials(tokens);
	return tokens;
}
async function signOutWithGoogle() {
	deleteRefreshToken();
	console.log("Signed out with Google");
}
//#endregion
//#region src/main/mailRuntime.ts
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = path.dirname(__filename$1);
var child = null;
var nextId = 1;
var pending = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
var ready = null;
function workerPath() {
	return path.join(__dirname$1, "mailWorker.js");
}
function post(message) {
	if (!child) throw new Error("Mail worker is not running.");
	child.postMessage(message);
}
function rejectAll(error) {
	for (const wait of pending.values()) wait.reject(error);
	pending.clear();
}
function onMailEvent(listener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
async function startMailRuntime(init) {
	if (ready) return ready;
	ready = new Promise((resolve, reject) => {
		try {
			child = utilityProcess.fork(workerPath(), [], {
				serviceName: "PostOffice Mail",
				stdio: "inherit"
			});
		} catch (error) {
			ready = null;
			reject(error instanceof Error ? error : new Error(String(error)));
			return;
		}
		child.on("message", (data) => {
			const message = data;
			if (message?.kind === "ready") {
				resolve();
				return;
			}
			if (message?.kind === "fatal") {
				reject(new Error(message.error));
				return;
			}
			if (message?.kind === "event") {
				for (const listener of listeners) listener(message);
				return;
			}
			if (message?.kind === "response") {
				const wait = pending.get(message.id);
				if (!wait) return;
				pending.delete(message.id);
				if (message.ok) wait.resolve(message.result);
				else wait.reject(new Error(message.error || "Mail worker request failed."));
			}
		});
		child.on("exit", (code) => {
			child = null;
			ready = null;
			rejectAll(/* @__PURE__ */ new Error(`Mail worker exited (${code ?? "unknown"}).`));
		});
		child.on("spawn", () => {
			post({
				kind: "init",
				init
			});
		});
	});
	return ready;
}
function stopMailRuntime() {
	child?.kill();
	child = null;
	ready = null;
	rejectAll(/* @__PURE__ */ new Error("Mail worker stopped."));
}
function callMail(method, payload) {
	if (!child) return Promise.reject(/* @__PURE__ */ new Error("Mail worker is not running."));
	const id = nextId++;
	return new Promise((resolve, reject) => {
		pending.set(id, {
			resolve: (value) => resolve(value),
			reject
		});
		post({
			kind: "request",
			id,
			method,
			payload
		});
	});
}
//#endregion
//#region src/main/main.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
app.setName("post-office");
app.setPath("userData", path.join(app.getPath("appData"), "post-office"));
function composeAttachmentFromPath(filePath) {
	try {
		const stat = fs.statSync(filePath);
		if (!stat.isFile()) return null;
		const filename = path.basename(filePath);
		return {
			path: filePath,
			filename,
			size: stat.size,
			mimeType: mimeFromFilename(filename)
		};
	} catch {
		return null;
	}
}
function isAppUrl(url) {
	return url.startsWith("http://localhost:5173") || url.startsWith("file:");
}
function openExternalIfSafe(url) {
	if (isAppUrl(url)) return false;
	if (url.startsWith("https:") || url.startsWith("http:") || url.startsWith("mailto:")) {
		shell.openExternal(url);
		return true;
	}
	return false;
}
var createWindow = () => {
	const window = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 500,
		icon: path.join(__dirname, "../src/assets/icon.png"),
		title: "PostOffice",
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	window.webContents.setWindowOpenHandler(({ url }) => {
		openExternalIfSafe(url);
		return { action: "deny" };
	});
	window.webContents.on("will-navigate", (event, url) => {
		if (isAppUrl(url)) return;
		event.preventDefault();
		openExternalIfSafe(url);
	});
	window.loadURL("http://localhost:5173");
};
function broadcast(channel, payload) {
	for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload);
}
onMailEvent((message) => {
	if (message.kind !== "event") return;
	if (message.event === "email-stored") {
		broadcast("email-stored", message.payload);
		return;
	}
	if (message.event === "sync-progress") {
		broadcast("sync-progress", message.payload);
		return;
	}
	broadcast("email-action-failed", message.payload);
});
ipcMain.handle("list-emails", async (_event, options) => {
	return callMail("listEmails", options);
});
ipcMain.handle("sync-emails", async () => {
	return callMail("syncEmails");
});
ipcMain.handle("list-mailslots", async () => {
	return callMail("listMailslots");
});
ipcMain.handle("create-mailslot", async (_event, payload) => {
	return callMail("createMailslot", payload);
});
ipcMain.handle("update-mailslot", async (_event, payload) => {
	return callMail("updateMailslot", payload);
});
ipcMain.handle("delete-mailslot", async (_event, id) => {
	return callMail("deleteMailslot", id);
});
ipcMain.handle("get-mailslot-filing", async (_event, emailId) => {
	return callMail("getMailslotFiling", emailId);
});
ipcMain.handle("apply-email-mailslots", async (_event, payload) => {
	return callMail("applyEmailMailslots", payload);
});
ipcMain.handle("apply-mailslot-rules", async (_event, payload) => {
	return callMail("applyMailslotRules", payload);
});
ipcMain.handle("get-email", async (_event, id) => {
	return callMail("getEmail", id);
});
ipcMain.handle("trash-email", async (_event, id) => {
	return callMail("trashEmail", id);
});
ipcMain.handle("untrash-email", async (_event, id) => {
	return callMail("untrashEmail", id);
});
ipcMain.handle("set-email-starred", async (_event, payload) => {
	return callMail("setEmailStarred", payload);
});
ipcMain.handle("send-email", async (_event, payload) => {
	return callMail("sendEmail", payload);
});
ipcMain.handle("pick-compose-attachments", async (event) => {
	const browserWindow = BrowserWindow.fromWebContents(event.sender);
	const result = browserWindow ? await dialog.showOpenDialog(browserWindow, {
		properties: ["openFile", "multiSelections"],
		title: "Attach files"
	}) : await dialog.showOpenDialog({
		properties: ["openFile", "multiSelections"],
		title: "Attach files"
	});
	if (result.canceled) return [];
	return result.filePaths.map((filePath) => composeAttachmentFromPath(filePath)).filter((item) => Boolean(item));
});
ipcMain.handle("compose-attachments-from-paths", async (_event, filePaths) => {
	if (!Array.isArray(filePaths)) return [];
	return filePaths.map((filePath) => composeAttachmentFromPath(filePath)).filter((item) => Boolean(item));
});
ipcMain.handle("list-drafts", async () => {
	return callMail("listDrafts");
});
ipcMain.handle("get-draft", async (_event, id) => {
	return callMail("getDraft", id);
});
ipcMain.handle("save-draft", async (_event, payload) => {
	return callMail("saveDraft", payload);
});
ipcMain.handle("delete-draft", async (_event, id) => {
	return callMail("deleteDraft", id);
});
ipcMain.handle("suggest-addresses", async (_event, query) => {
	return callMail("suggestAddresses", typeof query === "string" ? query : "");
});
ipcMain.handle("get-account-email", async () => {
	return callMail("getAccountEmail");
});
ipcMain.handle("list-signatures", async () => {
	return callMail("listSignatures");
});
ipcMain.handle("save-attachment", async (event, payload) => {
	const stored = await callMail("loadAttachment", {
		messageId: payload.messageId,
		attachmentId: payload.attachmentId
	});
	const browserWindow = BrowserWindow.fromWebContents(event.sender);
	const result = browserWindow ? await dialog.showSaveDialog(browserWindow, { defaultPath: stored.filename || payload.filename }) : await dialog.showSaveDialog({ defaultPath: stored.filename || payload.filename });
	if (result.canceled || !result.filePath) return { canceled: true };
	fs.writeFileSync(result.filePath, Buffer.from(stored.dataBase64, "base64"));
	return { canceled: false };
});
ipcMain.handle("google-sign-out", async () => {
	signOutWithGoogle();
	await callMail("setRefreshToken", null);
	return true;
});
ipcMain.handle("check-auth", async () => {
	return loadRefreshToken() !== null;
});
ipcMain.handle("google-sign-in", async () => {
	await signInWithGoogle();
	await callMail("setRefreshToken", loadRefreshToken());
	return true;
});
app.whenReady().then(async () => {
	await startMailRuntime({
		userDataPath: app.getPath("userData"),
		credentialsPath: CREDENTIALS_PATH,
		refreshToken: loadRefreshToken()
	});
	createWindow();
});
app.on("before-quit", () => {
	stopMailRuntime();
});
//#endregion
export {};
