import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { AiError, type AiClient } from "@/lib/ai/client";
import { coachSchema, type CoachOutput } from "@/lib/ai/schemas";
import { logEvent } from "@/lib/events/log";
import { currentMember } from "@/lib/projects/service";
import {
  coachInputSchema,
  resolveSchema,
  saveFieldSchema,
  type CoachInput,
  type ResolveInput,
  type SaveFieldInput,
} from "@/lib/schemas/intake";
import { getSettings } from "@/lib/settings/service";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
export type IntakeRow = Database["public"]["Tables"]["intakes"]["Row"];

export async function getIntake(
  client: Client,
  projectId: string,
): Promise<ActionResult<IntakeRow>> {
  const { data, error } = await client
    .from("intakes")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) return fail("unavailable");
  if (!data) return fail("not_found");
  return ok(data);
}

/**
 * O12 saveIntakeField (AC8.9): saves one field if nobody else saved since `version`
 * (otherwise `conflict`), and returns the new version. Approved briefs are edited through O16.
 */
export async function saveIntakeField(
  client: Client,
  input: SaveFieldInput,
  extra: { lowSpecificity?: Record<string, boolean> } = {},
): Promise<ActionResult<{ version: number }>> {
  const parsed = saveFieldSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const { projectId, field, value, version } = parsed.data;
  const update: Database["public"]["Tables"]["intakes"]["Update"] = {
    [field]: value.trim() === "" ? null : value,
    version: version + 1,
  };
  if (extra.lowSpecificity) update.low_specificity = extra.lowSpecificity;
  const { data, error } = await client
    .from("intakes")
    .update(update)
    .eq("project_id", projectId)
    .eq("version", version)
    .is("approved_at", null)
    .select("version");
  if (error) return fail("unavailable");
  if (!data || data.length === 0) {
    const exists = await client
      .from("intakes")
      .select("version, approved_at")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!exists.data) return fail("not_found");
    return fail("conflict");
  }
  return ok({ version: data[0]!.version });
}

const COACH_SYSTEM = `You coach behavioural designers writing a design brief. Rewrite the field so it is specific:
a business objective names a metric and a timeframe; a behavioural objective names who does what, and when.
Keep the writer's meaning and voice. Give a one-sentence reason. Set lowSpecificity to true when the
original is missing those parts.`;

const FIELD_NAMES: Record<string, string> = {
  business_objective: "Business objective",
  behavioural_objective: "Behavioural objective",
  audience_context: "Audience and context",
  constraints: "Constraints",
};

/** O13 coachField (AC8.2, AC8.4): a sharper version and a reason, or `unavailable` after 20 s. */
export async function coachField(
  client: Client,
  input: CoachInput,
  opts: { ai: AiClient; timeoutMs?: number },
): Promise<ActionResult<CoachOutput>> {
  const parsed = coachInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const settings = await getSettings(client);
  if (!settings.ok) return fail("unavailable");
  const { projectId, field, text } = parsed.data;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AiError("unavailable", "timeout")),
      opts.timeoutMs ?? 20_000,
    );
  });
  try {
    const out = await Promise.race([
      opts.ai.generate({
        workspaceId: me.workspace_id,
        projectId,
        stage: "intake",
        step: "coach",
        system: COACH_SYSTEM,
        prompt: `${FIELD_NAMES[field]}:\n${text}`,
        schema: coachSchema,
        settings: settings.data,
        input: { field, text },
        maxTokens: 2000,
      }),
      timeout,
    ]);
    return ok(out);
  } catch (e) {
    return fail(e instanceof AiError && e.code === "rate_limited" ? "rate_limited" : "unavailable");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AC8.3, AC8.5: saves the chosen text and records which action was taken. Keeping your own
 * text after a low-specificity verdict marks the objective as low specificity.
 */
export async function resolveSuggestion(
  client: Client,
  input: ResolveInput,
): Promise<ActionResult<{ version: number; lowSpecificity: boolean }>> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { projectId, field, action, value, lowSpecificity, version } = parsed.data;
  const current = await getIntake(client, projectId);
  if (!current.ok) return current;
  const flags = { ...((current.data.low_specificity as Record<string, boolean>) ?? {}) };
  const marked = action === "keep" && lowSpecificity && field.endsWith("_objective");
  if (marked) flags[field] = true;
  else delete flags[field];
  const saved = await saveIntakeField(
    client,
    { projectId, field, value, version },
    { lowSpecificity: flags },
  );
  if (!saved.ok) return saved;
  await logEvent(client, me, "intake_suggestion_resolved", {
    field,
    action,
    low_specificity: marked,
  });
  return ok({ version: saved.data.version, lowSpecificity: marked });
}
