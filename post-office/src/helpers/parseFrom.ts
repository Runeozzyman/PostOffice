export function parseFrom(fromHeader: string): {
  email: string;
  domain: string;
  displayName: string;
} {
  const trimmed = fromHeader.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const email = (angle?.[1] ?? trimmed).trim().toLowerCase();
  const at = email.lastIndexOf("@");
  const domain = at >= 0 ? email.slice(at + 1).replace(/\.+$/, "") : "";

  const nameMatch = trimmed.match(/^"?([^"<]+)"?\s*</);
  const displayName = nameMatch?.[1]?.trim() || email;

  return { email, domain, displayName };
}

const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

export function isPublicEmailDomain(domain: string) {
  return PUBLIC_DOMAINS.has(domain.toLowerCase());
}
