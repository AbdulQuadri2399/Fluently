import type { SupabaseClient } from "@supabase/supabase-js";
import { createProject } from "@/lib/projects/service";

/** A project with a filled-in brief, ready to approve. */
export async function projectWithBrief(
  client: SupabaseClient,
  brief: Partial<{
    business_objective: string;
    behavioural_objective: string;
    audience_context: string;
    sector: string;
  }> = {},
  mode: "new" | "optimise" = "new",
) {
  const p = await createProject(client, { name: "Brief", mode, channel: "screens" });
  if (!p.ok) throw new Error(p.code);
  const { error } = await client
    .from("intakes")
    .update({
      business_objective: "Raise completed ID checks by 15% within 3 months",
      behavioural_objective: "New customers upload their ID within their first day",
      audience_context: "First-time banking app customers",
      sector: "Banking",
      ...brief,
    })
    .eq("project_id", p.data.id);
  if (error) throw new Error(error.message);
  return p.data.id;
}
