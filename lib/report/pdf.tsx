import "server-only";
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { reportCopy as c } from "@/components/report/copy";
import { citationDetails } from "./markdown";
import type { Report } from "./model";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const ink = "#1f2123";
const muted = "#6f6e6a";
const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10.5, lineHeight: 1.5, color: ink, fontFamily: "Helvetica" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { color: muted, marginBottom: 12 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 3 },
  p: { marginBottom: 4 },
  li: { marginLeft: 10, marginBottom: 2 },
  muted: { color: muted },
  banner: { backgroundColor: "#fbf3db", color: "#8a5d00", padding: 6, marginBottom: 8 },
});

const cites = (nums: number[]) =>
  nums.length ? nums.map((n) => ` [${n}]`).join("") : ` (${c.aiInference})`;

function ReportPdf({ report }: { report: Report }) {
  const sum = report.summary;
  const gaps = report.gaps;
  const e = report.ethics;
  return (
    <Document title={`${c.title}: ${report.project.name}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{c.title}</Text>
        <Text style={s.meta}>
          {report.project.name}
          {report.toolkitVersion ? ` · ${c.toolkit(report.toolkitVersion)}` : ""}
        </Text>
        {report.hasStale ? <Text style={s.banner}>{c.hasStale}</Text> : null}

        <Text style={s.h2}>{c.sections.summary}</Text>
        <Text style={s.p}>
          {c.summaryText({
            sources: sum.sources,
            kinds: sum.kinds,
            findings: sum.findings,
            themes: sum.themes,
            opportunities: sum.opportunities,
            high: sum.byConfidence.High,
            med: sum.byConfidence.Med,
            low: sum.byConfidence.Low,
          })}
        </Text>

        <Text style={s.h2}>{c.sections.objectives}</Text>
        {report.objectives.map((o) => (
          <Text key={o.id} style={s.li}>
            {`${o.label}: ${o.text}${o.lowSpecificity ? ` (${c.lowSpecificity})` : ""}`}
          </Text>
        ))}

        <Text style={s.h2}>{c.sections.sources}</Text>
        {report.sourceGroups.map((g) => (
          <Text key={g.type} style={s.li}>
            {`${c.sourceKinds[g.type] ?? g.type}: ${g.count}`}
          </Text>
        ))}

        <Text style={s.h2}>{c.sections.themes}</Text>
        {report.themes.map((t) => (
          <View key={t.id} wrap={false}>
            <Text style={s.h3}>
              {`${t.title}${t.strength ? ` · ${t.strength} strength` : ""}${t.stale ? ` · ${c.outOfDate}` : ""}`}
            </Text>
            {t.summary ? <Text style={[s.p, s.muted]}>{t.summary}</Text> : null}
            {t.findings.map((f) => (
              <Text key={f.id} style={s.li}>{`• ${f.text}${cites(f.citations)}`}</Text>
            ))}
          </View>
        ))}

        <Text style={s.h2}>{c.sections.opportunities}</Text>
        {report.opportunities.map((o) => (
          <View key={o.id} wrap={false}>
            <Text style={s.h3}>
              {`${o.title}${o.confidence ? ` · ${o.confidence} confidence` : ""}${o.stale ? ` · ${c.outOfDate}` : ""}`}
            </Text>
            <Text style={s.p}>{`${o.summary}${cites(o.citations)}`}</Text>
            {o.reason && c.confidenceReason[o.reason] ? (
              <Text style={[s.p, s.muted]}>{c.confidenceReason[o.reason]}</Text>
            ) : null}
            {o.themes.length ? (
              <Text style={s.muted}>{`${c.builtFrom}: ${o.themes.join(", ")}`}</Text>
            ) : null}
            {o.principles.length ? (
              <Text style={s.muted}>{`${c.principles}: ${o.principles.join(", ")}`}</Text>
            ) : null}
          </View>
        ))}

        <Text style={s.h2}>{c.sections.gaps}</Text>
        <Text style={s.p}>
          {gaps.total
            ? c.gapsSummary(gaps.total, gaps.discovery.length, gaps.generative.length)
            : c.gapsNone}
        </Text>
        {(["discovery", "generative"] as const).map((kind) =>
          gaps[kind].length ? (
            <View key={kind}>
              <Text style={s.h3}>{`${c.gapKind[kind]} · ${c.gapKindHint[kind]}`}</Text>
              {gaps[kind].map((g) => (
                <Text key={g.id} style={s.li}>
                  {`• ${g.question} (${g.method}${g.opportunity ? `; ${c.affects(g.opportunity)}` : ""})`}
                </Text>
              ))}
            </View>
          ) : null,
        )}

        <Text style={s.h2}>{c.sections.ethics}</Text>
        {!e || e.status === "failed" ? (
          <Text style={s.p}>{c.ethicsNotRun}</Text>
        ) : e.status === "ok" ? (
          <Text style={s.p}>{c.ethicsPassed}</Text>
        ) : (
          <View>
            <Text style={s.h3}>{c.ethicsFlagged}</Text>
            {e.reasons.map((r) => (
              <Text key={r.rule} style={s.li}>{`• ${r.rule}: ${r.reason}`}</Text>
            ))}
            {e.overrides.map((o) => (
              <Text key={o.at} style={[s.p, s.muted]}>
                {c.override(o.by, date(o.at), o.reason)}
              </Text>
            ))}
          </View>
        )}

        <Text style={s.h2}>{c.sections.references}</Text>
        {report.citations.map((r) => {
          const d = citationDetails(r);
          return (
            <Text key={r.id} style={s.li}>
              {`[${r.n}] `}
              {r.url ? <Link src={r.url}>{r.title}</Link> : r.title}
              {` · ${c.sourceKinds[r.type] ?? r.type}${d ? ` · ${d}` : ""} · ${date(r.retrievedAt)}`}
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}

/** O28 PDF export (AC15.4, 04 D19): built from the same report model as SCR9 and the Markdown. */
export function reportToPdf(report: Report): Promise<Buffer> {
  return renderToBuffer(<ReportPdf report={report} />);
}
