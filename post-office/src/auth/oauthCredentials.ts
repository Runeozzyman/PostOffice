export function getOAuthClientCredentials() {
  const clientId = __GOOGLE_CLIENT_ID__;
  const clientSecret = __GOOGLE_CLIENT_SECRET__;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET at build time."
    );
  }

  return { clientId, clientSecret };
}
