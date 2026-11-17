"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { stageNames } from "@/components/projects/copy";
import { cardView } from "@/lib/canvas/card";
import type { TreeEdge, TreeNode } from "@/lib/canvas/load";
import { canvasCopy as c, typeNames } from "./copy";

export type HistoryItem = { change: string; at: string; by: string };

/** SCR7 details panel (AC22.5, AC11.8): type, title, properties, connections, history. Read-only until Slice 8. */
export function Inspector({
  node,
  nodes,
  edges,
  running,
  runningStage,
  loadHistory,
  onClose,
  onSelect,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  edges: TreeEdge[];
  running: boolean;
  runningStage: string | null;
  loadHistory: (nodeId: string) => Promise<HistoryItem[]>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  useEffect(() => {
    let live = true;
    loadHistory(node.id)
      .then((h) => live && setHistory(h))
      .catch(() => live && setHistory([]));
    return () => {
      live = false;
    };
  }, [node.id, loadHistory]);

  const v = cardView(node, running);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const linked = edges
    .filter((e) => e.from === node.id || e.to === node.id)
    .map((e) => byId.get(e.from === node.id ? e.to : e.from))
    .filter((n): n is TreeNode => Boolean(n));
  const data = node.data as {
    reasons?: { rule: string; reason: string }[];
    groups?: { key: string; title: string; count: number; status: string }[];
  };
  const locked =
    node.status === "running" || (runningStage !== null && node.stage === runningStage);
  const props: [string, string][] = [
    [c.inspector.type, typeNames[node.type] ?? node.type],
    [c.inspector.stage, stageNames[node.stage] ?? node.stage],
    [c.inspector.madeBy, c.inspector.madeByValues[node.provenance] ?? node.provenance],
    ...(node.model ? ([[c.inspector.model, node.model]] as [string, string][]) : []),
    [c.inspector.status, v.status],
    [
      c.inspector.created,
      new Date(node.createdAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ],
  ];

  return (
    <aside
      aria-label={v.typeLabel}
      className="absolute top-0 right-0 bottom-0 z-20 flex w-[384px] flex-col gap-5 overflow-y-auto border-l border-line bg-surface p-6 shadow-elev-1"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-xs bg-canvas px-1.5 py-px text-caption font-medium">
          {v.typeLabel}
        </span>
        <button
          type="button"
          aria-label={c.inspector.close}
          onClick={onClose}
          className="grid size-8 place-items-center rounded-sm text-muted hover:bg-soft hover:text-ink"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      <h2 className="text-panel font-semibold tracking-tight">{v.title}</h2>
      {locked ? (
        <p role="status" className="rounded-sm bg-soft p-3 text-small text-muted">
          {c.lockedWhileRunning(stageNames[runningStage ?? node.stage] ?? node.stage)}
        </p>
      ) : null}
      {v.markers.length ? (
        <p className="flex flex-wrap gap-1.5">
          {v.markers.map((m) => (
            <span key={m.kind} className="rounded-full bg-canvas px-2 text-caption font-medium">
              {m.label}
            </span>
          ))}
        </p>
      ) : null}
      {data.reasons?.length ? (
        <ul className="grid gap-2 rounded-md bg-warn-bg/60 p-3 text-small">
          {data.reasons.map((r, i) => (
            <li key={i}>
              <span className="font-medium">{r.rule}.</span> {r.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {data.groups?.length ? (
        <ul className="grid gap-1.5 rounded-md bg-soft p-3 text-small">
          {data.groups.map((g) => (
            <li key={g.key} className="flex justify-between gap-3">
              <span>{g.title}</span>
              <span className="font-mono text-[12.5px] text-muted">
                {g.status === "done" ? g.count : (c.stepStatus[g.status] ?? g.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2.5 text-small">
        {props.map(([k, val]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="min-w-0 break-words">{val}</dd>
          </div>
        ))}
      </dl>
      {linked.length ? (
        <details open className="grid gap-2">
          <summary className="cursor-pointer text-small font-medium">
            {c.inspector.connected}
          </summary>
          <ul className="mt-2 grid gap-1">
            {linked.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelect(n.id)}
                  className="w-full truncate rounded-sm px-2 py-1 text-left text-small hover:bg-soft"
                >
                  {cardView(n, running).title}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <details className="grid gap-2">
        <summary className="cursor-pointer text-small font-medium">{c.inspector.history}</summary>
        <ul className="mt-2 grid gap-1.5 text-small text-muted">
          {(history ?? []).map((h, i) => (
            <li key={i}>
              {c.inspector.historyNames[h.change] ?? h.change} · {h.at}
              {h.by ? ` · ${h.by}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
