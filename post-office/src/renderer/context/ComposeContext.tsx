import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ComposeDraft } from "../../types/compose";

export type ComposeMode = "closed" | "docked" | "minimized" | "fullscreen";

interface ComposeContextValue {
  mode: ComposeMode;
  sessionId: number;
  seed: ComposeDraft | null;
  openCompose: (draft?: ComposeDraft) => void;
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
  const [sessionId, setSessionId] = useState(0);
  const [seed, setSeed] = useState<ComposeDraft | null>(null);

  const openCompose = useCallback(
    (draft?: ComposeDraft) => {
      if (draft) {
        if (
          mode !== "closed" &&
          !window.confirm("Replace the message you are writing?")
        ) {
          return;
        }

        setSeed(draft);
        setSessionId((current) => current + 1);
      } else if (mode === "closed") {
        setSeed(null);
        setSessionId((current) => current + 1);
      }

      setMode((current) =>
        current === "fullscreen" ? "fullscreen" : "docked"
      );
    },
    [mode]
  );

  const value = useMemo(
    () => ({
      mode,
      sessionId,
      seed,
      openCompose,
      minimize: () => setMode("minimized"),
      restore: () => setMode("docked"),
      fullscreen: () =>
        setMode((current) =>
          current === "fullscreen" ? "docked" : "fullscreen"
        ),
      close: () => setMode("closed"),
    }),
    [mode, sessionId, seed, openCompose]
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
