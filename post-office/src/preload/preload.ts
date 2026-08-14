import { contextBridge, ipcRenderer } from "electron";

console.log("PRELOAD SCRIPT LOADED");

contextBridge.exposeInMainWorld("electronAPI", {
  signInWithGoogle: () =>
    ipcRenderer.invoke("google-sign-in"),

  checkAuth: () =>
    ipcRenderer.invoke("check-auth"),

  signOut: () =>
    ipcRenderer.invoke("google-sign-out"),  

  fetchEmails: () =>
    ipcRenderer.invoke("fetch-emails"),

});