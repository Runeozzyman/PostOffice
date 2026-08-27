import { ComposeProvider } from "./context/ComposeContext";
import { MailSyncProvider } from "./context/MailSyncContext";
import LoginScreen from "./pages/LoginScreen";
import HomePage from "./pages/HomePage";
import { useAuth } from "./context/AuthContext";

function App() {
  const {isAuthenticated} = useAuth();

  if (isAuthenticated === null) {
    return (
      <h1 className="p-6 text-ink">Loading...</h1>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen />
    );
  }

  return (
    <ComposeProvider>
      <MailSyncProvider>
        <HomePage />
      </MailSyncProvider>
    </ComposeProvider>
  );
}

export default App;