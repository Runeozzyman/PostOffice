import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

import Inbox from './Inbox';
import Mailslots from './Mailslots';
import Settings from './Settings';
import Starred from './Starred';
import Sent from './Sent';

import { useEffect, useState } from 'react';
  
  const HomePage = () =>  {

    const [currentPage, setCurrentPage]  = useState("mailslots")

    useEffect(() =>{
      const loadEmails = async () =>{
        const emails = await window.electronAPI.fetchEmails();

        console.log("Emails: ", emails)
      };
      loadEmails();
    }, []);

	return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar setCurrentPage={setCurrentPage}/>

      <main className="flex-1">
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
