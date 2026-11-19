"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/result";
import { REQUIRED_SOURCE } from "@/lib/canvas/connect";
import type { TreeNode } from "@/lib/canvas/load";
import { cardView } from "@/lib/canvas/card";
import { canvasCopy as c, typeNames } from "./copy";

export type AddCardInput = {
  type: "finding" | "theme" | "opportunity" | "gap";
  title: string;
  body: string;
  links: string[];
};

/** O22 add a card by hand (AC24.2): only types the column allows, with the links that type needs. */
export function AddCardDialog({
  types,
  nodes,
  onClose,
  onAdd,
}: {
  /** Types allowed in the column the person clicked + on. */
  types: string[];
  nodes: TreeNode[];
  onClose: () => void;
  onAdd: (input: AddCardInput) => Promise<ActionResult<{ id: string }>>;
}) {
  const [type, setType] = useState(types[0] as AddCardInput["type"]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [links, setLinks] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = REQUIRED_SOURCE[type]!;
  const candidates = nodes.filter((n) => n.type === required);
  const requiredName = typeNames[required] ?? required;
  const invalid = title.trim().length === 0 || links.size === 0;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="grid max-h-[85vh] gap-4 overflow-y-auto">
        <DialogTitle className="text-panel font-semibold tracking-tight">
          {c.editing.addTitle(typeNames[type] ?? type)}
        </DialogTitle>
        <DialogDescription className="sr-only">{c.editing.addTitle(type)}</DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (invalid) {
              setError(links.size === 0 ? c.editing.chooseOne(requiredName) : c.edit.titleLabel);
              return;
            }
            setBusy(true);
            const res = await onAdd({ type, title, body, links: [...links] });
            setBusy(false);
            if (!res.ok) {
              setError(
                res.code === "link_required"
                  ? c.editing.chooseOne(requiredName)
                  : res.code === "locked"
                    ? c.editing.locked("research")
                    : c.editing.saveFailed,
              );
              return;
            }
            onClose();
          }}
        >
          {types.length > 1 ? (
            <fieldset className="flex gap-2" aria-label={c.inspector.type}>
              {types.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-small">
                  <input
                    type="radio"
                    name="add-type"
                    checked={type === t}
                    onChange={() => {
                      setType(t as AddCardInput["type"]);
                      setLinks(new Set());
                      setError(null);
                    }}
                  />
                  {typeNames[t] ?? t}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="add-title">{c.edit.titleLabel}</Label>
            <Input
              id="add-title"
              value={title}
              maxLength={200}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="add-body">{c.edit.bodyLabel}</Label>
            <Textarea
              id="add-body"
              rows={3}
              value={body}
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <fieldset className="grid gap-1.5" aria-label={c.editing.builtFrom}>
            <legend className="mb-1 text-small font-medium">
              {c.editing.builtFrom} · {requiredName}
            </legend>
            {candidates.length ? (
              <ul className="grid max-h-48 gap-1 overflow-y-auto">
                {candidates.map((n) => {
                  const id = `add-link-${n.id}`;
                  return (
                    <li
                      key={n.id}
                      className="flex items-start gap-2 rounded-sm px-1 py-1 hover:bg-soft"
                    >
                      <Checkbox
                        id={id}
                        checked={links.has(n.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(links);
                          if (v === true) next.add(n.id);
                          else next.delete(n.id);
                          setLinks(next);
                          setError(null);
                        }}
                        className="mt-0.5"
                      />
                      <Label htmlFor={id} className="cursor-pointer text-small font-normal">
                        {cardView(n, false).title}
                      </Label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-small text-muted">{c.editing.noneToLink(requiredName)}</p>
            )}
          </fieldset>
          {error ? (
            <p role="alert" className="text-small text-bad">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {c.edit.cancel}
            </Button>
            <Button
              type="submit"
              loading={busy}
              loadingLabel={c.editing.adding}
              disabledReason={
                candidates.length === 0 ? c.editing.noneToLink(requiredName) : undefined
              }
            >
              {c.editing.add}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** O24 merge cards of one type into one (AC24.6). */
export function MergeDialog({
  nodes,
  onClose,
  onMerge,
}: {
  nodes: TreeNode[];
  onClose: () => void;
  onMerge: (title: string) => Promise<ActionResult<{ id: string }>>;
}) {
  const [title, setTitle] = useState(nodes[0]?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="grid gap-4">
        <DialogTitle className="text-panel font-semibold tracking-tight">
          {c.editing.mergeTitle}
        </DialogTitle>
        <DialogDescription className="text-body text-muted">
          {c.editing.mergeHint}
        </DialogDescription>
        <ul className="grid gap-1 text-small">
          {nodes.map((n) => (
            <li key={n.id} className="truncate rounded-sm bg-soft px-2 py-1">
              {cardView(n, false).title}
            </li>
          ))}
        </ul>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            setBusy(true);
            const res = await onMerge(title.trim());
            setBusy(false);
            if (!res.ok) {
              setError(res.code === "locked" ? c.editing.locked("research") : c.editing.saveFailed);
              return;
            }
            onClose();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="merge-title">{c.editing.mergeLabel}</Label>
            <Input
              id="merge-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-caption text-bad">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {c.edit.cancel}
            </Button>
            <Button
              type="submit"
              loading={busy}
              loadingLabel={c.editing.merging}
              disabledReason={title.trim() ? undefined : c.edit.titleLabel}
            >
              {c.editing.merge}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
