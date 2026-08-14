import { useEffect, useState } from "react";
import LoginScreen from "./pages/LoginScreen";
import HomePage from "./pages/HomePage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  //sign-in method passed into LoginScreen component
  const handleSignIn = async () => {
    try {
      await window.electronAPI.signInWithGoogle();

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

  //check once on mount if user auth creds are already stored
  useEffect(() => {
    const checkAuthentication = async () => {
      const authenticated = await window.electronAPI.checkAuth();

      setIsAuthenticated(authenticated);
    };

    checkAuthentication();
  }, []);

  if (isAuthenticated === null) {
    return <h1>Loading...</h1>;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen onSignIn={handleSignIn}/>
    );
  }

  return (
    <HomePage />
  );
}

export default App;