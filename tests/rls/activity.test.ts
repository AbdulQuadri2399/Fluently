import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser, sql } from "../helpers/supabase";

// run_events (04 D32, AC11.10): members of the workspace read; only the job (service role) writes.
const db = sql();
afterAll(() => db.end());

describe("RLS run_events", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let runId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Activity",
        mode: "new",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    const [run] =
      await db`insert into public.stage_runs (workspace_id, project_id, stage, started_by)
             values (${a.workspaceId}, ${projectId}, 'research', ${a.id}) returning id`;
    runId = run!.id as string;
    await db`insert into public.run_events (workspace_id, project_id, stage_run_id, kind, step, count)
             values (${a.workspaceId}, ${projectId}, ${runId}, 'found', 'papers', 12)`;
  });

  it("members read their workspace's activity; others and signed-out visitors don't", async () => {
    expect(
      (await a.client.from("run_events").select("kind, count").eq("stage_run_id", runId)).data,
    ).toEqual([{ kind: "found", count: 12 }]);
    expect(
      (await b.client.from("run_events").select("id").eq("stage_run_id", runId)).data ?? [],
    ).toHaveLength(0);
    expect((await anonClient().from("run_events").select("id")).data ?? []).toHaveLength(0);
  });

  it("members can't write, change or delete activity", async () => {
    const ins = await a.client.from("run_events").insert({
      workspace_id: a.workspaceId,
      project_id: projectId,
      stage_run_id: runId,
      kind: "done",
    });
    expect(ins.error).not.toBeNull();
    const upd = await a.client
      .from("run_events")
      .update({ count: 1 })
      .eq("stage_run_id", runId)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
    const del = await a.client.from("run_events").delete().eq("stage_run_id", runId).select("id");
    expect(del.data ?? []).toHaveLength(0);
  });
});
