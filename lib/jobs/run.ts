import "server-only";
import { after } from "next/server";
import { getAiClient } from "@/lib/ai";
import { adminClient } from "@/lib/supabase/admin";
import { ethicsGate } from "./ethics";
import { searchPapers } from "@/lib/retrieval/papers";
import { fakeResearchDeps, runResearch, type ResearchDeps } from "./research";

/** Live mode uses real academic search; web steps wait for the web-search check (T6.1, 04 D17). */
function researchDeps(): ResearchDeps {
  const ai = getAiClient();
  if (ai.mode === "fake") return fakeResearchDeps(ai);
  return {
    ai,
    papers: (q) => searchPapers(q),
    web: async () => {
      throw new Error("web search not set up yet (T6.1)");
    },
  };
}

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
      const deps = researchDeps();
      await runResearch(adminClient(), stageRunId, {
        stepDelayMs: deps.ai.mode === "fake" ? 1200 : 0,
        deps,
      });
    } catch (e) {
      console.error("research crashed", stageRunId, e);
      await adminClient()
        .from("stage_runs")
        .update({ status: "failed", error_code: "crashed", finished_at: new Date().toISOString() })
        .eq("id", stageRunId);
    }
  });
}
