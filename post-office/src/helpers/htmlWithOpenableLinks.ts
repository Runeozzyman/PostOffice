function isSafeExternalUrl(href: string) {
  try {
    const url = new URL(href, "https://invalid.local");
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function htmlWithOpenableLinks(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");

  for (const anchor of document.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href");

    if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
      continue;
    }

    if (!isSafeExternalUrl(href)) {
      continue;
    }

    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }

  return document.documentElement.outerHTML;
}
