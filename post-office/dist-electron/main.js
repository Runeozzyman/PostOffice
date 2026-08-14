import { BrowserWindow, app, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
//#region src/auth/google.ts
async function signInWithGoogle() {
	console.log("Starting Gogle OAuth");
}
//#endregion
//#region src/main/main.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var createWindow = () => {
	new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false
		}
	}).loadURL("http://localhost:5173");
};
ipcMain.handle("google-sign-in", async () => {
	return await signInWithGoogle();
});
app.whenReady().then(() => {
	createWindow();
});
//#endregion
export {};
