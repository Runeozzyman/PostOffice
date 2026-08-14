export {};

declare global{
    interface Window{
        electronAPI: {
            signInWithGoogle: () => Promise<Void>
            checkAuth: () => Promise<boolean>
        }
    }
}