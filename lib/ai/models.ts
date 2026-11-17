// Models, effort levels and prices (04 D16, AC28.2). The database defaults for
// workspaces.stage_models and workspaces.model_prices are generated from these constants.
// Prices in USD per million tokens (web search per 1,000 searches), checked 2026-11-17.
// Web search price is a placeholder until checked against the live pricing page (04 D28).

export const MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type ModelId = (typeof MODELS)[number];

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

/** Stages that call the AI, in order. "intake" is brief coaching (SCR6). */
export const AI_STAGES = ["intake", "ethics", "research", "solutions", "lofi", "testplan"] as const;
export type AiStage = (typeof AI_STAGES)[number];

export type StageModel = { model: ModelId; effort: Effort };
export type StageModels = Record<AiStage, StageModel>;

export type ModelPrice = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearchPer1k: number;
};
export type ModelPrices = Record<ModelId, ModelPrice>;

export const DEFAULT_STAGE_MODELS: StageModels = {
  intake: { model: "claude-haiku-5-5", effort: "medium" },
  ethics: { model: "claude-haiku-5-5", effort: "medium" },
  research: { model: "claude-haiku-5-5", effort: "medium" },
  solutions: { model: "claude-haiku-5-5", effort: "medium" },
  lofi: { model: "claude-haiku-5-5", effort: "medium" },
  testplan: { model: "claude-haiku-5-5", effort: "medium" },
};

export const DEFAULT_MODEL_PRICES: ModelPrices = {
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheRead: 0.01,
    cacheWrite: 0.125,
    webSearchPer1k: 10,
  },
  "claude-sonnet-5-5": {
    input: 2,
    output: 10,
    cacheRead: 0.1,
    cacheWrite: 2.5,
    webSearchPer1k: 10,
  },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, webSearchPer1k: 10 },
};
