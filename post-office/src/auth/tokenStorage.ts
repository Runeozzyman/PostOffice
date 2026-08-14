import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

const TOKEN_PATH = path.join(
  app.getPath("userData"),
  "google-token"
);

export function saveRefreshToken(refreshToken: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure storage is not available.");
  }

  const encryptedToken = safeStorage.encryptString(refreshToken);

  fs.writeFileSync(
    TOKEN_PATH,
    encryptedToken
  );

  console.log("Refresh token securely stored.");
}

export function loadRefreshToken(): string | null {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure storage is not available.");
  }

  const encryptedToken = fs.readFileSync(TOKEN_PATH);

  return safeStorage.decryptString(encryptedToken);
}