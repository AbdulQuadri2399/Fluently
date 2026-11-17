import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

/** Product events (NFR13, 04 O33). Names are fixed so reports stay comparable. */
export type EventName = "project_created" | "onboarding_completed" | "onboarding_skipped";

/**
 * O33 logEvent: records one event for the signed-in member. Never throws and never blocks
 * the user's action; a lost event is acceptable, a failed save because of one is not.
 */
export async function logEvent(
  client: SupabaseClient<Database>,
  member: { id: string; workspace_id: string },
  name: EventName,
  props: Record<string, Json> = {},
): Promise<void> {
  try {
    const { error } = await client
      .from("events")
      .insert({ workspace_id: member.workspace_id, member_id: member.id, name, props });
    if (error) console.error("logEvent failed", name, error.message);
  } catch (e) {
    console.error("logEvent failed", name, e);
  }
}
