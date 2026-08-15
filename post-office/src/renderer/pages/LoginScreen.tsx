import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FcGoogle } from "react-icons/fc";

  const LoginScreen = () =>  {

    const {signIn} = useAuth();

	return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              Post Office
            </h1>

            <p className="mt-2 text-gray-500">
              A better way to organize your inbox.
            </p>
          </div>

          <button
            onClick={signIn}
            className="
              w-full
              flex items-center justify-center
              gap-3
              rounded-lg
              border border-gray-300
              bg-white
              px-4 py-3
              text-sm font-medium
              text-gray-700
              hover:bg-gray-50
              transition-colors
            "
          >
            <FcGoogle size={20} />
            Sign in with Google
          </button>

        </div>

      </div>
    </div>
  );
  }
  
  export default LoginScreen;
  