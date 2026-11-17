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
