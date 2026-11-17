import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logEvent } from "@/lib/events/log";
import { currentMember } from "@/lib/projects/service";
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

export const updateNodeSchema = z.object({
  nodeId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(4000).nullable(),
  version: z.number().int().min(1),
});
export type UpdateNodeInput = z.input<typeof updateNodeSchema>;

/**
 * O21 updateNode (AC24.1, AC24.4, AC24.7): `conflict` when someone saved since `version` (the
 * caller keeps the person's text), `forbidden` while the card's stage is running.
 */
export async function updateNode(
  client: Client,
  input: UpdateNodeInput,
): Promise<ActionResult<{ version: number }>> {
  const parsed = updateNodeSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { nodeId, title, body, version } = parsed.data;
  const { data, error } = await client.rpc("update_node", {
    p_node: nodeId,
    p_title: title,
    p_body: body as string,
    p_version: version,
  });
  if (error) {
    if (error.code === "P0003") return fail("conflict");
    if (error.code === "P0002") return fail("not_found");
    if (error.code === "P0004") return fail("forbidden");
    if (error.code === "22023") return fail("validation");
    return fail("unavailable");
  }
  const { data: n } = await client.from("nodes").select("type").eq("id", nodeId).single();
  await logEvent(client, me, "node_edited", { node_type: n?.type ?? "" });
  return ok({ version: data as number });
}
