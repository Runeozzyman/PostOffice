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

export function splitAddressParts(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let angles = 0;

  for (const character of header) {
    if (character === '"' && angles === 0) {
      quoted = !quoted;
    }

    if (!quoted) {
      if (character === "<") {
        angles += 1;
      } else if (character === ">" && angles > 0) {
        angles -= 1;
      }
    }

    if (character === "," && !quoted && angles === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

export function parseAddressList(header: string) {
  return splitAddressParts(header)
    .map((part) => parseFrom(part))
    .filter((address) => address.email.includes("@"));
}

export function formatAddress(displayName: string, email: string) {
  const cleanEmail = email.trim();
  const name = displayName.trim();

  if (!name || name.toLowerCase() === cleanEmail.toLowerCase()) {
    return cleanEmail;
  }

  return `"${name.replaceAll('"', "")}" <${cleanEmail}>`;
}

export function joinAddresses(
  addresses: { email: string; displayName: string }[]
) {
  const seen = new Set<string>();
  const formatted: string[] = [];

  for (const address of addresses) {
    const key = address.email.toLowerCase();

    if (!key.includes("@") || seen.has(key)) {
      continue;
    }

    seen.add(key);
    formatted.push(formatAddress(address.displayName, address.email));
  }

  return formatted.join(", ");
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
