import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedUser, sql } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { FakeAiClient } from "@/lib/ai/fake";
import { approveObjectives, recordOverride } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";

// O17 recordOverride (AC26.1–AC26.3).
const db = sql();
afterAll(() => db.end());

describe("O17 override", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let ethicsId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    projectId = await projectWithBrief(a.client, {
      audience_context: "Only 2 left messaging to push the upgrade",
    });
    const res = await approveObjectives(a.client, projectId);
    if (!res.ok) throw new Error(res.code);
    await ethicsGate(
      adminClient() as never,
      new FakeAiClient(async () => undefined),
      res.data.stageRunId,
    );
    const n = await a.client
      .from("nodes")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("type", "ethics")
      .single();
    expect(n.data?.status).toBe("flagged");
    ethicsId = n.data!.id;
  });

  it("19 chars → validation", async () => {
    expect(await recordOverride(a.client, { nodeId: ethicsId, reason: "x".repeat(19) })).toEqual({
      ok: false,
      code: "validation",
    });
  });

  it("20 chars → override node linked to the flag, event recorded, research ready", async () => {
    const reason = "Stock is genuinely 2.";
    expect(reason.length).toBeGreaterThanOrEqual(20);
    const res = await recordOverride(a.client, { nodeId: ethicsId, reason });
    if (!res.ok) throw new Error(res.code);
    const node = await a.client
      .from("nodes")
      .select("type, provenance, data")
      .eq("id", res.data.overrideId)
      .single();
    expect(node.data).toMatchObject({
      type: "override",
      provenance: "human",
      data: { reason, rule: "Fake urgency or scarcity" },
    });
    const edge = await a.client
      .from("edges")
      .select("id")
      .eq("from_id", ethicsId)
      .eq("to_id", res.data.overrideId);
    expect(edge.data).toHaveLength(1);
    const ethics = await a.client.from("nodes").select("status").eq("id", ethicsId).single();
    expect(ethics.data?.status).toBe("overridden");
    const p = await a.client
      .from("projects")
      .select("current_stage, status")
      .eq("id", projectId)
      .single();
    expect(p.data).toEqual({ current_stage: "research", status: "waiting" });
    const [ev] = await db<{ props: Record<string, unknown> }[]>`
      select props from public.events where member_id = ${a.id} and name = 'ethics_override_recorded'`;
    expect(ev?.props).toEqual({ level: "gate", rule: "Fake urgency or scarcity" });
    expect(await recordOverride(a.client, { nodeId: ethicsId, reason })).toEqual({
      ok: false,
      code: "conflict",
    });
  });
});
