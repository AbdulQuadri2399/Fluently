import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** O34 reorderNode (AC22.8): saves the order of cards within one lane. */
export async function reorderNodes(
  client: Client,
  projectId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).min(1).max(500).safeParse(orderedIds);
  if (!parsed.success) return fail("validation");
  const results = await Promise.all(
    parsed.data.map((id, i) =>
      client
        .from("nodes")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("project_id", projectId)
        .select("id"),
    ),
  );
  if (results.some((r) => r.error)) return fail("unavailable");
  if (results.some((r) => !r.data?.length)) return fail("not_found");
  return ok(undefined);
}

export async function nodeHistory(client: Client, nodeId: string) {
  const { data } = await client
    .from("node_history")
    .select(
      "change, created_at, member:members!node_history_changed_by_members_id_fk(display_name, email)",
    )
    .eq("node_id", nodeId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((h) => {
    const m = Array.isArray(h.member) ? h.member[0] : h.member;
    return {
      change: h.change,
      at: new Date(h.created_at).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      by: m?.display_name || m?.email || "",
    };
  });
}
