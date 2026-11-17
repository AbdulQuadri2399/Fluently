import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedUser } from "../helpers/supabase";
import { updateNode } from "@/lib/canvas/service";

// O21 updateNode (AC24.1, AC24.4, AC24.7, FF10, EC6).
describe("O21 edit a card", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let source: string;
  let theme: string;
  let objective: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Edit",
        mode: "new",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
        current_stage: "research",
        status: "waiting",
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    const base = { workspace_id: a.workspaceId, project_id: projectId };
    const ins = await adminClient()
      .from("nodes")
      .insert([
        {
          ...base,
          type: "objective",
          stage: "intake",
          title: "Business objective",
          provenance: "human",
          sort_order: 0,
        },
        {
          ...base,
          type: "source",
          stage: "research",
          title: "Research sources",
          provenance: "ai",
          sort_order: 0,
        },
        {
          ...base,
          type: "theme",
          stage: "research",
          title: "People drop off at the ID step",
          provenance: "ai",
          sort_order: 0,
        },
      ])
      .select("id, type");
    const id = (t: string) => ins.data!.find((n) => n.type === t)!.id as string;
    objective = id("objective");
    source = id("source");
    theme = id("theme");
    await adminClient()
      .from("edges")
      .insert({ ...base, from_id: source, to_id: theme });
  });

  it("edit saves, marks it edited by a person, records history, and marks what's built from it out of date", async () => {
    const res = await updateNode(a.client, {
      nodeId: source,
      title: "Sources, checked",
      body: "Removed two duplicates.",
      version: 1,
    });
    expect(res).toEqual({ ok: true, data: { version: 2 } });
    const n = await a.client
      .from("nodes")
      .select("title, provenance, data, updated_by")
      .eq("id", source)
      .single();
    expect(n.data).toMatchObject({
      title: "Sources, checked",
      provenance: "ai_edited",
      data: { body: "Removed two duplicates." },
      updated_by: a.id,
    });
    const t = await a.client.from("nodes").select("stale").eq("id", theme).single();
    expect(t.data?.stale).toBe(true);
    const h = await a.client
      .from("node_history")
      .select("change, changed_by")
      .eq("node_id", source)
      .order("created_at");
    expect(h.data?.at(-1)).toEqual({ change: "edited", changed_by: a.id });
  });

  it("a stale copy is refused (conflict) and nothing changes", async () => {
    expect(
      await updateNode(a.client, { nodeId: source, title: "Old tab", body: null, version: 1 }),
    ).toEqual({ ok: false, code: "conflict" });
    const n = await a.client.from("nodes").select("title").eq("id", source).single();
    expect(n.data?.title).toBe("Sources, checked");
  });

  it("objectives, ethics and overrides aren't edited here", async () => {
    expect(
      await updateNode(a.client, { nodeId: objective, title: "x", body: null, version: 1 }),
    ).toEqual({ ok: false, code: "validation" });
  });

  it("locked while its stage runs", async () => {
    await adminClient().from("stage_runs").insert({
      workspace_id: a.workspaceId,
      project_id: projectId,
      stage: "research",
      status: "running",
      started_by: a.id,
    });
    expect(
      await updateNode(a.client, { nodeId: theme, title: "x", body: null, version: 1 }),
    ).toEqual({ ok: false, code: "forbidden" });
  });
});
