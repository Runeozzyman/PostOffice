import React from 'react';

interface LoginScreenProps {
	onSignIn: () => void;
}

  const LoginScreen = ({onSignIn}: LoginScreenProps) =>  {

	return (
	  <div>
        <h1>Welcome to Post Office</h1>

        <button
          onClick={onSignIn}
        >
          Sign in with Google
        </button>
      </div>
	);
  }
  
  export default LoginScreen;
  