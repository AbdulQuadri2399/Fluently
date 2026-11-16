import { beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  createSignedInUser,
  ensureOtherWorkspace,
  uniqueEmail,
} from "../helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("RLS: workspaces, members, allowlist_entries, events (NFR5)", () => {
  let a: { client: SupabaseClient; id: string };
  let b: { client: SupabaseClient; id: string };

  beforeAll(async () => {
    await ensureOtherWorkspace();
    a = await createSignedInUser(uniqueEmail("fluently.test"));
    b = await createSignedInUser(uniqueEmail("other.test"));
  });

  it("member A sees their own workspace and themself", async () => {
    const ws = await a.client.from("workspaces").select("id,name");
    expect(ws.error).toBeNull();
    expect(ws.data).toHaveLength(1);
    expect(ws.data?.[0]?.name).toBe("Fluently Dev");

    const me = await a.client.from("members").select("id").eq("id", a.id);
    expect(me.data).toHaveLength(1);
  });

  it("member B (other workspace) cannot see A's workspace or membership", async () => {
    const ws = await b.client.from("workspaces").select("id,name").eq("name", "Fluently Dev");
    expect(ws.data).toEqual([]);
    const other = await b.client.from("members").select("id").eq("id", a.id);
    expect(other.data).toEqual([]);
  });

  it("a member can't change their own role", async () => {
    const res = await a.client.from("members").update({ role: "admin" }).eq("id", a.id).select();
    expect(res.error).not.toBeNull();
  });

  it("a member (not admin) can't read the allowlist", async () => {
    const res = await a.client.from("allowlist_entries").select("id");
    expect(res.data).toEqual([]);
  });

  it("a member can log an event for themself but not read events", async () => {
    const ws = await a.client.from("workspaces").select("id").single();
    const ins = await a.client
      .from("events")
      .insert({ workspace_id: ws.data?.id, member_id: a.id, name: "smoke", props: {} });
    expect(ins.error).toBeNull();
    const read = await a.client.from("events").select("id");
    expect(read.data).toEqual([]);
  });

  it("signed-out client gets 0 rows from every table", async () => {
    const anon = anonClient();
    for (const table of ["workspaces", "members", "allowlist_entries", "events"]) {
      const res = await anon.from(table).select("*");
      expect(res.data ?? []).toEqual([]);
    }
  });
});
