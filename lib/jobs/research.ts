import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError, type AiClient } from "@/lib/ai/client";
import { FakeAiClient } from "@/lib/ai/fake";
import {
  DEFAULT_MODEL_PRICES,
  DEFAULT_STAGE_MODELS,
  type ModelPrices,
  type StageModels,
} from "@/lib/ai/models";
import {
  findingsSchema,
  synthesisSchema,
  type FindingsOutput,
  type SynthesisOutput,
} from "@/lib/ai/schemas";
import { fakeSearchPapers } from "@/lib/retrieval/fake";
import { fakeWebSearch, type WebResult } from "@/lib/retrieval/fakeWeb";
import type { PaperResult } from "@/lib/retrieval/types";
import { checkCitations } from "@/lib/rules/citationCheck";
import { confidence, needsGap, type SourceType } from "@/lib/rules/confidence";
import type { Database, Json } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
type StepStatus = "waiting" | "running" | "done" | "failed";
type Step = { key: string; status: StepStatus; count?: number };

export const RUN_TIMEOUT_MS = 30 * 60 * 1000;
const RETRIEVAL_STEPS = [
  "toolkit",
  "client_data",
  "papers",
  "web",
  "competitors",
  "reviews",
] as const;

/** Groups on the Evidence card, in the order of AC22.9 (the toolkit isn't shown as a group). */
const GROUPS: { key: string; title: string; type: SourceType }[] = [
  { key: "client_data", title: "Client uploads", type: "upload" },
  { key: "papers", title: "Academic papers", type: "paper" },
  { key: "web", title: "Web and market", type: "desk" },
  { key: "competitors", title: "Competitors", type: "competitor" },
  { key: "reviews", title: "Reviews and forums", type: "social" },
];
const STEP_TYPE: Record<string, SourceType> = {
  toolkit: "toolkit",
  ...Object.fromEntries(GROUPS.map((g) => [g.key, g.type])),
};

export type GroupItem = { id: string; title: string; sub: string; url: string | null };
export type EvidenceGroup = {
  key: string;
  title: string;
  count: number;
  status: StepStatus;
  items: GroupItem[];
};

/** Where research gets its material. Fakes in tests and the prototype; real services when live. */
export type ResearchDeps = {
  ai: AiClient;
  papers: (query: string) => Promise<PaperResult[]>;
  web: (step: "web" | "competitors" | "reviews", query: string) => Promise<WebResult[]>;
  /** Waits between retries of a failing step (AC11.4: up to 2 retries). */
  backoffMs?: number[];
};

export function fakeResearchDeps(
  ai: AiClient = new FakeAiClient(async () => undefined),
): ResearchDeps {
  return {
    ai,
    papers: () => fakeSearchPapers(),
    web: (step) => fakeWebSearch(step),
    backoffMs: [0, 0],
  };
}

const domain = (url: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};

async function withRetries<T>(fn: () => Promise<T>, backoff: number[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= backoff.length) throw e;
      await new Promise((r) => setTimeout(r, backoff[attempt]));
    }
  }
}

/**
 * J2 research (AC11.1–AC11.7, AC12.1–AC12.9, AC13.1–AC13.4). Steps run in order; each checks for
 * cancellation and the 30-minute limit first (NFR8). A failing retrieval step is retried twice,
 * then marked failed while the others carry on (AC11.4). Findings are citation-checked; confidence
 * and gaps are computed in code. Runs with the service role, scoped to the run's project.
 */
