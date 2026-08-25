import { useState } from "react";
import {
  FiInbox,
  FiStar,
  FiSend,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiMail,
} from "react-icons/fi";

interface SidebarProps {
    setCurrentPage: (page: string) => void 
}

const Sidebar = ({setCurrentPage}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
    className={`
        h-screen shrink 0
        border-r border-gray-200
        bg-white
        flex flex-col
        overflow-hidden
        transition-all duration-200
        ${collapsed ? "w-16" : "w-64"}
    `}
    >
      {/* Header */}
      <div className="h-16 flex items-center border-b border-gray-200 px-4">
  <div className="flex-1 min-w-0 overflow-hidden">
    <h1
      className={`
        text-lg font-semibold text-gray-900
        whitespace-nowrap
        transition-opacity duration-100
        ${collapsed ? "opacity-0" : "opacity-100"}
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
      text-gray-500
      hover:bg-gray-100
      hover:text-gray-900
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

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">

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
          onClick={() =>{setCurrentPage("starred")}}
        />

        <SidebarItem
          icon={<FiSend size={18} />}
          label="Sent"
          collapsed={collapsed}
          onClick={() =>{setCurrentPage("sent")}}
        />

      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-200">
        <SidebarItem
          icon={<FiSettings size={18} />}
          label="Settings"
          collapsed={collapsed}
          onClick={() =>{setCurrentPage("settings")}}
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
      className="
        w-full
        flex items-center
        gap-3
        px-3 py-2
        rounded-md
        text-sm
        text-gray-600
        hover:bg-gray-100
        hover:text-gray-900
        transition-colors
      "
    >
      <span className="shrink-0">
        {icon}
      </span>

      <span
        className={`
          whitespace-nowrap
          overflow-hidden
          transition-opacity duration-100
          ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}
        `}
      >
        {label}
      </span>
    </button>
  );
};

export default Sidebar;