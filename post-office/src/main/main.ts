import { app, BrowserWindow } from "electron";
import path from "path";

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  window.loadURL("http://localhost:5173");
};

app.whenReady().then(() => {
  createWindow();
});