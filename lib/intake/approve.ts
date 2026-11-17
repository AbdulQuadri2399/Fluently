import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logEvent } from "@/lib/events/log";
import { currentMember } from "@/lib/projects/service";
import type { Database } from "@/lib/supabase/database.types";
import type { IntakeRow } from "./service";

type Client = SupabaseClient<Database>;

export type Missing = "business_objective" | "behavioural_objective" | "sector" | "assets";

/** AC9.1, AC8.6: what still stops the brief being approved, in screen order. */
export function missingForApproval(
  intake: Pick<
    IntakeRow,
    "business_objective" | "behavioural_objective" | "sector" | "sector_other"
  >,
  mode: string,
  assetCount: number,
): Missing[] {
  const missing: Missing[] = [];
  if (!intake.business_objective?.trim()) missing.push("business_objective");
  if (!intake.behavioural_objective?.trim()) missing.push("behavioural_objective");
  if (!intake.sector?.trim() || (intake.sector === "Other" && !intake.sector_other?.trim()))
    missing.push("sector");
  if (mode === "optimise" && assetCount === 0) missing.push("assets");
  return missing;
}

/**
 * O15 approveObjectives (AC9.1, AC9.2, AC10.4, EC9): refuses incomplete briefs, blocks refused
 * sectors with no override, otherwise creates the objective cards, records the checkpoint and
 * queues the ethics check. The caller starts the job with the returned run id.
 */
export async function approveObjectives(
  client: Client,
  projectId: string,
): Promise<ActionResult<{ stageRunId: string }>> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const [{ data: project }, { data: intake }, { count: assets }, { data: ws }] = await Promise.all([
    client.from("projects").select("id, mode, workspace_id").eq("id", projectId).maybeSingle(),
    client.from("intakes").select("*").eq("project_id", projectId).maybeSingle(),
    client
      .from("uploads")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("kind", "asset"),
    client.from("workspaces").select("sector_refuse_list").eq("id", me.workspace_id).single(),
  ]);
  if (!project || !intake) return fail("not_found");
  if (intake.approved_at) return fail("conflict");
  if (missingForApproval(intake, project.mode, assets ?? 0).length) return fail("validation");

  const sector =
    (intake.sector === "Other" ? intake.sector_other : intake.sector)?.trim().toLowerCase() ?? "";
  if ((ws?.sector_refuse_list ?? []).some((s) => s.toLowerCase() === sector)) {
    await client
      .from("projects")
      .update({ status: "blocked", updated_by: me.id })
      .eq("id", projectId);
    return fail("forbidden");
  }

  const { data, error } = await client.rpc("approve_objectives", { p_project: projectId });
  if (error) {
    if (error.code === "42501") return fail("forbidden");
    if (error.code === "22023") return fail("validation");
    if (error.code === "P0004") return fail("conflict");
    return fail("unavailable");
  }
  await logEvent(client, me, "objectives_approved", { project_id: projectId });
  return ok({ stageRunId: data as string });
}

/**
 * O16 editApprovedIntake (AC9.3): re-opens the brief. Everything built from the objectives is
 * marked out of date (nothing is deleted) and the checkpoint must be approved again.
 */
export async function editApprovedIntake(client: Client, projectId: string): Promise<ActionResult> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { data: intake } = await client
    .from("intakes")
    .select("version, approved_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!intake) return fail("not_found");
  if (!intake.approved_at) return ok(undefined);
  const reopened = await client
    .from("intakes")
    .update({ approved_at: null, approved_by: null, version: intake.version + 1 })
    .eq("project_id", projectId)
    .select("project_id");
  if (reopened.error || !reopened.data?.length) return fail("unavailable");
  await client
    .from("nodes")
    .update({ stale: true, updated_by: me.id })
    .eq("project_id", projectId)
    .neq("type", "objective")
    .is("deleted_at", null);
  await client
    .from("projects")
    .update({ current_stage: "intake", status: "in_progress", updated_by: me.id })
    .eq("id", projectId);
  return ok(undefined);
}

/** O17 recordOverride (AC26.1–AC26.3, AC10.3): needs a reason of 20+ characters. */
export async function recordOverride(
  client: Client,
  input: { nodeId: string; reason: string },
): Promise<ActionResult<{ overrideId: string }>> {
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 20) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { data, error } = await client.rpc("record_override", {
    p_node: input.nodeId,
    p_reason: reason,
  });
  if (error) {
    if (error.code === "P0002") return fail("not_found");
    if (error.code === "P0003") return fail("conflict");
    if (error.code === "22023") return fail("validation");
    return fail(error.code === "42501" ? "forbidden" : "unavailable");
  }
  const { data: o } = await client
    .from("ethics_overrides")
    .select("rule")
    .eq("node_id", input.nodeId)
    .order("created_at", { ascending: false })
    .limit(1);
  await logEvent(client, me, "ethics_override_recorded", {
    level: "gate",
    rule: o?.[0]?.rule ?? "",
  });
  return ok({ overrideId: data as string });
}
