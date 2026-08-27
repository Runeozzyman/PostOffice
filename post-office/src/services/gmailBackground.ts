import { setEmailLabels } from "../db/emails";

const chains = new Map<string, Promise<void>>();
const generation = new Map<string, number>();

export function nextLabelGeneration(id: string) {
  const value = (generation.get(id) ?? 0) + 1;
  generation.set(id, value);
  return value;
}

export function enqueueGmailLabelSync(
  id: string,
  gen: number,
  previousLabels: string[],
  work: () => Promise<void>,
  onFailure: (error: Error) => void
) {
  const run = async () => {
    try {
      await work();
    } catch (error) {
      if (generation.get(id) !== gen) {
        return;
      }

      setEmailLabels(id, previousLabels);
      onFailure(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const next = (chains.get(id) ?? Promise.resolve()).then(run, run);
  chains.set(id, next);
  void next.finally(() => {
    if (chains.get(id) === next) {
      chains.delete(id);
    }
  });
}
