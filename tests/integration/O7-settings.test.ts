import { beforeAll, describe, expect, it } from "vitest";
import { createIsolatedAdmin } from "../helpers/supabase";
import { getSettings, updateWorkspaceSettings } from "@/lib/settings/service";
import { DEFAULT_STAGE_MODELS } from "@/lib/ai/models";

// O7 updateWorkspaceSettings (AC28.1, AC28.2, AC10.4, AC13.3).
describe("O7 settings", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  beforeAll(async () => {
    admin = await createIsolatedAdmin();
  });

  it("defaults: every stage on Haiku, £10 cap, 0.79 rate, seeded services and sector lists", async () => {
    const res = await getSettings(admin.client);
    if (!res.ok) throw new Error("load failed");
    expect(res.data.stageModels).toEqual(DEFAULT_STAGE_MODELS);
    expect(res.data.costCapGbp).toBe(10);
    expect(res.data.gbpPerUsd).toBe(0.79);
    expect(res.data.agencyServices).toEqual([
      "Implicit response test (IRT)",
      "Behavioural interviews",
    ]);
    expect(res.data.sectorFlagList).toContain("gambling");
    expect(res.data.sectorRefuseList).toEqual([]);
  });

  it("admin saves", async () => {
    const stageModels = {
      ...DEFAULT_STAGE_MODELS,
      solutions: { model: "claude-sonnet-5-5" as const, effort: "high" as const },
    };
    const res = await updateWorkspaceSettings(admin.client, {
      stageModels,
      costCapGbp: 25,
      gbpPerUsd: 0.8,
      agencyServices: ["Diary study", "diary study", "Behavioural interviews"],
      sectorRefuseList: ["tobacco"],
    });
    expect(res).toEqual({ ok: true, data: undefined });
    const after = await getSettings(admin.client);
    if (!after.ok) throw new Error("load failed");
    expect(after.data.stageModels.solutions).toEqual({
      model: "claude-sonnet-5-5",
      effort: "high",
    });
    expect(after.data.costCapGbp).toBe(25);
    expect(after.data.gbpPerUsd).toBe(0.8);
    expect(after.data.agencyServices).toEqual(["Diary study", "Behavioural interviews"]);
    expect(after.data.sectorRefuseList).toEqual(["tobacco"]);
  });

  it("member gets forbidden", async () => {
    const m = await admin.addMember();
    expect(await updateWorkspaceSettings(m.client, { costCapGbp: 20 })).toEqual({
      ok: false,
      code: "forbidden",
    });
    const direct = await m.client
      .from("workspaces")
      .update({ cost_cap_gbp: 20 })
      .eq("id", admin.workspaceId)
      .select("id");
    expect(direct.data ?? []).toHaveLength(0);
  });

  it("cap 0 and 501 → validation; unknown model → validation", async () => {
    expect(await updateWorkspaceSettings(admin.client, { costCapGbp: 0 })).toEqual({
      ok: false,
      code: "validation",
    });
    expect(await updateWorkspaceSettings(admin.client, { costCapGbp: 501 })).toEqual({
      ok: false,
      code: "validation",
    });
    const bad = { ...DEFAULT_STAGE_MODELS, ethics: { model: "gpt-x", effort: "low" } };
    expect(await updateWorkspaceSettings(admin.client, { stageModels: bad as never })).toEqual({
      ok: false,
      code: "validation",
    });
  });
});
