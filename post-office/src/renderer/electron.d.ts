//Add all IPC methods here for type declarations

export {};

declare global{
    interface Window{
        electronAPI: {
            signInWithGoogle: () => Promise<Void>
            checkAuth: () => Promise<boolean>
        }
    }
}