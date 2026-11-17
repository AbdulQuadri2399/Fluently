import { canvasCopy as c, typeNames } from "@/components/canvas/copy";
import type { TreeNode } from "./load";

export type Marker = {
  kind: "stale" | "lowSpecificity" | "failed" | "running" | "flagged" | "overridden";
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
  } else if (n.type === "asset_set") {
    const count = (n.data as { count?: number }).count ?? 0;
    status = count === 1 ? "1 asset" : `${count} assets`;
  } else if (n.type === "source") {
    status = data.note ?? status;
  }
  const markers: Marker[] = [];
  if (n.stale) markers.push({ kind: "stale", label: c.markers.stale });
  if (n.lowSpecificity) markers.push({ kind: "lowSpecificity", label: c.markers.lowSpecificity });
  if (n.status === "failed") markers.push({ kind: "failed", label: c.markers.failed });
  // The ethics card's status line already says flagged / overridden.
  if (n.status === "flagged" && n.type !== "ethics") markers.push({ kind: "flagged", label: c.markers.flagged });
  if (n.status === "overridden" && n.type !== "ethics") markers.push({ kind: "overridden", label: c.markers.overridden });
  if (n.status === "running" || (running && n.type === "ethics"))
    markers.push({ kind: "running", label: c.markers.running });
  const done = n.status === "ok" && !n.stale && (n.type === "ethics" || n.type === "objective");
  return { title, status, markers, done, typeLabel: typeNames[n.type] ?? n.type };
}
