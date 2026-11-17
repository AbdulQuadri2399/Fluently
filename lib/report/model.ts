import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type Level = "High" | "Med" | "Low";
export type SourceKind = "toolkit" | "paper" | "desk" | "competitor" | "social" | "upload";

export type Citation = {
  n: number;
  id: string;
  handle: string;
  type: SourceKind;
  title: string;
  url: string | null;
  authors: string[];
  year: number | null;
  doi: string | null;
  retrievedAt: string;
};

export type ReportFinding = {
  id: string;
  text: string;
  /** Citation numbers; empty means the finding is labelled AI inference (AC15.2). */
  citations: number[];
  aiInference: boolean;
  /** Distinct social URLs behind it, for the Qualitative signal label (AC12.4). */
  qualitative: number;
};

export type ReportTheme = {
  id: string;
  title: string;
  summary: string;
  strength: Level | null;
  reason: string | null;
  stale: boolean;
  findings: ReportFinding[];
};

export type ReportOpportunity = {
  id: string;
  title: string;
  summary: string;
  confidence: Level | null;
  reason: string | null;
  principles: string[];
  themes: string[];
  citations: number[];
  stale: boolean;
};

export type ReportGap = {
  id: string;
  question: string;
  method: string;
  kind: "discovery" | "generative";
  opportunity: string;
};

export type Report = {
  /** False until research has produced something to report (SCR9 not yet). */
  ready: boolean;
  project: { id: string; name: string };
  toolkitVersion: number | null;
  hasStale: boolean;
  summary: {
    sources: number;
    kinds: number;
    findings: number;
    themes: number;
    opportunities: number;
    byConfidence: Record<Level, number>;
    gaps: number;
  };
  objectives: { id: string; label: string; text: string; lowSpecificity: boolean }[];
  sourceGroups: { type: SourceKind; count: number }[];
  themes: ReportTheme[];
  opportunities: ReportOpportunity[];
  gaps: {
    total: number;
    discovery: ReportGap[];
    generative: ReportGap[];
    methods: string[];
  };
  ethics: {
    status: string;
    reasons: { rule: string; reason: string }[];
    overrides: { rule: string; reason: string; by: string; at: string }[];
  } | null;
  citations: Citation[];
};

const SOURCE_ORDER: SourceKind[] = ["upload", "paper", "desk", "competitor", "social", "toolkit"];
const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null;

/**
 * O27 getReport (AC15.1–AC15.3, AC12.8, AC13.5): the Audit Report is a view over the tree, built
 * fresh on every open, so edits show up next time. Read as the signed-in member (RLS applies).
 * Citations are numbered in reading order: themes and their findings first, then opportunities.
 */
