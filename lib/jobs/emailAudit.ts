import type { SupabaseClient } from "@supabase/supabase-js";
import { measuredFindings } from "@/lib/audit/measuredFindings";
import { emailText, normalise, quoteFound } from "@/lib/audit/quoteCheck";
import { shortlist, type ShortlistPrinciple } from "@/lib/audit/shortlist";
import { principleStrength } from "@/lib/audit/strength";
import { AiError, type AiClient } from "@/lib/ai/client";
import {
  DEFAULT_MODEL_PRICES,
  DEFAULT_STAGE_MODELS,
  type ModelPrices,
  type StageModels,
} from "@/lib/ai/models";
import { EMAIL_PARTS, emailAuditSchema } from "@/lib/ai/schemas";
import type { Measured } from "@/lib/email/measure";
import { splitEmail } from "@/lib/email/parts";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/** AC31.6: a few principles outside the shortlist are allowed, marked as such. */
export const MAX_EXTRA_PRINCIPLES = 3;
/** The model can't take pictures taller than this; the visual lens then has nothing to read. */
const MAX_IMAGE_HEIGHT = 7900;

export type DroppedFinding = {
  reason:
    | "quote_rejected"
    | "unknown_principle"
    | "too_many_extras"
    | "image_not_available"
    | "bad_proof";
  part: string;
  text: string;
  principleKey?: string | null;
};

const SYSTEM = `You audit one marketing email for a behavioural design agency, using only the toolkit principles you are given.
Look at it through three lenses: structure (order, length, where things sit), content (the words) and visual (colours, images, layout).
Work through six parts: subject, preheader, hero, body, ctas, footer.
For each finding give: the part, the lens, a verdict (friction = it gets in the way of the behavioural objective; working = it helps), one principle key from the list, and proof.
Proof is a quote copied exactly from the email's words (kind "quote"), or for the visual lens only, the name of a part you can see in the picture (kind "image"). Never invent or paraphrase a quote.
If a real problem fits no principle (a broken link, an accessibility failure), use principleKey null.
You may use at most a few principles that are not on the list; prefer the list.
Be specific and brief. Report what is working as well as what is not. Do not score impact.`;

type Settings = { stageModels: StageModels; modelPrices: ModelPrices };

