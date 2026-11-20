import { notFound } from "next/navigation";
import { BriefScreen } from "@/components/intake/BriefScreen";
import type { BriefData } from "@/components/intake/BriefPage";
import type { EthicsView } from "@/components/intake/EthicsPanel";
import { INTAKE_FIELDS, type IntakeField } from "@/lib/schemas/intake";
import { createClient } from "@/lib/supabase/server";
import { listEmails } from "@/lib/email/service";
import { listUploads } from "@/lib/uploads/service";

export const metadata = { title: "Brief" };

const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** SCR6 Brief. */
export default async function Page({ params }: PageProps<"/projects/[id]/brief">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: intake }, uploads, { data: run }, { data: nodes }, emails] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, mode, channel, status")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("intakes")
        .select("*, approver:members!intakes_approved_by_members_id_fk(display_name, email)")
        .eq("project_id", id)
        .maybeSingle(),
      listUploads(supabase, id),
      supabase
        .from("stage_runs")
        .select("status")
        .eq("project_id", id)
        .eq("stage", "ethics")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("nodes")
        .select("id, type, status, data")
        .eq("project_id", id)
        .in("type", ["ethics", "override"])
        .is("deleted_at", null)
        .order("created_at"),
      listEmails(supabase, id),
    ]);
  if (!project || !intake) notFound();

  const values = Object.fromEntries(
    INTAKE_FIELDS.map((f) => [f, (intake[f as keyof typeof intake] as string | null) ?? ""]),
  ) as Record<IntakeField, string>;
  const approver = Array.isArray(intake.approver) ? intake.approver[0] : intake.approver;

  let ethics: EthicsView | null = null;
  if (intake.approved_at) {
    const node = nodes?.find((n) => n.type === "ethics");
    const reasons = (
      (node?.data as { reasons?: { rule: string; reason: string }[] } | null)?.reasons ?? []
    ).slice();
    if (run && (run.status === "queued" || run.status === "running")) ethics = { state: "running" };
    else if (node?.status === "ok") ethics = { state: "passed" };
    else if (node?.status === "flagged") ethics = { state: "flagged", nodeId: node.id, reasons };
    else if (node?.status === "overridden") {
      const o = nodes?.filter((n) => n.type === "override").at(-1);
      const od = (o?.data ?? {}) as { reason?: string; decided_by?: string };
      const { data: who } = await supabase
        .from("members")
        .select("display_name, email")
        .eq("id", od.decided_by ?? "")
        .maybeSingle();
      ethics = {
        state: "overridden",
        reasons,
        overrideReason: od.reason ?? "",
        initials: initials(who?.display_name || who?.email || ""),
      };
    } else ethics = { state: "failed" };
  }

  const data: BriefData = {
    project: {
      id: project.id,
      name: project.name,
      mode: project.mode as "new" | "optimise",
      channel: project.channel as "screens" | "email",
      status: project.status,
    },
    intake: {
      version: intake.version,
      values,
      lowSpecificity: (intake.low_specificity ?? {}) as Record<string, boolean>,
      approved: intake.approved_at
        ? {
            by: approver?.display_name || approver?.email || "",
            at: new Date(intake.approved_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }
        : null,
    },
    uploads: uploads.ok ? uploads.data : [],
    emails,
    ethics,
  };
  return <BriefScreen data={data} />;
}
