import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AiError, type AiCall, type UsageRow } from "@/lib/ai/client";
import { FakeAiClient } from "@/lib/ai/fake";
import { DEFAULT_MODEL_PRICES, DEFAULT_STAGE_MODELS } from "@/lib/ai/models";
import { coachSchema, type CoachOutput } from "@/lib/ai/schemas";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(`tests/fixtures/ai/${name}.json`, "utf8"));

const call: AiCall<CoachOutput> = {
  workspaceId: "ws",
  projectId: "p",
  stage: "intake",
  step: "coach",
  system: "You coach briefs.",
  prompt: "Get more people to sign up",
  schema: coachSchema,
  settings: { stageModels: DEFAULT_STAGE_MODELS, modelPrices: DEFAULT_MODEL_PRICES },
};

function client(responder: () => unknown) {
  const rows: UsageRow[] = [];
  const ai = new FakeAiClient(async (r) => void rows.push(r), { coach: responder });
  return { ai, rows };
}

describe("AiClient (D6, D7, AC27.1)", () => {
  it("logs usage on success", async () => {
    const { ai, rows } = client(() => fixture("coach-business"));
    const out = await ai.generate(call);
    expect(out.lowSpecificity).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      workspace_id: "ws",
      project_id: "p",
      stage: "intake",
      step: "coach",
      model: "claude-haiku-5-5",
      success: true,
      cost_usd: 0,
    });
    expect(rows[0]!.input_tokens).toBeGreaterThan(0);
  });

  it("logs failed call", async () => {
    const { ai, rows } = client(() => {
      throw new Error("network down");
    });
    await expect(ai.generate(call)).rejects.toMatchObject({ code: "unavailable" });
    expect(rows).toEqual([expect.objectContaining({ success: false })]);
  });

  it("malformed JSON retried once then throws", async () => {
    const responder = vi.fn(() => ({ suggestion: 42 }));
    const { ai, rows } = client(responder);
    await expect(ai.generate(call)).rejects.toEqual(new AiError("invalid_output"));
    expect(responder).toHaveBeenCalledTimes(2);
    expect(rows.map((r) => r.success)).toEqual([false, false]);
  });

  it("malformed once, then valid: returns the valid answer", async () => {
    const responder = vi
      .fn()
      .mockReturnValueOnce("not json")
      .mockReturnValueOnce(fixture("coach-business"));
    const { ai } = client(responder);
    await expect(ai.generate(call)).resolves.toMatchObject({ lowSpecificity: true });
  });
});
