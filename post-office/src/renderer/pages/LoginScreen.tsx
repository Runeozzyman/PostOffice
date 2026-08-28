import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "../context/AuthContext";
import logo from "../../assets/icon.png";

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);

    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div
          className="login-enter flex items-center gap-3"
          style={{ animationDelay: "0ms" }}
        >
          <img
            src={logo}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full"
          />
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            PostOffice
          </h1>
        </div>

        <p
          className="login-enter mt-4 text-base text-ink-muted"
          style={{ animationDelay: "160ms" }}
        >
          A better way to organize your inbox.
        </p>

        <div
          className="login-enter mt-10 w-full"
          style={{ animationDelay: "320ms" }}
        >
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-hover disabled:cursor-wait disabled:opacity-70"
          >
            <FcGoogle size={20} />
            {busy ? "Waiting for Google…" : "Log in with Google"}
          </button>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
