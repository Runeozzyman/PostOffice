import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { MAX_MAILSLOTS, type Mailslot } from "../../types/mailslot";
import MailslotCard from "../components/MailslotCard";
import MailslotEditorModal from "../components/MailslotEditorModal";
import MailslotView from "../components/MailslotView";

interface MailslotsProps {
  openedMailslotId: string | null;
  onOpenMailslot: (id: string) => void;
  onCloseMailslot: () => void;
  keyboardActive: boolean;
}

export default function Mailslots({
  openedMailslotId,
  onOpenMailslot,
  onCloseMailslot,
  keyboardActive,
}: MailslotsProps) {
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<"create" | Mailslot | null>(null);

  const load = async () => {
    try {
      const rows = await window.electronAPI.listMailslots();
      setMailslots(rows);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load mailslots."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected =
    mailslots.find((mailslot) => mailslot.id === openedMailslotId) ?? null;

  useEffect(() => {
    if (!openedMailslotId || loading || selected) {
      return;
    }
    onCloseMailslot();
  }, [openedMailslotId, loading, selected, onCloseMailslot]);

  if (selected) {
    return (
      <MailslotView
        key={selected.id}
        mailslot={selected}
        mailslots={mailslots}
        keyboardActive={keyboardActive}
        onOpenMailslot={onOpenMailslot}
        onBack={onCloseMailslot}
        onUpdated={() => {
          void load();
        }}
        onDeleted={() => {
          onCloseMailslot();
          void load();
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-muted">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
        <h1 className="text-lg font-semibold text-ink">Mailslots</h1>
        {mailslots.length >= MAX_MAILSLOTS && (
          <p className="text-sm text-ink-muted">
            Maximum of {MAX_MAILSLOTS} mailslots.
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {error && <p className="mb-3 shrink-0 text-sm text-danger">{error}</p>}
        {loading ? (
          <p className="text-sm text-ink-muted">Loading mailslots…</p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-2 gap-3">
            {mailslots.slice(0, MAX_MAILSLOTS).map((mailslot, index) => (
              <MailslotCard
                key={mailslot.id}
                mailslot={mailslot}
                animationIndex={index}
                onOpen={(slot) => onOpenMailslot(slot.id)}
                onEdit={setEditor}
              />
            ))}

            {mailslots.length < MAX_MAILSLOTS && (
              <button
                type="button"
                onClick={() => setEditor("create")}
                className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink"
              >
                <FiPlus size={28} />
                <span className="text-sm font-medium">New mailslot</span>
              </button>
            )}
          </div>
        )}
      </div>

      {editor && (
        <MailslotEditorModal
          mailslot={editor === "create" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void load();
          }}
          onDeleted={() => {
            setEditor(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
