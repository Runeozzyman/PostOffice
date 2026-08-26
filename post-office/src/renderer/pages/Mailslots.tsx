import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import type { Mailslot } from "../../types/mailslot";
import MailslotCard from "../components/MailslotCard";
import MailslotEditorModal from "../components/MailslotEditorModal";
import MailslotView from "../components/MailslotView";

export default function Mailslots() {
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<"create" | Mailslot | null>(null);
  const [selected, setSelected] = useState<Mailslot | null>(null);

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

  if (selected) {
    return (
      <MailslotView
        mailslot={selected}
        onBack={() => setSelected(null)}
        onUpdated={(updated) => {
          setSelected(updated);
          void load();
        }}
        onDeleted={() => {
          setSelected(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Mailslots</h1>
        <p className="text-sm text-gray-500">
          Separate inboxes you can open at a glance.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-500">Loading mailslots…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {mailslots.map((mailslot, index) => (
              <MailslotCard
                key={mailslot.id}
                mailslot={mailslot}
                animationIndex={index}
                onOpen={setSelected}
                onEdit={setEditor}
              />
            ))}

            <button
              type="button"
              onClick={() => setEditor("create")}
              className="flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-800"
            >
              <FiPlus size={28} />
              <span className="text-sm font-medium">New mailslot</span>
            </button>
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
