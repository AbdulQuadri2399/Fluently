import type { ModelPrices } from "./models";

export type Usage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  webSearches?: number;
};

/** Cost of one AI call in USD from the workspace price table (AC27.1). Unknown model → 0. */
export function costUsd(u: Usage, prices: ModelPrices): number {
  const p = prices[u.model as keyof ModelPrices];
  if (!p) return 0;
  const perToken = (perMillion: number, n = 0) => (perMillion * n) / 1_000_000;
  return (
    perToken(p.input, u.inputTokens) +
    perToken(p.output, u.outputTokens) +
    perToken(p.cacheRead, u.cacheReadTokens) +
    perToken(p.cacheWrite, u.cacheWriteTokens) +
    (p.webSearchPer1k * (u.webSearches ?? 0)) / 1000
  );
}

/** USD → GBP at the workspace's configured rate (AC27.2). */
export function toGbp(usd: number, gbpPerUsd: number): number {
  return usd * gbpPerUsd;
}

/** "£0.42" — two decimals; amounts under a penny but above zero show as "<£0.01". */
export function formatGbp(gbp: number): string {
  if (gbp > 0 && gbp < 0.005) return "<£0.01";
  return `£${gbp.toFixed(2)}`;
}
