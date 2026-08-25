import { useAuth } from "../context/AuthContext";

const SignOutButton = () =>{

    const {signOut} = useAuth();

    return(
        <div>
            <button 
                onClick={signOut}
                className="hover:bg-gray-500 p-1 border border-red-500 rounded transition duration-100"
            >
                Sign Out
            </button>
        </div>
    )
}

export default SignOutButton;