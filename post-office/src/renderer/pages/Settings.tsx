import SignOutButton from "../components/SignOutButton";

const Settings = () => {
  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="absolute bottom-0 right-0 p-3">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
};

export default Settings;
