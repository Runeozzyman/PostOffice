import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

function tokenPath() {
  return path.join(app.getPath("userData"), "google-token");
}

export function saveRefreshToken(refreshToken: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure storage is not available.");
  }

  const encryptedToken = safeStorage.encryptString(refreshToken);

  fs.writeFileSync(tokenPath(), encryptedToken);

  console.log("Refresh token securely stored.");
}

export function loadRefreshToken(): string | null {
  const filePath = tokenPath();

  if (!fs.existsSync(filePath)) {
    return null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure storage is not available.");
  }

  try {
    return safeStorage.decryptString(fs.readFileSync(filePath));
  } catch {
    console.warn(
      "Stored Google token could not be decrypted. Sign in again."
    );
    fs.unlinkSync(filePath);
    return null;
  }
}

export function deleteRefreshToken() {
  const filePath = tokenPath();

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log("Refresh token deleted");
}
