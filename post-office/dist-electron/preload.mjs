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
	getEmail: (id) => electron.ipcRenderer.invoke("get-email", id),
	saveAttachment: (payload) => electron.ipcRenderer.invoke("save-attachment", payload)
});
//#endregion
