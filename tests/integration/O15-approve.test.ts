import { beforeAll, describe, expect, it } from "vitest";
import { createIsolatedAdmin } from "../helpers/supabase";
import { projectWithBrief } from "../helpers/brief";
import { approveObjectives, editApprovedIntake, missingForApproval } from "@/lib/intake/approve";
import { updateWorkspaceSettings } from "@/lib/settings/service";

// O15 approveObjectives, O16 editApprovedIntake (AC9.1–AC9.3, AC10.4, EC9).
describe("O15 approve objectives", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  beforeAll(async () => {
    admin = await createIsolatedAdmin();
  });

  it("each missing item named", async () => {
    const empty = {
      business_objective: null,
      behavioural_objective: "",
      sector: null,
      sector_other: null,
    };
    expect(missingForApproval(empty, "optimise", 0)).toEqual([
      "business_objective",
      "behavioural_objective",
      "sector",
      "assets",
    ]);
    expect(
      missingForApproval(
        { ...empty, business_objective: "x", behavioural_objective: "y", sector: "Other" },
        "new",
        0,
      ),
    ).toEqual(["sector"]);
    const projectId = await projectWithBrief(admin.client, { behavioural_objective: "" });
    expect(await approveObjectives(admin.client, projectId)).toEqual({
      ok: false,
      code: "validation",
    });
    const optimise = await projectWithBrief(admin.client, {}, "optimise");
    expect(await approveObjectives(admin.client, optimise)).toEqual({
      ok: false,
      code: "validation",
    });
  });

  it("refused sector → forbidden and status blocked", async () => {
    await updateWorkspaceSettings(admin.client, { sectorRefuseList: ["Tobacco"] });
    const projectId = await projectWithBrief(admin.client, { sector: "tobacco" });
    expect(await approveObjectives(admin.client, projectId)).toEqual({
      ok: false,
      code: "forbidden",
    });
    const p = await admin.client.from("projects").select("status").eq("id", projectId).single();
    expect(p.data?.status).toBe("blocked");
  });

  it("approval creates 2 objective nodes + checkpoint row, and queues the ethics check", async () => {
    const projectId = await projectWithBrief(admin.client);
    await admin.client
      .from("intakes")
      .update({ low_specificity: { behavioural_objective: true } })
      .eq("project_id", projectId);
    const res = await approveObjectives(admin.client, projectId);
    if (!res.ok) throw new Error(res.code);
    const nodes = await admin.client
      .from("nodes")
      .select("title, low_specificity, provenance")
      .eq("project_id", projectId)
      .eq("type", "objective")
      .order("sort_order");
    expect(nodes.data).toEqual([
      { title: "Business objective", low_specificity: false, provenance: "human" },
      { title: "Behavioural objective", low_specificity: true, provenance: "human" },
    ]);
    const cp = await admin.client
      .from("checkpoints")
      .select("stage, decision, decided_by")
      .eq("project_id", projectId);
    expect(cp.data).toEqual([{ stage: "intake", decision: "approve", decided_by: admin.id }]);
    const run = await admin.client
      .from("stage_runs")
      .select("id, status")
      .eq("id", res.data.stageRunId)
      .single();
    expect(run.data?.status).toBe("queued");
    const intake = await admin.client
      .from("intakes")
      .select("approved_by")
      .eq("project_id", projectId)
      .single();
    expect(intake.data?.approved_by).toBe(admin.id);
    expect(await approveObjectives(admin.client, projectId)).toEqual({
      ok: false,
      code: "conflict",
    });

    // O16: editing re-opens the checkpoint; re-approving updates the same two cards.
    expect(await editApprovedIntake(admin.client, projectId)).toEqual({
      ok: true,
      data: undefined,
    });
    const reopened = await admin.client
      .from("projects")
      .select("current_stage, status")
      .eq("id", projectId)
      .single();
    expect(reopened.data).toEqual({ current_stage: "intake", status: "in_progress" });
    await admin.client
      .from("stage_runs")
      .update({ status: "succeeded" })
      .eq("id", res.data.stageRunId);
  });
});
