let electron = require("electron");
//#region src/preload/preload.ts
console.log("PRELOAD SCRIPT LOADED");
electron.contextBridge.exposeInMainWorld("electronAPI", {
	signInWithGoogle: () => electron.ipcRenderer.invoke("google-sign-in"),
	checkAuth: () => electron.ipcRenderer.invoke("check-auth"),
	signOut: () => electron.ipcRenderer.invoke("google-sign-out"),
	listEmails: (options) => electron.ipcRenderer.invoke("list-emails", options),
	syncEmails: () => electron.ipcRenderer.invoke("sync-emails"),
	onEmailStored: (callback) => {
		const listener = (_event, email) => {
			callback(email);
		};
		electron.ipcRenderer.on("email-stored", listener);
		return () => {
			electron.ipcRenderer.removeListener("email-stored", listener);
		};
	},
	onSyncProgress: (callback) => {
		const listener = (_event, progress) => {
			callback(progress);
		};
		electron.ipcRenderer.on("sync-progress", listener);
		return () => {
			electron.ipcRenderer.removeListener("sync-progress", listener);
		};
	},
	listMailslots: () => electron.ipcRenderer.invoke("list-mailslots"),
	createMailslot: (payload) => electron.ipcRenderer.invoke("create-mailslot", payload),
	updateMailslot: (payload) => electron.ipcRenderer.invoke("update-mailslot", payload),
	deleteMailslot: (id) => electron.ipcRenderer.invoke("delete-mailslot", id),
	getMailslotFiling: (emailId) => electron.ipcRenderer.invoke("get-mailslot-filing", emailId),
	applyEmailMailslots: (payload) => electron.ipcRenderer.invoke("apply-email-mailslots", payload),
	applyMailslotRules: (payload) => electron.ipcRenderer.invoke("apply-mailslot-rules", payload),
	getEmail: (id) => electron.ipcRenderer.invoke("get-email", id),
	trashEmail: (id) => electron.ipcRenderer.invoke("trash-email", id),
	untrashEmail: (id) => electron.ipcRenderer.invoke("untrash-email", id),
	setEmailStarred: (payload) => electron.ipcRenderer.invoke("set-email-starred", payload),
	onEmailActionFailed: (callback) => {
		const listener = (_event, payload) => {
			callback(payload);
		};
		electron.ipcRenderer.on("email-action-failed", listener);
		return () => {
			electron.ipcRenderer.removeListener("email-action-failed", listener);
		};
	},
	sendEmail: (payload) => electron.ipcRenderer.invoke("send-email", payload),
	pickComposeAttachments: () => electron.ipcRenderer.invoke("pick-compose-attachments"),
	composeAttachmentsFromPaths: (filePaths) => electron.ipcRenderer.invoke("compose-attachments-from-paths", filePaths),
	getPathForFile: (file) => electron.webUtils.getPathForFile(file),
	suggestAddresses: (query) => electron.ipcRenderer.invoke("suggest-addresses", query),
	getAccountEmail: () => electron.ipcRenderer.invoke("get-account-email"),
	saveAttachment: (payload) => electron.ipcRenderer.invoke("save-attachment", payload)
});
//#endregion
