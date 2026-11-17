import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedAdmin, sql } from "../helpers/supabase";
import { createProject, deleteProject, updateProject } from "@/lib/projects/service";

// O10 updateProject / deleteProject (AC7.6, AC7.8, NFR7).
const db = sql();
afterAll(() => db.end());

describe("O10 rename and delete", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let member: Awaited<ReturnType<typeof admin.addMember>>;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    member = await admin.addMember();
  });

  async function project(name = "Halden onboarding") {
    const res = await createProject(admin.client, { name, mode: "new", channel: "screens" });
    if (!res.ok) throw new Error(res.code);
    return res.data.id;
  }

  it("rename validates and saves (any member)", async () => {
    const id = await project();
    expect(await updateProject(member.client, { id, name: "  ", clientLabel: "" })).toEqual({
      ok: false,
      code: "validation",
    });
    expect(
      await updateProject(member.client, { id, name: "x".repeat(81), clientLabel: "" }),
    ).toEqual({ ok: false, code: "validation" });
    expect(
      await updateProject(member.client, {
        id,
        name: "Halden ID check",
        clientLabel: "Halden Bank",
      }),
    ).toEqual({ ok: true, data: undefined });
    const [row] =
      await db`select name, client_label, updated_by from public.projects where id = ${id}`;
    expect(row).toEqual({
      name: "Halden ID check",
      client_label: "Halden Bank",
      updated_by: member.id,
    });
  });

  it("admin deletes: rows and files gone, usage kept", async () => {
    const id = await project("To delete");
    const path = `${admin.workspaceId}/${id}/client_data/notes.txt`;
    const up = await admin.client.storage
      .from("uploads")
      .upload(path, new Blob(["hello"], { type: "text/plain" }));
    expect(up.error).toBeNull();
    await db`insert into public.uploads (workspace_id, project_id, kind, storage_path, file_name, mime, size_bytes, uploaded_by)
      values (${admin.workspaceId}, ${id}, 'client_data', ${path}, 'notes.txt', 'text/plain', 5, ${admin.id})`;
    const [usage] =
      await db`insert into public.ai_usage (workspace_id, project_id, stage, step, model, input_tokens, output_tokens, cost_usd, duration_ms, success)
      values (${admin.workspaceId}, ${id}, 'research', 'findings', 'm', 1, 1, 0.5, 1, true) returning id`;

    expect(await deleteProject(admin.client, { id, confirmName: "To delete" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await db`select id from public.projects where id = ${id}`).toHaveLength(0);
    expect(await db`select id from public.uploads where project_id = ${id}`).toHaveLength(0);
    expect(await db`select project_id from public.intakes where project_id = ${id}`).toHaveLength(
      0,
    );
    expect(await db`select name from storage.objects where name = ${path}`).toHaveLength(0);
    const [kept] =
      await db`select project_id, cost_usd from public.ai_usage where id = ${usage!.id}`;
    expect(kept).toEqual({ project_id: null, cost_usd: "0.50000" });
    const [event] = await db`select member_id from public.events
      where name = 'project_deleted' and props->>'project_id' = ${id}`;
    expect(event).toEqual({ member_id: admin.id });
  });

  it("member refused", async () => {
    const id = await project("Members can't delete");
    expect(await deleteProject(member.client, { id, confirmName: "Members can't delete" })).toEqual(
      { ok: false, code: "forbidden" },
    );
    // Not through the database directly either.
    const direct = await member.client.from("projects").delete().eq("id", id).select("id");
    expect(direct.data ?? []).toHaveLength(0);
    expect(await db`select id from public.projects where id = ${id}`).toHaveLength(1);
  });

  it("wrong name refused", async () => {
    const id = await project("Exact name");
    expect(await deleteProject(admin.client, { id, confirmName: "exact name" })).toEqual({
      ok: false,
      code: "validation",
    });
    expect(await db`select id from public.projects where id = ${id}`).toHaveLength(1);
  });

  it("an admin of another workspace can't delete it", async () => {
    const id = await project("Not yours");
    const other = await createIsolatedAdmin();
    expect(await deleteProject(other.client, { id, confirmName: "Not yours" })).toEqual({
      ok: false,
      code: "not_found",
    });
  });
});
