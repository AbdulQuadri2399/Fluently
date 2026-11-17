import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createIsolatedUser, createSignedInUser, sql, uniqueEmail } from "../helpers/supabase";
import { completeOnboarding } from "@/lib/members/service";
import { createProject } from "@/lib/projects/service";

const db = sql();

// O33 logEvent (NFR13) and O4 completeOnboarding (AC2.2).
afterAll(() => db.end());

describe("events", () => {
  let a: { client: SupabaseClient; id: string };

  beforeAll(async () => {
    a = await createIsolatedUser();
  });

  it("project_created recorded with mode and channel", async () => {
    const res = await createProject(a.client, {
      name: "Event check",
      mode: "new",
      channel: "email",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const rows = await db<{ props: Record<string, unknown> }[]>`
      select props from public.events where member_id = ${a.id} and name = 'project_created'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.props).toEqual({ project_id: res.data.id, mode: "new", channel: "email" });
  });

  it("completeOnboarding sets onboarded_at once and records how it ended", async () => {
    expect((await completeOnboarding(a.client, "skipped")).ok).toBe(true);
    const [first] = await db<{ onboarded_at: Date | null }[]>`
      select onboarded_at from public.members where id = ${a.id}`;
    expect(first?.onboarded_at).toBeInstanceOf(Date);

    expect((await completeOnboarding(a.client, "finished")).ok).toBe(true);
    const [second] = await db<{ onboarded_at: Date | null }[]>`
      select onboarded_at from public.members where id = ${a.id}`;
    expect(second?.onboarded_at?.getTime()).toBe(first?.onboarded_at?.getTime());

    const names = await db<{ name: string }[]>`
      select name from public.events where member_id = ${a.id} and name like 'onboarding_%'`;
    expect(names.map((n) => n.name)).toEqual(["onboarding_skipped"]);
  });

  it("nobody can record an event as someone else", async () => {
    const b = await createSignedInUser(uniqueEmail("fluently.test"));
    const [ws] = await db<{ workspace_id: string }[]>`
      select workspace_id from public.members where id = ${a.id}`;
    const { error } = await b.client
      .from("events")
      .insert({ workspace_id: ws!.workspace_id, member_id: a.id, name: "project_created" });
    expect(error).not.toBeNull();
  });
});
