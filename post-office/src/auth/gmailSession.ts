import { google } from "googleapis";
import { getOAuthClientCredentials } from "./oauthCredentials";

export const GMAIL_AUTH_EXPIRED_MESSAGE =
  "Google sign-in expired. Sign in again to continue.";

let refreshToken: string | null = null;
let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;
let cachedRefreshToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function configureGmailSession(options: {
  refreshToken: string | null;
  onAuthExpired?: () => void;
}) {
  onAuthExpired = options.onAuthExpired ?? null;
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

  try {
    await oauth2Client.getAccessToken();
  } catch (error) {
    rethrowIfGmailAuthFailed(error);
  }

  cachedClient = oauth2Client;
  cachedRefreshToken = refreshToken;
  return oauth2Client;
}

export function isGmailAuthError(error: unknown) {
  const text = [
    error instanceof Error ? error.message : String(error),
    typeof error === "object" && error && "response" in error
      ? JSON.stringify(
          (error as { response?: { data?: unknown } }).response?.data ?? ""
        )
      : "",
  ].join(" ");

  return (
    text.includes("invalid_grant") ||
    text.includes("invalid_client") ||
    text.includes("invalid_rapt") ||
    text.includes("Token has been expired or revoked")
  );
}

export function rethrowIfGmailAuthFailed(error: unknown): never {
  if (isGmailAuthError(error)) {
    setGmailRefreshToken(null);
    onAuthExpired?.();
    throw new Error(GMAIL_AUTH_EXPIRED_MESSAGE);
  }

  throw error instanceof Error ? error : new Error(String(error));
}
