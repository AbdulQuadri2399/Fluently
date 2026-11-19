"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { stageNames } from "@/components/projects/copy";
import { cardView } from "@/lib/canvas/card";
import type { TreeEdge, TreeNode } from "@/lib/canvas/load";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/result";
import { canvasCopy as c, typeNames } from "./copy";
import { StrengthTag, type Level } from "./StrengthTag";

type SaveFn = NonNullable<Parameters<typeof Inspector>[0]["onSave"]>;

/** SCR7 editing (AC24.1, AC24.7, MI6): title and notes; a stale copy is refused and the text kept. */
function EditForm({
  node,
  onSave,
  onSeeLatest,
  onDone,
}: {
  node: TreeNode;
  onSave: SaveFn;
  onSeeLatest?: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(node.title);
  const [body, setBody] = useState(((node.data as { body?: string }).body ?? "") as string);
  const [state, setState] = useState<"idle" | "saving" | "conflict" | "failed">("idle");
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        const res = await onSave({ nodeId: node.id, title, body, version: node.version }).catch(
          () => null,
        );
        if (res?.ok) onDone();
        else setState(res && !res.ok && res.code === "conflict" ? "conflict" : "failed");
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="edit-title">{c.edit.titleLabel}</Label>
        <Input
          id="edit-title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="edit-body">{c.edit.bodyLabel}</Label>
        <Textarea
          id="edit-body"
          value={body}
          maxLength={4000}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {state === "conflict" ? (
        <div
          role="alert"
          className="grid justify-items-start gap-2 rounded-sm bg-warn-bg p-3 text-small text-warn"
        >
          {c.edit.conflict(node.updatedByName || "Someone")}
          <Button type="button" size="sm" variant="secondary" onClick={() => onSeeLatest?.()}>
            {c.edit.seeLatest}
          </Button>
        </div>
      ) : null}
      {state === "failed" ? (
        <p role="alert" className="text-small text-bad">
          {c.edit.saveFailed}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          loading={state === "saving"}
          loadingLabel={c.edit.saving}
          disabledReason={title.trim() ? undefined : c.edit.titleLabel}
        >
          {c.edit.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {c.edit.cancel}
        </Button>
      </div>
    </form>
  );
}

export type HistoryItem = { change: string; at: string; by: string };
export type NodeEvidenceView = {
  sources: { id: string; title: string; url: string | null; type: string; handle: string }[];
  external: { name: string; mechanism: string | null; sourceTitle: string }[];
};

const RESEARCH_TYPES = new Set(["finding", "theme", "opportunity", "gap"]);

/** SCR7 details panel (AC22.5, AC11.8): type, title, properties, connections, history. Read-only until Slice 8. */
export function Inspector({
  node,
  nodes,
  edges,
  running,
  runningStage,
  loadHistory,
  loadEvidence,
  onClose,
  onSelect,
  projectId,
  onSave,
  onSeeLatest,
  onTrace,
  tracePath = null,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  edges: TreeEdge[];
  running: boolean;
  runningStage: string | null;
  loadHistory: (nodeId: string) => Promise<HistoryItem[]>;
  loadEvidence?: (nodeId: string) => Promise<NodeEvidenceView>;
  onClose: () => void;
  onSelect: (id: string) => void;
  projectId?: string;
  onSave?: (input: {
    nodeId: string;
    title: string;
    body: string | null;
    version: number;
  }) => Promise<ActionResult<{ version: number }>>;
  onSeeLatest?: () => void;
  /** Starts (true) or clears (false) trace mode for this card (AC23.1, AC23.3). */
  onTrace?: (on: boolean) => void;
  /** Cards on the traced path, in order from this card back to the objectives. */
  tracePath?: TreeNode[] | null;
}) {
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [evidence, setEvidence] = useState<NodeEvidenceView | null>(null);
  useEffect(() => {
    if (!loadEvidence || !RESEARCH_TYPES.has(node.type)) return;
    let live = true;
    loadEvidence(node.id)
      .then((e) => live && setEvidence(e))
      .catch(() => live && setEvidence({ sources: [], external: [] }));
    return () => {
      live = false;
    };
  }, [node.id, node.type, loadEvidence]);
  const [savedAt, setSavedAt] = useState(0);
  useEffect(() => {
    let live = true;
    loadHistory(node.id)
      .then((h) => live && setHistory(h))
      .catch(() => live && setHistory([]));
    return () => {
      live = false;
    };
  }, [node.id, loadHistory, savedAt]);

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
      {editing && onSave ? (
        <EditForm
          key={`${node.id}-${node.version}`}
          node={node}
          onSave={onSave}
          onSeeLatest={onSeeLatest}
          onDone={() => {
            setEditing(false);
            setSavedAt(Date.now());
          }}
        />
      ) : (
        <h2 className="text-panel font-semibold tracking-tight">{v.title}</h2>
      )}
      {!editing && (node.data as { body?: string }).body ? (
        <p className="text-body whitespace-pre-wrap">{(node.data as { body?: string }).body}</p>
      ) : null}
      {!editing && onSave ? (
        node.type === "objective" ? (
          <p className="flex items-center justify-between gap-3 text-small text-muted">
            {c.edit.objectiveHint}
            {projectId ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/projects/${projectId}/brief`}>{c.edit.goToBrief}</Link>
              </Button>
            ) : null}
          </p>
        ) : node.type === "ethics" ? (
          <p className="text-small text-muted">{c.edit.ethicsHint}</p>
        ) : node.type === "override" ? (
          <p className="text-small text-muted">{c.edit.overrideHint}</p>
        ) : (
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabledReason={
                locked
                  ? c.lockedWhileRunning(stageNames[runningStage ?? node.stage] ?? node.stage)
                  : undefined
              }
              onClick={() => setEditing(true)}
            >
              {c.edit.edit}
            </Button>
          </div>
        )
      ) : null}
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
      {(node.type === "opportunity" || node.type === "theme") && node.confidence ? (
        <p className="grid justify-items-start gap-1 rounded-sm bg-soft px-3 py-2 text-small">
          <StrengthTag
            level={node.confidence as Level}
            of={node.type === "theme" ? "strength" : "confidence"}
          />
          <span className="text-muted">
            {c.labels.confidenceReason[
              (node.data as { confidenceReason?: string }).confidenceReason ?? ""
            ] ?? ""}
          </span>
        </p>
      ) : null}
      {node.type === "finding" ? <p className="text-small text-muted">{v.status}</p> : null}
      {evidence?.sources.length ? (
        <details open className="grid gap-2">
          <summary className="cursor-pointer text-small font-medium">{c.inspector.sources}</summary>
          <ul className="mt-2 grid gap-1.5 text-small">
            {evidence.sources.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span className="font-mono text-[11px] text-muted">{s.handle}</span>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    {s.title}
                  </a>
                ) : (
                  <span>{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {evidence?.external.length ? (
        <ul className="grid gap-1.5 text-small">
          {evidence.external.map((e) => (
            <li key={e.name} className="grid gap-0.5 rounded-sm border border-line px-3 py-2">
              <span className="text-caption font-medium text-info">{c.labels.external}</span>
              <span>
                {e.name}
                {e.mechanism ? ` · ${e.mechanism}` : ""}
              </span>
              {e.sourceTitle ? (
                <span className="text-caption text-muted">{e.sourceTitle}</span>
              ) : null}
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
      {onTrace ? (
        <div className="grid gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="justify-self-start"
            onClick={() => onTrace(!tracePath)}
          >
            {tracePath ? c.trace.clear : c.trace.button}
          </Button>
          {tracePath ? (
            <section aria-label={c.trace.title} className="grid gap-2">
              <h3 className="text-small font-medium">{c.trace.title}</h3>
              <p className="text-caption text-muted">{c.trace.hint}</p>
              <ol className="grid gap-1">
                {tracePath.map((n, i) => (
                  <li key={n.id} className="grid grid-cols-[1.25rem_1fr] items-baseline gap-1">
                    <span className="font-mono text-caption text-muted">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => onSelect(n.id)}
                      className="min-w-0 truncate rounded-sm px-1 py-0.5 text-left text-small hover:bg-soft"
                    >
                      <span className="text-muted">{typeNames[n.type] ?? n.type} · </span>
                      {cardView(n, running).title}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}
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
