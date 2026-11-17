import { beforeAll, describe, expect, it } from "vitest";
import { createIsolatedUser, sql } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { moveAssets, updateNode } from "@/lib/canvas/service";
import { approveObjectives } from "@/lib/intake/approve";

// O36 Current assets cards (AC22.10, AC22.11).
describe("O36 assets cards", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let uploads: string[];

  const cards = async () =>
    (
      (
        await a.client
          .from("nodes")
          .select("id, title, data, version")
          .eq("project_id", projectId)
          .eq("type", "asset_set")
          .is("deleted_at", null)
          .order("sort_order")
      ).data ?? []
    ).map((n) => ({
      id: n.id,
      title: n.title,
      version: n.version,
      ids: ((n.data as { uploadIds?: string[] }).uploadIds ?? []).slice().sort(),
    }));

  beforeAll(async () => {
    a = await createIsolatedUser();
    projectId = await projectWithBrief(a.client, {}, "optimise");
    const db = sql();
    uploads = [];
    for (const name of ["home.png", "id-step.png", "done.png"]) {
      const [row] = await db<{ id: string }[]>`
        insert into public.uploads (workspace_id, project_id, kind, storage_path, file_name, mime, size_bytes, uploaded_by)
        values (${a.workspaceId}, ${projectId}, 'asset', ${`${a.workspaceId}/${projectId}/${name}`}, ${name}, 'image/png', 10, ${a.id}) returning id`;
      uploads.push(row!.id);
    }
    await db.end();
    const res = await approveObjectives(a.client, projectId);
    if (!res.ok) throw new Error(res.code);
  });

  it("uploads start in one card named Current assets", async () => {
    const all = await cards();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Current assets", ids: uploads.slice().sort() });
  });

  it("split keeps every asset in one card", async () => {
    const res = await moveAssets(a.client, projectId, [uploads[2]!], null);
    expect(res.ok).toBe(true);
    const all = await cards();
    expect(all).toHaveLength(2);
    expect(all.flatMap((c) => c.ids).sort()).toEqual(uploads.slice().sort());
    expect(all[1]!.ids).toEqual([uploads[2]]);
  });

  it("moving the last asset removes the empty card", async () => {
    const [first, second] = await cards();
    expect((await moveAssets(a.client, projectId, [uploads[2]!], first!.id)).ok).toBe(true);
    const all = await cards();
    expect(all).toHaveLength(1);
    expect(all[0]!.ids).toEqual(uploads.slice().sort());
    expect(all.some((c) => c.id === second!.id)).toBe(false);
  });

  it("rename saves", async () => {
    const [card] = await cards();
    expect(
      (
        await updateNode(a.client, {
          nodeId: card!.id,
          title: "Onboarding screens",
          body: null,
          version: card!.version,
        })
      ).ok,
    ).toBe(true);
    expect((await cards())[0]!.title).toBe("Onboarding screens");
  });

  it("assets from elsewhere are refused", async () => {
    expect(await moveAssets(a.client, projectId, [crypto.randomUUID()], null)).toEqual({
      ok: false,
      code: "validation",
    });
  });
});
