import { google } from "googleapis";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { shell } from "electron";
import { saveRefreshToken, deleteRefreshToken } from "./tokenStorage";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

export const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

export async function signInWithGoogle() {
  console.log("Starting Google OAuth...");

  // Read our Google OAuth credentials
  const credentials = JSON.parse(
    fs.readFileSync(CREDENTIALS_PATH, "utf-8")
  );

  const { client_id, client_secret } = credentials.installed;

  /*
   * Start a temporary local HTTP server.
   *
   * Port 0 means:
   * "Give me any available port."
   */
  const server = http.createServer();

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start OAuth callback server.");
  }

  const port = address.port;

  const redirectUri = `http://127.0.0.1:${port}`;

  console.log(`OAuth callback listening on ${redirectUri}`);

  // Create our OAuth client
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirectUri
  );

  // Generate Google's login/authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("Opening Google authorization page...");

  await shell.openExternal(authUrl);

  /*
   * Wait for Google to redirect the browser
   * back to our local server.
   */
  const code = await new Promise<string>((resolve, reject) => {
    server.on("request", (req, res) => {
      if (!req.url) {
        return;
      }

      const url = new URL(
        req.url,
        redirectUri
      );

      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.end("Authorization failed. You can close this window.");

        server.close();

        reject(new Error(error));

        return;
      }

      if (code) {
        res.end(
          "Authorization successful! You can close this window."
        );

        server.close();

        resolve(code);
      }
    });
  });

  console.log("Authorization code received!");

  const { tokens } = await oauth2Client.getToken(code);

  console.log("Tokens received");

  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not issue a new sign-in token. Revoke PostOffice in your Google Account permissions, then sign in again and accept mail access."
    );
  }

  saveRefreshToken(tokens.refresh_token);

  oauth2Client.setCredentials(tokens);

  return tokens;
}

export async function signOutWithGoogle() {
  deleteRefreshToken();
  console.log("Signed out with Google");
}