import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser, sql } from "../helpers/supabase";

// nodes, edges, node_history, stage_runs, checkpoints, ethics_overrides (04 section 5).
const db = sql();
afterAll(() => db.end());

describe("RLS tree tables", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let nodeId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Tree RLS",
        mode: "new",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    const n = await a.client
      .from("nodes")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        type: "objective",
        stage: "intake",
        title: "Objective",
        provenance: "human",
        created_by: a.id,
      })
      .select("id")
      .single();
    nodeId = n.data!.id;
  });

  it("members create, read and edit cards; edits leave history", async () => {
    expect(nodeId).toBeTruthy();
    const upd = await a.client
      .from("nodes")
      .update({ title: "Objective v2" })
      .eq("id", nodeId)
      .select("id");
    expect(upd.data).toHaveLength(1);
    const hist = await a.client
      .from("node_history")
      .select("change")
      .eq("node_id", nodeId)
      .order("created_at");
    expect(hist.data?.map((h) => h.change)).toEqual(["created", "edited"]);
  });

  it("another workspace can't read, edit, or add cards or lines to this project", async () => {
    expect((await b.client.from("nodes").select("id").eq("id", nodeId)).data ?? []).toHaveLength(0);
    expect(
      (await b.client.from("nodes").update({ title: "x" }).eq("id", nodeId).select("id")).data ??
        [],
    ).toHaveLength(0);
    const ins = await b.client
      .from("nodes")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        type: "theme",
        stage: "research",
        title: "x",
      });
    expect(ins.error).not.toBeNull();
    const edge = await b.client
      .from("edges")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        from_id: nodeId,
        to_id: nodeId,
      });
    expect(edge.error).not.toBeNull();
    expect(
      (await b.client.from("node_history").select("id").eq("node_id", nodeId)).data ?? [],
    ).toHaveLength(0);
  });

  it("signed-out visitors see nothing", async () => {
    const anon = anonClient();
    for (const t of [
      "nodes",
      "edges",
      "node_history",
      "stage_runs",
      "checkpoints",
      "ethics_overrides",
    ] as const) {
      expect((await anon.from(t).select("id")).data ?? []).toHaveLength(0);
    }
  });

  it("history, stage runs: members can't write them directly", async () => {
    const h = await a.client
      .from("node_history")
      .insert({ workspace_id: a.workspaceId, node_id: nodeId, snapshot: {}, change: "edited" });
    expect(h.error).not.toBeNull();
    const r = await a.client
      .from("stage_runs")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        stage: "ethics",
        started_by: a.id,
      });
    expect(r.error).not.toBeNull();
  });

  it("checkpoints and overrides: only as yourself, never edited or deleted", async () => {
    const asOther = await a.client
      .from("checkpoints")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        stage: "intake",
        decision: "approve",
        decided_by: b.id,
      });
    expect(asOther.error).not.toBeNull();
    const cp = await a.client
      .from("checkpoints")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        stage: "intake",
        decision: "approve",
        decided_by: a.id,
      })
      .select("id")
      .single();
    expect(cp.error).toBeNull();
    const del = await a.client.from("checkpoints").delete().eq("id", cp.data!.id).select("id");
    expect(del.data ?? []).toHaveLength(0);
    const short = await a.client
      .from("ethics_overrides")
      .insert({
        workspace_id: a.workspaceId,
        project_id: projectId,
        node_id: nodeId,
        rule: "Deception",
        reason: "too short",
        decided_by: a.id,
      });
    expect(short.error).not.toBeNull();
  });
});
