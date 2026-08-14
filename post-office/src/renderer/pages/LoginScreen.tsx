import React from 'react';
import { useAuth } from '../context/AuthContext';

  const LoginScreen = () =>  {

    const {signIn} = useAuth();

	return (
	  <div>
        <h1>Welcome to Post Office</h1>

        <button
          onClick={signIn}
        >
          Sign in with Google
        </button>
      </div>
	);
  }
  
  export default LoginScreen;
  