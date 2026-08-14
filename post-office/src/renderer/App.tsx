import { useEffect, useState } from "react";
import LoginScreen from "./pages/LoginScreen";
import HomePage from "./pages/HomePage";
import { useAuth } from "./context/AuthContext";

function App() {
  const {isAuthenticated} = useAuth();

  if (isAuthenticated === null) {
    return <h1>Loading...</h1>;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen />
    );
  }

  return (
    <HomePage />
  );
}

export default App;