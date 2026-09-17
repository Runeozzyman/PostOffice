import { useRef, useState, type ReactNode } from "react";
import {
  FiInbox,
  FiStar,
  FiSend,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiMail,
  FiTrash2,
  FiEdit3,
} from "react-icons/fi";

interface SidebarProps {
  setCurrentPage: (page: string) => void;
}

const Sidebar = ({ setCurrentPage }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggledFromPointer = useRef(false);

  const toggleCollapsed = () => {
    setCollapsed((current) => !current);
  };

  return (
    <aside
      className={`sidebar-rail relative z-10 flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-surface${
        collapsed ? " sidebar-rail-closed" : ""
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-line px-3">
        <h1 className="sidebar-label text-lg font-semibold text-ink">
          <span className="sidebar-label-text">PostOffice</span>
        </h1>

        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            toggledFromPointer.current = true;
            toggleCollapsed();
          }}
          onClick={() => {
            if (toggledFromPointer.current) {
              toggledFromPointer.current = false;
              return;
            }
            toggleCollapsed();
          }}
          className="shrink-0 rounded-md p-2 text-ink-muted transition-colors hover:bg-hover hover:text-ink"
        >
          {collapsed ? (
            <FiChevronRight size={18} />
          ) : (
            <FiChevronLeft size={18} />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <SidebarItem
          icon={<FiMail size={18} />}
          label="Mailslots"
          collapsed={collapsed}
          onClick={() => setCurrentPage("mailslots")}
        />

        <SidebarItem
          icon={<FiInbox size={18} />}
          label="Inbox"
          collapsed={collapsed}
          onClick={() => setCurrentPage("inbox")}
        />

        <SidebarItem
          icon={<FiStar size={18} />}
          label="Starred"
          collapsed={collapsed}
          onClick={() => {
            setCurrentPage("starred");
          }}
        />

        <SidebarItem
          icon={<FiSend size={18} />}
          label="Sent"
          collapsed={collapsed}
          onClick={() => {
            setCurrentPage("sent");
          }}
        />

        <SidebarItem
          icon={<FiEdit3 size={18} />}
          label="Drafts"
          collapsed={collapsed}
          onClick={() => {
            setCurrentPage("drafts");
          }}
        />

        <SidebarItem
          icon={<FiTrash2 size={18} />}
          label="Trash"
          collapsed={collapsed}
          onClick={() => {
            setCurrentPage("trash");
          }}
        />
      </nav>

      <div className="flex h-10 shrink-0 items-center border-t border-line px-3">
        <SidebarItem
          icon={<FiSettings size={18} />}
          label="Settings"
          collapsed={collapsed}
          onClick={() => {
            setCurrentPage("settings");
          }}
        />
      </div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

const SidebarItem = ({
  icon,
  label,
  collapsed,
  onClick,
}: SidebarItemProps) => {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      onClick={onClick}
      className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm leading-none text-ink-secondary hover:cursor-pointer hover:bg-hover hover:text-ink"
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:block">
        {icon}
      </span>
      <span className="sidebar-label">
        <span className="sidebar-label-text">{label}</span>
      </span>
    </button>
  );
};

export default Sidebar;
