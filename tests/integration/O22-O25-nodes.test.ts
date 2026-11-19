import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { researchedProject } from "../helpers/researched";
import { sql } from "../helpers/supabase";
import {
  addNode,
  connectNodes,
  deleteNode,
  disconnectEdge,
  mergeNodes,
  restoreNode,
} from "@/lib/canvas/service";

// O22 addNode, O23 deleteNode / undo, O24 mergeNodes, O34 connect / disconnect (AC24.2, AC24.4–AC24.6, AC24.8, AC30.x).
const db = sql();
afterAll(() => db.end());

describe("Slice 8 editing", () => {
  let ctx: Awaited<ReturnType<typeof researchedProject>>;
  const client = () => ctx.admin.client;
  beforeAll(async () => {
    ctx = await researchedProject();
  });

  const staleIds = async () =>
    new Set(
      (
        await db`select id from public.nodes where project_id = ${ctx.projectId}::uuid and stale and deleted_at is null`
      ).map((r) => r.id as string),
    );
  const unstale = () =>
    db`update public.nodes set stale = false where project_id = ${ctx.projectId}::uuid`;

  describe("add (O22)", () => {
    it("adds a theme linked to findings; a person's card; missing or wrong links refused", async () => {
      const [f1] = await ctx.nodes("finding");
      const res = await addNode(client(), {
        projectId: ctx.projectId,
        type: "theme",
        title: "People fear failing the photo check",
        body: "Several people said it feels like a test.",
        links: [f1!.id],
      });
      if (!res.ok) throw new Error(res.code);
      const [row] =
        await db`select type, stage, provenance, data from public.nodes where id = ${res.data.id}::uuid`;
      expect(row).toMatchObject({ type: "theme", stage: "research", provenance: "human" });
      expect(row!.data).toEqual({ body: "Several people said it feels like a test." });
      const edges = await db`select from_id from public.edges where to_id = ${res.data.id}::uuid`;
      expect(edges.map((e) => e.from_id)).toEqual([f1!.id]);

      // A theme needs findings, not a theme or nothing.
      const [t] = await ctx.nodes("theme");
      expect(
        await addNode(client(), {
          projectId: ctx.projectId,
          type: "theme",
          title: "x",
          links: [t!.id],
        }),
      ).toEqual({ ok: false, code: "link_required" });
      expect(
        await addNode(client(), { projectId: ctx.projectId, type: "theme", title: "x", links: [] }),
      ).toEqual({ ok: false, code: "validation" });
    });

    it("opportunities link to themes, gaps to opportunities; objectives and unknown types refused", async () => {
      const [t] = await ctx.nodes("theme");
      const opp = await addNode(client(), {
        projectId: ctx.projectId,
        type: "opportunity",
        title: "Reassure people about the photo",
        links: [t!.id],
      });
      if (!opp.ok) throw new Error(opp.code);
      const gap = await addNode(client(), {
        projectId: ctx.projectId,
        type: "gap",
        title: "Do people fear the test, or the privacy?",
        links: [opp.data.id],
      });
      expect(gap.ok).toBe(true);
      expect(
        await addNode(client(), {
          projectId: ctx.projectId,
          type: "objective" as never,
          title: "x",
          links: [t!.id],
        }),
      ).toEqual({ ok: false, code: "validation" });
    });
  });

  describe("connect and disconnect (O34)", () => {
    it("theme→opportunity allowed; marks the opportunity and what's built from it out of date", async () => {
      const [t1] = await ctx.nodes("theme");
      const o = (await ctx.nodes("opportunity")).at(-1)!;
      await unstale();
      // Make sure there's a line to add: remove the existing one if present (needs another link).
      const existing =
        await db`select id from public.edges where from_id = ${t1!.id}::uuid and to_id = ${o.id}::uuid`;
      if (existing.length) await db`delete from public.edges where id = ${existing[0]!.id}::uuid`;
      const res = await connectNodes(client(), t1!.id, o.id);
      if (!res.ok) throw new Error(res.code);
      expect((await staleIds()).has(o.id)).toBe(true);
      const hist =
        await db`select change from public.node_history where node_id = ${o.id}::uuid order by created_at desc limit 1`;
      expect(hist[0]!.change).toBe("edited");
      // Twice is a conflict.
      expect(await connectNodes(client(), t1!.id, o.id)).toEqual({ ok: false, code: "conflict" });
    });

    it("theme→wireframe style jumps refused with cant_connect", async () => {
      const [t1] = await ctx.nodes("theme");
      const [f1] = await ctx.nodes("finding");
      expect(await connectNodes(client(), t1!.id, f1!.id)).toEqual({
        ok: false,
        code: "cant_connect",
      });
      const gap = (await ctx.nodes("gap"))[0];
      if (gap)
        expect(await connectNodes(client(), t1!.id, gap.id)).toEqual({
          ok: false,
          code: "cant_connect",
        });
    });

    it("removing the last link a card needs is refused; otherwise it's removed and dependants go out of date", async () => {
      const added = await addNode(client(), {
        projectId: ctx.projectId,
        type: "theme",
        title: "Solo theme",
        links: [(await ctx.nodes("finding"))[0]!.id],
      });
      if (!added.ok) throw new Error(added.code);
      const [only] = await db`select id from public.edges where to_id = ${added.data.id}::uuid`;
      expect(await disconnectEdge(client(), only!.id as string)).toEqual({
        ok: false,
        code: "link_required",
      });
      // Add a second link, then the first can go.
      const f2 = (await ctx.nodes("finding"))[1]!;
      expect((await connectNodes(client(), f2.id, added.data.id)).ok).toBe(true);
      expect((await disconnectEdge(client(), only!.id as string)).ok).toBe(true);
      expect(
        await db`select id from public.edges where id = ${only!.id as string}::uuid`,
      ).toHaveLength(0);
    });
  });

  describe("delete and undo (O23)", () => {
    it("deleting a finding marks what's built from it out of date; undo brings it back", async () => {
      const f = (await ctx.nodes("finding"))[0]!;
      await unstale();
      const res = await deleteNode(client(), f.id);
      if (!res.ok) throw new Error(res.code);
      expect(res.data.dependents).toBeGreaterThan(0);
      expect((await ctx.nodes("finding")).some((n) => n.id === f.id)).toBe(false);
      expect((await staleIds()).size).toBeGreaterThanOrEqual(1);
      const hist =
        await db`select change from public.node_history where node_id = ${f.id}::uuid order by created_at desc limit 1`;
      expect(hist[0]!.change).toBe("deleted");
      expect((await restoreNode(client(), f.id)).ok).toBe(true);
      expect((await ctx.nodes("finding")).some((n) => n.id === f.id)).toBe(true);
    });

    it("undo is only possible for 60 seconds", async () => {
      const f = (await ctx.nodes("finding"))[1]!;
      expect((await deleteNode(client(), f.id)).ok).toBe(true);
      await db`update public.nodes set deleted_at = now() - interval '2 minutes' where id = ${f.id}::uuid`;
      expect(await restoreNode(client(), f.id)).toEqual({ ok: false, code: "conflict" });
    });

    it("objective delete refused with cant_delete_objective; evidence and ethics cards too", async () => {
      const [obj] = (
        await client()
          .from("nodes")
          .select("id")
          .eq("project_id", ctx.projectId)
          .eq("type", "objective")
      ).data!;
      expect(await deleteNode(client(), obj!.id)).toEqual({
        ok: false,
        code: "cant_delete_objective",
      });
      const [src] = await ctx.nodes("source");
      expect(await deleteNode(client(), src!.id)).toEqual({ ok: false, code: "validation" });
    });
  });

  describe("merge (O24)", () => {
    it("merges two themes into one with the combined links; originals removed; downstream out of date", async () => {
      const a = await addNode(client(), {
        projectId: ctx.projectId,
        type: "theme",
        title: "Merge A",
        links: [(await ctx.nodes("finding"))[0]!.id],
      });
      const b = await addNode(client(), {
        projectId: ctx.projectId,
        type: "theme",
        title: "Merge B",
        links: [(await ctx.nodes("finding")).at(-1)!.id],
      });
      if (!a.ok || !b.ok) throw new Error("setup");
      const opp = await addNode(client(), {
        projectId: ctx.projectId,
        type: "opportunity",
        title: "Built on Merge B",
        links: [b.data.id],
      });
      if (!opp.ok) throw new Error(opp.code);
      await unstale();
      const res = await mergeNodes(client(), {
        nodeIds: [a.data.id, b.data.id],
        title: "Merged theme",
      });
      if (!res.ok) throw new Error(res.code);
      const incoming =
        await db`select from_id from public.edges where to_id = ${res.data.id}::uuid`;
      expect(incoming).toHaveLength(2);
      const outgoing =
        await db`select to_id from public.edges where from_id = ${res.data.id}::uuid`;
      expect(outgoing.map((e) => e.to_id)).toEqual([opp.data.id]);
      const originals =
        await db`select id from public.nodes where id in (${a.data.id}::uuid, ${b.data.id}::uuid) and deleted_at is null`;
      expect(originals).toHaveLength(0);
      expect((await staleIds()).has(opp.data.id)).toBe(true);
      const hist =
        await db`select change from public.node_history where node_id = ${a.data.id}::uuid order by created_at desc limit 1`;
      expect(hist[0]!.change).toBe("merged");
    });

    it("different types or fewer than two are refused", async () => {
      const [t] = await ctx.nodes("theme");
      const [f] = await ctx.nodes("finding");
      expect(await mergeNodes(client(), { nodeIds: [t!.id, f!.id], title: "x" })).toEqual({
        ok: false,
        code: "validation",
      });
      expect(await mergeNodes(client(), { nodeIds: [t!.id], title: "x" })).toEqual({
        ok: false,
        code: "validation",
      });
    });
  });

  it("nothing can be edited while that stage is running (EC: locked)", async () => {
    const [f] = await ctx.nodes("finding");
    await db`insert into public.stage_runs (workspace_id, project_id, stage, status, started_by)
      values (${ctx.admin.workspaceId}::uuid, ${ctx.projectId}::uuid, 'research', 'running', ${ctx.admin.id}::uuid)`;
    expect(await deleteNode(client(), f!.id)).toEqual({ ok: false, code: "locked" });
    await db`update public.stage_runs set status = 'succeeded' where project_id = ${ctx.projectId}::uuid and status = 'running'`;
  });
});
