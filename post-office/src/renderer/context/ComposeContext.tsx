import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ComposeMode = "closed" | "docked" | "minimized" | "fullscreen";

interface ComposeContextValue {
  mode: ComposeMode;
  openCompose: () => void;
  minimize: () => void;
  restore: () => void;
  fullscreen: () => void;
  close: () => void;
}

const ComposeContext = createContext<ComposeContextValue | undefined>(
  undefined
);

export function ComposeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ComposeMode>("closed");

  const openCompose = useCallback(() => {
    setMode((current) =>
      current === "fullscreen" ? "fullscreen" : "docked"
    );
  }, []);

  const value = useMemo(
    () => ({
      mode,
      openCompose,
      minimize: () => setMode("minimized"),
      restore: () => setMode("docked"),
      fullscreen: () =>
        setMode((current) =>
          current === "fullscreen" ? "docked" : "fullscreen"
        ),
      close: () => setMode("closed"),
    }),
    [mode, openCompose]
  );

  return (
    <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>
  );
}

export function useCompose() {
  const context = useContext(ComposeContext);

  if (!context) {
    throw new Error("useCompose must be used within ComposeProvider.");
  }

  return context;
}
