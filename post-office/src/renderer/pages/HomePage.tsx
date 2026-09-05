import Sidebar from "../components/Sidebar";
import ComposeWindow from "../components/ComposeWindow";

import Inbox from "./Inbox";
import Mailslots from "./Mailslots";
import Settings from "./Settings";
import Starred from "./Starred";
import Sent from "./Sent";
import Drafts from "./Drafts";
import Trash from "./Trash";

import { useCallback, useEffect, useState } from "react";
import { useCompose } from "../context/ComposeContext";
import { isTypingTarget } from "../helpers/keyboard";
import { MAILSLOTS_CHANGED_EVENT } from "../helpers/mailslotEvents";
import type { Mailslot } from "../../types/mailslot";

const HomePage = () => {
  const { openCompose } = useCompose();
  const [currentPage, setCurrentPage] = useState("mailslots");
  const [openedMailslotId, setOpenedMailslotId] = useState<string | null>(
    null
  );
  const [mailslots, setMailslots] = useState<Mailslot[]>([]);

  const goToPage = useCallback((page: string) => {
    setCurrentPage(page);
    if (page !== "mailslots") {
      setOpenedMailslotId(null);
    }
  }, []);

  const openMailslot = useCallback((id: string) => {
    setOpenedMailslotId(id);
    setCurrentPage("mailslots");
  }, []);

  const closeMailslot = useCallback(() => {
    setOpenedMailslotId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await window.electronAPI.listMailslots();
        if (!cancelled) {
          setMailslots(rows);
        }
      } catch {
        // Shortcuts still work for inbox / compose without slots.
      }
    };

    void load();
    const onChanged = () => {
      void load();
    };
    window.addEventListener(MAILSLOTS_CHANGED_EVENT, onChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(MAILSLOTS_CHANGED_EVENT, onChanged);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key;

      if (key === "i" || key === "I") {
        event.preventDefault();
        goToPage("inbox");
        return;
      }

      if (key === "c" || key === "C") {
        event.preventDefault();
        openCompose();
        return;
      }

      if (key >= "1" && key <= "9") {
        const slot = mailslots[Number(key) - 1];
        if (!slot) {
          return;
        }
        event.preventDefault();
        openMailslot(slot.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, mailslots, openCompose, openMailslot]);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar
        setCurrentPage={(page) => {
          if (page === "mailslots") {
            setOpenedMailslotId(null);
          }
          goToPage(page);
        }}
      />
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className={
            currentPage === "inbox" ? "h-full min-w-0" : "hidden"
          }
        >
          <Inbox
            keyboardActive={currentPage === "inbox"}
            onOpenMailslot={openMailslot}
          />
        </div>
        {currentPage === "mailslots" && (
          <div className="h-full min-w-0">
            <Mailslots
              openedMailslotId={openedMailslotId}
              onOpenMailslot={openMailslot}
              onCloseMailslot={closeMailslot}
              keyboardActive={
                currentPage === "mailslots" && Boolean(openedMailslotId)
              }
            />
          </div>
        )}
        <div
          className={
            currentPage === "starred" ? "h-full min-w-0" : "hidden"
          }
        >
          <Starred keyboardActive={currentPage === "starred"} />
        </div>
        <div
          className={
            currentPage === "sent" ? "h-full min-w-0" : "hidden"
          }
        >
          <Sent keyboardActive={currentPage === "sent"} />
        </div>
        <div
          className={
            currentPage === "drafts" ? "h-full min-w-0" : "hidden"
          }
        >
          <Drafts />
        </div>
        <div
          className={
            currentPage === "trash" ? "h-full min-w-0" : "hidden"
          }
        >
          <Trash keyboardActive={currentPage === "trash"} />
        </div>
        {currentPage === "settings" && (
          <div className="h-full min-w-0">
            <Settings />
          </div>
        )}
        <ComposeWindow />
      </main>
    </div>
  );
};

export default HomePage;
