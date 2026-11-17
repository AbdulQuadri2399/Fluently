import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
type Step = { key: string; status: "waiting" | "running" | "done" | "failed"; count?: number };

export const RUN_TIMEOUT_MS = 30 * 60 * 1000;

/** Made-up counts per research step, so the prototype tree has evidence to show (D30). */
const FAKE_COUNTS: Record<string, number> = { papers: 12, web: 8, competitors: 4, reviews: 23 };
const STEP_TITLES: Record<string, string> = {
  client_data: "Client data",
  papers: "Academic papers",
  web: "Web and market",
  competitors: "Competitors",
  reviews: "Reviews and forums",
};

/**
 * Research stage runner (T5.5, AC11.1–AC11.3, AC11.7, NFR8). Before every step it checks for
 * cancellation and the 30-minute limit; progress is written to stage_runs.steps so the decision
 * bar can show it live. Until Slice 6 each step adds one made-up Evidence card.
 * Runs with the service role, so it keeps going if the person who started it is deactivated (EC8).
 */
export async function runResearch(
  db: Db,
  runId: string,
  opts: { stepDelayMs?: number; now?: () => number } = {},
): Promise<"succeeded" | "cancelled" | "failed"> {
  const now = opts.now ?? Date.now;
  const { data: run } = await db.from("stage_runs").select("*").eq("id", runId).single();
  if (!run) throw new Error(`stage run ${runId} not found`);
  const started = run.started_at ? new Date(run.started_at).getTime() : now();
  if (!run.started_at) {
    await db
      .from("stage_runs")
      .update({ status: "running", started_at: new Date(started).toISOString() })
      .eq("id", runId);
  }
  const steps = (run.steps as Step[]).map((s) => ({ ...s }));
  const save = () =>
    db
      .from("stage_runs")
      .update({ steps: steps as unknown as NonNullable<Json> })
      .eq("id", runId);
  const finish = async (
    status: "succeeded" | "cancelled" | "failed",
    errorCode: string | null = null,
  ) => {
    if (status !== "cancelled") {
      await db
        .from("stage_runs")
        .update({ status, error_code: errorCode, finished_at: new Date(now()).toISOString() })
        .eq("id", runId);
    }
    await db
      .from("projects")
      .update({ current_stage: "research", status: status === "failed" ? "failed" : "waiting" })
      .eq("id", run.project_id);
    return status;
  };

  const { data: objectives } = await db
    .from("nodes")
    .select("id")
    .eq("project_id", run.project_id)
    .eq("type", "objective")
    .is("deleted_at", null);

  // One Evidence card for the whole run (03b: sources fold into one Evidence card). Each step
  // fills in its group as it finishes; a re-run reuses the same card.
  type Group = { key: string; title: string; count: number; status: Step["status"] };
  const groups: Group[] = steps.map((s) => ({
    key: s.key,
    title: STEP_TITLES[s.key] ?? s.key,
    count: s.count ?? 0,
    status: s.status,
  }));
  const cardData = () => ({ groups, note: "Made-up results for the prototype." });
  const { data: existing } = await db
    .from("nodes")
    .select("id")
    .eq("project_id", run.project_id)
    .eq("type", "source")
    .eq("stage", "research")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  let cardId = existing?.id ?? null;
  if (cardId) {
    await db
      .from("nodes")
      .update({ data: cardData(), stage_run_id: runId, stale: false })
      .eq("id", cardId);
  } else {
    const { data: card } = await db
      .from("nodes")
      .insert({
        workspace_id: run.workspace_id,
        project_id: run.project_id,
        type: "source",
        stage: "research",
        title: "Research sources",
        data: cardData(),
        provenance: "ai",
        stage_run_id: runId,
        sort_order: 0,
        created_by: run.started_by,
      })
      .select("id")
      .single();
    cardId = card?.id ?? null;
    if (cardId && objectives?.length) {
      await db.from("edges").insert(
        objectives.map((o) => ({
          workspace_id: run.workspace_id,
          project_id: run.project_id,
          from_id: o.id,
          to_id: cardId!,
        })),
      );
    }
  }
  const saveCard = () =>
    cardId ? db.from("nodes").update({ data: cardData() }).eq("id", cardId) : Promise.resolve();

  for (const [i, step] of steps.entries()) {
    if (step.status === "done") continue;
    const { data: latest } = await db.from("stage_runs").select("status").eq("id", runId).single();
    if (latest?.status === "cancelled") return finish("cancelled");
    if (now() - started > RUN_TIMEOUT_MS) return finish("failed", "timeout");

    step.status = "running";
    groups[i]!.status = "running";
    await save();
    await saveCard();
    if (opts.stepDelayMs) await new Promise((r) => setTimeout(r, opts.stepDelayMs));

    let count = FAKE_COUNTS[step.key] ?? 0;
    if (step.key === "client_data") {
      const { count: files } = await db
        .from("uploads")
        .select("id", { count: "exact", head: true })
        .eq("project_id", run.project_id)
        .eq("kind", "client_data");
      count = files ?? 0;
    }
    step.status = "done";
    step.count = count;
    groups[i] = { ...groups[i]!, status: "done", count };
    await save();
    await saveCard();
  }
  return finish("succeeded");
}
