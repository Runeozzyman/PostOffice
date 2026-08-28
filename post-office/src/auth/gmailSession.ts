import fs from "node:fs";
import { google } from "googleapis";

let credentialsPath = "";
let refreshToken: string | null = null;
let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;
let cachedRefreshToken: string | null = null;

export function configureGmailSession(options: {
  credentialsPath: string;
  refreshToken: string | null;
}) {
  credentialsPath = options.credentialsPath;
  setGmailRefreshToken(options.refreshToken);
}

export function setGmailRefreshToken(token: string | null) {
  refreshToken = token;
  cachedClient = null;
  cachedRefreshToken = null;
}

export async function getAuthenticatedClient() {
  if (!refreshToken) {
    cachedClient = null;
    cachedRefreshToken = null;
    return null;
  }

  if (cachedClient && cachedRefreshToken === refreshToken) {
    return cachedClient;
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8")) as {
    installed: { client_id: string; client_secret: string };
  };

  const { client_id, client_secret } = credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  cachedClient = oauth2Client;
  cachedRefreshToken = refreshToken;
  return oauth2Client;
}
