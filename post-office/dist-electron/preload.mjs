let electron = require("electron");
//#region src/preload/preload.ts
console.log("PRELOAD SCRIPT LOADED");
electron.contextBridge.exposeInMainWorld("electronAPI", { signInWithGoogle: () => electron.ipcRenderer.invoke("google-sign-in") });
//#endregion
