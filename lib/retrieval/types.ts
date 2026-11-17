/** A paper found by academic search, shaped for the sources table (AC12.2). */
export type PaperResult = {
  sourceType: "paper";
  title: string;
  url: string | null;
  authors: string[];
  year: number | null;
  doi: string | null;
  externalId: string;
  excerpt: string | null;
  /** EC19: papers without an abstract are listed but not used for findings. */
  hasAbstract: boolean;
  provider: "semantic_scholar" | "openalex";
};

export type Fetch = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>;

export type SearchOptions = {
  limit?: number;
  timeoutMs?: number;
  /** Waits between retries after a rate limit or server error (AC11.4: up to 2 retries). */
  backoffMs?: number[];
  fetch?: Fetch;
  sleep?: (ms: number) => Promise<void>;
};

export class RetrievalError extends Error {
  constructor(
    public provider: string,
    public status: number | "timeout" | "network",
  ) {
    super(`${provider} failed: ${status}`);
  }
}

/** GET JSON with a timeout, retrying 429 and 5xx with backoff. */
export async function getJson(
  provider: string,
  url: string,
  opts: SearchOptions,
): Promise<unknown> {
  const doFetch = opts.fetch ?? ((u, i) => fetch(u, i));
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const backoff = opts.backoffMs ?? [1000, 3000];
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
    let status: number | "timeout" | "network";
    try {
      const res = await doFetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (res.ok) return await res.json();
      status = res.status;
    } catch (e) {
      status = (e as Error).name === "AbortError" ? "timeout" : "network";
    } finally {
      clearTimeout(timer);
    }
    const retryable =
      status === "timeout" ||
      status === "network" ||
      status === 429 ||
      (typeof status === "number" && status >= 500);
    if (!retryable || attempt >= backoff.length) throw new RetrievalError(provider, status);
    await sleep(backoff[attempt]!);
  }
}
