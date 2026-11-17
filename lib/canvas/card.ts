import { canvasCopy as c, typeNames } from "@/components/canvas/copy";
import type { TreeNode } from "./load";

export type Marker = {
  kind:
    "stale" | "lowSpecificity" | "lowConfidence" | "failed" | "running" | "flagged" | "overridden";
  label: string;
};

/** What a card says (03b Tree card): one title, one status line, markers as words. */
export function cardView(n: TreeNode, running: boolean) {
  const data = n.data as {
    text?: string;
    kind?: string;
    reasons?: unknown[];
    reason?: string;
    note?: string;
  };
  let title = n.title;
  let status = typeNames[n.type] ?? n.type;
  if (n.type === "objective") {
    title = data.text ?? n.title;
    status = n.title;
  } else if (n.type === "ethics") {
    title = typeNames.ethics!;
    status =
      n.status === "running" || running
        ? c.ethicsStatus.running
        : n.status === "flagged"
          ? c.ethicsStatus.flagged(data.reasons?.length ?? 0)
          : n.status === "overridden"
            ? c.ethicsStatus.overridden
            : n.status === "failed"
              ? c.ethicsStatus.failed
              : c.ethicsStatus.passed;
  } else if (n.type === "override") {
    status = data.reason ?? status;
  } else if (n.type === "opportunity") {
    status = (n.data as { summary?: string }).summary || status;
  } else if (n.type === "finding") {
    const d = n.data as { aiInference?: boolean; sources?: string[]; socialCount?: number };
    status = d.aiInference
      ? c.labels.aiInference
      : d.socialCount && d.socialCount === (d.sources?.length ?? 0)
        ? c.labels.qualitative(d.socialCount)
        : c.labels.sources(d.sources?.length ?? 0);
  } else if (n.type === "theme") {
    status = (n.data as { summary?: string }).summary || status;
  } else if (n.type === "gap") {
    status = c.labels.gapMethod((n.data as { method?: string }).method ?? "");
  } else if (n.type === "asset_set") {
    const count = (n.data as { count?: number }).count ?? 0;
    status = count === 1 ? "1 asset" : `${count} assets`;
  } else if (n.type === "source") {
    const groups = (n.data as { groups?: { count: number; status: string }[] }).groups;
    if (groups) {
      const total = groups.reduce((sum, g) => sum + (g.count ?? 0), 0);
      const done = groups.filter((g) => g.status === "done").length;
      status =
        done < groups.length
          ? c.sourcesCollecting(done, groups.length)
          : c.sourcesSummary(total, groups.length);
    } else status = data.note ?? status;
  }
  const markers: Marker[] = [];
  if (n.stale) markers.push({ kind: "stale", label: c.markers.stale });
  if (n.lowSpecificity) markers.push({ kind: "lowSpecificity", label: c.markers.lowSpecificity });
  // Opportunities and themes show their level as a tag (AC12.12); cards built from a Low
  // opportunity carry the Low confidence marker (AC13.4).
  const level =
    n.confidence === "High" || n.confidence === "Med" || n.confidence === "Low"
      ? (n.confidence as "High" | "Med" | "Low")
      : null;
  const tag = !level
    ? null
    : n.type === "opportunity"
      ? { level, of: "confidence" as const }
      : n.type === "theme"
        ? { level, of: "strength" as const }
        : null;
  if (n.confidence === "Low" && !tag)
    markers.push({ kind: "lowConfidence", label: c.markers.lowConfidence });
  if (n.status === "failed") markers.push({ kind: "failed", label: c.markers.failed });
  // The ethics card's status line already says flagged / overridden.
  if (n.status === "flagged" && n.type !== "ethics")
    markers.push({ kind: "flagged", label: c.markers.flagged });
  if (n.status === "overridden" && n.type !== "ethics")
    markers.push({ kind: "overridden", label: c.markers.overridden });
  if (n.status === "running" || (running && n.type === "ethics"))
    markers.push({ kind: "running", label: c.markers.running });
  const done = n.status === "ok" && !n.stale && (n.type === "ethics" || n.type === "objective");
  return { title, status, markers, done, tag, typeLabel: typeNames[n.type] ?? n.type };
}
