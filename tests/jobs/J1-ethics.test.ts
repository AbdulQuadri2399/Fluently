import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedUser } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { AiError, type UsageRow } from "@/lib/ai/client";
import { FakeAiClient } from "@/lib/ai/fake";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";

// J1 ethicsGate (AC10.1–AC10.3, AC10.5).
describe("J1 ethics gate", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  const usage: UsageRow[] = [];
  const ai = new FakeAiClient(async (r) => void usage.push(r));
  const db = adminClient() as never;

  beforeAll(async () => {
    a = await createIsolatedUser();
  });

  async function approved(brief = {}) {
    const projectId = await projectWithBrief(a.client, brief);
    const res = await approveObjectives(a.client, projectId);
    if (!res.ok) throw new Error(res.code);
    return { projectId, runId: res.data.stageRunId };
  }

  async function state(projectId: string) {
    const [node, project, run] = await Promise.all([
      a.client
        .from("nodes")
        .select("id, status, data")
        .eq("project_id", projectId)
        .eq("type", "ethics")
        .single(),
      a.client.from("projects").select("current_stage, status").eq("id", projectId).single(),
      a.client
        .from("stage_runs")
        .select("status")
        .eq("project_id", projectId)
        .eq("stage", "ethics")
        .single(),
    ]);
    return { node: node.data, project: project.data, run: run.data };
  }

  it("pass → ethics node ok, research ready, linked to both objectives", async () => {
    const { projectId, runId } = await approved();
    expect(await ethicsGate(db, ai, runId)).toBe("pass");
    const s = await state(projectId);
    expect(s.node).toMatchObject({ status: "ok", data: { result: "pass", reasons: [] } });
    expect(s.project).toEqual({ current_stage: "research", status: "waiting" });
    expect(s.run?.status).toBe("succeeded");
    const edges = await a.client.from("edges").select("id").eq("to_id", s.node!.id);
    expect(edges.data).toHaveLength(2);
    expect(usage.at(-1)).toMatchObject({ stage: "ethics", success: true });
  });

  it("fake 'fake urgency' brief → flag with rule name", async () => {
    const { projectId, runId } = await approved({
      audience_context: "Add a countdown so they hurry before the offer ends",
    });
    expect(await ethicsGate(db, ai, runId)).toBe("flag");
    const s = await state(projectId);
    expect(s.node?.status).toBe("flagged");
    expect((s.node?.data as { reasons: { rule: string }[] }).reasons[0]?.rule).toBe(
      "Fake urgency or scarcity",
    );
    expect(s.project).toEqual({ current_stage: "ethics", status: "waiting" });
  });

  it("AI failure → stage failed, research not enabled", async () => {
    const broken = new FakeAiClient(async () => undefined, {
      ethics: () => {
        throw new AiError("unavailable");
      },
    });
    const { projectId, runId } = await approved();
    expect(await ethicsGate(db, broken, runId)).toBe("failed");
    const s = await state(projectId);
    expect(s.node?.status).toBe("failed");
    expect(s.run?.status).toBe("failed");
    expect(s.project).toEqual({ current_stage: "ethics", status: "failed" });
  });
});
