import "server-only";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { startEmailAudit } from "@/lib/jobs/run";
import { currentMember } from "@/lib/projects/service";
import { adminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type AuditFinding = {
  id: string;
  part: "subject" | "preheader" | "hero" | "body" | "ctas" | "footer";
  lens: "structure" | "content" | "visual";
  verdict: "friction" | "working";
  principleKey: string | null;
  principleName: string | null;
  extra: boolean;
  outsideToolkit: boolean;
  strength: "High" | "Med" | "Low" | null;
  proofKind: "quote" | "image" | "measured";
  proofText: string;
  explanation: string;
};

export type EmailAuditView = {
  status: "running" | "done" | "failed";
  errorCode: string | null;
  shortlist: { key: string; name: string; extra: boolean }[];
  droppedCount: number;
  usedImage: boolean;
  usedMeasured: boolean;
  finishedAt: string | null;
  findings: AuditFinding[];
};

/** The latest quick audit of an email, read as the signed-in member (RLS applies). */
export async function getEmailAudit(
  client: Client,
  emailId: string,
): Promise<EmailAuditView | null> {
  const { data: audit } = await client
    .from("email_audits")
    .select("id, status, error_code, shortlist, dropped, used_image, used_measured, finished_at")
    .eq("email_id", emailId)
    .eq("depth", "quick")
    .maybeSingle();
  if (!audit) return null;
  const { data: rows } = await client
    .from("email_findings")
    .select("*")
    .eq("audit_id", audit.id)
    .order("position");
  return {
    status: audit.status as EmailAuditView["status"],
    errorCode: audit.error_code,
    shortlist: (audit.shortlist ?? []) as EmailAuditView["shortlist"],
    droppedCount: Array.isArray(audit.dropped) ? audit.dropped.length : 0,
    usedImage: audit.used_image,
    usedMeasured: audit.used_measured,
    finishedAt: audit.finished_at,
    findings: (rows ?? []).map((r) => ({
      id: r.id,
      part: r.part as AuditFinding["part"],
      lens: r.lens as AuditFinding["lens"],
      verdict: r.verdict as AuditFinding["verdict"],
      principleKey: r.principle_key,
      principleName: r.principle_name,
      extra: r.extra,
      outsideToolkit: r.outside_toolkit,
      strength: r.strength as AuditFinding["strength"],
      proofKind: r.proof_kind as AuditFinding["proofKind"],
      proofText: r.proof_text,
      explanation: r.explanation,
    })),
  };
}

/**
 * Starts the quick audit of one email (AC31.6, AC31.9: an email added later is audited alone).
 * The audit row is marked running straight away so the screen shows it at once; the job then runs
 * in the background.
 */
export async function startQuickAudit(
  client: Client,
  emailId: string,
  /** Replaceable in tests: how the background job is started. */
  launch: (emailId: string, startedBy: string | null) => void = startEmailAudit,
): Promise<ActionResult<{ started: true }>> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  // Members can only see emails in their own workspace.
  const { data: email } = await client
    .from("emails")
    .select("id, workspace_id, project_id")
    .eq("id", emailId)
    .maybeSingle();
  if (!email) return fail("not_found");
  const db = adminClient();
  const { data: current } = await db
    .from("email_audits")
    .select("id, status, updated_at")
    .eq("email_id", emailId)
    .eq("depth", "quick")
    .maybeSingle();
  // Already running (and not stuck for more than 10 minutes): don't start a second one.
  if (
    current?.status === "running" &&
    Date.now() - new Date(current.updated_at).getTime() < 10 * 60 * 1000
  )
    return ok({ started: true });
  const patch = {
    status: "running",
    error_code: null,
    started_by: me.id,
    finished_at: null,
  };
  if (current) await db.from("email_audits").update(patch).eq("id", current.id);
  else
    await db.from("email_audits").insert({
      ...patch,
      workspace_id: email.workspace_id,
      project_id: email.project_id,
      email_id: email.id,
      depth: "quick",
    });
  launch(emailId, me.id);
  return ok({ started: true });
}
