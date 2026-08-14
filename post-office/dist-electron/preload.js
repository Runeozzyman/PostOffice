import { contextBridge, ipcRenderer } from "electron";
//#region src/preload/preload.ts
console.log("Reading Preload");
contextBridge.exposeInMainWorld("electronAPI", { signInWithGoogle: () => ipcRenderer.invoke("google-sign-in") });
//#endregion
export {};
