import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedAdmin } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { FakeAiClient } from "@/lib/ai/fake";
import { updateNode } from "@/lib/canvas/service";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";
import { runResearch } from "@/lib/jobs/research";
import { getReport } from "@/lib/report/model";
import { startStage } from "@/lib/stages/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// O27 getReport (AC15.1–AC15.3, AC12.8, AC13.5).
describe("O27 report", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let projectId: string;
  const db = adminClient() as never;
  const quiet = async () => undefined;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    const saved = await saveToolkitVersion(admin.client, {
      fileName: "t.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    if (!saved.ok) throw new Error(saved.code);
    projectId = await projectWithBrief(admin.client, {
      audience_context: "People abandon the ID photo step; progress and effort matter",
    });
    const approved = await approveObjectives(admin.client, projectId);
    if (!approved.ok) throw new Error(approved.code);
    await ethicsGate(db, new FakeAiClient(quiet), approved.data.stageRunId);
  });

  it("not ready before research", async () => {
    const report = await getReport(admin.client, projectId);
    expect(report!.ready).toBe(false);
    expect(report!.objectives.map((o) => o.label)).toEqual([
      "Business objective",
      "Behavioural objective",
    ]);
  });

  it("every finding in the report has a citation or AI inference; citations resolve to records", async () => {
    const run = await startStage(admin.client, projectId, "research");
    if (!run.ok) throw new Error(run.code);
    await runResearch(db, run.data.stageRunId);
    const report = (await getReport(admin.client, projectId))!;
    expect(report.ready).toBe(true);
    const findings = report.themes.flatMap((t) => t.findings);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.citations.length > 0 || f.aiInference).toBe(true);
    expect(findings.some((f) => f.aiInference)).toBe(true);
    const numbers = new Set(report.citations.map((c) => c.n));
    for (const n of [
      ...findings.flatMap((f) => f.citations),
      ...report.opportunities.flatMap((o) => o.citations),
    ])
      expect(numbers.has(n)).toBe(true);
    expect(report.citations.map((c) => c.n)).toEqual(report.citations.map((_, i) => i + 1));
    for (const c of report.citations) expect(c.title).toBeTruthy();
    // Sections per AC15.1.
    expect(report.sourceGroups.length).toBeGreaterThanOrEqual(4);
    expect(report.opportunities.every((o) => o.confidence)).toBe(true);
    expect(report.themes.every((t) => t.strength)).toBe(true);
    expect(report.ethics?.status).toBe("ok");
    expect(report.toolkitVersion).toBe(1);
    expect(report.summary.opportunities).toBe(report.opportunities.length);
  });

  it("gaps grouped by kind with a summary (AC13.5)", async () => {
    const report = (await getReport(admin.client, projectId))!;
    expect(report.gaps.total).toBe(report.gaps.discovery.length + report.gaps.generative.length);
    expect(report.gaps.total).toBeGreaterThan(0);
    const gap = [...report.gaps.discovery, ...report.gaps.generative][0]!;
    expect(gap.opportunity).toBeTruthy();
    expect(report.gaps.methods).toContain(gap.method);
  });

  it("editing a node changes the next report (AC15.3)", async () => {
    const before = (await getReport(admin.client, projectId))!;
    const theme = before.themes[0]!;
    const { data: node } = await admin.client
      .from("nodes")
      .select("version")
      .eq("id", theme.id)
      .single();
    const res = await updateNode(admin.client, {
      nodeId: theme.id,
      title: "Effort at the ID step, checked by the team",
      body: null,
      version: node!.version,
    });
    expect(res.ok).toBe(true);
    const after = (await getReport(admin.client, projectId))!;
    expect(after.themes.find((t) => t.id === theme.id)!.title).toBe(
      "Effort at the ID step, checked by the team",
    );
  });

  it("members of another workspace get nothing", async () => {
    const other = await createIsolatedAdmin();
    expect(await getReport(other.client, projectId)).toBeNull();
  });
});
