import './App.css'

function App() {
  const handleSignIn = async () => {
    await window.electronAPI.signInWithGoogle();
  };

  return (
    <div>
      <h1>Post Office</h1>

      <button onClick={handleSignIn}>
        Test Sign In
      </button>
    </div>
  );
}

export default App;
