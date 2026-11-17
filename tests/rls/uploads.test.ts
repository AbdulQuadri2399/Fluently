import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser } from "../helpers/supabase";

// uploads table (04 section 5): members of the workspace only; recorded as yourself.
describe("RLS uploads", () => {
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
        name: "Uploads RLS",
        mode: "optimise",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
  });

  const row = (uploadedBy: string, ws: string) => ({
    workspace_id: ws,
    project_id: projectId,
    kind: "asset",
    storage_path: `${ws}/${projectId}/x.png`,
    file_name: "x.png",
    mime: "image/png",
    size_bytes: 10,
    uploaded_by: uploadedBy,
  });

  it("member records an upload as themselves and reads it", async () => {
    const ins = await a.client
      .from("uploads")
      .insert(row(a.id, a.workspaceId))
      .select("id")
      .single();
    expect(ins.error).toBeNull();
    expect(
      (await a.client.from("uploads").select("id").eq("project_id", projectId)).data,
    ).toHaveLength(1);
  });

  it("can't record an upload as someone else or into another workspace", async () => {
    expect((await a.client.from("uploads").insert(row(b.id, a.workspaceId))).error).not.toBeNull();
    expect((await b.client.from("uploads").insert(row(b.id, a.workspaceId))).error).not.toBeNull();
  });

  it("another workspace and signed-out visitors see nothing", async () => {
    expect(
      (await b.client.from("uploads").select("id").eq("project_id", projectId)).data ?? [],
    ).toHaveLength(0);
    expect((await anonClient().from("uploads").select("id")).data ?? []).toHaveLength(0);
  });
});
