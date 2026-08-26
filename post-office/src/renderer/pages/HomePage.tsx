import Sidebar from "../components/Sidebar";
import ComposeWindow from "../components/ComposeWindow";

import Inbox from "./Inbox";
import Mailslots from "./Mailslots";
import Settings from "./Settings";
import Starred from "./Starred";
import Sent from "./Sent";
import Trash from "./Trash";

import { useState } from "react";

const HomePage = () => {
  const [currentPage, setCurrentPage] = useState("mailslots");

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar setCurrentPage={setCurrentPage} />
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className={
            currentPage === "inbox" ? "h-full min-w-0" : "hidden"
          }
        >
          <Inbox />
        </div>
        {currentPage === "mailslots" && (
          <div className="h-full min-w-0">
            <Mailslots />
          </div>
        )}
        <div
          className={
            currentPage === "starred" ? "h-full min-w-0" : "hidden"
          }
        >
          <Starred />
        </div>
        <div
          className={
            currentPage === "sent" ? "h-full min-w-0" : "hidden"
          }
        >
          <Sent />
        </div>
        <div
          className={
            currentPage === "trash" ? "h-full min-w-0" : "hidden"
          }
        >
          <Trash />
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
