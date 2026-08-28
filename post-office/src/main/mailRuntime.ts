import { utilityProcess, type UtilityProcess } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  MailEvent,
  MailFromWorker,
  MailMethod,
  MailMethodMap,
  MailToWorker,
  MailWorkerInit,
} from "./mailProtocol";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

let child: UtilityProcess | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
const listeners = new Set<(event: MailEvent) => void>();
let ready: Promise<void> | null = null;

function workerPath() {
  return path.join(__dirname, "mailWorker.js");
}

function post(message: MailToWorker) {
  if (!child) {
    throw new Error("Mail worker is not running.");
  }

  child.postMessage(message);
}

function rejectAll(error: Error) {
  for (const wait of pending.values()) {
    wait.reject(error);
  }
  pending.clear();
}

export function onMailEvent(listener: (event: MailEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function startMailRuntime(init: MailWorkerInit) {
  if (ready) {
    return ready;
  }

  ready = new Promise<void>((resolve, reject) => {
    try {
      child = utilityProcess.fork(workerPath(), [], {
        serviceName: "PostOffice Mail",
        stdio: "inherit",
      });
    } catch (error) {
      ready = null;
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    child.on("message", (data: unknown) => {
      const message = data as MailFromWorker;

      if (message?.kind === "ready") {
        resolve();
        return;
      }

      if (message?.kind === "fatal") {
        reject(new Error(message.error));
        return;
      }

      if (message?.kind === "event") {
        for (const listener of listeners) {
          listener(message);
        }
        return;
      }

      if (message?.kind === "response") {
        const wait = pending.get(message.id);
        if (!wait) {
          return;
        }
        pending.delete(message.id);
        if (message.ok) {
          wait.resolve(message.result);
        } else {
          wait.reject(new Error(message.error || "Mail worker request failed."));
        }
      }
    });

    child.on("exit", (code) => {
      child = null;
      ready = null;
      rejectAll(new Error(`Mail worker exited (${code ?? "unknown"}).`));
    });

    child.on("spawn", () => {
      post({ kind: "init", init });
    });
  });

  return ready;
}

export function stopMailRuntime() {
  child?.kill();
  child = null;
  ready = null;
  rejectAll(new Error("Mail worker stopped."));
}

export function callMail<K extends MailMethod>(
  method: K,
  payload?: MailMethodMap[K]["payload"]
): Promise<MailMethodMap[K]["result"]> {
  if (!child) {
    return Promise.reject(new Error("Mail worker is not running."));
  }

  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (value) => resolve(value as MailMethodMap[K]["result"]),
      reject,
    });
    post({ kind: "request", id, method, payload });
  });
}