export async function runResearch(
  db: Db,
  runId: string,
  opts: { stepDelayMs?: number; now?: () => number; deps?: ResearchDeps } = {},
): Promise<"succeeded" | "partial" | "cancelled" | "failed"> {
  const now = opts.now ?? Date.now;
  const deps = opts.deps ?? fakeResearchDeps();
  const backoff = deps.backoffMs ?? [1000, 3000];
  const { data: run } = await db.from("stage_runs").select("*").eq("id", runId).single();
  if (!run) throw new Error(`stage run ${runId} not found`);
  if (run.status === "cancelled") return "cancelled";
  const started = run.started_at ? new Date(run.started_at).getTime() : now();
  if (!run.started_at) {
    await db
      .from("stage_runs")
      .update({ status: "running", started_at: new Date(started).toISOString() })
      .eq("id", runId)
      .eq("status", "queued");
  }
  const projectId = run.project_id;
  const workspaceId = run.workspace_id;
  const steps = (run.steps as Step[]).map((s) => ({ ...s }));
  const runIds = run.retry_of ? [runId, run.retry_of] : [runId];
  const saveSteps = () =>
    db
      .from("stage_runs")
      .update({ steps: steps as unknown as NonNullable<Json> })
      .eq("id", runId);

  const finish = async (
    status: "succeeded" | "partial" | "cancelled" | "failed",
    errorCode: string | null = null,
  ) => {
    if (status !== "cancelled") {
      await db
        .from("stage_runs")
        .update({ status, error_code: errorCode, finished_at: new Date(now()).toISOString() })
        .eq("id", runId);
    }
    await db
      .from("projects")
      .update({ current_stage: "research", status: status === "failed" ? "failed" : "waiting" })
      .eq("id", projectId);
    return status;
  };
  const checkpoint = async () => {
    const { data: latest } = await db.from("stage_runs").select("status").eq("id", runId).single();
    if (latest?.status === "cancelled") return "cancelled" as const;
    if (now() - started > RUN_TIMEOUT_MS) return "timeout" as const;
    return null;
  };

  // Context: brief, workspace settings, pinned toolkit, objective cards.
  const [{ data: intake }, { data: project }, { data: ws }, { data: objectives }] =
    await Promise.all([
      db.from("intakes").select("*").eq("project_id", projectId).single(),
      db.from("projects").select("toolkit_version_id").eq("id", projectId).single(),
      db
        .from("workspaces")
        .select("stage_models, model_prices, agency_services")
        .eq("id", workspaceId)
        .single(),
      db
        .from("nodes")
        .select("id")
        .eq("project_id", projectId)
        .eq("type", "objective")
        .is("deleted_at", null),
    ]);
  const settings = {
    stageModels: { ...DEFAULT_STAGE_MODELS, ...((ws?.stage_models ?? {}) as Partial<StageModels>) },
    modelPrices: { ...DEFAULT_MODEL_PRICES, ...((ws?.model_prices ?? {}) as Partial<ModelPrices>) },
  };
  const services = ws?.agency_services ?? [];
  const brief = [
    intake?.business_objective,
    intake?.behavioural_objective,
    intake?.audience_context,
  ]
    .filter(Boolean)
    .join(". ");

  // One Evidence card for research; a re-run reuses it.
  const groups: EvidenceGroup[] = GROUPS.map((g) => ({
    key: g.key,
    title: g.title,
    count: 0,
    status: "waiting",
    items: [],
  }));
  const { data: existingCard } = await db
    .from("nodes")
    .select("id, data")
    .eq("project_id", projectId)
    .eq("type", "source")
    .eq("stage", "research")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  let cardId = existingCard?.id ?? null;
  const cardData = () => ({ groups, total: groups.reduce((n, g) => n + g.count, 0) });
  if (cardId) {
    await db
      .from("nodes")
      .update({ data: cardData(), stage_run_id: runId, stale: false })
      .eq("id", cardId);
  } else {
    const { data: card } = await db
      .from("nodes")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        type: "source",
        stage: "research",
        title: "Research sources",
        data: cardData(),
        provenance: "ai",
        stage_run_id: runId,
        created_by: run.started_by,
      })
      .select("id")
      .single();
    cardId = card?.id ?? null;
    if (cardId && objectives?.length) {
      await db.from("edges").insert(
        objectives.map((o) => ({
          workspace_id: workspaceId,
          project_id: projectId,
          from_id: o.id,
          to_id: cardId!,
        })),
      );
    }
  }
  const saveCard = () =>
    cardId ? db.from("nodes").update({ data: cardData() }).eq("id", cardId) : Promise.resolve();

  // Sources already stored by an earlier run this one continues (Retry failed steps / synthesis).
  const { data: earlier } = await db
    .from("sources")
    .select("id, handle, source_type, title, url, authors, year, meta, stage_run_id")
    .in("stage_run_id", runIds)
    .order("created_at");
  let handleNo = (earlier ?? []).filter(
    (s) => s.stage_run_id === runId && s.handle.startsWith("S"),
  ).length;
  const addItems = (
    key: string,
    rows: { id: string; title: string; url: string | null; sub: string }[],
  ) => {
    const g = groups.find((x) => x.key === key);
    if (!g) return;
    g.items.push(...rows.map((r) => ({ id: r.id, title: r.title, sub: r.sub, url: r.url })));
    g.count = g.items.length;
  };
  for (const s of earlier ?? []) {
    const key = Object.entries(STEP_TYPE).find(([, t]) => t === s.source_type)?.[0];
    if (key && key !== "toolkit")
      addItems(key, [
        { id: s.id, title: s.title, url: s.url, sub: (s.meta as { sub?: string })?.sub ?? "" },
      ]);
  }
  for (const g of groups) {
    const st = steps.find((s) => s.key === g.key);
    if (st?.status === "done") g.status = "done";
  }

  const insertSources = async (
    key: string,
    rows: Omit<
      Database["public"]["Tables"]["sources"]["Insert"],
      "workspace_id" | "project_id" | "stage_run_id" | "handle"
    >[],
  ) => {
    if (!rows.length) return [];
    const prefix = key === "toolkit" ? "T" : "S";
    const toolkitNo = (earlier ?? []).filter(
      (s) => s.stage_run_id === runId && s.handle.startsWith("T"),
    ).length;
    const payload = rows.map((r, i) => ({
      ...r,
      workspace_id: workspaceId,
      project_id: projectId,
      stage_run_id: runId,
      handle: prefix === "T" ? `T${toolkitNo + i + 1}` : `S${++handleNo}`,
    }));
    const { data, error } = await db.from("sources").insert(payload).select("id, title, url, meta");
    if (error) throw new Error(error.message);
    return data ?? [];
  };

  const principleKeys: string[] = [];

  // ---- Retrieval steps (AC12.1). ----
  for (const step of steps) {
    if (
      !RETRIEVAL_STEPS.includes(step.key as (typeof RETRIEVAL_STEPS)[number]) ||
      step.status === "done"
    )
      continue;
    const stop = await checkpoint();
    if (stop === "cancelled") return finish("cancelled");
    if (stop === "timeout") return finish("failed", "timeout");
    step.status = "running";
    const group = groups.find((g) => g.key === step.key);
    if (group) group.status = "running";
    await saveSteps();
    await saveCard();
    if (opts.stepDelayMs) await new Promise((r) => setTimeout(r, opts.stepDelayMs));

    try {
      let stored: { id: string; title: string; url: string | null; meta: unknown }[] = [];
      if (step.key === "toolkit") {
        // Candidate principles via the goal hierarchy: principles whose goal, sub-goal or name share words with the brief.
        const { data: principles } = await db
          .from("principles")
          .select("principle_key, name, general_goal, sub_goal, mechanism, evidence_level")
          .eq("version_id", project?.toolkit_version_id ?? "")
          .limit(500);
        const words = new Set(brief.toLowerCase().match(/[a-z]{4,}/g) ?? []);
        const scored = (principles ?? [])
          .map((p) => ({
            p,
            score: `${p.general_goal} ${p.sub_goal} ${p.name} ${p.mechanism}`
              .toLowerCase()
              .split(/\W+/)
              .filter((w) => words.has(w)).length,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((x) => x.p);
        principleKeys.push(...scored.map((p) => p.principle_key));
        stored = await insertSources(
          "toolkit",
          scored.map((p) => ({
            source_type: "toolkit",
            title: `${p.principle_key} ${p.name}`,
            external_id: p.principle_key,
            meta: { goal: p.general_goal, subGoal: p.sub_goal },
          })),
        );
      } else if (step.key === "client_data") {
        const { data: uploads } = await db
          .from("uploads")
          .select("id, file_name, mime, size_bytes, storage_path")
          .eq("project_id", projectId)
          .eq("kind", "client_data");
        const rows = [];
        for (const u of uploads ?? []) {
          const ext = u.file_name.split(".").pop()?.toUpperCase() ?? "File";
          let excerpt: string | null = null;
          let sub = ext === "XLSX" ? "Spreadsheet" : ext;
          if (ext === "CSV" || ext === "TXT") {
            const file = await db.storage.from("uploads").download(u.storage_path);
            const text = file.data ? await file.data.text() : "";
            excerpt = text.slice(0, 3000) || null;
            if (ext === "CSV")
              sub = `CSV, ${Math.max(0, text.split(/\r?\n/).filter(Boolean).length - 1).toLocaleString("en-GB")} rows`;
          }
          rows.push({
            source_type: "upload",
            title: u.file_name,
            upload_id: u.id,
            excerpt,
            meta: { sub },
          });
        }
        stored = await insertSources("client_data", rows);
      } else if (step.key === "papers") {
        const papers = await withRetries(() => deps.papers(brief || "behaviour change"), backoff);
        stored = await insertSources(
          "papers",
          papers.map((p) => ({
            source_type: "paper",
            title: p.title,
            url: p.url,
            authors: p.authors,
            year: p.year,
            doi: p.doi,
            external_id: p.externalId,
            excerpt: p.excerpt,
            meta: {
              sub: [p.authors.slice(0, 3).join(", "), p.year].filter(Boolean).join(", "),
              hasAbstract: p.hasAbstract,
            },
          })),
        );
      } else {
        const kind = step.key as "web" | "competitors" | "reviews";
        const results = await withRetries(() => deps.web(kind, brief), backoff);
        stored = await insertSources(
          kind,
          results.map((r) => ({
            source_type: STEP_TYPE[kind]!,
            title: r.title,
            url: r.url,
            excerpt: r.excerpt,
            meta: { sub: domain(r.url) },
          })),
        );
      }
      if (step.key !== "toolkit")
        addItems(
          step.key,
          stored.map((s) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            sub: (s.meta as { sub?: string })?.sub ?? "",
          })),
        );
      step.status = "done";
      step.count = step.key === "toolkit" ? stored.length : (group?.count ?? stored.length);
      if (group) group.status = "done";
    } catch {
      step.status = "failed";
      if (group) group.status = "failed";
    }
    await saveSteps();
    await saveCard();
  }

  // Everything this run can cite.
  const { data: allSources } = await db
    .from("sources")
    .select("id, handle, source_type, title, excerpt, meta")
    .in("stage_run_id", runIds);
  const usable = (allSources ?? []).filter(
    (s) => (s.meta as { hasAbstract?: boolean })?.hasAbstract !== false,
  );
  if (!principleKeys.length) {
    principleKeys.push(
      ...(allSources ?? [])
        .filter((s) => s.source_type === "toolkit")
        .map((s) => s.title.split(" ")[0]!),
    );
  }

  // ---- Findings (AC12.2, AC12.3). ----
  const findStep = steps.find((s) => s.key === "findings");
  let findingNodes: {
    id: string;
    text: string;
    handles: string[];
    aiInference: boolean;
    stance: string;
  }[] = [];
  if (findStep && findStep.status !== "done") {
    const stop = await checkpoint();
    if (stop === "cancelled") return finish("cancelled");
    if (stop === "timeout") return finish("failed", "timeout");
    findStep.status = "running";
    await saveSteps();
    let out: FindingsOutput;
    try {
      out = await deps.ai.generate({
        workspaceId,
        projectId,
        stage: "research",
        step: "findings",
        system:
          "Extract findings from the sources. Each finding cites the handles (like S3) of the sources it rests on. If a finding rests on no source, mark aiInference true. Never cite anything not listed.",
        prompt: `Brief: ${brief}\n\nSources:\n${usable.map((s) => `${s.handle} [${s.source_type}] ${s.title}: ${s.excerpt ?? ""}`).join("\n")}`,
        schema: findingsSchema,
        settings,
        input: { sources: usable.map((s) => ({ handle: s.handle, type: s.source_type })) },
        maxTokens: 8000,
      });
    } catch (e) {
      findStep.status = "failed";
      await saveSteps();
      return finish("failed", e instanceof AiError ? `findings_${e.code}` : "findings");
    }
    const checked = checkCitations(
      out.findings,
      usable.map((s) => s.handle),
    );
    if (checked.rejectedHandles.length) {
      await db.from("events").insert({
        workspace_id: workspaceId,
        member_id: run.started_by,
        name: "citation_rejected",
        props: { stage: "research", count: checked.rejectedHandles.length },
      });
    }
    // A re-run replaces earlier AI-made findings, themes, opportunities and gaps; people's cards stay.
    await db
      .from("nodes")
      .update({ deleted_at: new Date(now()).toISOString() })
      .eq("project_id", projectId)
      .in("type", ["finding", "theme", "opportunity", "gap"])
      .eq("provenance", "ai")
      .is("deleted_at", null);
    const stanceOf = new Map(out.findings.map((f) => [f.text, f.stance]));
    const byHandle = new Map((allSources ?? []).map((s) => [s.handle, s]));
    for (const [i, f] of checked.kept.entries()) {
      const types = [
        ...new Set(f.sourceHandles.map((h) => byHandle.get(h)?.source_type ?? "")),
      ].filter(Boolean);
      const social = f.sourceHandles.filter(
        (h) => byHandle.get(h)?.source_type === "social",
      ).length;
      const { data: node } = await db
        .from("nodes")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          type: "finding",
          stage: "research",
          title: f.text,
          data: {
            sources: f.sourceHandles,
            sourceTypes: types,
            aiInference: f.aiInference,
            stance: stanceOf.get(f.text) ?? "neutral",
            socialCount: social,
          },
          provenance: "ai",
          stage_run_id: runId,
          sort_order: 10 + i,
          model: settings.stageModels.research.model,
          created_by: run.started_by,
        })
        .select("id")
        .single();
      if (node) {
        findingNodes.push({
          id: node.id,
          text: f.text,
          handles: f.sourceHandles,
          aiInference: f.aiInference,
          stance: stanceOf.get(f.text) ?? "neutral",
        });
        if (cardId && f.sourceHandles.length) {
          await db.from("edges").insert({
            workspace_id: workspaceId,
            project_id: projectId,
            from_id: cardId,
            to_id: node.id,
          });
        }
      }
    }
    findStep.status = "done";
    findStep.count = findingNodes.length;
    await saveSteps();
  } else {
    const { data: existing } = await db
      .from("nodes")
      .select("id, title, data")
      .eq("project_id", projectId)
      .eq("type", "finding")
      .is("deleted_at", null)
      .order("sort_order");
    findingNodes = (existing ?? []).map((n) => {
      const d = n.data as { sources?: string[]; aiInference?: boolean; stance?: string };
      return {
        id: n.id,
        text: n.title,
        handles: d.sources ?? [],
        aiInference: Boolean(d.aiInference),
        stance: d.stance ?? "neutral",
      };
    });
  }

  // ---- Themes, opportunities, gaps, external principles (AC12.5, AC12.6, AC12.9, AC13.x). ----
  const synthStep = steps.find((s) => s.key === "synthesis");
  if (synthStep && synthStep.status !== "done") {
    const stop = await checkpoint();
    if (stop === "cancelled") return finish("cancelled");
    if (stop === "timeout") return finish("failed", "timeout");
    synthStep.status = "running";
    await saveSteps();
    let out: SynthesisOutput;
    const paperHandle = (allSources ?? []).find((s) => s.source_type === "paper")?.handle ?? null;
    try {
      out = await deps.ai.generate({
        workspaceId,
        projectId,
        stage: "research",
        step: "synthesis",
        system:
          "Group the findings into themes (by index), then up to 8 opportunities (by theme index), each with candidate principles chosen only from the listed toolkit keys. For opportunities with weak or conflicting evidence, give the open question and a method from the listed services or 'Desk research'. List principles from sources that aren't in the toolkit as external principles.",
        prompt: `Brief: ${brief}\n\nFindings:\n${findingNodes.map((f, i) => `${i}. ${f.text} [${f.handles.join(", ") || "AI inference"}]`).join("\n")}\n\nToolkit keys: ${principleKeys.join(", ")}\nServices: ${services.join(", ")}`,
        schema: synthesisSchema,
        settings,
        input: {
          findings: findingNodes.map((f) => ({ text: f.text })),
          principleKeys,
          services,
          externalHandle: paperHandle,
        },
        maxTokens: 12000,
      });
    } catch (e) {
      // AC11.6: findings and sources are kept; Retry synthesis re-runs only this step.
      synthStep.status = "failed";
      await saveSteps();
      return finish("failed", e instanceof AiError ? `synthesis_${e.code}` : "synthesis");
    }

    const valid = new Set(principleKeys);
    const allowedMethods = new Set([...services, "Desk research"]);
    const typeOf = new Map((allSources ?? []).map((s) => [s.handle, s.source_type as SourceType]));
    const idOf = new Map((allSources ?? []).map((s) => [s.handle, s.id]));

    const themeIds: string[] = [];
    for (const [i, t] of out.themes.entries()) {
      const linked = t.findings
        .map((f) => findingNodes[f])
        .filter((f): f is (typeof findingNodes)[number] => Boolean(f));
      if (!linked.length) {
        themeIds.push("");
        continue;
      }
      const { data: node } = await db
        .from("nodes")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          type: "theme",
          stage: "research",
          title: t.title,
          data: { summary: t.summary },
          provenance: "ai",
          stage_run_id: runId,
          sort_order: i,
          model: settings.stageModels.research.model,
          created_by: run.started_by,
        })
        .select("id")
        .single();
      themeIds.push(node?.id ?? "");
      if (node) {
        await db.from("edges").insert(
          linked.map((f) => ({
            workspace_id: workspaceId,
            project_id: projectId,
            from_id: f.id,
            to_id: node.id,
          })),
        );
      }
    }

    for (const [i, o] of out.opportunities.slice(0, 8).entries()) {
      const themes = o.themes.map((t) => ({ idx: t, id: themeIds[t] })).filter((t) => t.id);
      if (!themes.length) continue;
      const findingsBehind = out.themes
        .filter((_, ti) => o.themes.includes(ti))
        .flatMap((t) => t.findings.map((f) => findingNodes[f]))
        .filter((f): f is (typeof findingNodes)[number] => Boolean(f));
      const handles = [...new Set(findingsBehind.flatMap((f) => f.handles))];
      const evidence = {
        sources: handles.map((h) => ({ id: idOf.get(h) ?? h, type: typeOf.get(h) ?? "desk" })),
        aiInference: findingsBehind.some((f) => f.aiInference),
        contradicts: o.contradicts || findingsBehind.some((f) => f.stance === "contradicts"),
      };
      const conf = confidence(evidence);
      const principles = o.principleKeys.filter((k) => valid.has(k)); // unknown principles are dropped
      const { data: node } = await db
        .from("nodes")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          type: "opportunity",
          stage: "research",
          title: o.title,
          data: {
            summary: o.summary,
            principles,
            confidenceReason: conf.reason,
            sourceCount: handles.length,
          },
          confidence: conf.level,
          provenance: "ai",
          stage_run_id: runId,
          sort_order: i,
          model: settings.stageModels.research.model,
          created_by: run.started_by,
        })
        .select("id")
        .single();
      if (!node) continue;
      await db.from("edges").insert(
        themes.map((t) => ({
          workspace_id: workspaceId,
          project_id: projectId,
          from_id: t.id!,
          to_id: node.id,
        })),
      );
      if (needsGap(evidence)) {
        const method =
          o.gapMethod && allowedMethods.has(o.gapMethod) ? o.gapMethod : "Desk research";
        const { data: gap } = await db
          .from("nodes")
          .insert({
            workspace_id: workspaceId,
            project_id: projectId,
            type: "gap",
            stage: "research",
            title: o.gapQuestion ?? `What would confirm "${o.title}"?`,
            data: { method, opportunity: node.id },
            provenance: "ai",
            stage_run_id: runId,
            sort_order: 100 + i,
            created_by: run.started_by,
          })
          .select("id")
          .single();
        if (gap)
          await db.from("edges").insert({
            workspace_id: workspaceId,
            project_id: projectId,
            from_id: node.id,
            to_id: gap.id,
          });
      }
    }

    // AC12.9: principles from research that aren't in the toolkit go to the candidates list.
    for (const ext of out.externalPrinciples) {
      const sourceId = idOf.get(ext.sourceHandle);
      if (!sourceId || valid.has(ext.name)) continue;
      await db.from("toolkit_candidates").insert({
        workspace_id: workspaceId,
        project_id: projectId,
        name: ext.name,
        mechanism: ext.mechanism,
        source_id: sourceId,
      });
    }
    synthStep.status = "done";
    synthStep.count = out.opportunities.length;
    await saveSteps();
  }

  const anyFailed = steps.some((s) => s.status === "failed");
  return finish(anyFailed ? "partial" : "succeeded");
}
