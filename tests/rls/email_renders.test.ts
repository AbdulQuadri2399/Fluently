import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser, sql } from "../helpers/supabase";

// email_renders (04 D38, AC31.4, AC31.5): members of the workspace read; only the render route
// (service role) writes; other workspaces and signed-out visitors see and touch nothing.
const db = sql();
afterAll(() => db.end());

describe("RLS email_renders", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let emailId: string;
  let renderId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Renders RLS",
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
    const [r] =
      await db`insert into public.email_renders (workspace_id, project_id, email_id, images, storage_path, width, height)
      values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, false, 'x/y/renders/z.png', 375, 800) returning id`;
    renderId = r!.id as string;
  });

  it("members read their workspace's renders; others and signed-out visitors don't", async () => {
    expect(
      (await a.client.from("email_renders").select("id").eq("email_id", emailId)).data,
    ).toEqual([{ id: renderId }]);
    expect(
      (await b.client.from("email_renders").select("id").eq("email_id", emailId)).data ?? [],
    ).toHaveLength(0);
    expect((await anonClient().from("email_renders").select("id")).data ?? []).toHaveLength(0);
  });

  it("nobody can write through the app: not members, not other workspaces", async () => {
    const row = {
      workspace_id: a.workspaceId,
      project_id: projectId,
      email_id: emailId,
      images: true,
      storage_path: "x",
      width: 375,
      height: 100,
    };
    expect((await a.client.from("email_renders").insert(row)).error).not.toBeNull();
    expect((await b.client.from("email_renders").insert(row)).error).not.toBeNull();
    const upd = await a.client
      .from("email_renders")
      .update({ height: 1 })
      .eq("id", renderId)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
    const del = await a.client.from("email_renders").delete().eq("id", renderId).select("id");
    expect(del.data ?? []).toHaveLength(0);
  });

  it("one render per email and images setting", async () => {
    await expect(
      db`insert into public.email_renders (workspace_id, project_id, email_id, images, storage_path, width, height)
         values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, false, 'again', 375, 800)`,
    ).rejects.toThrow();
  });

  it("removing the email removes its renders", async () => {
    await db`delete from public.emails where id = ${emailId}::uuid`;
    expect(await db`select id from public.email_renders where id = ${renderId}::uuid`).toHaveLength(
      0,
    );
  });
});
