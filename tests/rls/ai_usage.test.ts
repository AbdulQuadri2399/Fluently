import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedUser, ensureOtherWorkspace, sql } from "../helpers/supabase";

// ai_usage (04 section 4): members read their workspace's usage; nobody writes from a user session.
const db = sql();
afterAll(() => db.end());

describe("RLS ai_usage", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let otherWs: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    otherWs = await ensureOtherWorkspace();
    for (const ws of [a.workspaceId, otherWs]) {
      await db`insert into public.ai_usage (workspace_id, stage, step, model, input_tokens, output_tokens, cost_usd, duration_ms, success)
               values (${ws}, 'research', 'search', 'claude-haiku-5-5', 100, 50, 0.001, 900, true)`;
    }
  });

  it("members read their own workspace's usage only", async () => {
    const { data, error } = await a.client.from("ai_usage").select("workspace_id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0]?.workspace_id).toBe(a.workspaceId);
  });

  it("nobody inserts from a user session", async () => {
    const { error } = await a.client.from("ai_usage").insert({
      workspace_id: a.workspaceId,
      stage: "research",
      step: "search",
      model: "claude-haiku-5-5",
      input_tokens: 1,
      output_tokens: 1,
      cost_usd: 0,
      duration_ms: 1,
      success: true,
    });
    expect(error).not.toBeNull();
  });

  it("nobody updates or deletes from a user session", async () => {
    const upd = await a.client
      .from("ai_usage")
      .update({ cost_usd: 0 })
      .eq("workspace_id", a.workspaceId)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
    const del = await a.client
      .from("ai_usage")
      .delete()
      .eq("workspace_id", a.workspaceId)
      .select("id");
    expect(del.data ?? []).toHaveLength(0);
    const [row] = await db<
      { n: number }[]
    >`select count(*)::int as n from public.ai_usage where workspace_id = ${a.workspaceId}`;
    expect(row?.n).toBe(1);
  });
});