export async function getReport(client: Client, projectId: string): Promise<Report | null> {
  const { data: project } = await client
    .from("projects")
    .select(
      "id, name, workspace_id, pinned:toolkit_versions!projects_toolkit_version_id_toolkit_versions_id_fk(number)",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [{ data: nodes }, { data: edges }, { data: sources }, { data: overrides }] =
    await Promise.all([
      client
        .from("nodes")
        .select("id, type, title, data, status, stale, low_specificity, confidence, sort_order")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("sort_order"),
      client.from("edges").select("from_id, to_id").eq("project_id", projectId),
      client
        .from("sources")
        .select("id, handle, source_type, title, url, authors, year, doi, retrieved_at, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      client
        .from("ethics_overrides")
        .select(
          "rule, reason, created_at, by:members!ethics_overrides_decided_by_members_id_fk(display_name, email)",
        )
        .eq("project_id", projectId)
        .order("created_at"),
    ]);

  const all = nodes ?? [];
  const of = (type: string) => all.filter((n) => n.type === type);
  const from = new Map<string, string[]>(); // to_id → from_ids
  for (const e of edges ?? []) from.set(e.to_id, [...(from.get(e.to_id) ?? []), e.from_id]);
  const byId = new Map(all.map((n) => [n.id, n]));

  // The latest stored record for each handle (as on the details panel).
  const byHandle = new Map<string, NonNullable<typeof sources>[number]>();
  for (const s of sources ?? []) if (!byHandle.has(s.handle)) byHandle.set(s.handle, s);

  const citations: Citation[] = [];
  const numberOf = new Map<string, number>();
  const cite = (handle: string): number | null => {
    const s = byHandle.get(handle);
    if (!s) return null;
    const known = numberOf.get(s.id);
    if (known) return known;
    const n = citations.length + 1;
    numberOf.set(s.id, n);
    citations.push({
      n,
      id: s.id,
      handle: s.handle,
      type: s.source_type as SourceKind,
      title: s.title,
      url: s.url,
      authors: s.authors ?? [],
      year: s.year,
      doi: s.doi,
      retrievedAt: s.retrieved_at,
    });
    return n;
  };

  const findingView = (f: (typeof all)[number]): ReportFinding => {
    const d = (f.data ?? {}) as { sources?: string[]; socialCount?: number };
    const nums = [...new Set((d.sources ?? []).map(cite).filter((n): n is number => n !== null))];
    return {
      id: f.id,
      text: f.title,
      citations: nums.sort((a, b) => a - b),
      aiInference: nums.length === 0,
      qualitative: d.socialCount ?? 0,
    };
  };

  const themes: ReportTheme[] = of("theme").map((t) => {
    const d = (t.data ?? {}) as { summary?: string; confidenceReason?: string };
    const findings = (from.get(t.id) ?? [])
      .map((id) => byId.get(id))
      .filter((n): n is (typeof all)[number] => n?.type === "finding")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(findingView);
    return {
      id: t.id,
      title: t.title,
      summary: d.summary ?? "",
      strength: (t.confidence as Level | null) ?? null,
      reason: d.confidenceReason ?? null,
      stale: t.stale,
      findings,
    };
  });
  const themeById = new Map(themes.map((t) => [t.id, t]));

  const opportunities: ReportOpportunity[] = of("opportunity").map((o) => {
    const d = (o.data ?? {}) as {
      summary?: string;
      principles?: string[];
      confidenceReason?: string;
    };
    const linked = (from.get(o.id) ?? [])
      .map((id) => themeById.get(id))
      .filter((t): t is ReportTheme => Boolean(t));
    const nums = [...new Set(linked.flatMap((t) => t.findings.flatMap((f) => f.citations)))];
    return {
      id: o.id,
      title: o.title,
      summary: d.summary ?? "",
      confidence: (o.confidence as Level | null) ?? null,
      reason: d.confidenceReason ?? null,
      principles: d.principles ?? [],
      themes: linked.map((t) => t.title),
      citations: nums.sort((a, b) => a - b),
      stale: o.stale,
    };
  });
  const oppTitle = new Map(opportunities.map((o) => [o.id, o.title]));

  const gapList: ReportGap[] = of("gap").map((g) => {
    const d = (g.data ?? {}) as { method?: string; kind?: string; opportunity?: string };
    const opp = d.opportunity ?? (from.get(g.id) ?? []).find((id) => oppTitle.has(id)) ?? "";
    return {
      id: g.id,
      question: g.title,
      method: d.method ?? "Desk research",
      kind: d.kind === "generative" ? "generative" : "discovery",
      opportunity: oppTitle.get(opp) ?? "",
    };
  });

  // Every source this project gathered, by kind, whether cited or not (AC15.1).
  const counts = new Map<SourceKind, Set<string>>();
  for (const s of byHandle.values()) {
    const k = s.source_type as SourceKind;
    counts.set(k, (counts.get(k) ?? new Set()).add(s.id));
  }
  const sourceGroups = SOURCE_ORDER.filter((k) => counts.get(k)?.size).map((type) => ({
    type,
    count: counts.get(type)!.size,
  }));

  const ethicsNode = of("ethics")[0];
  const ethicsData = (ethicsNode?.data ?? {}) as { reasons?: { rule: string; reason: string }[] };
  const findings = of("finding");
  const byConfidence: Record<Level, number> = { High: 0, Med: 0, Low: 0 };
  for (const o of opportunities) if (o.confidence) byConfidence[o.confidence]++;
  const reportNodes = [...findings, ...of("theme"), ...of("opportunity"), ...of("gap")];

  return {
    ready: themes.length > 0 || opportunities.length > 0,
    project: { id: project.id, name: project.name },
    toolkitVersion: one(project.pinned)?.number ?? null,
    hasStale: reportNodes.some((n) => n.stale),
    summary: {
      sources: sourceGroups.reduce((n, g) => n + g.count, 0),
      kinds: sourceGroups.length,
      findings: findings.length,
      themes: themes.length,
      opportunities: opportunities.length,
      byConfidence,
      gaps: gapList.length,
    },
    objectives: of("objective").map((o) => {
      const d = (o.data ?? {}) as { text?: string };
      return { id: o.id, label: o.title, text: d.text ?? "", lowSpecificity: o.low_specificity };
    }),
    sourceGroups,
    themes,
    opportunities,
    gaps: {
      total: gapList.length,
      discovery: gapList.filter((g) => g.kind === "discovery"),
      generative: gapList.filter((g) => g.kind === "generative"),
      methods: [...new Set(gapList.map((g) => g.method))],
    },
    ethics: ethicsNode
      ? {
          status: ethicsNode.status,
          reasons: ethicsData.reasons ?? [],
          overrides: (overrides ?? []).map((o) => {
            const by = one(o.by);
            return {
              rule: o.rule,
              reason: o.reason,
              by: by?.display_name || by?.email || "",
              at: o.created_at,
            };
          }),
        }
      : null,
    citations,
  };
}
