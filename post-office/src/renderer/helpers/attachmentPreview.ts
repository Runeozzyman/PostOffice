import { mimeFromFilename } from "../../helpers/mimeFromFilename";

export type AttachmentPreviewKind = "image" | "pdf" | "video";

function resolvedMime(mimeType: string, filename: string) {
  const type = mimeType.trim().toLowerCase();

  if (type && type !== "application/octet-stream") {
    return type.split(";")[0]?.trim() ?? type;
  }

  return mimeFromFilename(filename).toLowerCase();
}

export function attachmentPreviewKind(
  mimeType: string,
  filename: string
): AttachmentPreviewKind | null {
  const type = resolvedMime(mimeType, filename);

  if (type === "application/pdf") {
    return "pdf";
  }

  if (type.startsWith("image/")) {
    return "image";
  }

  if (type.startsWith("video/")) {
    return "video";
  }

  return null;
}

export function blobFromBase64(dataBase64: string, mimeType: string) {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}
