import { describe, expect, it } from "vitest";
import { costUsd, formatGbp, toGbp } from "@/lib/ai/cost";
import { DEFAULT_MODEL_PRICES } from "@/lib/ai/models";

describe("cost (AC27.1, AC27.2)", () => {
  it("USD→GBP at configured rate, per-model prices incl. cache and web search", () => {
    // Sonnet 5.5: $2 in, $10 out, $0.10 cache read, $2.50 cache write per MTok, $10 per 1k searches.
    const usd = costUsd(
      {
        model: "claude-sonnet-5-5",
        inputTokens: 1_000_000,
        outputTokens: 100_000,
        cacheReadTokens: 2_000_000,
        cacheWriteTokens: 400_000,
        webSearches: 5,
      },
      DEFAULT_MODEL_PRICES,
    );
    expect(usd).toBeCloseTo(2 + 1 + 0.2 + 1 + 0.05, 10);
    expect(toGbp(usd, 0.79)).toBeCloseTo(4.25 * 0.79, 10);
    // Haiku is the cheap default; Opus costs twice Sonnet.
    const haiku = costUsd(
      { model: "claude-haiku-5-5", inputTokens: 1_000_000, outputTokens: 1_000_000 },
      DEFAULT_MODEL_PRICES,
    );
    expect(haiku).toBeCloseTo(0.6, 10);
    const opus = costUsd(
      { model: "claude-opus-5-5", inputTokens: 1_000_000, outputTokens: 0 },
      DEFAULT_MODEL_PRICES,
    );
    expect(opus).toBe(4);
  });

  it("unknown model costs nothing rather than throwing", () => {
    expect(
      costUsd({ model: "other", inputTokens: 10, outputTokens: 10 }, DEFAULT_MODEL_PRICES),
    ).toBe(0);
  });

  it("formats pounds, with <£0.01 for tiny amounts", () => {
    expect(formatGbp(0)).toBe("£0.00");
    expect(formatGbp(0.001)).toBe("<£0.01");
    expect(formatGbp(3.456)).toBe("£3.46");
  });
});
