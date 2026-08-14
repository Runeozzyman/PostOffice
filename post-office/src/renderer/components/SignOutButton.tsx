import React from "react"
import { useAuth } from "../context/AuthContext";

const SignOutButton = () =>{

    const {signOut} = useAuth();

    return(
        <div>
            <button onClick={signOut}>
                Sign Out
            </button>
        </div>
    )
}

export default SignOutButton;