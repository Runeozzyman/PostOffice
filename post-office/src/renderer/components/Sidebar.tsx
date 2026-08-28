import { useState } from "react";
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

  return (
    <aside
      className={`
        h-full shrink-0
        border-r border-line
        bg-surface
        flex flex-col
        overflow-hidden
        ${collapsed ? "w-16" : "w-64"}
    `}
    >
      <div className="flex h-16 items-center border-b border-line px-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h1
            className={`
        text-lg font-semibold text-ink
        whitespace-nowrap
        ${collapsed ? "sr-only" : ""}
      `}
          >
            PostOffice
          </h1>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
      shrink-0
      p-2
      rounded-md
      text-ink-muted
      hover:bg-hover
      hover:text-ink
      transition-colors
    "
        >
          {collapsed ? (
            <FiChevronRight size={18} />
          ) : (
            <FiChevronLeft size={18} />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
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

      <div className="flex h-16 shrink-0 items-center border-t border-line px-3">
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
  icon: React.ReactNode;
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
      onClick={onClick}
      className={`
        w-full
        flex items-center
        rounded-md
        text-sm
        text-ink-secondary
        hover:bg-hover
        hover:text-ink
        transition-colors
        hover:cursor-pointer
        ${collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"}
      `}
    >
      <span className="shrink-0">{icon}</span>
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </button>
  );
};

export default Sidebar;
