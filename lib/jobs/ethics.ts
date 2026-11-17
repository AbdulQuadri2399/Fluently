import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError, type AiClient } from "@/lib/ai/client";
import {
  DEFAULT_MODEL_PRICES,
  DEFAULT_STAGE_MODELS,
  type ModelPrices,
  type StageModels,
} from "@/lib/ai/models";
import { ethicsSchema, type EthicsOutput } from "@/lib/ai/schemas";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

const SYSTEM = `You screen design briefs for a behavioural design agency. Flag the brief if it asks for any of:
deception; fake urgency or scarcity; making it hard to cancel or opt out; hidden costs; exploiting
vulnerable groups. Also flag when the sector is on the sensitive list. Give one reason per rule broken,
quoting the brief. Otherwise return pass with no reasons.`;

/**
 * J1 ethicsGate (AC10.1–AC10.3, AC10.5). Runs with the service role (`db`), so every query is
 * scoped to the run's project. A failure never counts as a pass: the run and the ethics card
 * are marked failed and research stays blocked.
 */
export async function ethicsGate(
  db: Db,
  ai: AiClient,
  stageRunId: string,
): Promise<"pass" | "flag" | "failed"> {
  const { data: run } = await db
    .from("stage_runs")
    .select("id, project_id, workspace_id, started_by")
    .eq("id", stageRunId)
    .single();
  if (!run) throw new Error(`stage run ${stageRunId} not found`);
  const now = () => new Date().toISOString();
  await db.from("stage_runs").update({ status: "running", started_at: now() }).eq("id", run.id);

  const [{ data: intake }, { data: ws }, { data: objectives }] = await Promise.all([
    db.from("intakes").select("*").eq("project_id", run.project_id).single(),
    db
      .from("workspaces")
      .select("stage_models, model_prices, sector_flag_list")
      .eq("id", run.workspace_id)
      .single(),
    db
      .from("nodes")
      .select("id")
      .eq("project_id", run.project_id)
      .eq("type", "objective")
      .is("deleted_at", null),
  ]);
  const sector =
    intake?.sector === "Other" ? (intake?.sector_other ?? "Other") : (intake?.sector ?? "");
  const brief = [
    `Business objective: ${intake?.business_objective ?? ""}`,
    `Behavioural objective: ${intake?.behavioural_objective ?? ""}`,
    `Audience and context: ${intake?.audience_context ?? ""}`,
    `Constraints: ${intake?.constraints ?? ""}`,
    `Sector: ${sector}`,
  ].join("\n");
  const flagList = ws?.sector_flag_list ?? [];

  let result: EthicsOutput | null = null;
  let errorCode: string | null = null;
  try {
    result = await ai.generate({
      workspaceId: run.workspace_id,
      projectId: run.project_id,
      stage: "ethics",
      step: "ethics",
      system: SYSTEM,
      prompt: `${brief}\n\nSensitive sectors: ${flagList.join(", ")}`,
      schema: ethicsSchema,
      settings: {
        stageModels: {
          ...DEFAULT_STAGE_MODELS,
          ...((ws?.stage_models ?? {}) as Partial<StageModels>),
        },
        modelPrices: {
          ...DEFAULT_MODEL_PRICES,
          ...((ws?.model_prices ?? {}) as Partial<ModelPrices>),
        },
      },
      input: { brief, sector, flagList },
      maxTokens: 4000,
    });
  } catch (e) {
    errorCode = e instanceof AiError ? e.code : "unavailable";
  }

  const outcome = result ? result.result : "failed";
  const data = result
    ? { result: result.result, reasons: result.reasons }
    : { result: "failed", reasons: [] };
  const status = outcome === "pass" ? "ok" : outcome === "flag" ? "flagged" : "failed";
  const title =
    outcome === "pass"
      ? "Ethics check passed"
      : outcome === "flag"
        ? "Ethics check flagged"
        : "Ethics check didn't run";

  // One ethics card per project; a re-screen replaces its result.
  const { data: existing } = await db
    .from("nodes")
    .select("id")
    .eq("project_id", run.project_id)
    .eq("type", "ethics")
    .is("deleted_at", null)
    .maybeSingle();
  let nodeId = existing?.id;
  if (nodeId) {
    await db
      .from("nodes")
      .update({ title, data, status, stale: false, stage_run_id: run.id })
      .eq("id", nodeId);
  } else {
    const { data: created } = await db
      .from("nodes")
      .insert({
        workspace_id: run.workspace_id,
        project_id: run.project_id,
        type: "ethics",
        stage: "ethics",
        title,
        data,
        status,
        provenance: "ai",
        stage_run_id: run.id,
        model: (ws?.stage_models as StageModels | undefined)?.ethics?.model ?? null,
        created_by: run.started_by,
      })
      .select("id")
      .single();
    nodeId = created?.id;
  }
  if (nodeId && objectives?.length) {
    await db.from("edges").upsert(
      objectives.map((o) => ({
        workspace_id: run.workspace_id,
        project_id: run.project_id,
        from_id: o.id,
        to_id: nodeId!,
      })),
      { onConflict: "from_id,to_id", ignoreDuplicates: true },
    );
  }

  await db
    .from("stage_runs")
    .update({
      status: outcome === "failed" ? "failed" : "succeeded",
      error_code: errorCode,
      finished_at: now(),
    })
    .eq("id", run.id);
  await db
    .from("projects")
    .update(
      outcome === "pass"
        ? { current_stage: "research", status: "waiting" }
        : outcome === "flag"
          ? { current_stage: "ethics", status: "waiting" }
          : { current_stage: "ethics", status: "failed" },
    )
    .eq("id", run.project_id);
  return outcome;
}
