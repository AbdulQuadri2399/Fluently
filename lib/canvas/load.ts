import type { SupabaseClient } from "@supabase/supabase-js";
import { toGbp } from "@/lib/ai/cost";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type TreeNode = {
  id: string;
  type: string;
  stage: string;
  title: string;
  data: Record<string, unknown>;
  status: string;
  stale: boolean;
  lowSpecificity: boolean;
  provenance: string;
  model: string | null;
  sortOrder: number;
  createdAt: string;
  stageRunId: string | null;
  version: number;
  updatedByName: string;
  confidence: string | null;
};
export type TreeEdge = { id: string; from: string; to: string };
export type RunStep = {
  key: string;
  status: "waiting" | "running" | "done" | "failed";
  count?: number;
};
export type RunInfo = {
  id: string;
  stage: string;
  status: string;
  steps: RunStep[];
  startedAt: string | null;
  finishedAt: string | null;
};

export type ProjectTree = {
  project: {
    id: string;
    name: string;
    mode: "new" | "optimise";
    channel: "screens" | "email";
    status: string;
    currentStage: string;
  };
  intakeApproved: boolean;
  hasToolkit: boolean;
  isAdmin: boolean;
  nodes: TreeNode[];
  edges: TreeEdge[];
  latestRun: RunInfo | null;
};

/** Everything the tree screen needs for one project, read as the signed-in member (RLS applies). */
export async function loadTree(client: Client, projectId: string): Promise<ProjectTree | null> {
  const { data: auth } = await client.auth.getUser();
  const [
    { data: p },
    { data: intake },
    { data: nodes },
    { data: edges },
    { data: run },
    { data: me },
  ] = await Promise.all([
    client
      .from("projects")
      .select("id, name, mode, channel, status, current_stage, toolkit_version_id, workspace_id")
      .eq("id", projectId)
      .maybeSingle(),
    client.from("intakes").select("approved_at").eq("project_id", projectId).maybeSingle(),
    client
      .from("nodes")
      .select(
        "id, type, stage, title, data, status, stale, low_specificity, provenance, model, sort_order, created_at, stage_run_id, version, confidence, editor:members!nodes_updated_by_members_id_fk(display_name, email)",
      )
      .eq("project_id", projectId)
      .is("deleted_at", null),
    client.from("edges").select("id, from_id, to_id").eq("project_id", projectId),
    client
      .from("stage_runs")
      .select("id, stage, status, steps, started_at, finished_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("members")
      .select("role")
      .eq("id", auth.user?.id ?? "")
      .maybeSingle(),
  ]);
  if (!p) return null;
  const { data: ws } = await client
    .from("workspaces")
    .select("default_toolkit_version_id")
    .eq("id", p.workspace_id)
    .single();
  // AC22.10: Current assets cards show thumbnails, from short-lived private links.
  const assets = new Map<string, { id: string; fileName: string; url: string | null }>();
  if ((nodes ?? []).some((n) => n.type === "asset_set")) {
    const { data: ups } = await client
      .from("uploads")
      .select("id, file_name, mime, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "asset");
    const images = (ups ?? []).filter((u) => u.mime.startsWith("image/"));
    const signed = images.length
      ? ((await client.storage.from("uploads").createSignedUrls(images.map((u) => u.storage_path), 3600)).data ?? [])
      : [];
    const urlOf = new Map(images.map((u, i) => [u.id, signed[i]?.signedUrl ?? null]));
    for (const u of ups ?? []) assets.set(u.id, { id: u.id, fileName: u.file_name, url: urlOf.get(u.id) ?? null });
  }
  return {
    project: {
      id: p.id,
      name: p.name,
      mode: p.mode as "new" | "optimise",
      channel: p.channel as "screens" | "email",
      status: p.status,
      currentStage: p.current_stage,
    },
    intakeApproved: Boolean(intake?.approved_at),
    hasToolkit: Boolean(p.toolkit_version_id || ws?.default_toolkit_version_id),
    isAdmin: me?.role === "admin",
    nodes: (nodes ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      stage: n.stage,
      title: n.title,
      data:
        n.type === "asset_set"
          ? {
              ...((n.data ?? {}) as Record<string, unknown>),
              assets: (((n.data as { uploadIds?: string[] } | null)?.uploadIds ?? []) as string[])
                .map((id) => assets.get(id))
                .filter(Boolean),
            }
          : ((n.data ?? {}) as Record<string, unknown>),
      status: n.status,
      stale: n.stale,
      lowSpecificity: n.low_specificity,
      provenance: n.provenance,
      model: n.model,
      sortOrder: n.sort_order,
      createdAt: n.created_at,
      stageRunId: n.stage_run_id,
      version: n.version,
      confidence: n.confidence,
      updatedByName: (() => {
        const e = Array.isArray(n.editor) ? n.editor[0] : n.editor;
        return e?.display_name || e?.email || "";
      })(),
    })),
    edges: (edges ?? []).map((e) => ({ id: e.id, from: e.from_id, to: e.to_id })),
    latestRun: run
      ? {
          id: run.id,
          stage: run.stage,
          status: run.status,
          steps: (run.steps ?? []) as RunStep[],
          startedAt: run.started_at,
          finishedAt: run.finished_at,
        }
      : null,
  };
}

/** Project header facts (T5.7): toolkit pin and AI spend so far against the cap (AC27.2). */
export async function loadHeader(client: Client, projectId: string) {
  const { data: p } = await client
    .from("projects")
    .select(
      "id, name, mode, channel, workspace_id, cost_cap_override_gbp, pinned:toolkit_versions!projects_toolkit_version_id_toolkit_versions_id_fk(number)",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!p) return null;
  const [{ data: ws }, { data: usage }] = await Promise.all([
    client
      .from("workspaces")
      .select(
        "cost_cap_gbp, gbp_per_usd, current:toolkit_versions!workspaces_default_toolkit_version_id_toolkit_versions_id_fk(number)",
      )
      .eq("id", p.workspace_id)
      .single(),
    client.from("ai_usage").select("cost_usd").eq("project_id", projectId),
  ]);
  const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null;
  const usd = (usage ?? []).reduce((sum, u) => sum + Number(u.cost_usd), 0);
  return {
    id: p.id,
    name: p.name,
    mode: p.mode,
    channel: p.channel,
    pinned: one(p.pinned)?.number ?? null,
    latest: one(ws?.current)?.number ?? null,
    spentGbp: toGbp(usd, Number(ws?.gbp_per_usd ?? 0.79)),
    capGbp: Number(p.cost_cap_override_gbp ?? ws?.cost_cap_gbp ?? 10),
  };
}
