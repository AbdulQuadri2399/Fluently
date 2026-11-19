import { readFileSync } from "node:fs";
import { adminClient, createIsolatedAdmin } from "./supabase";
import { projectWithBrief } from "./brief";
import { FakeAiClient } from "@/lib/ai/fake";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";
import { runResearch } from "@/lib/jobs/research";
import { startStage } from "@/lib/stages/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

/** A fresh admin with a project that has been through (made-up) research: a real tree to edit. */
export async function researchedProject() {
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

  const nodes = async (type: string) =>
    (
      await admin.client
        .from("nodes")
        .select("id, title, data, stale, provenance, confidence, deleted_at")
        .eq("project_id", projectId)
        .eq("type", type)
        .is("deleted_at", null)
        .order("sort_order")
    ).data ?? [];
  return { admin, projectId, runId: run.data.stageRunId, nodes };
}
