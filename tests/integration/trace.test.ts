import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedAdmin, sql } from "../helpers/supabase";
import { getTrace } from "@/lib/canvas/service";

// O26 getTrace / trace_path (AC23.1, AC23.2).
const db = sql();
afterAll(() => db.end());

describe("O26 trace", () => {
  let a: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let projectId: string;
  const ids: Record<string, string> = {};

  async function node(type: string, title: string, stage: string) {
    const [n] =
      await db`insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance)
      values (${a.workspaceId}, ${projectId}, ${type}, ${stage}, ${title}, '{}', 'ai') returning id`;
    return n!.id as string;
  }
  const edge = (from: string, to: string) =>
    db`insert into public.edges (workspace_id, project_id, from_id, to_id) values (${a.workspaceId}, ${projectId}, ${from}, ${to})`;

  beforeAll(async () => {
    a = await createIsolatedAdmin();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Trace",
        mode: "new",
        channel: "screens",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    ids.biz = await node("objective", "Business", "intake");
    ids.beh = await node("objective", "Behavioural", "intake");
    ids.src = await node("source", "Sources", "research");
    ids.f1 = await node("finding", "F1", "research");
    ids.f2 = await node("finding", "F2", "research");
    ids.other = await node("finding", "Unrelated", "research");
    ids.t1 = await node("theme", "T1", "research");
    ids.o1 = await node("opportunity", "O1", "research");
    ids.gap = await node("gap", "Gap", "research");
    for (const [f, t] of [
      ["biz", "src"],
      ["beh", "src"],
      ["src", "f1"],
      ["src", "f2"],
      ["src", "other"],
      ["f1", "t1"],
      ["f2", "t1"],
      ["t1", "o1"],
      ["o1", "gap"],
    ] as const)
      await edge(ids[f]!, ids[t]!);
  });

  it("path from an opportunity back to the sources and both objectives", async () => {
    const res = await getTrace(a.client, ids.o1!);
    if (!res.ok) throw new Error(res.code);
    expect(new Set(res.data)).toEqual(
      new Set([ids.o1, ids.t1, ids.f1, ids.f2, ids.src, ids.biz, ids.beh]),
    );
    expect(res.data).not.toContain(ids.other);
    expect(res.data).not.toContain(ids.gap);
  });

  it("a gap traces through its opportunity", async () => {
    const res = await getTrace(a.client, ids.gap!);
    if (!res.ok) throw new Error(res.code);
    expect(res.data).toContain(ids.o1);
    expect(res.data).toContain(ids.biz);
  });

  it("other workspaces and deleted cards: not found", async () => {
    const other = await createIsolatedAdmin();
    expect(await getTrace(other.client, ids.o1!)).toEqual({ ok: false, code: "not_found" });
    await db`update public.nodes set deleted_at = now() where id = ${ids.other!}`;
    expect(await getTrace(a.client, ids.other!)).toEqual({ ok: false, code: "not_found" });
  });

  it("a 1,000-card project traces in 300 ms or less (AC23.2)", async () => {
    const big = await createIsolatedAdmin();
    const p = await big.client
      .from("projects")
      .insert({
        workspace_id: big.workspaceId,
        name: "Big",
        mode: "new",
        channel: "screens",
        created_by: big.id,
        updated_by: big.id,
      })
      .select("id")
      .single();
    const pid = p.data!.id as string;
    await db`insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance)
      select ${big.workspaceId}, ${pid}, 'finding', 'research', 'n' || g, '{}', 'ai' from generate_series(1, 1000) g`;
    // Eight stages of 125 cards; each card is fed by three cards in the stage before it.
    await db`insert into public.edges (workspace_id, project_id, from_id, to_id)
      select ${big.workspaceId}::uuid, ${pid}::uuid, a.id, b.id
      from (select id, row_number() over (order by id) - 1 as rn from public.nodes where project_id = ${pid}::uuid) a
      join (select id, row_number() over (order by id) - 1 as rn from public.nodes where project_id = ${pid}::uuid) b
        on b.rn >= 125 and a.rn / 125 = b.rn / 125 - 1 and (a.rn % 125) in (b.rn % 125, (b.rn + 1) % 125, (b.rn + 2) % 125)`;
    const [lastRow] =
      await db`select id from public.nodes where project_id = ${pid}::uuid order by id desc limit 1`;
    const last = lastRow!.id as string;
    const started = performance.now();
    const res = await getTrace(big.client, last);
    const ms = performance.now() - started;
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.length).toBeGreaterThan(20);
    expect(ms).toBeLessThan(300);
  });
});
