import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { adminClient, createIsolatedAdmin } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { AiError } from "@/lib/ai/client";
import { defaultResponders, FakeAiClient } from "@/lib/ai/fake";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";
import { fakeResearchDeps, runResearch, type ResearchDeps } from "@/lib/jobs/research";
import { startStage } from "@/lib/stages/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// J2 research (AC11.4–AC11.6, AC12.1–AC12.9, AC13.1–AC13.3).
describe("J2 research", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  const db = adminClient() as never;
  const quiet = async () => undefined;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    const saved = await saveToolkitVersion(admin.client, {
      fileName: "t.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    if (!saved.ok) throw new Error(saved.code);
  });

  async function startedRun() {
    const projectId = await projectWithBrief(admin.client, {
      audience_context: "People abandon the ID photo step; progress and effort matter",
    });
    const approved = await approveObjectives(admin.client, projectId);
    if (!approved.ok) throw new Error(approved.code);
    await ethicsGate(db, new FakeAiClient(quiet), approved.data.stageRunId);
    const run = await startStage(admin.client, projectId, "research");
    if (!run.ok) throw new Error(run.code);
    return { projectId, runId: run.data.stageRunId };
  }
  const nodes = async (projectId: string, type: string) =>
    (
      await admin.client
        .from("nodes")
        .select("id, title, data, confidence, provenance")
        .eq("project_id", projectId)
        .eq("type", type)
        .is("deleted_at", null)
    ).data ?? [];

  it("retrieval steps write source rows and source nodes", async () => {
    const { projectId, runId } = await startedRun();
    expect(await runResearch(db, runId)).toBe("succeeded");
    const sources =
      (await admin.client.from("sources").select("handle, source_type").eq("stage_run_id", runId))
        .data ?? [];
    const types = new Set(sources.map((s) => s.source_type));
    expect([...types].sort()).toEqual(["competitor", "desk", "paper", "social", "toolkit"]);
    expect(sources.filter((s) => s.handle.startsWith("S")).length).toBeGreaterThan(5);
    const [card] = await nodes(projectId, "source");
    const groups = (card!.data as { groups: { key: string; count: number; items: unknown[] }[] })
      .groups;
    expect(groups.map((g) => g.key)).toEqual([
      "client_data",
      "papers",
      "web",
      "competitors",
      "reviews",
    ]);
    expect(groups.find((g) => g.key === "papers")).toMatchObject({ count: 3 });
    expect(groups.find((g) => g.key === "reviews")!.items).toHaveLength(3);
  });

  it("synthesis creates themes/opportunities/gaps with edges; confidence computed in code", async () => {
    const { projectId } = await startedRun().then(async (r) => (await runResearch(db, r.runId), r));
    const findings = await nodes(projectId, "finding");
    const themes = await nodes(projectId, "theme");
    const opps = await nodes(projectId, "opportunity");
    const gaps = await nodes(projectId, "gap");
    expect(findings.length).toBeGreaterThanOrEqual(5);
    expect(findings.some((f) => (f.data as { aiInference: boolean }).aiInference)).toBe(true);
    expect(themes).toHaveLength(3);
    expect(opps).toHaveLength(3);
    expect(opps.every((o) => ["High", "Med", "Low"].includes(o.confidence!))).toBe(true);
    // The privacy opportunity rests on one review plus AI inference → Low → gap.
    const privacy = opps.find((o) => o.title === "Explain where the ID photo goes")!;
    expect(privacy.confidence).toBe("Low");
    expect(gaps).toHaveLength(1);
    const gapEdge = await admin.client
      .from("edges")
      .select("id")
      .eq("from_id", privacy.id)
      .eq("to_id", gaps[0]!.id);
    expect(gapEdge.data).toHaveLength(1);
    const themeEdges = await admin.client
      .from("edges")
      .select("id")
      .in(
        "to_id",
        themes.map((t) => t.id),
      );
    expect(themeEdges.data!.length).toBeGreaterThanOrEqual(3);
    const candidates = await admin.client
      .from("toolkit_candidates")
      .select("name")
      .eq("project_id", projectId);
    expect(candidates.data).toEqual([{ name: "Endowed progress" }]);
  });

  it("unknown principle dropped; gap methods only from services list", async () => {
    const ai = new FakeAiClient(quiet, {
      ...defaultResponders,
      synthesis: () => ({
        themes: [{ title: "T", summary: "", findings: [0] }],
        opportunities: [
          {
            title: "O",
            summary: "",
            themes: [0],
            principleKeys: ["P001", "P999-not-real"],
            contradicts: true,
            gapQuestion: "Q?",
            gapMethod: "Eye tracking (not offered)",
          },
        ],
        externalPrinciples: [],
      }),
    });
    const { projectId, runId } = await startedRun();
    await runResearch(db, runId, { deps: { ...fakeResearchDeps(ai) } });
    const [opp] = await nodes(projectId, "opportunity");
    expect(
      (opp!.data as { principles: string[] }).principles.every((k) => k !== "P999-not-real"),
    ).toBe(true);
    expect(opp!.confidence).toBe("Low");
    const [gap] = await nodes(projectId, "gap");
    expect((gap!.data as { method: string }).method).toBe("Desk research");
  });

  it("an invented citation is rejected and logged (AC12.3)", async () => {
    const ai = new FakeAiClient(quiet, {
      ...defaultResponders,
      findings: () => ({
        findings: [
          {
            text: "From a paper that wasn't found",
            sourceHandles: ["S999"],
            aiInference: false,
            stance: "supports",
          },
        ],
      }),
    });
    const { projectId, runId } = await startedRun();
    await runResearch(db, runId, { deps: fakeResearchDeps(ai) });
    expect(await nodes(projectId, "finding")).toHaveLength(0);
    const ev = await adminClient()
      .from("events")
      .select("props")
      .eq("member_id", admin.id)
      .eq("name", "citation_rejected");
    expect(ev.data!.length).toBeGreaterThan(0);
  });

  it("failed step retried twice then failed, others continue", async () => {
    const papers = vi.fn(async () => {
      throw new Error("rate limited");
    });
    const deps: ResearchDeps = { ...fakeResearchDeps(), papers };
    const { projectId, runId } = await startedRun();
    expect(await runResearch(db, runId, { deps })).toBe("partial");
    expect(papers).toHaveBeenCalledTimes(3);
    const run = await admin.client
      .from("stage_runs")
      .select("status, steps")
      .eq("id", runId)
      .single();
    const steps = run.data!.steps as { key: string; status: string }[];
    expect(steps.find((s) => s.key === "papers")!.status).toBe("failed");
    expect(steps.filter((s) => s.status === "done").map((s) => s.key)).toEqual([
      "toolkit",
      "client_data",
      "web",
      "competitors",
      "reviews",
      "findings",
      "synthesis",
    ]);
    expect((await nodes(projectId, "opportunity")).length).toBeGreaterThan(0);
  });

  it("0 papers completes", async () => {
    const { runId } = await startedRun();
    expect(
      await runResearch(db, runId, { deps: { ...fakeResearchDeps(), papers: async () => [] } }),
    ).toBe("succeeded");
    const run = await admin.client.from("stage_runs").select("steps").eq("id", runId).single();
    expect(
      (run.data!.steps as { key: string; status: string; count?: number }[]).find(
        (s) => s.key === "papers",
      ),
    ).toMatchObject({ status: "done", count: 0 });
  });

  it("synthesis failure keeps findings and offers retry", async () => {
    const broken = new FakeAiClient(quiet, {
      ...defaultResponders,
      synthesis: () => {
        throw new AiError("unavailable");
      },
    });
    const { projectId, runId } = await startedRun();
    expect(await runResearch(db, runId, { deps: fakeResearchDeps(broken) })).toBe("failed");
    const kept = await nodes(projectId, "finding");
    expect(kept.length).toBeGreaterThan(0);
    expect(await nodes(projectId, "opportunity")).toHaveLength(0);

    const retry = await admin.client.rpc("retry_research", {
      p_run: runId,
      p_synthesis_only: true,
    });
    expect(retry.error).toBeNull();
    const papers = vi.fn(async () => []);
    expect(
      await runResearch(db, retry.data as string, { deps: { ...fakeResearchDeps(), papers } }),
    ).toBe("succeeded");
    expect(papers).not.toHaveBeenCalled(); // retrieval isn't run again
    expect((await nodes(projectId, "finding")).map((f) => f.id).sort()).toEqual(
      kept.map((f) => f.id).sort(),
    );
    expect((await nodes(projectId, "opportunity")).length).toBeGreaterThan(0);
  });
});
