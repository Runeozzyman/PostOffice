import React from 'react';
import SignOutButton from '../components/SignOutButton';
  
  const HomePage = () =>  {
	return (
	  <div>
      <h1>Welcome back! 📬</h1>
      <p>You are already authenticated.</p>
      <SignOutButton />
    </div>
	);
  }
  
  export default HomePage;
