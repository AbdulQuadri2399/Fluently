import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logEvent } from "@/lib/events/log";
import { currentMember } from "@/lib/projects/service";
import type { Database } from "@/lib/supabase/database.types";
import { missingForApproval } from "./approve-rules";

export { missingForApproval, type Missing } from "./approve-rules";

type Client = SupabaseClient<Database>;

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
  const [
    { data: project },
    { data: intake },
    { count: assets },
    { count: emailCount },
    { data: ws },
  ] = await Promise.all([
    client
      .from("projects")
      .select("id, mode, channel, workspace_id")
      .eq("id", projectId)
      .maybeSingle(),
    client.from("intakes").select("*").eq("project_id", projectId).maybeSingle(),
    client
      .from("uploads")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("kind", "asset"),
    client.from("emails").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    client.from("workspaces").select("sector_refuse_list").eq("id", me.workspace_id).single(),
  ]);
  if (!project || !intake) return fail("not_found");
  if (intake.approved_at) return fail("conflict");
  const isEmail = project.channel === "email";
  if (
    missingForApproval(intake, project.mode, assets ?? 0, isEmail ? (emailCount ?? 0) : undefined)
      .length
  )
    return fail("validation");

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
  // AC22.7: optimise projects show their current assets as a card under the objectives.
  if (project.mode === "optimise" && !isEmail) {
    const { data: files } = await client
      .from("uploads")
      .select("id")
      .eq("project_id", projectId)
      .eq("kind", "asset");
    const { data: existing } = await client
      .from("nodes")
      .select("id")
      .eq("project_id", projectId)
      .eq("type", "asset_set")
      .is("deleted_at", null);
    if (!existing?.length) {
      await client.from("nodes").insert({
        workspace_id: project.workspace_id,
        project_id: projectId,
        type: "asset_set",
        stage: "intake",
        title: "Current assets",
        data: { uploadIds: (files ?? []).map((f) => f.id), count: files?.length ?? 0 },
        provenance: "human",
        created_by: me.id,
        updated_by: me.id,
      });
    }
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

/** AC10.5: queues the ethics check again after it failed. */
export async function retryEthics(
  client: Client,
  projectId: string,
): Promise<ActionResult<{ stageRunId: string }>> {
  const { data, error } = await client.rpc("retry_ethics", { p_project: projectId });
  if (error)
    return fail(
      error.code === "42501" ? "forbidden" : error.code === "P0003" ? "conflict" : "unavailable",
    );
  return ok({ stageRunId: data as string });
}
