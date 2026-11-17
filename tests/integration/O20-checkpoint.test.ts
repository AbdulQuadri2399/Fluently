import { beforeAll, describe, expect, it } from "vitest";
import { createIsolatedUser } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { approveCheckpoint } from "@/lib/stages/service";

// O20 decideCheckpoint, approve path (AC25.1, AC25.3).
describe("O20 checkpoint", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  beforeAll(async () => {
    a = await createIsolatedUser();
  });

  it("approve records decision and sets status", async () => {
    const projectId = await projectWithBrief(a.client);
    expect(await approveCheckpoint(a.client, projectId, "research")).toEqual({
      ok: false,
      code: "conflict",
    });
    await a.client
      .from("projects")
      .update({ current_stage: "research", status: "waiting", updated_by: a.id })
      .eq("id", projectId);
    const res = await approveCheckpoint(a.client, projectId, "research", []);
    if (!res.ok) throw new Error(res.code);
    const cp = await a.client
      .from("checkpoints")
      .select("stage, decision, decided_by")
      .eq("id", res.data.checkpointId)
      .single();
    expect(cp.data).toEqual({ stage: "research", decision: "approve", decided_by: a.id });
    const p = await a.client
      .from("projects")
      .select("current_stage, status")
      .eq("id", projectId)
      .single();
    expect(p.data).toEqual({ current_stage: "solutions", status: "in_progress" });
  });
});
