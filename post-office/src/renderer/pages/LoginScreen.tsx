import { useAuth } from "../context/AuthContext";
import { FcGoogle } from "react-icons/fc";

const LoginScreen = () => {
  const { signIn } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-line bg-surface p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Post Office
            </h1>
            <p className="mt-2 text-ink-muted">
              A better way to organize your inbox.
            </p>
          </div>

          <button
            onClick={signIn}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-hover"
          >
            <FcGoogle size={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
