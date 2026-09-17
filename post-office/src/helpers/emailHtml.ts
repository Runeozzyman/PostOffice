const BLOCKED_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "base",
  "link",
  "frame",
  "frameset",
  "applet",
]);

function isSafeUrl(value: string, extra: string[] = []) {
  const trimmed = value.trim().toLowerCase();
  if (
    trimmed.startsWith("https:") ||
    trimmed.startsWith("http:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("cid:") ||
    trimmed.startsWith("data:image/") ||
    extra.some((prefix) => trimmed.startsWith(prefix))
  ) {
    return true;
  }

  return trimmed.startsWith("#") || trimmed.startsWith("/");
}

function cleanElement(el: Element) {
  const tag = el.tagName.toLowerCase();

  if (BLOCKED_TAGS.has(tag) || tag.includes(":")) {
    if (tag !== "o:p") {
      el.remove();
      return;
    }
  }

  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name.startsWith("on") || name === "srcdoc" || name === "xlink:href") {
      el.removeAttribute(attr.name);
      continue;
    }

    if ((name === "href" || name === "src") && !isSafeUrl(value)) {
      el.removeAttribute(attr.name);
    }
  }

  for (const child of [...el.children]) {
    cleanElement(child);
  }
}

export function sanitizeEmailHtml(html: string) {
  if (!html) {
    return "";
  }

  if (typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  if (document.documentElement) {
    cleanElement(document.documentElement);
  }

  const hasHtmlWrapper = /<html[\s>]/i.test(html);
  if (hasHtmlWrapper) {
    return document.documentElement.outerHTML;
  }

  return document.body.innerHTML;
}

export function rewriteCidUrls(
  html: string,
  urls: Record<string, string>
) {
  if (!html || Object.keys(urls).length === 0) {
    return html;
  }

  return html.replace(/cid:([^"'>\s]+)/gi, (full, raw: string) => {
    const cid = decodeURIComponent(String(raw).replace(/^<|>$/g, "")).replace(
      /[<>]/g,
      ""
    );
    return urls[cid] ?? urls[cid.toLowerCase()] ?? full;
  });
}

export function collectCidRefs(html: string) {
  const ids = new Set<string>();
  const pattern = /cid:([^"'>\s]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const cid = decodeURIComponent(match[1].replace(/^<|>$/g, "")).replace(
      /[<>]/g,
      ""
    );
    if (cid) {
      ids.add(cid);
    }
  }

  return [...ids];
}
