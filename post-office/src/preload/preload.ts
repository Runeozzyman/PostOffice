import { contextBridge, ipcRenderer } from "electron";

console.log("PRELOAD SCRIPT LOADED");

contextBridge.exposeInMainWorld("electronAPI", {
  signInWithGoogle: () =>
    ipcRenderer.invoke("google-sign-in"),

  checkAuth: () =>
    ipcRenderer.invoke("check-auth"),
  
});