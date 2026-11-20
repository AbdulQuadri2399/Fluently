import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedAdmin } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { FakeAiClient } from "@/lib/ai/fake";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";
import { runResearch } from "@/lib/jobs/research";
import { reportToMarkdown } from "@/lib/report/markdown";
import { getReport, type Report } from "@/lib/report/model";
import { reportToPdf } from "@/lib/report/pdf";
import { startStage } from "@/lib/stages/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// O28 exportReport (AC15.4): Markdown and PDF from the same report model as SCR9.
describe("O28 export", () => {
  let report: Report;

  beforeAll(async () => {
    const admin = await createIsolatedAdmin();
    const saved = await saveToolkitVersion(admin.client, {
      fileName: "t.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    if (!saved.ok) throw new Error(saved.code);
    const projectId = await projectWithBrief(admin.client, {
      audience_context: "People abandon the ID photo step; progress and effort matter",
    });
    const approved = await approveObjectives(admin.client, projectId);
    if (!approved.ok) throw new Error(approved.code);
    const db = adminClient() as never;
    await ethicsGate(db, new FakeAiClient(async () => undefined), approved.data.stageRunId);
    const run = await startStage(admin.client, projectId, "research");
    if (!run.ok) throw new Error(run.code);
    await runResearch(db, run.data.stageRunId);
    report = (await getReport(admin.client, projectId))!;
  });

  it("Markdown and PDF contain same citations as report model", async () => {
    expect(report.citations.length).toBeGreaterThan(3);
    const md = reportToMarkdown(report);
    for (const r of report.citations) expect(md).toContain(`${r.n}. `);
    for (const r of report.citations) expect(md).toContain(r.title);
    for (const f of report.themes.flatMap((t) => t.findings)) {
      const line = md.split("\n").find((l) => l.startsWith(`- ${f.text}`))!;
      expect(line).toBeTruthy();
      if (f.citations.length) for (const n of f.citations) expect(line).toContain(`[${n}]`);
      else expect(line).toContain("AI independent inference");
    }
    for (const h of [
      "Summary",
      "Objectives",
      "Themes",
      "Opportunities",
      "Evidence gaps",
      "Ethics check",
      "References",
    ])
      expect(md).toContain(`## ${h}`);

    const pdf = await reportToPdf(report);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
    // Every cited web or paper link is a live link in the PDF.
    const raw = pdf.toString("latin1");
    for (const r of report.citations.filter((x) => x.url)) expect(raw).toContain(r.url!);
  });
});
