import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedAdmin, sql } from "../helpers/supabase";
import { confirmOverCap, raiseProjectCap } from "@/lib/stages/service";

// O31 raiseProjectCap / confirmOverCap (AC27.4).
const db = sql();
afterAll(() => db.end());

describe("O31 AI budget", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let member: Awaited<ReturnType<typeof admin.addMember>>;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    member = await admin.addMember();
  });

  async function pausedRun() {
    const p = await admin.client
      .from("projects")
      .insert({
        workspace_id: admin.workspaceId,
        name: "Budget",
        mode: "new",
        channel: "screens",
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select("id")
      .single();
    const projectId = p.data!.id as string;
    const [run] =
      await db`insert into public.stage_runs (workspace_id, project_id, stage, status, started_by)
      values (${admin.workspaceId}, ${projectId}, 'research', 'paused_cost', ${admin.id}) returning id`;
    return { projectId, runId: run!.id as string };
  }

  it("an admin raises the cap; the paused run is queued again", async () => {
    const { projectId, runId } = await pausedRun();
    const res = await raiseProjectCap(admin.client, projectId, 20);
    expect(res).toEqual({ ok: true, data: { resumedRunId: runId } });
    const [row] = await db`select p.cost_cap_override_gbp as cap, r.status
      from public.projects p join public.stage_runs r on r.project_id = p.id where r.id = ${runId}`;
    expect(row).toEqual({ cap: "20.00", status: "queued" });
  });

  it("a member can't raise the cap", async () => {
    const { projectId } = await pausedRun();
    expect(await raiseProjectCap(member.client, projectId, 50)).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(await raiseProjectCap(admin.client, projectId, 0)).toEqual({
      ok: false,
      code: "validation",
    });
  });

  it("a member confirms going over; it's recorded and the run continues", async () => {
    const { runId } = await pausedRun();
    expect(await confirmOverCap(member.client, runId)).toEqual({
      ok: true,
      data: { stageRunId: runId },
    });
    const [row] =
      await db`select status, over_cap_confirmed_by from public.stage_runs where id = ${runId}`;
    expect(row).toEqual({ status: "queued", over_cap_confirmed_by: member.id });
    // Only a paused run can be confirmed.
    expect(await confirmOverCap(member.client, runId)).toEqual({ ok: false, code: "conflict" });
  });
});
