import { useAuth } from "../context/AuthContext";

const SignOutButton = () => {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      onClick={signOut}
      className="shrink-0 rounded-md border border-danger px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft hover:cursor-pointer"
    >
      Sign out
    </button>
  );
};

export default SignOutButton;
