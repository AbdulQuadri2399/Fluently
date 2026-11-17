import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult, type ErrorCode } from "@/lib/actions/result";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

function mapError(code: string | undefined): ErrorCode {
  if (code === "42501") return "forbidden";
  if (code === "P0004") return "conflict";
  if (code === "P0003") return "conflict";
  return code === "22023" || code === "P0005" ? "validation" : "unavailable";
}

/** O18 startStage (AC11.1, AC4.9): queues the run; the caller starts the job. */
export async function startStage(
  client: Client,
  projectId: string,
  stage: "research",
): Promise<
  ActionResult<{ stageRunId: string }> | { ok: false; code: "validation"; reason: "no_toolkit" }
> {
  const { data, error } = await client.rpc("start_stage", { p_project: projectId, p_stage: stage });
  if (error) {
    if (error.code === "P0005") return { ok: false, code: "validation", reason: "no_toolkit" };
    return fail(mapError(error.code));
  }
  return ok({ stageRunId: data as string });
}

/** O19 cancelStage (AC11.7): the job stops before its next step; what it made is kept. */
export async function cancelStage(client: Client, stageRunId: string): Promise<ActionResult> {
  const { error } = await client.rpc("cancel_stage", { p_run: stageRunId });
  return error ? fail(mapError(error.code)) : ok(undefined);
}

/** O20 decideCheckpoint, approve path (AC25.1, AC25.3). */
export async function approveCheckpoint(
  client: Client,
  projectId: string,
  stage: string,
  selection?: string[],
): Promise<ActionResult<{ checkpointId: string }>> {
  const { data, error } = await client.rpc("approve_checkpoint", {
    p_project: projectId,
    p_stage: stage,
    ...(selection ? { p_selection: selection } : {}),
  });
  if (error) return fail(mapError(error.code));
  return ok({ checkpointId: data as string });
}

/** O20 send back (AC25.2): research analysis runs again with the feedback (≥ 10 characters). */
export async function sendBackResearch(
  client: Client,
  projectId: string,
  feedback: string,
  replaceHuman: boolean,
): Promise<ActionResult<{ stageRunId: string }>> {
  if ((feedback ?? "").trim().length < 10) return fail("validation");
  const { data, error } = await client.rpc("send_back_research", {
    p_project: projectId,
    p_feedback: feedback,
    p_replace_human: replaceHuman,
  });
  if (error) return fail(mapError(error.code));
  return ok({ stageRunId: data as string });
}

/** Retry failed steps (AC11.5) or synthesis only (AC11.6), keeping what already worked. */
export async function retryResearch(
  client: Client,
  runId: string,
  synthesisOnly: boolean,
): Promise<ActionResult<{ stageRunId: string }>> {
  const { data, error } = await client.rpc("retry_research", {
    p_run: runId,
    p_synthesis_only: synthesisOnly,
  });
  if (error) return fail(mapError(error.code));
  return ok({ stageRunId: data as string });
}
