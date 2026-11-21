import type { z } from "zod";
import { costUsd, type Usage } from "./cost";
import type { AiStage, ModelPrices, StageModels } from "./models";

/** One AI call (D6): which stage and step it belongs to, what to ask, and the shape to return. */
export type AiCall<T> = {
  workspaceId: string;
  projectId: string | null;
  stage: AiStage;
  step: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  settings: { stageModels: StageModels; modelPrices: ModelPrices };
  /** Pictures sent with the prompt (the email's phone render, for the visual lens). */
  images?: { mediaType: "image/png" | "image/jpeg"; base64: string }[];
  /** Fake mode only: the inputs the made-up answer is built from. */
  input?: Record<string, unknown>;
  maxTokens?: number;
};

export type AiErrorCode = "unavailable" | "rate_limited" | "invalid_output";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export type UsageRow = {
  workspace_id: string;
  project_id: string | null;
  stage: string;
  step: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  web_searches: number;
  cost_usd: number;
  duration_ms: number;
  success: boolean;
};

/** Writes one ai_usage row (AC27.1). Failures to log never fail the user's action. */
export type UsageLogger = (row: UsageRow) => Promise<void>;

export interface AiClient {
  readonly mode: "live" | "fake";
  generate<T>(call: AiCall<T>): Promise<T>;
}

export function usageRow(
  call: AiCall<unknown>,
  usage: Usage,
  durationMs: number,
  success: boolean,
  priced = true,
): UsageRow {
  return {
    workspace_id: call.workspaceId,
    project_id: call.projectId,
    stage: call.stage,
    step: call.step,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_tokens: usage.cacheReadTokens ?? 0,
    cache_write_tokens: usage.cacheWriteTokens ?? 0,
    web_searches: usage.webSearches ?? 0,
    cost_usd: priced ? costUsd(usage, call.settings.modelPrices) : 0,
    duration_ms: Math.round(durationMs),
    success,
  };
}

/** Validates against the schema; returns null when the output doesn't fit (D7). */
export function validate<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const res = schema.safeParse(value);
  return res.success ? res.data : null;
}
