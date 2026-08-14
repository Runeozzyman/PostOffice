let electron = require("electron");
//#region src/preload/preload.ts
console.log("PRELOAD SCRIPT LOADED");
electron.contextBridge.exposeInMainWorld("electronAPI", {
	signInWithGoogle: () => electron.ipcRenderer.invoke("google-sign-in"),
	checkAuth: () => electron.ipcRenderer.invoke("check-auth"),
	signOut: () => electron.ipcRenderer.invoke("google-sign-out")
});
//#endregion
