import { htmlToPlain as htmlToPlainText } from "./htmlToPlain";
import { sanitizeEmailHtml } from "./emailHtml";

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
  return htmlToPlainText(html);
}

export function plainToEditorHtml(value: string) {
  if (!value) {
    return "";
  }

  if (looksLikeHtml(value)) {
    return sanitizeEmailHtml(value);
  }

  return escapeHtml(value).replaceAll("\r\n", "\n").replaceAll("\n", "<br>");
}

export function isComposeBodyEmpty(value: string) {
  return htmlToPlain(value).trim().length === 0;
}

export function sanitizeComposeHtml(html: string) {
  return sanitizeEmailHtml(html);
}
