import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  anonClient,
  createSignedInUser,
  ensureOtherWorkspace,
  sql,
  uniqueEmail,
} from "../helpers/supabase";

// T1.1: projects, intakes, project_ratings access rules (04 section 4, NFR5).
describe("RLS: projects, intakes, project_ratings", () => {
  let a: { client: SupabaseClient; id: string };
  let b: { client: SupabaseClient; id: string };
  let wsA = "";

  beforeAll(async () => {
    await ensureOtherWorkspace();
    a = await createSignedInUser(uniqueEmail("fluently.test"));
    b = await createSignedInUser(uniqueEmail("other.test"));
    const ws = await a.client.from("workspaces").select("id").single();
    wsA = ws.data?.id ?? "";
  });

  async function createProjectAsA(name: string) {
    const res = await a.client
      .from("projects")
      .insert({
        workspace_id: wsA,
        name,
        mode: "new",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    expect(res.error).toBeNull();
    return res.data?.id ?? "";
  }

  it("member creates a project in their workspace and an empty brief is created with it", async () => {
    const id = await createProjectAsA("RLS project A");
    const intake = await a.client.from("intakes").select("project_id").eq("project_id", id);
    expect(intake.data).toHaveLength(1);
  });

  it("member cannot create a project on behalf of someone else", async () => {
    const res = await a.client.from("projects").insert({
      workspace_id: wsA,
      name: "Spoof",
      mode: "new",
      channel: "screens",
      created_by: b.id,
      updated_by: b.id,
    });
    expect(res.error).not.toBeNull();
  });

  it("a user in another workspace sees none of A's projects or briefs", async () => {
    const id = await createProjectAsA("RLS project B");
    expect((await b.client.from("projects").select("id").eq("id", id)).data).toEqual([]);
    expect((await b.client.from("intakes").select("project_id").eq("project_id", id)).data).toEqual(
      [],
    );
    const upd = await b.client.from("projects").update({ name: "hijack" }).eq("id", id).select();
    expect(upd.data ?? []).toEqual([]);
  });

  it("a member cannot delete a project; an admin can", async () => {
    const id = await createProjectAsA("RLS project C");
    const del = await a.client.from("projects").delete().eq("id", id).select();
    expect(del.data ?? []).toEqual([]);
    const db = sql();
    try {
      await db`update public.members set role = 'admin' where id = ${a.id}`;
    } finally {
      await db.end();
    }
    const del2 = await a.client.from("projects").delete().eq("id", id).select("id");
    expect(del2.data).toHaveLength(1);
  });

  it("ratings: one per member per project, 1 to 5, only for yourself", async () => {
    const id = await createProjectAsA("RLS project D");
    const ok = await a.client
      .from("project_ratings")
      .insert({ workspace_id: wsA, project_id: id, member_id: a.id, rating: 4 });
    expect(ok.error).toBeNull();
    const dup = await a.client
      .from("project_ratings")
      .insert({ workspace_id: wsA, project_id: id, member_id: a.id, rating: 5 });
    expect(dup.error).not.toBeNull();
    const bad = await a.client
      .from("project_ratings")
      .insert({ workspace_id: wsA, project_id: id, member_id: a.id, rating: 9 });
    expect(bad.error).not.toBeNull();
  });

  it("signed-out client gets nothing", async () => {
    const anon = anonClient();
    for (const table of ["projects", "intakes", "project_ratings"]) {
      expect((await anon.from(table).select("*")).data ?? []).toEqual([]);
    }
  });
});
