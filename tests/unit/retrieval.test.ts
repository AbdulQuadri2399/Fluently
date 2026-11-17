import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { invertedToText, searchOpenAlex } from "@/lib/retrieval/openAlex";
import { searchPapers } from "@/lib/retrieval/papers";
import { searchSemanticScholar } from "@/lib/retrieval/semanticScholar";
import type { Fetch } from "@/lib/retrieval/types";

const fixture = (name: string) => readFileSync(`tests/fixtures/retrieval/${name}.json`, "utf8");
const respond = (status: number, body = "{}") =>
  new Response(body, { status, headers: { "Content-Type": "application/json" } });
const noSleep = vi.fn(async () => undefined);

describe("academic retrieval (D17, AC12.1)", () => {
  it("Semantic Scholar maps to source rows; no abstract is flagged (EC19)", async () => {
    const fetch: Fetch = vi.fn(async () => respond(200, fixture("semantic-scholar")));
    const papers = await searchSemanticScholar("goal gradient", { fetch });
    expect(papers[0]).toEqual({
      sourceType: "paper",
      title: "The goal-gradient hypothesis resurrected",
      url: "https://www.semanticscholar.org/paper/a1b2c3",
      authors: ["Ran Kivetz", "Oleg Urminsky", "Yuhuang Zheng"],
      year: 2006,
      doi: "10.1509/jmkr.43.1.39",
      externalId: "S2:a1b2c3",
      excerpt: "People accelerate their efforts as they approach a reward.",
      hasAbstract: true,
      provider: "semantic_scholar",
    });
    expect(papers[1]).toMatchObject({
      hasAbstract: false,
      doi: null,
      url: "https://www.semanticscholar.org/paper/d4e5f6",
    });
  });

  it("OpenAlex maps to source rows and rebuilds the abstract", async () => {
    const fetch: Fetch = vi.fn(async () => respond(200, fixture("openalex")));
    const [p] = await searchOpenAlex("defaults", { fetch });
    expect(p).toMatchObject({
      title: "Defaults and choice architecture",
      doi: "10.1000/xyz",
      externalId: "OA:W123",
      excerpt: "Defaults shape choices",
      url: "https://example.org/defaults",
    });
    expect(invertedToText(null)).toBeNull();
  });

  it("429 → backoff then fallback to OpenAlex", async () => {
    const calls: string[] = [];
    const fetch: Fetch = vi.fn(async (url: string) => {
      calls.push(url.includes("semanticscholar") ? "s2" : "oa");
      return url.includes("semanticscholar") ? respond(429) : respond(200, fixture("openalex"));
    });
    const papers = await searchPapers("defaults", { fetch, sleep: noSleep, backoffMs: [10, 20] });
    expect(calls).toEqual(["s2", "s2", "s2", "oa"]);
    expect(noSleep).toHaveBeenCalledWith(10);
    expect(noSleep).toHaveBeenCalledWith(20);
    expect(papers[0]?.provider).toBe("openalex");
  });

  it("a timeout counts as a failure and is retried", async () => {
    const fetch: Fetch = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
    );
    await expect(
      searchSemanticScholar("x", { fetch, timeoutMs: 5, backoffMs: [], sleep: noSleep }),
    ).rejects.toMatchObject({ status: "timeout" });
  });

  it("both fail → the step fails (AC11.4)", async () => {
    const fetch: Fetch = vi.fn(async () => respond(503));
    await expect(
      searchPapers("x", { fetch, sleep: noSleep, backoffMs: [1, 1] }),
    ).rejects.toMatchObject({ provider: "openalex", status: 503 });
  });
});
