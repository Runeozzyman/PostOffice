import { useEffect, useState } from "react";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const handleSignIn = async () => {
    try {
      await window.electronAPI.signInWithGoogle();

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

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
      <div>
        <h1>Welcome to Post Office</h1>

        <button
          onClick={handleSignIn}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome back! 📬</h1>
      <p>You are already authenticated.</p>
    </div>
  );
}

export default App;