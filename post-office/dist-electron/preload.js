import { contextBridge, ipcRenderer } from "electron";
//#region src/preload/preload.ts
contextBridge.exposeInMainWorld("electronAPI", { signInWithGoogle: () => ipcRenderer.invoke("google-sign-in") });
//#endregion
export {};
