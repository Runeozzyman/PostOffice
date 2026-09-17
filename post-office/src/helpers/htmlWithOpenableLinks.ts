import { autolinkHtml } from "./signatureHtml";
import { sanitizeEmailHtml } from "./emailHtml";

const VIEWER_CSS = `
  html, body { margin: 0; height: 100%; }
  html { background: #fff; }
  body {
    min-height: 100%;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.45;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  pre { white-space: pre-wrap; }
  blockquote.gmail_quote, .gmail_quote {
    margin: 0 0 0 0.8ex;
    border-left: 1px solid #ccc;
    padding-left: 1ex;
  }
`;

function isSafeExternalUrl(href: string) {
  try {
    const url = new URL(href, "https://invalid.local");
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function htmlWithOpenableLinks(html: string) {
  const document = new DOMParser().parseFromString(
    autolinkHtml(sanitizeEmailHtml(html)),
    "text/html"
  );

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

  if (!document.querySelector("meta[charset]")) {
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    document.head.prepend(meta);
  }

  const style = document.createElement("style");
  style.textContent = VIEWER_CSS;
  document.head.append(style);

  return `<!DOCTYPE html>${document.documentElement.outerHTML}`;
}
