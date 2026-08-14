//AuthContext wraps the entire app and provides global access and management to auth state

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

interface AuthContextType {
    isAuthenticated: boolean | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] =
        useState<boolean | null>(null);

    useEffect(() => {
        const checkAuthentication = async () => {
            const authenticated =
                await window.electronAPI.checkAuth();

            setIsAuthenticated(authenticated);
        };

        checkAuthentication();
    }, []);

    const signIn = async () => {
        await window.electronAPI.signInWithGoogle();

        setIsAuthenticated(true);
    };

    const signOut = async () => {
        await window.electronAPI.signOut();

        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside an AuthProvider"
        );
    }

    return context;
}