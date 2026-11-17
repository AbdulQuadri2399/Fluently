import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedAdmin } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { FakeAiClient } from "@/lib/ai/fake";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";
import { RUN_TIMEOUT_MS, runResearch } from "@/lib/jobs/research";
import { setMemberActive } from "@/lib/settings/service";
import { cancelStage, startStage } from "@/lib/stages/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// Stage engine (AC11.1, AC11.3, AC11.7, NFR8, EC8, EC18).
describe("stage engine", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  const db = adminClient() as never;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    const saved = await saveToolkitVersion(admin.client, {
      fileName: "sample-toolkit.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    if (!saved.ok) throw new Error(saved.code);
  });

  async function readyProject(client = admin.client) {
    const projectId = await projectWithBrief(client);
    const approved = await approveObjectives(client, projectId);
    if (!approved.ok) throw new Error(approved.code);
    await ethicsGate(db, new FakeAiClient(async () => undefined), approved.data.stageRunId);
    return projectId;
  }

  it("start queues run", async () => {
    const projectId = await readyProject();
    const res = await startStage(admin.client, projectId, "research");
    if (!res.ok) throw new Error(res.code);
    const run = await admin.client
      .from("stage_runs")
      .select("status, steps, stage")
      .eq("id", res.data.stageRunId)
      .single();
    expect(run.data).toMatchObject({ status: "queued", stage: "research" });
    expect((run.data?.steps as unknown[]).length).toBe(5);
    const p = await admin.client.from("projects").select("status").eq("id", projectId).single();
    expect(p.data?.status).toBe("running");

    expect(await runResearch(db, res.data.stageRunId)).toBe("succeeded");
    const cards = await admin.client
      .from("nodes")
      .select("title")
      .eq("project_id", projectId)
      .eq("type", "source");
    expect(cards.data).toHaveLength(5);
    const after = await admin.client
      .from("projects")
      .select("status, current_stage")
      .eq("id", projectId)
      .single();
    expect(after.data).toEqual({ status: "waiting", current_stage: "research" });
  });

  it("second start → conflict", async () => {
    const projectId = await readyProject();
    expect((await startStage(admin.client, projectId, "research")).ok).toBe(true);
    expect(await startStage(admin.client, projectId, "research")).toEqual({
      ok: false,
      code: "conflict",
    });
  });

  it("not ready (ethics not passed) → validation", async () => {
    const projectId = await projectWithBrief(admin.client);
    expect(await startStage(admin.client, projectId, "research")).toEqual({
      ok: false,
      code: "validation",
    });
  });

  it("cancel marks cancelled and keeps nodes", async () => {
    const projectId = await readyProject();
    const res = await startStage(admin.client, projectId, "research");
    if (!res.ok) throw new Error(res.code);
    const running = runResearch(db, res.data.stageRunId, { stepDelayMs: 250 });
    await new Promise((r) => setTimeout(r, 400));
    expect(await cancelStage(admin.client, res.data.stageRunId)).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await running).toBe("cancelled");
    const run = await admin.client
      .from("stage_runs")
      .select("status")
      .eq("id", res.data.stageRunId)
      .single();
    expect(run.data?.status).toBe("cancelled");
    const kept = await admin.client
      .from("nodes")
      .select("id")
      .eq("project_id", projectId)
      .eq("type", "source");
    expect(kept.data!.length).toBeGreaterThan(0);
    expect(kept.data!.length).toBeLessThan(5);
  });

  it("timeout marks failed", async () => {
    const projectId = await readyProject();
    const res = await startStage(admin.client, projectId, "research");
    if (!res.ok) throw new Error(res.code);
    await admin.client.from("stage_runs").select("id"); // ensure visible
    await (
      adminClient() as never as {
        from: (t: string) => {
          update: (v: unknown) => { eq: (c: string, v: string) => Promise<unknown> };
        };
      }
    )
      .from("stage_runs")
      .update({
        started_at: new Date(Date.now() - RUN_TIMEOUT_MS - 60_000).toISOString(),
        status: "running",
      })
      .eq("id", res.data.stageRunId);
    expect(await runResearch(db, res.data.stageRunId)).toBe("failed");
    const run = await admin.client
      .from("stage_runs")
      .select("status, error_code")
      .eq("id", res.data.stageRunId)
      .single();
    expect(run.data).toEqual({ status: "failed", error_code: "timeout" });
  });

  it("run continues after its starter is deactivated (EC8)", async () => {
    const member = await admin.addMember();
    const projectId = await readyProject(member.client);
    const res = await startStage(member.client, projectId, "research");
    if (!res.ok) throw new Error(res.code);
    expect((await setMemberActive(admin.client, member.id, false)).ok).toBe(true);
    expect(await runResearch(db, res.data.stageRunId)).toBe("succeeded");
    const cards = await admin.client
      .from("nodes")
      .select("created_by")
      .eq("project_id", projectId)
      .eq("type", "source");
    expect(cards.data?.every((c) => c.created_by === member.id)).toBe(true);
  });
});
