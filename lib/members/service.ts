import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logEvent } from "@/lib/events/log";
import { currentMember } from "@/lib/projects/service";
import type { Database } from "@/lib/supabase/database.types";

/** O4 completeOnboarding (AC2.2): records that the introduction was finished or skipped. */
export async function completeOnboarding(
  client: SupabaseClient<Database>,
  how: "finished" | "skipped" = "finished",
): Promise<ActionResult> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  if (me.onboarded_at) return ok(undefined);
  const { error } = await client
    .from("members")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", me.id);
  if (error) return fail("unavailable");
  await logEvent(client, me, how === "skipped" ? "onboarding_skipped" : "onboarding_completed");
  return ok(undefined);
}
