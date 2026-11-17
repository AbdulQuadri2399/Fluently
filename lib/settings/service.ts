import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { toGbp } from "@/lib/ai/cost";
import {
  DEFAULT_MODEL_PRICES,
  DEFAULT_STAGE_MODELS,
  type ModelPrices,
  type StageModels,
} from "@/lib/ai/models";
import { currentMember } from "@/lib/projects/service";
import {
  allowEntryKind,
  allowEntrySchema,
  workspaceSettingsSchema,
  type AllowEntryInput,
  type WorkspaceSettingsInput,
} from "@/lib/schemas/settings";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type WorkspaceSettings = {
  costCapGbp: number;
  gbpPerUsd: number;
  stageModels: StageModels;
  modelPrices: ModelPrices;
  agencyServices: string[];
  sectorFlagList: string[];
  sectorRefuseList: string[];
};

export type MemberRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "member";
  active: boolean;
};

export type AllowEntry = { id: string; value: string; kind: "email" | "domain" };

export type UsageRow = {
  projectId: string | null;
  projectName: string;
  stage: string;
  calls: number;
  costGbp: number;
};

export async function getSettings(client: Client): Promise<ActionResult<WorkspaceSettings>> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { data, error } = await client
    .from("workspaces")
    .select(
      "cost_cap_gbp, gbp_per_usd, stage_models, model_prices, agency_services, sector_flag_list, sector_refuse_list",
    )
    .eq("id", me.workspace_id)
    .single();
  if (error || !data) return fail("unavailable");
  return ok({
    costCapGbp: Number(data.cost_cap_gbp),
    gbpPerUsd: Number(data.gbp_per_usd),
    stageModels: { ...DEFAULT_STAGE_MODELS, ...(data.stage_models as Partial<StageModels>) },
    modelPrices: { ...DEFAULT_MODEL_PRICES, ...(data.model_prices as Partial<ModelPrices>) },
    agencyServices: data.agency_services,
    sectorFlagList: data.sector_flag_list,
    sectorRefuseList: data.sector_refuse_list,
  });
}

/** O7 updateWorkspaceSettings (AC28.1, AC10.4, AC13.3, AC27.2). */
export async function updateWorkspaceSettings(
  client: Client,
  input: WorkspaceSettingsInput,
): Promise<ActionResult> {
  const parsed = workspaceSettingsSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me || me.role !== "admin") return fail("forbidden");
  const d = parsed.data;
  const patch: Database["public"]["Tables"]["workspaces"]["Update"] = {};
  if (d.stageModels) patch.stage_models = d.stageModels;
  if (d.costCapGbp !== undefined) patch.cost_cap_gbp = d.costCapGbp;
  if (d.gbpPerUsd !== undefined) patch.gbp_per_usd = d.gbpPerUsd;
  if (d.agencyServices) patch.agency_services = dedupe(d.agencyServices);
  if (d.sectorFlagList) patch.sector_flag_list = dedupe(d.sectorFlagList);
  if (d.sectorRefuseList) patch.sector_refuse_list = dedupe(d.sectorRefuseList);
  const { data, error } = await client
    .from("workspaces")
    .update(patch)
    .eq("id", me.workspace_id)
    .select("id");
  if (error) return fail("unavailable");
  if (!data || data.length === 0) return fail("forbidden");
  return ok(undefined);
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((v) => {
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function listAllowlist(client: Client): Promise<ActionResult<AllowEntry[]>> {
  const { data, error } = await client
    .from("allowlist_entries")
    .select("id, value, kind")
    .order("created_at", { ascending: true });
  if (error) return fail("unavailable");
  return ok((data ?? []) as AllowEntry[]);
}

/** O5 addAllowEntry (AC3.1, AC3.2). Adding an entry that's already there is a no-op. */
export async function addAllowEntry(
  client: Client,
  input: AllowEntryInput,
): Promise<ActionResult<AllowEntry>> {
  const parsed = allowEntrySchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me || me.role !== "admin") return fail("forbidden");
  const value = parsed.data.value;
  const { data, error } = await client
    .from("allowlist_entries")
    .insert({
      workspace_id: me.workspace_id,
      value,
      kind: allowEntryKind(value),
      created_by: me.id,
    })
    .select("id, value, kind")
    .single();
  if (error?.code === "23505") {
    const existing = await client
      .from("allowlist_entries")
      .select("id, value, kind")
      .eq("value", value)
      .single();
    return existing.data ? ok(existing.data as AllowEntry) : fail("conflict");
  }
  if (error || !data) return fail(error?.code === "42501" ? "forbidden" : "unavailable");
  return ok(data as AllowEntry);
}

/** O5 removeAllowEntry (AC3.3): blocks new sign-ups; existing accounts stay active. */
export async function removeAllowEntry(client: Client, id: string): Promise<ActionResult> {
  const me = await currentMember(client);
  if (!me || me.role !== "admin") return fail("forbidden");
  const { data, error } = await client.from("allowlist_entries").delete().eq("id", id).select("id");
  if (error) return fail("unavailable");
  if (!data || data.length === 0) return fail("not_found");
  return ok(undefined);
}

export async function listMembers(client: Client): Promise<ActionResult<MemberRow[]>> {
  const { data, error } = await client
    .from("members")
    .select("id, email, display_name, role, active")
    .order("created_at", { ascending: true });
  if (error) return fail("unavailable");
  return ok(
    (data ?? []).map((m) => ({
      id: m.id,
      email: m.email,
      displayName: m.display_name,
      role: m.role as MemberRow["role"],
      active: m.active,
    })),
  );
}

function rpcError(code: string | undefined): ActionResult<never> {
  if (code === "P0003") return fail("conflict");
  if (code === "42501") return fail("forbidden");
  if (code === "P0002") return fail("not_found");
  if (code === "22023") return fail("validation");
  return fail("unavailable");
}

/** O6 setMemberRole (AC3.5): refuses to demote the last admin. */
export async function setMemberRole(
  client: Client,
  memberId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  const { error } = await client.rpc("set_member_role", { member_id: memberId, new_role: role });
  return error ? rpcError(error.code) : ok(undefined);
}

/** O6 setMemberActive (AC3.4, AC3.5): ends sessions and blocks sign-in; work stays. */
export async function setMemberActive(
  client: Client,
  memberId: string,
  active: boolean,
): Promise<ActionResult> {
  const { error } = await client.rpc("set_member_active", {
    member_id: memberId,
    is_active: active,
  });
  return error ? rpcError(error.code) : ok(undefined);
}

/** Usage per project and stage in GBP (AC27.2). */
export async function usageByProjectStage(
  client: Client,
  settings: Pick<WorkspaceSettings, "gbpPerUsd" | "modelPrices">,
): Promise<ActionResult<UsageRow[]>> {
  const { data, error } = await client
    .from("ai_usage")
    .select("project_id, stage, cost_usd, project:projects(name)")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return fail("unavailable");
  const rows = new Map<string, UsageRow>();
  for (const r of data ?? []) {
    const key = `${r.project_id ?? "-"}|${r.stage}`;
    const project = Array.isArray(r.project) ? r.project[0] : r.project;
    const row = rows.get(key) ?? {
      projectId: r.project_id,
      projectName: project?.name ?? "",
      stage: r.stage,
      calls: 0,
      costGbp: 0,
    };
    row.calls += 1;
    row.costGbp += toGbp(Number(r.cost_usd), settings.gbpPerUsd);
    rows.set(key, row);
  }
  return ok([...rows.values()].sort((a, b) => a.projectName.localeCompare(b.projectName)));
}
