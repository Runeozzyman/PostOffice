//preload implements an IPC doorway to expose methods to React safely

import { contextBridge, ipcRenderer } from "electron";
import { signInWithGoogle } from "../auth/google";

contextBridge.exposeInMainWorld("electronAPI", {
    signInWithGoogle: () => ipcRenderer.invoke("google-sign-in"),
});