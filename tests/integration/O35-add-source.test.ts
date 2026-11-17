import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedAdmin } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { FakeAiClient } from "@/lib/ai/fake";
import { addSource } from "@/lib/canvas/service";
import { approveObjectives } from "@/lib/intake/approve";
import { ethicsGate } from "@/lib/jobs/ethics";
import { runResearch } from "@/lib/jobs/research";
import { startStage } from "@/lib/stages/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// O35 addSource (AC12.10).
describe("O35 add source after research", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let projectId: string;
  const db = adminClient() as never;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    await saveToolkitVersion(admin.client, {
      fileName: "t.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    projectId = await projectWithBrief(admin.client);
    const approved = await approveObjectives(admin.client, projectId);
    if (!approved.ok) throw new Error(approved.code);
    await ethicsGate(db, new FakeAiClient(async () => undefined), approved.data.stageRunId);
    const run = await startStage(admin.client, projectId, "research");
    if (!run.ok) throw new Error(run.code);
    await runResearch(db, run.data.stageRunId);
  });

  it("new source marks themes out of date and joins its group", async () => {
    const res = await addSource(admin.client, {
      kind: "link",
      projectId,
      url: "https://www.example.org/new-study",
      title: "A new study",
    });
    if (!res.ok) throw new Error(res.code);
    const src = await admin.client
      .from("sources")
      .select("source_type, added_by, handle")
      .eq("id", res.data.sourceId)
      .single();
    expect(src.data).toEqual({ source_type: "desk", added_by: admin.id, handle: "U1" });
    const themes = await admin.client
      .from("nodes")
      .select("stale")
      .eq("project_id", projectId)
      .eq("type", "theme")
      .is("deleted_at", null);
    expect(themes.data!.length).toBeGreaterThan(0);
    expect(themes.data!.every((t) => t.stale)).toBe(true);
    const card = await admin.client
      .from("nodes")
      .select("data")
      .eq("project_id", projectId)
      .eq("type", "source")
      .single();
    const web = (
      card.data!.data as { groups: { key: string; items: { title: string; sub: string }[] }[] }
    ).groups.find((g) => g.key === "web")!;
    expect(web.items.at(-1)).toMatchObject({ title: "A new study", sub: "example.org" });
  });

  it("a link must be a full web address", async () => {
    expect(await addSource(admin.client, { kind: "link", projectId, url: "not a link" })).toEqual({
      ok: false,
      code: "validation",
    });
    expect(
      await addSource(admin.client, { kind: "link", projectId, url: "javascript:alert(1)" }),
    ).toEqual({ ok: false, code: "validation" });
  });
});
