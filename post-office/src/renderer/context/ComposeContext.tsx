import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ComposeDraft } from "../../types/compose";

export type ComposeMode = "closed" | "docked" | "minimized" | "fullscreen";

interface ComposeContextValue {
  mode: ComposeMode;
  sessionId: number;
  seed: ComposeDraft | null;
  activeDraftId: string;
  openCompose: (draft?: ComposeDraft) => void;
  registerPersist: (persist: (() => Promise<void>) | null) => void;
  setActiveDraftId: (id: string) => void;
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
  const [activeDraftId, setActiveDraftId] = useState("");
  const persistRef = useRef<(() => Promise<void>) | null>(null);
  const modeRef = useRef(mode);
  const activeDraftIdRef = useRef(activeDraftId);

  modeRef.current = mode;
  activeDraftIdRef.current = activeDraftId;

  const registerPersist = useCallback((persist: (() => Promise<void>) | null) => {
    persistRef.current = persist;
  }, []);

  const openCompose = useCallback((draft?: ComposeDraft) => {
    const currentMode = modeRef.current;

    if (
      draft?.id &&
      draft.id === activeDraftIdRef.current &&
      currentMode !== "closed"
    ) {
      setMode((current) =>
        current === "fullscreen" ? "fullscreen" : "docked"
      );
      return;
    }

    void (async () => {
      try {
        if (currentMode !== "closed" && persistRef.current) {
          await persistRef.current();
        }
      } catch {
        return;
      }

      if (draft) {
        setSeed(draft);
        setActiveDraftId(draft.id ?? "");
        setSessionId((current) => current + 1);
      } else if (currentMode === "closed") {
        setSeed(null);
        setActiveDraftId("");
        setSessionId((current) => current + 1);
      }

      setMode((current) =>
        current === "fullscreen" || currentMode === "fullscreen"
          ? "fullscreen"
          : "docked"
      );
    })();
  }, []);

  const close = useCallback(() => {
    setMode("closed");
    setActiveDraftId("");
    setSeed(null);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      sessionId,
      seed,
      activeDraftId,
      openCompose,
      registerPersist,
      setActiveDraftId,
      minimize: () => setMode("minimized"),
      restore: () => setMode("docked"),
      fullscreen: () =>
        setMode((current) =>
          current === "fullscreen" ? "docked" : "fullscreen"
        ),
      close,
    }),
    [mode, sessionId, seed, activeDraftId, openCompose, registerPersist, close]
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
