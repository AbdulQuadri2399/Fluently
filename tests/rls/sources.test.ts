import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser, sql } from "../helpers/supabase";

// sources (04 section 5): members of the workspace read; members add only as themselves.
const db = sql();
afterAll(() => db.end());

describe("RLS sources", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Sources",
        mode: "new",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    await db`insert into public.sources (workspace_id, project_id, handle, source_type, title)
             values (${a.workspaceId}, ${projectId}, 'S1', 'paper', 'The goal-gradient hypothesis resurrected')`;
  });

  it("members read their workspace's sources; others and signed-out visitors don't", async () => {
    expect(
      (await a.client.from("sources").select("handle").eq("project_id", projectId)).data,
    ).toEqual([{ handle: "S1" }]);
    expect(
      (await b.client.from("sources").select("id").eq("project_id", projectId)).data ?? [],
    ).toHaveLength(0);
    expect((await anonClient().from("sources").select("id")).data ?? []).toHaveLength(0);
  });

  it("a member adds a source as themselves; not as someone else, not into another workspace", async () => {
    const row = {
      workspace_id: a.workspaceId,
      project_id: projectId,
      handle: "U1",
      source_type: "desk",
      title: "A link",
    };
    expect((await a.client.from("sources").insert({ ...row, added_by: a.id })).error).toBeNull();
    expect(
      (await a.client.from("sources").insert({ ...row, handle: "U2", added_by: b.id })).error,
    ).not.toBeNull();
    expect(
      (await b.client.from("sources").insert({ ...row, handle: "U3", added_by: b.id })).error,
    ).not.toBeNull();
  });

  it("nobody edits or deletes a stored source", async () => {
    const upd = await a.client
      .from("sources")
      .update({ title: "x" })
      .eq("project_id", projectId)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
    const del = await a.client.from("sources").delete().eq("project_id", projectId).select("id");
    expect(del.data ?? []).toHaveLength(0);
  });
});
