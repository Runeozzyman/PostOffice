import React from 'react';
import SignOutButton from '../components/SignOutButton';
import { useEffect } from 'react';
  
  const HomePage = () =>  {

    useEffect(() =>{
      const loadEmails = async () =>{
        const emails = await window.electronAPI.fetchEmails();

        console.log("Emails: ", emails)
      };
      loadEmails();
    }, []);

	return (
	  <div>
      <h1 className='text-red-500'>
        Welcome back! 📬
      </h1>
      <p>You are already authenticated.</p>
      <SignOutButton />
    </div>
	);
  }
  
  export default HomePage;
