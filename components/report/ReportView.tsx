import Link from "next/link";
import type { ReactNode } from "react";
import { StrengthTag } from "@/components/canvas/StrengthTag";
import { Badge } from "@/components/ui/badge";
import type { Citation, Report, ReportGap } from "@/lib/report/model";
import { cn } from "@/lib/utils";
import { reportCopy as c } from "./copy";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** A citation marker: a small numbered link to the reference list (AC15.2). */
function Cites({ nums }: { nums: number[] }) {
  if (!nums.length)
    return (
      <Badge kind="type" className="ml-1 align-middle">
        {c.aiInference}
      </Badge>
    );
  return (
    <span className="ml-0.5 whitespace-nowrap">
      {nums.map((n) => (
        <a
          key={n}
          href={`#ref-${n}`}
          aria-label={`Source ${n}`}
          className="ml-0.5 align-super font-mono text-[10.5px] text-info underline-offset-2 hover:underline"
        >
          [{n}]
        </a>
      ))}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-line pt-8">
      <h2 id={id} className="text-panel font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stale({ show }: { show: boolean }) {
  return show ? (
    <Badge kind="status" tone="warn" className="ml-2 align-middle">
      {c.outOfDate}
    </Badge>
  ) : null;
}

function GapList({ kind, gaps }: { kind: "discovery" | "generative"; gaps: ReportGap[] }) {
  if (!gaps.length) return null;
  return (
    <div className="grid gap-2">
      <h3 className="text-body font-semibold">
        {c.gapKind[kind]} <span className="font-normal text-muted">· {c.gapKindHint[kind]}</span>
      </h3>
      <ul className="grid gap-2">
        {gaps.map((g) => (
          <li key={g.id} className="grid gap-0.5 rounded-sm bg-soft px-3 py-2 text-small">
            <span className="font-medium">{g.question}</span>
            <span className="text-muted">
              {g.method}
              {g.opportunity ? ` · ${c.affects(g.opportunity)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function details(r: Citation) {
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

/** SCR9 citation check (AC12.8): every citation with its stored record and a link. */
export function CitationCheck({ report, backHref }: { report: Report; backHref: string }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-page font-semibold tracking-tight">{c.citationCheck}</h1>
        <Link href={backHref} className="text-small text-muted underline-offset-2 hover:underline">
          {c.backToReport}
        </Link>
      </div>
      <p className="text-body text-muted">{c.citationCheckHint}</p>
      <table className="w-full border-collapse text-small">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th scope="col" className="py-2 pr-3 font-medium">
              {c.citationCols.n}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {c.citationCols.source}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {c.citationCols.kind}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {c.citationCols.details}
            </th>
            <th scope="col" className="py-2 font-medium">
              {c.citationCols.retrieved}
            </th>
          </tr>
        </thead>
        <tbody>
          {report.citations.map((r) => (
            <tr key={r.id} className="border-b border-line align-top">
              <td className="py-2 pr-3 font-mono text-muted">{r.n}</td>
              <td className="py-2 pr-3">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
              </td>
              <td className="py-2 pr-3 text-muted">{c.sourceKinds[r.type] ?? r.type}</td>
              <td className="py-2 pr-3 text-muted">{details(r)}</td>
              <td className="py-2 whitespace-nowrap text-muted">{date(r.retrievedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** SCR9 Audit Report (AC15.1, AC15.2, AC12.12, AC13.5): a 680 px reading column. */
export function ReportView({
  report,
  canvasHref,
  citationsHref,
  actions,
}: {
  report: Report;
  canvasHref: string;
  citationsHref: string;
  actions?: ReactNode;
}) {
  const s = report.summary;
  return (
    <article className="grid gap-8">
      <header className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-page font-semibold tracking-tight">{c.title}</h1>
          <div className="flex items-center gap-2">
            <Link
              href={citationsHref}
              className="text-small text-muted underline-offset-2 hover:underline"
            >
              {c.citationCheck}
            </Link>
            {actions}
          </div>
        </div>
        <p className="text-small text-muted">
          {report.project.name}
          {report.toolkitVersion ? ` · ${c.toolkit(report.toolkitVersion)}` : ""}
        </p>
        {report.hasStale ? (
          <p
            role="status"
            className="flex items-center justify-between gap-3 rounded-sm bg-warn-bg px-3 py-2 text-small text-warn"
          >
            {c.hasStale}
            <Link href={canvasHref} className="font-medium underline underline-offset-2">
              {c.goToCanvas}
            </Link>
          </p>
        ) : null}
      </header>

      <Section id="r-summary" title={c.sections.summary}>
        <p className="text-body">
          {c.summaryText({
            sources: s.sources,
            kinds: s.kinds,
            findings: s.findings,
            themes: s.themes,
            opportunities: s.opportunities,
            high: s.byConfidence.High,
            med: s.byConfidence.Med,
            low: s.byConfidence.Low,
          })}
        </p>
      </Section>

      <Section id="r-objectives" title={c.sections.objectives}>
        <dl className="grid gap-3">
          {report.objectives.map((o) => (
            <div key={o.id} className="grid gap-0.5">
              <dt className="text-small text-muted">
                {o.label}
                {o.lowSpecificity ? (
                  <Badge kind="status" tone="warn" className="ml-2">
                    {c.lowSpecificity}
                  </Badge>
                ) : null}
              </dt>
              <dd className="text-body">{o.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="r-sources" title={c.sections.sources}>
        <ul className="grid gap-1 text-body">
          {report.sourceGroups.map((g) => (
            <li key={g.type} className="flex justify-between border-b border-line py-1.5">
              <span>{c.sourceKinds[g.type] ?? g.type}</span>
              <span className="font-mono text-muted">{g.count}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="r-themes" title={c.sections.themes}>
        <div className="grid gap-6">
          {report.themes.map((t) => (
            <div key={t.id} className="grid gap-2">
              <h3 className="text-body font-semibold">
                {t.title}
                {t.strength ? (
                  <StrengthTag level={t.strength} of="strength" className="ml-2 align-middle" />
                ) : null}
                <Stale show={t.stale} />
              </h3>
              {t.summary ? <p className="text-body text-muted">{t.summary}</p> : null}
              <ul className="grid list-disc gap-1 pl-5 text-body">
                {t.findings.map((f) => (
                  <li key={f.id}>
                    {f.text}
                    <Cites nums={f.citations} />
                    {f.qualitative && f.qualitative === f.citations.length ? (
                      <span className="ml-1 text-caption text-muted">
                        {c.qualitative(f.qualitative)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="r-opportunities" title={c.sections.opportunities}>
        <div className="grid gap-6">
          {report.opportunities.map((o) => (
            <div key={o.id} className="grid gap-2">
              <h3 className="text-body font-semibold">
                {o.title}
                {o.confidence ? (
                  <StrengthTag level={o.confidence} of="confidence" className="ml-2 align-middle" />
                ) : null}
                <Stale show={o.stale} />
              </h3>
              <p className="text-body">
                {o.summary}
                <Cites nums={o.citations} />
              </p>
              {o.reason ? (
                <p className="text-small text-muted">{c.confidenceReason[o.reason] ?? ""}</p>
              ) : null}
              <dl className="grid gap-1 text-small">
                {o.themes.length ? (
                  <div className="flex gap-2">
                    <dt className="text-muted">{c.builtFrom}</dt>
                    <dd>{o.themes.join(", ")}</dd>
                  </div>
                ) : null}
                {o.principles.length ? (
                  <div className="flex gap-2">
                    <dt className="text-muted">{c.principles}</dt>
                    <dd className="font-mono">{o.principles.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section id="r-gaps" title={c.sections.gaps}>
        <p className="text-body">
          {report.gaps.total
            ? c.gapsSummary(
                report.gaps.total,
                report.gaps.discovery.length,
                report.gaps.generative.length,
              )
            : c.gapsNone}
        </p>
        <GapList kind="discovery" gaps={report.gaps.discovery} />
        <GapList kind="generative" gaps={report.gaps.generative} />
      </Section>

      <Section id="r-ethics" title={c.sections.ethics}>
        {!report.ethics || report.ethics.status === "failed" ? (
          <p className="text-body text-muted">{c.ethicsNotRun}</p>
        ) : report.ethics.status === "ok" ? (
          <p className="text-body">{c.ethicsPassed}</p>
        ) : (
          <div className="grid gap-2">
            <p className="text-body font-medium">{c.ethicsFlagged}</p>
            <ul className="grid list-disc gap-1 pl-5 text-body">
              {report.ethics.reasons.map((r) => (
                <li key={r.rule}>
                  <span className="font-medium">{r.rule}:</span> {r.reason}
                </li>
              ))}
            </ul>
            {report.ethics.overrides.map((o) => (
              <p key={o.at} className="text-small text-muted">
                {c.override(o.by, date(o.at), o.reason)}
              </p>
            ))}
          </div>
        )}
      </Section>

      <Section id="r-references" title={c.sections.references}>
        <ol className="grid gap-2 text-small">
          {report.citations.map((r) => (
            <li
              key={r.id}
              id={`ref-${r.n}`}
              className={cn("grid grid-cols-[2rem_1fr] scroll-mt-20")}
            >
              <span className="font-mono text-muted">[{r.n}]</span>
              <span>
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
                <span className="text-muted">
                  {" "}
                  · {c.sourceKinds[r.type] ?? r.type}
                  {details(r) ? ` · ${details(r)}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </article>
  );
}

/** SCR9 not yet (AC15.1): nothing to report until research finishes. */
export function ReportNotYet({ canvasHref }: { canvasHref: string }) {
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-body text-muted">{c.notYet}</p>
      <Link href={canvasHref} className="text-small font-medium underline underline-offset-2">
        {c.goToCanvas}
      </Link>
    </div>
  );
}
