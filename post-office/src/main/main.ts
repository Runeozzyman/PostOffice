import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAuthenticatedClient,signInWithGoogle } from "../auth/google";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,

    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadURL("http://localhost:5173");
};

ipcMain.handle("check-auth", async () =>{
  const auth = await getAuthenticatedClient();

  return auth !== null;
})

ipcMain.handle("google-sign-in", async () => {
  return await signInWithGoogle();
});

app.whenReady().then(() => {
  createWindow();
});