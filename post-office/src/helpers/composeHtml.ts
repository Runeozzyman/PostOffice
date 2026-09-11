const ALLOWED_TAGS = new Set([
  "b",
  "i",
  "u",
  "strong",
  "em",
  "br",
  "div",
  "p",
  "span",
]);

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function htmlToPlain(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainToEditorHtml(value: string) {
  if (!value) {
    return "";
  }

  if (looksLikeHtml(value)) {
    return value;
  }

  return escapeHtml(value).replaceAll("\r\n", "\n").replaceAll("\n", "<br>");
}

export function isComposeBodyEmpty(value: string) {
  return htmlToPlain(value).trim().length === 0;
}

export function sanitizeComposeHtml(html: string) {
  return html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string) => {
    const name = tag.toLowerCase();

    if (!ALLOWED_TAGS.has(name)) {
      return "";
    }

    if (name === "br") {
      return "<br>";
    }

    return full.startsWith("</") ? `</${name}>` : `<${name}>`;
  });
}
