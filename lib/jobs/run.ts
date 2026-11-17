import "server-only";
import { after } from "next/server";
import { getAiClient } from "@/lib/ai";
import { adminClient } from "@/lib/supabase/admin";
import { ethicsGate } from "./ethics";
import { runResearch } from "./research";

/**
 * Starts a background job (D2, D30). JOBS_MODE=inline (default) runs it on this server after
 * the response is sent; an Inngest sender replaces this once the account exists.
 */
export function startEthicsGate(stageRunId: string) {
  after(async () => {
    try {
      await ethicsGate(adminClient(), getAiClient(), stageRunId);
    } catch (e) {
      console.error("ethicsGate crashed", stageRunId, e);
      await adminClient()
        .from("stage_runs")
        .update({ status: "failed", error_code: "crashed", finished_at: new Date().toISOString() })
        .eq("id", stageRunId);
    }
  });
}

/** Starts the research stage in the background (D30). Steps are spaced out so progress is visible. */
export function startResearch(stageRunId: string) {
  after(async () => {
    try {
      await runResearch(adminClient(), stageRunId, { stepDelayMs: 1500 });
    } catch (e) {
      console.error("research crashed", stageRunId, e);
      await adminClient()
        .from("stage_runs")
        .update({ status: "failed", error_code: "crashed", finished_at: new Date().toISOString() })
        .eq("id", stageRunId);
    }
  });
}
