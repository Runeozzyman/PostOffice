import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

let started = false;

function checkForUpdates() {
  void autoUpdater.checkForUpdates().catch((error: unknown) => {
    console.warn("App update check failed.", error);
  });
}

export function startAppUpdater() {
  if (started || !app.isPackaged) {
    return;
  }

  started = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on("error", (error) => {
    console.warn("App update failed.", error);
  });

  autoUpdater.on("update-downloaded", (info) => {
    const version = info.version ? ` ${info.version}` : "";

    void dialog
      .showMessageBox({
        type: "info",
        title: "Update ready",
        message: `PostOffice${version} has been downloaded.`,
        detail:
          "Restart to install it now, or keep working. The update will install when you quit.",
        buttons: ["Restart now", "Later"],
        defaultId: 1,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  checkForUpdates();
  setInterval(checkForUpdates, CHECK_EVERY_MS);
}
