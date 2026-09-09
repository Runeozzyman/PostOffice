const WINDOW_MS = 60_000;
const MAX_UNITS_PER_MINUTE = 180;
const UNITS_PER_LIST = 5;
const UNITS_PER_MESSAGE_GET = 5;
const MAX_RETRIES = 6;

const spent: { at: number; units: number }[] = [];

export function gmailListCost() {
  return UNITS_PER_LIST;
}

export function gmailMessageGetCost(count: number) {
  return Math.max(0, count) * UNITS_PER_MESSAGE_GET;
}

function prune(now: number) {
  while (spent.length > 0 && now - spent[0].at >= WINDOW_MS) {
    spent.shift();
  }
}

function usedUnits(now: number) {
  prune(now);
  return spent.reduce((sum, item) => sum + item.units, 0);
}

export function isGmailQuotaError(error: unknown) {
  const status =
    error && typeof error === "object"
      ? (error as { code?: number | string; status?: number }).code ??
        (error as { status?: number }).status ??
        (error as { response?: { status?: number } }).response?.status
      : null;
  const code =
    typeof status === "string" && status ? Number(status) : status;

  const text = [
    error instanceof Error ? error.message : String(error),
    typeof error === "object" && error && "response" in error
      ? JSON.stringify(
          (error as { response?: { data?: unknown } }).response?.data ?? ""
        )
      : "",
  ].join(" ");

  return (
    code === 429 ||
    text.includes("Quota exceeded") ||
    text.includes("RATE_LIMIT") ||
    text.includes("Rate Limit") ||
    text.includes("RESOURCE_EXHAUSTED") ||
    text.includes("usageLimits") ||
    text.includes("rate-limiting this account")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function consumeGmailQuota(units: number) {
  if (units <= 0) {
    return;
  }

  for (;;) {
    const now = Date.now();
    const used = usedUnits(now);

    if (used + units <= MAX_UNITS_PER_MINUTE) {
      spent.push({ at: now, units });
      return;
    }

    const oldest = spent[0];
    const wait = oldest
      ? Math.max(250, WINDOW_MS - (now - oldest.at) + 50)
      : 1000;
    await sleep(wait);
  }
}

function retryDelayMs(attempt: number, error: unknown) {
  const headers =
    error && typeof error === "object"
      ? (error as { response?: { headers?: Record<string, unknown> } })
          .response?.headers
      : undefined;
  const retryAfter = headers?.["retry-after"] ?? headers?.["Retry-After"];
  const seconds =
    typeof retryAfter === "string" ? Number(retryAfter) : Number(retryAfter);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(90_000, seconds * 1000);
  }

  return Math.min(60_000, 2000 * 2 ** attempt);
}

export async function withGmailRetry<T>(work: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;

      if (!isGmailQuotaError(error) || attempt === MAX_RETRIES) {
        break;
      }

      const delay = retryDelayMs(attempt, error);
      console.warn(
        `Gmail quota hit; waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}.`
      );
      await sleep(delay);
    }
  }

  if (isGmailQuotaError(lastError)) {
    throw new Error(
      "Gmail is rate-limiting this account. Wait a minute, then refresh to continue syncing."
    );
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
