import { notFound } from "next/navigation";
import { CitationCheck, ReportNotYet, ReportView } from "@/components/report/ReportView";
import { getReport } from "@/lib/report/model";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit Report" };

/** SCR9 Audit Report (AC15.1–AC15.3) and its citation check (AC12.8, `?view=citations`). */
export default async function ReportPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/report">) {
  const { id } = await params;
  const { view } = await searchParams;
  const report = await getReport(await createClient(), id);
  if (!report) notFound();
  const base = `/projects/${id}/report`;
  return (
    <main className="mx-auto w-full max-w-[680px] px-6 py-11">
      {!report.ready ? (
        <ReportNotYet canvasHref={`/projects/${id}`} />
      ) : view === "citations" ? (
        <CitationCheck report={report} backHref={base} />
      ) : (
        <ReportView
          report={report}
          canvasHref={`/projects/${id}`}
          citationsHref={`${base}?view=citations`}
        />
      )}
    </main>
  );
}