/** Loads the toolkit the project uses: the version it pinned, else the workspace's latest. */
async function loadPrinciples(db: Db, workspaceId: string, pinned: string | null) {
  let versionId = pinned;
  if (!versionId) {
    const { data: v } = await db
      .from("toolkit_versions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();
    versionId = v?.id ?? null;
  }
  if (!versionId) return [];
  const { data } = await db
    .from("principles")
    .select(
      "id, principle_key, name, general_goal, sub_goal, mechanism, quick_insight, extended_explanation, examples, design_lever, outcome, evidence_level, link_to_paper",
    )
    .eq("version_id", versionId);
  return (data ?? []).map((p) => ({
    id: p.id,
    principleKey: p.principle_key,
    name: p.name,
    generalGoal: p.general_goal,
    subGoal: p.sub_goal,
    mechanism: p.mechanism,
    quickInsight: p.quick_insight,
    extendedExplanation: p.extended_explanation,
    examples: p.examples,
    designLever: p.design_lever,
    outcome: p.outcome,
    evidenceLevel: p.evidence_level,
    linkToPaper: p.link_to_paper,
  }));
}

/** The picture and measured facts from the latest render of this email, if there is one. */
async function loadRender(db: Db, emailId: string, imagesLoaded: boolean) {
  const { data: rows } = await db
    .from("email_renders")
    .select("images, storage_path, height, measured")
    .eq("email_id", emailId);
  const row = rows?.find((r) => r.images === imagesLoaded) ?? rows?.[0];
  if (!row) return { measured: null as Measured | null, image: null };
  let image: { mediaType: "image/png"; base64: string } | null = null;
  if (row.height <= MAX_IMAGE_HEIGHT) {
    const file = await db.storage.from("uploads").download(row.storage_path);
    if (file.data)
      image = {
        mediaType: "image/png",
        base64: Buffer.from(await file.data.arrayBuffer()).toString("base64"),
      };
  }
  return { measured: row.measured as unknown as Measured, image };
}

const brief = (i: Database["public"]["Tables"]["intakes"]["Row"] | null) =>
  [
    `Business objective: ${i?.business_objective ?? ""}`,
    `Behavioural objective: ${i?.behavioural_objective ?? ""}`,
    `Audience and context: ${i?.audience_context ?? ""}`,
    `Sector: ${i?.sector === "Other" ? (i?.sector_other ?? "Other") : (i?.sector ?? "")}`,
  ].join("\n");

const describePrinciple = (p: ShortlistPrinciple) =>
  [
    `- ${p.principleKey}: ${p.name} (${p.generalGoal} / ${p.subGoal}). ${p.mechanism}`,
    p.quickInsight ? `  Insight: ${p.quickInsight.slice(0, 300)}` : "",
    p.designLever ? `  Lever: ${p.designLever.slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

/**
 * J8 emailAudit (AC31.6–AC31.8, 04 D39, D46): audits one email against about 20 toolkit principles.
 * Runs with the service role (`db`); every query is scoped to this email's project. Code, not the
 * model, checks every quote, the principle keys and the evidence strength, and adds the measured
 * findings. Running it again replaces the earlier findings for this email.
 */
export async function runEmailAudit(
  db: Db,
  ai: AiClient,
  opts: { emailId: string; startedBy?: string | null },
): Promise<{ status: "done" | "failed"; findings: number; dropped: number }> {
  const { data: email } = await db.from("emails").select("*").eq("id", opts.emailId).single();
  if (!email) throw new Error(`email ${opts.emailId} not found`);
  const now = () => new Date().toISOString();

  // One audit row per email and depth; reuse it, and clear what it found before.
  const { data: existing } = await db
    .from("email_audits")
    .select("id")
    .eq("email_id", email.id)
    .eq("depth", "quick")
    .maybeSingle();
  const base = {
    workspace_id: email.workspace_id,
    project_id: email.project_id,
    email_id: email.id,
    depth: "quick",
    status: "running",
    shortlist: [],
    dropped: [],
    used_image: false,
    used_measured: false,
    error_code: null,
    started_by: opts.startedBy ?? null,
    finished_at: null,
  };
  let auditId = existing?.id;
  if (auditId) {
    await db.from("email_findings").delete().eq("audit_id", auditId);
    await db.from("email_audits").update(base).eq("id", auditId);
  } else {
    const { data: created, error } = await db
      .from("email_audits")
      .insert(base)
      .select("id")
      .single();
    if (error || !created) throw new Error(`could not start audit: ${error?.message}`);
    auditId = created.id;
  }
  const finish = async (patch: Database["public"]["Tables"]["email_audits"]["Update"]) =>
    db
      .from("email_audits")
      .update({ ...patch, finished_at: now() })
      .eq("id", auditId!);
  const fail = async (code: string) => {
    await finish({ status: "failed", error_code: code });
    return { status: "failed" as const, findings: 0, dropped: 0 };
  };

  const [{ data: project }, { data: intake }, { data: ws }] = await Promise.all([
    db.from("projects").select("toolkit_version_id").eq("id", email.project_id).single(),
    db.from("intakes").select("*").eq("project_id", email.project_id).maybeSingle(),
    db
      .from("workspaces")
      .select("stage_models, model_prices")
      .eq("id", email.workspace_id)
      .single(),
  ]);
  const principles = await loadPrinciples(
    db,
    email.workspace_id,
    project?.toolkit_version_id ?? null,
  );
  if (!principles.length) return fail("no_toolkit");

  const parts = splitEmail(email.html, email.subject);
  const render = await loadRender(db, email.id, email.images_loaded);
  const chosen = shortlist(principles, {
    behaviouralObjective: intake?.behavioural_objective ?? "",
    businessObjective: intake?.business_objective ?? "",
    audience: intake?.audience_context ?? "",
    sector: intake?.sector === "Other" ? (intake?.sector_other ?? "") : (intake?.sector ?? ""),
    emailHints: [
      "subject line",
      parts.ctas.length ? "button call to action" : "",
      parts.preheader ? "preheader" : "",
      parts.footer.hasUnsubscribe ? "unsubscribe" : "",
    ],
  });
  const byKey = new Map(principles.map((p) => [p.principleKey, p]));
  const onList = new Set(chosen.map((p) => p.principleKey));

  const settings: Settings = {
    stageModels: { ...DEFAULT_STAGE_MODELS, ...((ws?.stage_models ?? {}) as Partial<StageModels>) },
    modelPrices: { ...DEFAULT_MODEL_PRICES, ...((ws?.model_prices ?? {}) as Partial<ModelPrices>) },
  };
  const prompt = [
    brief(intake),
    "",
    "Toolkit principles to audit against:",
    chosen.map(describePrinciple).join("\n"),
    "",
    `Subject line: ${email.subject}`,
    `Preheader: ${parts.preheader ?? "(none)"}`,
    `Hero: ${parts.hero.text}`,
    `Body: ${parts.body.text.slice(0, 6000)}`,
    `Calls to action: ${parts.ctas.map((c) => `${c.text} (${c.kind})`).join("; ") || "(none)"}`,
    `Footer: ${parts.footer.text.slice(0, 800)}${parts.footer.hasUnsubscribe ? "" : " (no unsubscribe link)"}`,
    render.image
      ? "A phone-width picture of the email is attached: use it for the visual lens."
      : "No picture is attached, so give no visual findings that rest on the image.",
  ].join("\n");

  let out;
  try {
    out = await ai.generate({
      workspaceId: email.workspace_id,
      projectId: email.project_id,
      stage: "research",
      step: "email_audit",
      system: SYSTEM,
      prompt,
      schema: emailAuditSchema,
      settings,
      images: render.image ? [render.image] : undefined,
      input: {
        subject: email.subject,
        ctas: parts.ctas.map((c) => c.text),
        links: parts.links.map((l) => l.text),
        bodyStart: parts.body.text.split(/\s+/).slice(0, 8).join(" "),
        shortlist: chosen.map((p) => p.principleKey),
        hasImage: Boolean(render.image),
      },
    });
  } catch (e) {
    return fail(e instanceof AiError ? e.code : "crashed");
  }

  // Code checks everything the model said (AC31.7).
  const haystack = `${emailText(email)} ${normalise(parts.text)}`;
  const dropped: DroppedFinding[] = [];
  const extras = new Set<string>();
  const kept: Database["public"]["Tables"]["email_findings"]["Insert"][] = [];
  const partOrder = (part: string) => EMAIL_PARTS.indexOf(part as (typeof EMAIL_PARTS)[number]);
  const common = {
    workspace_id: email.workspace_id,
    project_id: email.project_id,
    email_id: email.id,
    audit_id: auditId!,
  };
  for (const f of out.findings) {
    const drop = (reason: DroppedFinding["reason"]) =>
      dropped.push({ reason, part: f.part, text: f.proof.text, principleKey: f.principleKey });
    if (f.proof.kind === "quote" && !quoteFound(f.proof.text, haystack)) {
      drop("quote_rejected");
      continue;
    }
    if (f.proof.kind === "image" && (f.lens !== "visual" || !render.image)) {
      drop(render.image ? "bad_proof" : "image_not_available");
      continue;
    }
    let principle = f.principleKey ? byKey.get(f.principleKey) : undefined;
    let extra = false;
    if (f.principleKey && !principle) {
      drop("unknown_principle");
      continue;
    }
    if (principle && !onList.has(principle.principleKey)) {
      if (!extras.has(principle.principleKey) && extras.size >= MAX_EXTRA_PRINCIPLES) {
        drop("too_many_extras");
        continue;
      }
      extras.add(principle.principleKey);
      extra = true;
    }
    if (!f.principleKey) principle = undefined;
    kept.push({
      ...common,
      part: f.part,
      lens: f.lens,
      verdict: f.verdict,
      principle_key: principle?.principleKey ?? null,
      principle_name: principle?.name ?? null,
      extra,
      outside_toolkit: !principle,
      strength: principle
        ? principleStrength({
            evidenceLevel: principle.evidenceLevel,
            linkToPaper: principle.linkToPaper,
          })
        : null,
      proof_kind: f.proof.kind,
      proof_text: f.proof.text,
      explanation: f.explanation,
    });
  }
  // Toolkit findings first (by part), then the measured facts and other problems outside the toolkit.
  kept.sort(
    (a, b) =>
      Number(a.outside_toolkit) - Number(b.outside_toolkit) ||
      partOrder(a.part) - partOrder(b.part),
  );
  if (render.measured) {
    for (const m of measuredFindings(render.measured))
      kept.push({
        ...common,
        part: m.part,
        lens: m.lens,
        verdict: m.verdict,
        principle_key: null,
        principle_name: null,
        extra: false,
        outside_toolkit: true,
        strength: null,
        proof_kind: "measured",
        proof_text: m.proofText,
        explanation: m.explanation,
      });
  }
  if (kept.length) {
    const { error } = await db
      .from("email_findings")
      .insert(kept.map((k, i) => ({ ...k, position: i })));
    if (error) return fail("crashed");
  }
  await finish({
    status: "done",
    shortlist: [
      ...chosen.map((p) => ({ key: p.principleKey, name: p.name, extra: false })),
      ...[...extras].map((k) => ({ key: k, name: byKey.get(k)!.name, extra: true })),
    ],
    dropped:
      dropped as unknown as Database["public"]["Tables"]["email_audits"]["Update"]["dropped"],
    used_image: Boolean(render.image),
    used_measured: Boolean(render.measured),
  });
  return { status: "done", findings: kept.length, dropped: dropped.length };
}
