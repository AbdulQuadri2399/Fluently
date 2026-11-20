import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser, sql } from "../helpers/supabase";

// emails (04 D37, AC31.2): members of the workspace read, add (as themselves) and remove;
// nobody edits; other workspaces and signed-out visitors see and touch nothing.
const db = sql();
afterAll(() => db.end());

describe("RLS emails", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let emailId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Emails RLS",
        mode: "optimise",
        channel: "email",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    const [e] =
      await db`insert into public.emails (workspace_id, project_id, source, subject, html, added_by)
      values (${a.workspaceId}::uuid, ${projectId}::uuid, 'paste', 'Hello', '<p>Hi</p>', ${a.id}::uuid) returning id`;
    emailId = e!.id as string;
  });

  const row = (over: Record<string, unknown> = {}) => ({
    workspace_id: a.workspaceId,
    project_id: projectId,
    source: "paste",
    subject: "Another",
    html: "<p>x</p>",
    added_by: a.id,
    ...over,
  });

  it("members read their workspace's emails; others and signed-out visitors don't", async () => {
    expect(
      (await a.client.from("emails").select("subject").eq("project_id", projectId)).data,
    ).toEqual([{ subject: "Hello" }]);
    expect(
      (await b.client.from("emails").select("id").eq("project_id", projectId)).data ?? [],
    ).toHaveLength(0);
    expect((await anonClient().from("emails").select("id")).data ?? []).toHaveLength(0);
  });

  it("a member adds an email as themselves, not as someone else, not into another workspace", async () => {
    expect((await a.client.from("emails").insert(row())).error).toBeNull();
    expect((await a.client.from("emails").insert(row({ added_by: b.id }))).error).not.toBeNull();
    expect((await b.client.from("emails").insert(row({ added_by: b.id }))).error).not.toBeNull();
  });

  it("nobody edits an email", async () => {
    const upd = await a.client
      .from("emails")
      .update({ subject: "Changed" })
      .eq("id", emailId)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
  });

  it("another workspace can't remove it; the owner's workspace can", async () => {
    const other = await b.client.from("emails").delete().eq("id", emailId).select("id");
    expect(other.data ?? []).toHaveLength(0);
    const mine = await a.client.from("emails").delete().eq("id", emailId).select("id");
    expect(mine.data).toHaveLength(1);
  });
});
