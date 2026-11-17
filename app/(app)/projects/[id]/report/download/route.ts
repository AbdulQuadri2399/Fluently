import type { NextRequest } from "next/server";
import { logEvent } from "@/lib/events/log";
import { currentMember } from "@/lib/projects/service";
import { reportToMarkdown } from "@/lib/report/markdown";
import { getReport } from "@/lib/report/model";
import { reportToPdf } from "@/lib/report/pdf";
import { createClient } from "@/lib/supabase/server";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "report";

/** O28 exportReport (AC15.4): `?format=md|pdf`, read as the signed-in member (RLS applies). */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/projects/[id]/report/download">,
) {
  const { id } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format");
  if (format !== "md" && format !== "pdf") return new Response("validation", { status: 400 });
  const client = await createClient();
  const report = await getReport(client, id);
  if (!report || !report.ready) return new Response("not_found", { status: 404 });
  const name = `audit-report-${slug(report.project.name)}.${format}`;
  try {
    const body =
      format === "md"
        ? new TextEncoder().encode(reportToMarkdown(report))
        : new Uint8Array(await reportToPdf(report));
    const me = await currentMember(client);
    if (me) await logEvent(client, me, "report_exported", { format });
    return new Response(body, {
      headers: {
        "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("report export failed", id, format, e);
    return new Response("unavailable", { status: 503 });
  }
}
