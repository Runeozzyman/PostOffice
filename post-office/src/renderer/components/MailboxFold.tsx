import type { ReactNode } from "react";

export default function MailboxFold({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`mailbox-fold${collapsed ? " mailbox-fold-closed" : ""}`}
      aria-hidden={collapsed}
    >
      <div
        className={`mailbox-fold-inner ${collapsed ? "pointer-events-none" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
