import { reportCopy as c } from "@/components/report/copy";
import type { Citation, Report } from "./model";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const cites = (nums: number[]) =>
  nums.length ? nums.map((n) => ` [${n}]`).join("") : ` _(${c.aiInference})_`;

const level = (l: string | null, of: "confidence" | "strength") => (l ? ` · ${l} ${of}` : "");

export function citationDetails(r: Citation): string {
  if (r.type === "paper")
    return [r.authors.slice(0, 3).join(", "), r.year, r.doi ? `DOI ${r.doi}` : null]
      .filter(Boolean)
      .join(" · ");
  if (r.type === "upload") return c.uploadedFile;
  if (r.type === "toolkit") return r.handle;
  try {
    return r.url ? new URL(r.url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

/** O28 Markdown export (AC15.4, 04 D19): the same sections and citations as SCR9. */
export function reportToMarkdown(report: Report): string {
  const s = report.summary;
  const out: string[] = [];
  out.push(`# ${c.title}: ${report.project.name}`);
  if (report.toolkitVersion) out.push(`_${c.toolkit(report.toolkitVersion)}_`);
  if (report.hasStale) out.push(`> ${c.hasStale}`);

  out.push(`## ${c.sections.summary}`);
  out.push(
    c.summaryText({
      sources: s.sources,
      kinds: s.kinds,
      findings: s.findings,
      themes: s.themes,
      opportunities: s.opportunities,
      high: s.byConfidence.High,
      med: s.byConfidence.Med,
      low: s.byConfidence.Low,
    }),
  );

  out.push(`## ${c.sections.objectives}`);
  for (const o of report.objectives)
    out.push(`- **${o.label}:** ${o.text}${o.lowSpecificity ? ` _(${c.lowSpecificity})_` : ""}`);

  out.push(`## ${c.sections.sources}`);
  for (const g of report.sourceGroups) out.push(`- ${c.sourceKinds[g.type] ?? g.type}: ${g.count}`);

  out.push(`## ${c.sections.themes}`);
  for (const t of report.themes) {
    out.push(`### ${t.title}${level(t.strength, "strength")}${t.stale ? ` · ${c.outOfDate}` : ""}`);
    if (t.summary) out.push(t.summary);
    out.push(t.findings.map((f) => `- ${f.text}${cites(f.citations)}`).join("\n"));
  }

  out.push(`## ${c.sections.opportunities}`);
  for (const o of report.opportunities) {
    out.push(
      `### ${o.title}${level(o.confidence, "confidence")}${o.stale ? ` · ${c.outOfDate}` : ""}`,
    );
    out.push(`${o.summary}${cites(o.citations)}`);
    const lines: string[] = [];
    if (o.reason && c.confidenceReason[o.reason]) lines.push(`- ${c.confidenceReason[o.reason]}`);
    if (o.themes.length) lines.push(`- ${c.builtFrom}: ${o.themes.join(", ")}`);
    if (o.principles.length) lines.push(`- ${c.principles}: ${o.principles.join(", ")}`);
    if (lines.length) out.push(lines.join("\n"));
  }

  out.push(`## ${c.sections.gaps}`);
  const gaps = report.gaps;
  out.push(
    gaps.total
      ? c.gapsSummary(gaps.total, gaps.discovery.length, gaps.generative.length)
      : c.gapsNone,
  );
  for (const kind of ["discovery", "generative"] as const) {
    if (!gaps[kind].length) continue;
    out.push(`### ${c.gapKind[kind]}\n_${c.gapKindHint[kind]}_`);
    out.push(
      gaps[kind]
        .map(
          (g) =>
            `- ${g.question} (${g.method}${g.opportunity ? `; ${c.affects(g.opportunity)}` : ""})`,
        )
        .join("\n"),
    );
  }

  out.push(`## ${c.sections.ethics}`);
  const e = report.ethics;
  if (!e || e.status === "failed") out.push(c.ethicsNotRun);
  else if (e.status === "ok") out.push(c.ethicsPassed);
  else {
    out.push(`**${c.ethicsFlagged}**`);
    out.push(e.reasons.map((r) => `- **${r.rule}:** ${r.reason}`).join("\n"));
    for (const o of e.overrides) out.push(c.override(o.by, date(o.at), o.reason));
  }

  out.push(`## ${c.sections.references}`);
  out.push(
    report.citations
      .map((r) => {
        const title = r.url ? `[${r.title}](${r.url})` : r.title;
        const d = citationDetails(r);
        return `${r.n}. ${title} · ${c.sourceKinds[r.type] ?? r.type}${d ? ` · ${d}` : ""} · ${date(r.retrievedAt)}`;
      })
      .join("\n"),
  );
  return `${out.join("\n\n")}\n`;
}
