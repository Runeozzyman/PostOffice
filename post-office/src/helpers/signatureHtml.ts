import { htmlToPlain, withSignatureDelimiter } from "./htmlToPlain";

const URL_PATTERN =
  /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?])/gi;

function unescapeIfNeeded(html: string) {
  if (html.includes("<") || !html.includes("&lt;")) {
    return html;
  }

  return html
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function hrefFor(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function linkifyText(text: string) {
  return text.replace(URL_PATTERN, (url) => {
    const href = hrefFor(url);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

export function autolinkHtml(html: string) {
  return html.replace(
    /(<a\b[^>]*>[\s\S]*?<\/a>)|([^<]+)|(<[^>]+>)/gi,
    (
      full,
      anchor: string | undefined,
      text: string | undefined,
      tag: string | undefined
    ) => {
      if (anchor) {
        return anchor;
      }
      if (tag) {
        return tag;
      }
      return linkifyText(text ?? full);
    }
  );
}

function styleSignatureAnchors(html: string) {
  return html.replace(/<a\b([^>]*)>/gi, (_full, attrs: string) => {
    let next = attrs;
    if (!/\bhref\s*=/i.test(next)) {
      return `<a${next}>`;
    }
    if (!/\btarget=/i.test(next)) {
      next += ' target="_blank"';
    }
    if (!/\brel=/i.test(next)) {
      next += ' rel="noopener noreferrer"';
    }
    if (!/\bstyle=/i.test(next)) {
      next += ' style="color:inherit;text-decoration:underline"';
    }
    return `<a${next}>`;
  });
}

export function formatSignatureHtml(html: string) {
  let next = unescapeIfNeeded(html.trim());
  if (!next) {
    return "";
  }

  next = autolinkHtml(next);

  if (!htmlToPlain(next).startsWith("--")) {
    next = `<div>--</div>${next}`;
  }

  if (!/gmail_signature/i.test(next)) {
    next = `<div class="gmail_signature" data-smartmail="gmail_signature" style="color:#777777">${next}</div>`;
  }

  return styleSignatureAnchors(next);
}

export function formatSignatureText(html: string) {
  return withSignatureDelimiter(htmlToPlain(html));
}
