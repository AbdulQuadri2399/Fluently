import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AiError,
  usageRow,
  validate,
  type AiCall,
  type AiClient,
  type UsageLogger,
} from "./client";

/**
 * Live Claude calls (D6, D7, D16). Model and effort come from the workspace's per-stage
 * settings (AC28.1). Sonnet and Opus requests opt into server-side refusal fallbacks.
 * Output is checked against the Zod schema; one retry on invalid output, then invalid_output.
 */
export class AnthropicAiClient implements AiClient {
  readonly mode = "live" as const;
  private sdk: Anthropic;

  constructor(
    private log: UsageLogger,
    apiKey = process.env.ANTHROPIC_API_KEY,
  ) {
    this.sdk = new Anthropic({ apiKey, maxRetries: 2 });
  }

  async generate<T>(call: AiCall<T>): Promise<T> {
    const { model, effort } = call.settings.stageModels[call.stage];
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = performance.now();
      try {
        const params = {
          model,
          max_tokens: call.maxTokens ?? 16000,
          system: call.system,
          messages: [{ role: "user" as const, content: call.prompt }],
          output_config: { effort, format: zodOutputFormat(call.schema) },
          ...(model === "claude-haiku-5-5"
            ? {}
            : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }),
        };
        // The fallback parameter lives on the beta endpoint; the shapes are otherwise the same.
        const res = await (
          this.sdk.beta.messages.parse as unknown as (p: unknown) => Promise<{
            parsed_output: unknown;
            stop_reason: string;
            model: string;
            usage: {
              input_tokens: number;
              output_tokens: number;
              cache_read_input_tokens?: number | null;
              cache_creation_input_tokens?: number | null;
              server_tool_use?: { web_search_requests?: number } | null;
            };
          }>
        )(params);
        const usage = {
          model: res.model ?? model,
          inputTokens: res.usage.input_tokens,
          outputTokens: res.usage.output_tokens,
          cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
          webSearches: res.usage.server_tool_use?.web_search_requests ?? 0,
        };
        const ok = res.stop_reason !== "refusal" ? validate(call.schema, res.parsed_output) : null;
        await this.log(usageRow(call, usage, performance.now() - started, ok !== null));
        if (ok !== null) return ok;
        if (res.stop_reason === "refusal") throw new AiError("unavailable", "refused");
      } catch (e) {
        if (e instanceof AiError) throw e;
        await this.log(
          usageRow(
            call,
            { model, inputTokens: 0, outputTokens: 0 },
            performance.now() - started,
            false,
          ),
        );
        if (e instanceof Anthropic.RateLimitError) throw new AiError("rate_limited");
        if (e instanceof Anthropic.APIError) throw new AiError("unavailable", e.message);
        throw new AiError("unavailable", e instanceof Error ? e.message : String(e));
      }
    }
    throw new AiError("invalid_output");
  }
}
