import { FiEdit3 } from "react-icons/fi";
import { useCompose } from "../context/ComposeContext";

export default function ComposeButton() {
  const { openCompose } = useCompose();

  return (
    <button
      type="button"
      aria-label="Compose"
      onClick={openCompose}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink"
    >
      <FiEdit3 size={18} />
    </button>
  );
}
