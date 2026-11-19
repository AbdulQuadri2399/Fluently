"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { canConnect, DELETABLE, downstreamIds } from "@/lib/canvas/connect";
import { cardView } from "@/lib/canvas/card";
import type { TreeEdge, TreeNode } from "@/lib/canvas/load";
import { canvasCopy as c, typeNames } from "./copy";

/** Delete a card (AC24.5, AC24.8): a confirm that says how many cards depend on it. */
export function DeleteCardSection({
  node,
  nodes,
  edges,
  disabled,
  onDelete,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  edges: TreeEdge[];
  disabled: boolean;
  onDelete: (nodeId: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (node.type === "objective")
    return <p className="text-small text-muted">{c.editing.cantDeleteObjective}</p>;
  if (!DELETABLE.has(node.type)) return null;
  const live = new Set(nodes.map((n) => n.id));
  const deps = [...downstreamIds(edges, node.id)].filter((id) => live.has(id)).length;
  const type = typeNames[node.type] ?? node.type;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start text-bad"
        disabledReason={disabled ? c.lockedWhileRunning("research") : undefined}
        onClick={() => setOpen(true)}
      >
        {c.editing.delete}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="grid gap-4">
          <DialogTitle className="text-panel font-semibold tracking-tight">
            {c.editing.deleteTitle(type)}
          </DialogTitle>
          <DialogDescription className="text-body text-muted">
            {deps > 0 ? c.editing.deleteConfirm(type, deps) : c.editing.deleteConfirmNone(type)}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {c.edit.cancel}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              loadingLabel={c.editing.deleting}
              onClick={async () => {
                setBusy(true);
                const done = await onDelete(node.id);
                setBusy(false);
                if (done) setOpen(false);
              }}
            >
              {c.editing.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The Connections section (AC30.7): the same connect and disconnect actions without dragging. */
export function ConnectionsSection({
  node,
  nodes,
  edges,
  disabled,
  onConnect,
  onDisconnect,
  onSelect,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  edges: TreeEdge[];
  disabled: boolean;
  onConnect: (fromId: string, toId: string) => Promise<boolean>;
  onDisconnect: (edgeId: string) => Promise<boolean>;
  onSelect: (id: string) => void;
}) {
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const title = (n: TreeNode) => cardView(n, false).title;
  const incoming = edges.filter((e) => e.to === node.id && byId.has(e.from));
  const outgoing = edges.filter((e) => e.from === node.id && byId.has(e.to));
  const linkedTo = new Set([...incoming.map((e) => e.from), ...outgoing.map((e) => e.to)]);
  const upstream = nodes.filter((n) => canConnect(n.type, node.type) && !linkedTo.has(n.id));
  const downstream = nodes.filter((n) => canConnect(node.type, n.type) && !linkedTo.has(n.id));

  const row = (edge: TreeEdge, other: TreeNode) => (
    <li key={edge.id} className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(other.id)}
        className="min-w-0 flex-1 truncate rounded-sm px-2 py-1 text-left text-small hover:bg-soft"
      >
        <span className="text-muted">{typeNames[other.type] ?? other.type} · </span>
        {title(other)}
      </button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${c.editing.removeLine}: ${title(other)}`}
        disabledReason={disabled ? c.lockedWhileRunning("research") : undefined}
        onClick={() => void onDisconnect(edge.id)}
      >
        {c.editing.removeLine}
      </Button>
    </li>
  );

  return (
    <section aria-label={c.editing.connections} className="grid gap-3">
      <h3 className="text-small font-medium">{c.editing.connections}</h3>
      {incoming.length ? (
        <div className="grid gap-1">
          <p className="text-caption text-muted">{c.editing.builtFromLabel}</p>
          <ul className="grid gap-0.5">{incoming.map((e) => row(e, byId.get(e.from)!))}</ul>
        </div>
      ) : null}
      {outgoing.length ? (
        <div className="grid gap-1">
          <p className="text-caption text-muted">{c.editing.leadsTo}</p>
          <ul className="grid gap-0.5">{outgoing.map((e) => row(e, byId.get(e.to)!))}</ul>
        </div>
      ) : null}
      {upstream.length || downstream.length ? (
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!choice) return;
            const [dir, id] = choice.split(":") as ["in" | "out", string];
            setBusy(true);
            const done = await (dir === "in" ? onConnect(id, node.id) : onConnect(node.id, id));
            setBusy(false);
            if (done) setChoice("");
          }}
        >
          <select
            aria-label={c.editing.addConnection}
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-2 text-small"
          >
            <option value="">{c.editing.chooseCard}</option>
            {upstream.length ? (
              <optgroup label={c.editing.builtFromLabel}>
                {upstream.map((n) => (
                  <option key={n.id} value={`in:${n.id}`}>
                    {title(n)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {downstream.length ? (
              <optgroup label={c.editing.leadsTo}>
                {downstream.map((n) => (
                  <option key={n.id} value={`out:${n.id}`}>
                    {title(n)}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={busy}
            disabledReason={
              disabled
                ? c.lockedWhileRunning("research")
                : choice
                  ? undefined
                  : c.editing.chooseCard
            }
          >
            {c.editing.connect}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
