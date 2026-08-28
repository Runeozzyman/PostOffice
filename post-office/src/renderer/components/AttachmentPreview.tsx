import { useEffect, useState } from "react";
import type { EmailAttachment } from "../../types/email";
import {
  attachmentPreviewKind,
  blobFromBase64,
} from "../helpers/attachmentPreview";

interface AttachmentPreviewProps {
  messageId: string;
  attachment: EmailAttachment;
}

export default function AttachmentPreview({
  messageId,
  attachment,
}: AttachmentPreviewProps) {
  const kind = attachmentPreviewKind(attachment.mimeType, attachment.filename);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const stored = await window.electronAPI.getAttachment({
          messageId,
          attachmentId: attachment.id,
        });
        const mime =
          stored.mimeType ||
          attachment.mimeType ||
          "application/octet-stream";
        objectUrl = URL.createObjectURL(
          blobFromBase64(stored.dataBase64, mime)
        );

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setSrc(objectUrl);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load preview."
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment.id, attachment.mimeType, kind, messageId]);

  if (!kind) {
    return null;
  }

  if (error) {
    return <p className="text-xs text-danger">{error}</p>;
  }

  if (!src) {
    return <p className="text-xs text-ink-muted">Loading preview…</p>;
  }

  if (kind === "image") {
    return (
      <img
        src={src}
        alt={attachment.filename}
        className="max-h-[32rem] w-full rounded-md object-contain bg-muted"
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        src={src}
        controls
        className="max-h-[32rem] w-full rounded-md bg-muted"
      />
    );
  }

  return (
    <iframe
      title={attachment.filename}
      src={src}
      className="h-[32rem] w-full rounded-md border-0 bg-muted"
    />
  );
}
