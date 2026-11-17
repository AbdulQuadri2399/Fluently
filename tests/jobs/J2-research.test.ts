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
            gapKind: null,
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

  it("send back records feedback, reuses sources, keeps people's cards unless asked (AC25.2, EC13)", async () => {
    const { projectId, runId } = await startedRun();
    await runResearch(db, runId);
    const [theme] = await nodes(projectId, "theme");
    await admin.client.from("nodes").insert({
      workspace_id: admin.workspaceId,
      project_id: projectId,
      type: "theme",
      stage: "research",
      title: "A theme a person added",
      provenance: "human",
      created_by: admin.id,
    });
    expect(
      (
        await admin.client.rpc("send_back_research", {
          p_project: projectId,
          p_feedback: "short",
          p_replace_human: false,
        })
      ).error,
    ).not.toBeNull();
    const back = await admin.client.rpc("send_back_research", {
      p_project: projectId,
      p_feedback: "Focus on trust, not effort",
      p_replace_human: false,
    });
    expect(back.error).toBeNull();
    const cp = await admin.client
      .from("checkpoints")
      .select("decision, feedback")
      .eq("project_id", projectId)
      .eq("stage", "research");
    expect(cp.data).toEqual([{ decision: "send_back", feedback: "Focus on trust, not effort" }]);
    const papers = vi.fn(async () => []);
    expect(
      await runResearch(db, back.data as string, { deps: { ...fakeResearchDeps(), papers } }),
    ).toBe("succeeded");
    expect(papers).not.toHaveBeenCalled();
    const themes = await nodes(projectId, "theme");
    expect(themes.some((t) => t.title === "A theme a person added")).toBe(true);
    expect(themes.some((t) => t.id === theme!.id)).toBe(false); // the AI's earlier theme was replaced
  });

  it("questions stored and used: written from the objectives, passed to search (AC11.9)", async () => {
    const queries: string[] = [];
    const base = fakeResearchDeps(new FakeAiClient(quiet));
    const deps: ResearchDeps = {
      ...base,
      papers: async (q) => {
        queries.push(q);
        return base.papers(q);
      },
      web: async (step, q) => {
        queries.push(q);
        return base.web(step, q);
      },
    };
    const { runId } = await startedRun();
    await runResearch(db, runId, { deps });
    const { data: run } = await admin.client
      .from("stage_runs")
      .select("questions")
      .eq("id", runId)
      .single();
    const questions = run!.questions as string[];
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(6);
    expect(queries.every((q) => q.includes(questions[0]!))).toBe(true);
  });

  it("activity logged per step (AC11.10)", async () => {
    const { runId } = await startedRun();
    await runResearch(db, runId);
    const { data: events } = await admin.client
      .from("run_events")
      .select("kind, step, count")
      .eq("stage_run_id", runId)
      .order("created_at");
    const has = (kind: string, step: string | null) =>
      events!.some((e) => e.kind === kind && e.step === step);
    expect(events![0]).toMatchObject({ kind: "questions" });
    for (const step of [
      "toolkit",
      "papers",
      "web",
      "competitors",
      "reviews",
      "findings",
      "synthesis",
    ]) {
      expect(has("started", step), step).toBe(true);
      expect(has("done", step), step).toBe(true);
    }
    expect(events!.find((e) => e.kind === "found" && e.step === "papers")!.count).toBeGreaterThan(
      0,
    );
    expect(has("kept", "papers")).toBe(true);
  });

  it("a failing step is logged as failed (AC11.10)", async () => {
    const base = fakeResearchDeps(new FakeAiClient(quiet));
    const { runId } = await startedRun();
    await runResearch(db, runId, {
      deps: { ...base, papers: async () => Promise.reject(new Error("down")) },
    });
    const { data: events } = await admin.client
      .from("run_events")
      .select("kind, step")
      .eq("stage_run_id", runId);
    expect(events).toContainEqual({ kind: "failed", step: "papers" });
  });

  it("every gap has a kind (AC13.5)", async () => {
    const { projectId, runId } = await startedRun();
    await runResearch(db, runId);
    const gaps = await nodes(projectId, "gap");
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps)
      expect(["discovery", "generative"]).toContain((g.data as { kind: string }).kind);
  });

  it("themes get a strength from the confidence rule (AC12.11)", async () => {
    const { projectId, runId } = await startedRun();
    await runResearch(db, runId);
    const themes = await nodes(projectId, "theme");
    expect(themes.length).toBeGreaterThan(0);
    for (const t of themes) {
      expect(["High", "Med", "Low"]).toContain(t.confidence);
      expect((t.data as { confidenceReason?: string }).confidenceReason).toBeTruthy();
    }
  });

  it("pauses at the AI budget before the next AI call; a member confirms and it finishes (AC27.4)", async () => {
    const { projectId, runId } = await startedRun();
    const { data: p } = await admin.client
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();
    // £10 cap at 0.79 GBP/USD: $13 of usage is over it.
    await (db as ReturnType<typeof adminClient>).from("ai_usage").insert({
      workspace_id: p!.workspace_id,
      project_id: projectId,
      stage: "ethics",
      step: "ethics",
      model: "claude-haiku-5-5",
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 13,
      duration_ms: 1,
      success: true,
    } as never);
    expect(await runResearch(db, runId)).toBe("paused");
    const paused = await admin.client.from("stage_runs").select("status").eq("id", runId).single();
    expect(paused.data!.status).toBe("paused_cost");

    const { error } = await admin.client.rpc("confirm_over_cap", { p_run: runId });
    expect(error).toBeNull();
    expect(await runResearch(db, runId)).toBe("succeeded");
    const { data: events } = await admin.client
      .from("run_events")
      .select("kind")
      .eq("stage_run_id", runId);
    expect(events!.map((e) => e.kind)).toEqual(expect.arrayContaining(["paused_cost", "resumed"]));
  });
});
