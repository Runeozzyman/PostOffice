import { useRef } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function MailboxChromeToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const toggledFromPointer = useRef(false);

  return (
    <button
      type="button"
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Show mailslots" : "Hide mailslots"}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        toggledFromPointer.current = true;
        onToggle();
      }}
      onClick={() => {
        if (toggledFromPointer.current) {
          toggledFromPointer.current = false;
          return;
        }
        onToggle();
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink"
    >
      {collapsed ? <FiChevronDown size={18} /> : <FiChevronUp size={18} />}
    </button>
  );
}
