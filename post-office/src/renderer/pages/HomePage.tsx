import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

import Inbox from './Inbox';
import Mailslots from './Mailslots';
import Settings from './Settings';
import Starred from './Starred';
import Sent from './Sent';

import {useState } from 'react';
  
  const HomePage = () =>  {

    const [currentPage, setCurrentPage]  = useState("mailslots")

	return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar setCurrentPage={setCurrentPage} />
    <main className="min-w-0 flex-1 overflow-hidden">
        {currentPage === "mailslots" && <Mailslots />}
        {currentPage === "inbox" && <Inbox />}
        {currentPage === "starred" && <Starred />}
        {currentPage === "sent" && <Sent />}
        {currentPage === "settings" && <Settings />}
      </main>
    </div>
  );
  }
  
  export default HomePage;
