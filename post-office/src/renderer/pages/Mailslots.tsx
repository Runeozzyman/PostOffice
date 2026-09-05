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
        mailslot={selected}
        keyboardActive={keyboardActive}
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
      <div className="flex h-16 shrink-0 items-center border-b border-line bg-surface px-4">
        <h1 className="text-lg font-semibold text-ink">Mailslots</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {error && <p className="mb-4 text-sm text-danger">{error}</p>}
        {loading ? (
          <p className="text-sm text-ink-muted">Loading mailslots…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {mailslots.map((mailslot, index) => (
              <MailslotCard
                key={mailslot.id}
                mailslot={mailslot}
                animationIndex={index}
                onOpen={(slot) => onOpenMailslot(slot.id)}
                onEdit={setEditor}
              />
            ))}

            {mailslots.length < MAX_MAILSLOTS ? (
              <button
                type="button"
                onClick={() => setEditor("create")}
                className="flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink"
              >
                <FiPlus size={28} />
                <span className="text-sm font-medium">New mailslot</span>
              </button>
            ) : (
              <p className="col-span-full text-sm text-ink-muted">
                Maximum of {MAX_MAILSLOTS} mailslots.
              </p>
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
