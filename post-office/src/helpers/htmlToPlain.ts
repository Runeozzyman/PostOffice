export function htmlToPlain(html: string) {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, inner) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      const url = String(href).trim();
      if (!label || label === url || url.includes(label) || label.includes(url.replace(/^https?:\/\//, ""))) {
        return url;
      }
      return `${label} (${url})`;
    })
    .replace(/<\/(p|h[1-6]|table|blockquote)>/gi, "\n\n")
    .replace(/<li(\s[^>]*)?>/gi, "\n• ")
    .replace(/<(p|div|h[1-6]|tr|table|blockquote)(\s[^>]*)?>/gi, "\n")
    .replace(/<\/(div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function withSignatureDelimiter(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (/^--\s*$/m.test(trimmed.split(/\r?\n/, 1)[0] ?? "") || trimmed.startsWith("--\n") || trimmed.startsWith("-- \n")) {
    return trimmed;
  }

  return `--\n${trimmed}`;
}

export function withSignatureDelimiterHtml(html: string) {
  const trimmed = html.trim();
  if (!trimmed) {
    return "";
  }

  if (htmlToPlain(trimmed).startsWith("--")) {
    return trimmed;
  }

  return `<div>--</div>${trimmed}`;
}
