import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const MAX_SKIN_BYTES = 12 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export type SkinPayload = {
  mime: string;
  data: Buffer;
};

function skinFilePath() {
  return path.join(app.getPath("userData"), "app-skin");
}

function skinMimePath() {
  return path.join(app.getPath("userData"), "app-skin.mime");
}

function mimeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "";
}

export function readAppSkin(): SkinPayload | null {
  const filePath = skinFilePath();
  const mimePath = skinMimePath();

  if (!fs.existsSync(filePath) || !fs.existsSync(mimePath)) {
    return null;
  }

  const mime = fs.readFileSync(mimePath, "utf8").trim();
  const data = fs.readFileSync(filePath);

  if (!mime || data.length === 0) {
    return null;
  }

  return { mime, data };
}

export function writeAppSkinFromPath(sourcePath: string): SkinPayload {
  const mime = mimeFromPath(sourcePath);

  if (!mime) {
    throw new Error("Use a PNG, JPEG, WebP, or GIF.");
  }

  const data = fs.readFileSync(sourcePath);

  if (data.length > MAX_SKIN_BYTES) {
    throw new Error("Image must be 12 MB or smaller.");
  }

  fs.writeFileSync(skinFilePath(), data);
  fs.writeFileSync(skinMimePath(), mime);

  return { mime, data };
}

export function clearAppSkin() {
  for (const filePath of [skinFilePath(), skinMimePath()]) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
