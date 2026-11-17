import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSignedInUser, uniqueEmail } from "../helpers/supabase";
import {
  archiveProject,
  createProject,
  listProjects,
  unarchiveProject,
} from "@/lib/projects/service";

// O10 createProject / archiveProject / unarchiveProject, O11 listProjects (AC7.1, AC7.2, AC7.3, AC7.5).
describe("O10 projects", () => {
  let a: { client: SupabaseClient; id: string };

  beforeAll(async () => {
    a = await createSignedInUser(uniqueEmail("fluently.test"));
  });

  it("valid create returns an id, stores mode and channel, and starts at the brief", async () => {
    const res = await createProject(a.client, {
      name: "Halden onboarding",
      mode: "optimise",
      channel: "screens",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await a.client
      .from("projects")
      .select("mode, channel, current_stage, status")
      .eq("id", res.data.id)
      .single();
    expect(row.data).toEqual({
      mode: "optimise",
      channel: "screens",
      current_stage: "intake",
      status: "in_progress",
    });
  });

  it("pins the workspace's default toolkit version (null until a toolkit exists)", async () => {
    const res = await createProject(a.client, { name: "Pinned", mode: "new", channel: "email" });
    if (!res.ok) throw new Error("create failed");
    const row = await a.client
      .from("projects")
      .select("toolkit_version_id")
      .eq("id", res.data.id)
      .single();
    expect(row.data?.toolkit_version_id).toBeNull();
  });

  it("empty and 81-character names return validation (AC7.2)", async () => {
    expect(await createProject(a.client, { name: "   ", mode: "new", channel: "screens" })).toEqual(
      { ok: false, code: "validation" },
    );
    expect(
      await createProject(a.client, { name: "x".repeat(81), mode: "new", channel: "screens" }),
    ).toEqual({ ok: false, code: "validation" });
  });

  it("archive hides from Active and shows under Archived; restore round-trips (AC7.5)", async () => {
    const res = await createProject(a.client, {
      name: "Archive me",
      mode: "new",
      channel: "screens",
    });
    if (!res.ok) throw new Error("create failed");
    expect((await archiveProject(a.client, res.data.id)).ok).toBe(true);
    const active = await listProjects(a.client, { filter: "active", search: "Archive me" });
    const archived = await listProjects(a.client, { filter: "archived", search: "Archive me" });
    expect(active.ok && active.data.items.map((p) => p.id)).not.toContain(res.data.id);
    expect(archived.ok && archived.data.items.map((p) => p.id)).toContain(res.data.id);
    expect((await unarchiveProject(a.client, res.data.id)).ok).toBe(true);
    const back = await listProjects(a.client, { filter: "active", search: "Archive me" });
    expect(back.ok && back.data.items.map((p) => p.id)).toContain(res.data.id);
  });

  it("archiving an unknown project returns not_found", async () => {
    expect(await archiveProject(a.client, "00000000-0000-4000-8000-00000000ffff")).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("list is newest first and search matches names (AC7.3)", async () => {
    await createProject(a.client, { name: "Zeta search one", mode: "new", channel: "screens" });
    await createProject(a.client, { name: "Zeta search two", mode: "new", channel: "screens" });
    const res = await listProjects(a.client, { filter: "active", search: "zeta search" });
    if (!res.ok) throw new Error("list failed");
    expect(res.data.items.map((p) => p.name)).toEqual(["Zeta search two", "Zeta search one"]);
  });
});
