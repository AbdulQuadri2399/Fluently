import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { AnthropicAiClient } from "./anthropic";
import type { AiClient, UsageLogger } from "./client";
import { FakeAiClient } from "./fake";

/** Writes usage with the service role: users can read ai_usage but never write it. */
export const supabaseUsageLogger: UsageLogger = async (row) => {
  try {
    const { error } = await adminClient().from("ai_usage").insert(row);
    if (error) console.error("ai_usage insert failed", error.message);
  } catch (e) {
    console.error("ai_usage insert failed", e);
  }
};

/** AI_MODE=live with an ANTHROPIC_API_KEY uses Claude; anything else uses made-up answers. */
export function getAiClient(): AiClient {
  if (process.env.AI_MODE === "live" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicAiClient(supabaseUsageLogger);
  }
  return new FakeAiClient(supabaseUsageLogger);
}
