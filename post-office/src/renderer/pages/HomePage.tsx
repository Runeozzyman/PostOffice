import Sidebar from "../components/Sidebar";

import Inbox from "./Inbox";
import Mailslots from "./Mailslots";
import Settings from "./Settings";
import Starred from "./Starred";
import Sent from "./Sent";

import { useState } from "react";

const HomePage = () => {
  const [currentPage, setCurrentPage] = useState("mailslots");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar setCurrentPage={setCurrentPage} />
      <main className="min-w-0 flex-1 overflow-hidden">
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
        {currentPage === "settings" && <Settings />}
      </main>
    </div>
  );
};

export default HomePage;
