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

const addSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("link"),
    projectId: z.uuid(),
    url: z.url({ protocol: /^https?$/ }).max(2000),
    title: z.string().trim().max(200).optional(),
  }),
  z.object({ kind: z.literal("upload"), projectId: z.uuid(), uploadId: z.uuid() }),
]);
export type AddSourceInput = z.input<typeof addSourceSchema>;

type Group = {
  key: string;
  title: string;
  count: number;
  status: string;
  items: { id: string; title: string; sub: string; url: string | null }[];
};

/**
 * O35 addSource (AC12.10): stores a source added by a member after research, adds it to the
 * Evidence card's group, and marks everything built from Evidence out of date.
 */
export async function addSource(
  client: Client,
  input: AddSourceInput,
): Promise<ActionResult<{ sourceId: string }>> {
  const parsed = addSourceSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const d = parsed.data;
  const { data: card } = await client
    .from("nodes")
    .select("id, data, workspace_id")
    .eq("project_id", d.projectId)
    .eq("type", "source")
    .eq("stage", "research")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!card) return fail("not_found");

  let row: {
    source_type: string;
    title: string;
    url: string | null;
    upload_id: string | null;
    meta: { sub: string };
  };
  let groupKey: string;
  if (d.kind === "link") {
    const host = new URL(d.url).hostname.replace(/^www\./, "");
    row = {
      source_type: "desk",
      title: d.title || host,
      url: d.url,
      upload_id: null,
      meta: { sub: host },
    };
    groupKey = "web";
  } else {
    const { data: up } = await client
      .from("uploads")
      .select("id, file_name, kind")
      .eq("id", d.uploadId)
      .eq("project_id", d.projectId)
      .maybeSingle();
    if (!up || up.kind !== "client_data") return fail("validation");
    const ext = up.file_name.split(".").pop()?.toUpperCase() ?? "File";
    row = {
      source_type: "upload",
      title: up.file_name,
      url: null,
      upload_id: up.id,
      meta: { sub: ext === "XLSX" ? "Spreadsheet" : ext },
    };
    groupKey = "client_data";
  }
  const { count } = await client
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq("project_id", d.projectId)
    .like("handle", "U%");
  const { data: src, error } = await client
    .from("sources")
    .insert({
      ...row,
      workspace_id: card.workspace_id,
      project_id: d.projectId,
      handle: `U${(count ?? 0) + 1}`,
      added_by: me.id,
    })
    .select("id")
    .single();
  if (error || !src) return fail("unavailable");

  const data = (card.data ?? {}) as { groups?: Group[]; total?: number };
  const groups = (data.groups ?? []).map((g) =>
    g.key === groupKey
      ? {
          ...g,
          status: "done",
          items: [...g.items, { id: src.id, title: row.title, sub: row.meta.sub, url: row.url }],
          count: g.items.length + 1,
        }
      : g,
  );
  await client
    .from("nodes")
    .update({
      data: { ...data, groups, total: groups.reduce((n, g) => n + g.count, 0) },
      updated_by: me.id,
    })
    .eq("id", card.id);

  // AC12.10, AC24.4: everything built from Evidence is out of date (kept and usable).
  const stale = new Set<string>();
  let frontier = [card.id];
  while (frontier.length) {
    const { data: next } = await client.from("edges").select("to_id").in("from_id", frontier);
    frontier = (next ?? []).map((e) => e.to_id).filter((id) => !stale.has(id));
    frontier.forEach((id) => stale.add(id));
  }
  if (stale.size)
    await client
      .from("nodes")
      .update({ stale: true })
      .in("id", [...stale]);
  return ok({ sourceId: src.id });
}

export type NodeEvidence = {
  sources: { id: string; title: string; url: string | null; type: string; handle: string }[];
  external: { name: string; mechanism: string | null; sourceTitle: string }[];
};

