import { useEffect, useRef, useState } from "react";
import type { EmailAttachment } from "../../types/email";
import { collectCidRefs, rewriteCidUrls } from "../../helpers/emailHtml";
import { htmlWithOpenableLinks } from "../../helpers/htmlWithOpenableLinks";

interface EmailHtmlFrameProps {
  messageId: string;
  html: string;
  attachments: EmailAttachment[];
}

export default function EmailHtmlFrame({
  messageId,
  html,
  attachments,
}: EmailHtmlFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState("");

  const cidKey = attachments
    .map((item) => `${item.id}:${item.contentId ?? ""}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cids = collectCidRefs(html);
      const urls: Record<string, string> = {};

      for (const cid of cids) {
        const attachment = attachments.find(
          (item) =>
            item.contentId === cid ||
            item.contentId?.toLowerCase() === cid.toLowerCase()
        );

        if (!attachment) {
          continue;
        }

        try {
          const stored = await window.electronAPI.getAttachment({
            messageId,
            attachmentId: attachment.id,
          });
          const mime =
            stored.mimeType ||
            attachment.mimeType ||
            "application/octet-stream";
          urls[cid] = `data:${mime};base64,${stored.dataBase64}`;
        } catch {
          // Leave the cid: reference; the image stays broken rather than crashing.
        }
      }

      if (!cancelled) {
        setSrcDoc(htmlWithOpenableLinks(rewriteCidUrls(html, urls)));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [cidKey, html, messageId, attachments]);

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={srcDoc}
      className="h-full min-h-0 w-full flex-1 border-0 bg-white"
    />
  );
}
