import { randomBytes } from "node:crypto";

export interface InlineImagePart {
  cid: string;
  mimeType: string;
  filename: string;
  data: Buffer;
}

const DATA_IMG =
  /(<img\b[^>]*?\bsrc\s*=\s*)(["'])(data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+))\2/gi;

export function extractInlineDataImages(html: string) {
  const inlines: InlineImagePart[] = [];
  const next = html.replace(
    DATA_IMG,
    (
      _full,
      prefix: string,
      quote: string,
      _src: string,
      mime: string,
      b64: string
    ) => {
      const cid = `po${randomBytes(8).toString("hex")}@postoffice.local`;
      const ext = mime.split("/")[1]?.replace("+xml", "") || "img";
      inlines.push({
        cid,
        mimeType: mime,
        filename: `image.${ext}`,
        data: Buffer.from(b64.replace(/\s/g, ""), "base64"),
      });
      return `${prefix}${quote}cid:${cid}${quote}`;
    }
  );

  return { html: next, inlines };
}