/** AC12.7, AC12.9: the stored sources behind a finding, theme or opportunity, and external principles. */
export async function nodeEvidence(client: Client, nodeId: string): Promise<NodeEvidence> {
  const { data: node } = await client
    .from("nodes")
    .select("id, project_id, type, data")
    .eq("id", nodeId)
    .maybeSingle();
  if (!node) return { sources: [], external: [] };
  // Walk upstream to the findings this card rests on.
  const findingIds = new Set<string>();
  let frontier = [node.id];
  const seen = new Set(frontier);
  while (frontier.length) {
    const { data: ups } = await client.from("nodes").select("id, type").in("id", frontier);
    for (const u of ups ?? []) if (u.type === "finding") findingIds.add(u.id);
    const { data: edges } = await client.from("edges").select("from_id").in("to_id", frontier);
    frontier = (edges ?? []).map((e) => e.from_id).filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
    if (seen.size > 500) break;
  }
  const { data: findings } = findingIds.size
    ? await client
        .from("nodes")
        .select("data, stage_run_id")
        .in("id", [...findingIds])
    : { data: [] };
  const handles = new Set(
    (findings ?? []).flatMap((f) => (f.data as { sources?: string[] }).sources ?? []),
  );
  const { data: rows } = handles.size
    ? await client
        .from("sources")
        .select("id, title, url, source_type, handle, created_at")
        .eq("project_id", node.project_id)
        .in("handle", [...handles])
        .order("created_at", { ascending: false })
    : { data: [] };
  const byHandle = new Map<string, NonNullable<typeof rows>[number]>();
  for (const r of rows ?? []) if (!byHandle.has(r.handle)) byHandle.set(r.handle, r); // latest run wins
  const sources = [...byHandle.values()].map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    type: r.source_type,
    handle: r.handle,
  }));
  let external: NodeEvidence["external"] = [];
  if (node.type === "opportunity") {
    const { data: cands } = await client
      .from("toolkit_candidates")
      .select("name, mechanism, source:sources(title)")
      .eq("project_id", node.project_id);
    external = (cands ?? []).map((c) => {
      const s = Array.isArray(c.source) ? c.source[0] : c.source;
      return { name: c.name, mechanism: c.mechanism, sourceTitle: s?.title ?? "" };
    });
  }
  return { sources, external };
}

/** O36 split / move assets between Current assets cards (AC22.11). `toNodeId` null = split into a new card. */
export async function moveAssets(
  client: Client,
  projectId: string,
  uploadIds: string[],
  toNodeId: string | null,
): Promise<ActionResult<{ nodeId: string }>> {
  const parsed = z.array(z.uuid()).min(1).max(20).safeParse(uploadIds);
  if (!parsed.success) return fail("validation");
  const { data, error } = await client.rpc("move_assets", {
    p_project: projectId,
    p_uploads: parsed.data,
    p_to: toNodeId,
  } as never);
  if (error) {
    if (error.code === "22023") return fail("validation");
    if (error.code === "P0002") return fail("not_found");
    return fail(error.code === "42501" ? "forbidden" : "unavailable");
  }
  return ok({ nodeId: data as string });
}

export type RunActivity = {
  questions: string[];
  events: { id: string; kind: string; step: string | null; count: number | null; at: string }[];
};

/** AC11.9, AC11.10: the research questions and the activity log of one stage run. */
export async function runActivity(client: Client, runId: string): Promise<RunActivity> {
  const [{ data: run }, { data: events }] = await Promise.all([
    client.from("stage_runs").select("questions").eq("id", runId).maybeSingle(),
    client
      .from("run_events")
      .select("id, kind, step, count, created_at")
      .eq("stage_run_id", runId)
      .order("created_at")
      .limit(500),
  ]);
  return {
    questions: ((run?.questions ?? []) as string[]).filter((q) => typeof q === "string"),
    events: (events ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      step: e.step,
      count: e.count,
      at: e.created_at,
    })),
  };
}
