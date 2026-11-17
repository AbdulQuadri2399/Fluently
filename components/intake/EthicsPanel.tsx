"use client";

import { CheckIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mi } from "@/lib/motion";
import { ethicsCopy as c } from "./copy";

export type EthicsView =
  | { state: "running" }
  | { state: "passed" }
  | { state: "failed" }
  | { state: "flagged"; nodeId: string; reasons: { rule: string; reason: string }[] }
  | {
      state: "overridden";
      reasons: { rule: string; reason: string }[];
      overrideReason: string;
      initials: string;
    };

function Reasons({ reasons }: { reasons: { rule: string; reason: string }[] }) {
  return (
    <ul className="grid gap-2">
      {reasons.map((r, i) => (
        <li key={i} className="text-small">
          <span className="font-medium">{r.rule}.</span> {r.reason}
        </li>
      ))}
    </ul>
  );
}

/** Ethics result on the brief (SCR6 ethics states, AC10.2, AC10.3, AC10.5, AC26.1–AC26.3, MI11). */
export function EthicsPanel({
  view,
  onEditBrief,
  onOverride,
  onRetry,
}: {
  view: EthicsView;
  onEditBrief: () => void;
  onOverride: (nodeId: string, reason: string) => Promise<boolean>;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const short = reason.trim().length < 20;

  if (view.state === "running") {
    return (
      <section
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border border-line bg-surface p-5 text-small"
      >
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink"
        />
        {c.checking}
      </section>
    );
  }
  if (view.state === "passed") {
    return (
      <section
        aria-live="polite"
        className="grid gap-2 rounded-lg border border-line bg-surface p-5"
      >
        <Badge kind="status" tone="ok" className="w-fit">
          <CheckIcon aria-hidden="true" weight="bold" />
          {c.passed}
        </Badge>
        <p className="text-body">{c.readyResearch}</p>
      </section>
    );
  }
  if (view.state === "failed") {
    return (
      <section
        role="alert"
        className="grid justify-items-start gap-3 rounded-lg border border-line bg-surface p-5"
      >
        <p className="flex items-center gap-2 text-body text-bad">
          <WarningCircleIcon aria-hidden="true" className="size-4" />
          {c.checkFailed}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {c.tryAgain}
        </Button>
      </section>
    );
  }
  if (view.state === "overridden") {
    return (
      <section className="grid gap-3 rounded-lg border border-line bg-surface p-5">
        <Badge kind="status" tone="info" className={`w-fit ${mi.badgeSwap}`}>
          {c.overridden(view.initials)}
        </Badge>
        <Reasons reasons={view.reasons} />
        <blockquote className="border-l-2 border-line-strong pl-3 text-small text-muted">
          {view.overrideReason}
        </blockquote>
        <p className="text-body">{c.readyResearch}</p>
      </section>
    );
  }
  return (
    <section
      aria-labelledby="ethics-flagged"
      className="grid gap-4 rounded-lg border border-line bg-warn-bg/60 p-5"
    >
      <h2 id="ethics-flagged" className="flex items-center gap-2 text-lead font-semibold text-warn">
        <WarningCircleIcon aria-hidden="true" className="size-5" />
        {c.flaggedTitle}
      </h2>
      <Reasons reasons={view.reasons} />
      {open ? (
        <div className="grid gap-1.5">
          <Label htmlFor="override-reason">{c.reasonLabel}</Label>
          <Textarea
            id="override-reason"
            value={reason}
            rows={3}
            aria-describedby="override-help"
            onChange={(e) => setReason(e.target.value)}
          />
          <p id="override-help" className="text-caption text-muted">
            {reason.length > 0 && short ? c.reasonTooShort : c.reasonHelp}{" "}
            <span className="font-mono">{reason.trim().length}/20</span>
          </p>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onEditBrief}>
          {c.editBrief}
        </Button>
        {open ? (
          <Button
            loading={saving}
            disabledReason={short ? c.reasonTooShort : undefined}
            onClick={async () => {
              setSaving(true);
              const ok = await onOverride(view.nodeId, reason.trim());
              setSaving(false);
              if (ok) setOpen(false);
            }}
          >
            {c.recordOverride}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            {c.override}
          </Button>
        )}
      </div>
    </section>
  );
}
