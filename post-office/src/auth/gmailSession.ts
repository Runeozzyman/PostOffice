import { google } from "googleapis";
import { getOAuthClientCredentials } from "./oauthCredentials";

let refreshToken: string | null = null;
let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;
let cachedRefreshToken: string | null = null;

export function configureGmailSession(options: {
  refreshToken: string | null;
}) {
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

  const { clientId, clientSecret } = getOAuthClientCredentials();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  cachedClient = oauth2Client;
  cachedRefreshToken = refreshToken;
  return oauth2Client;
}
