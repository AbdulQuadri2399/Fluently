"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";
import { StrengthTag } from "./StrengthTag";

export type OpportunityOption = {
  id: string;
  title: string;
  confidence: "High" | "Med" | "Low" | null;
  themes: number;
  principles: string[];
};

/**
 * SCR8 research checkpoint (AC14.1–AC14.3, AC25.2, EC4, EC13): every opportunity listed with its
 * confidence, themes and candidate principles; none chosen in advance; approve needs at least one.
 */
export function ResearchCheckpoint({
  opportunities,
  note,
  onApprove,
  onSendBack,
  onSelectionChange,
  expanded = false,
}: {
  opportunities: OpportunityOption[];
  /** e.g. the partial-failure message with Retry failed steps (AC11.5). */
  note?: React.ReactNode;
  onApprove: (selection: string[]) => Promise<boolean>;
  onSendBack: (feedback: string, replaceHuman: boolean) => Promise<boolean>;
  /** The panel shows the count when minimised (AC25.5). */
  onSelectionChange?: (count: number) => void;
  /** Full-height panel: the list isn't capped. */
  expanded?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<null | "approve" | "send">(null);
  const [sendingBack, setSendingBack] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [replace, setReplace] = useState(false);
  const allLow = opportunities.length > 0 && opportunities.every((o) => o.confidence === "Low");
  const short = feedback.trim().length < 10;

  return (
    <div className="grid gap-3">
      <p className="text-small font-medium">{c.checkpoint.chooseOpportunities}</p>
      {note}
      {allLow ? (
        <p className="rounded-sm bg-warn-bg px-3 py-2 text-small text-warn">
          {c.checkpoint.allLow}
        </p>
      ) : null}
      <ul className={cn("grid gap-1", !expanded && "max-h-56 overflow-y-auto")}>
        {opportunities.map((o) => {
          const id = `opp-${o.id}`;
          return (
            <li key={o.id} className="flex items-start gap-3 rounded-sm px-2 py-2 hover:bg-soft">
              <Checkbox
                id={id}
                checked={selected.has(o.id)}
                onCheckedChange={(v) => {
                  const next = new Set(selected);
                  if (v === true) next.add(o.id);
                  else next.delete(o.id);
                  setSelected(next);
                  onSelectionChange?.(next.size);
                }}
                className="mt-0.5"
              />
              <Label htmlFor={id} className="grid flex-1 cursor-pointer gap-0.5 font-normal">
                <span className="text-small font-medium">{o.title}</span>
                <span className="text-caption text-muted">
                  {c.checkpoint.themesCount(o.themes)}
                  {o.principles.length ? ` · ${o.principles.join(", ")}` : ""}
                </span>
              </Label>
              {o.confidence ? <StrengthTag level={o.confidence} of="confidence" /> : null}
            </li>
          );
        })}
      </ul>
      {sendingBack ? (
        <div className="grid gap-2 border-t border-line pt-3">
          <Label htmlFor="send-back-feedback">{c.checkpoint.feedbackLabel}</Label>
          <Textarea
            id="send-back-feedback"
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            aria-describedby="send-back-help"
          />
          <p id="send-back-help" className="text-caption text-muted">
            {feedback.length > 0 && short ? c.checkpoint.feedbackShort : null}
          </p>
          <label className="flex items-center gap-2 text-small">
            <Checkbox checked={replace} onCheckedChange={(v) => setReplace(v === true)} />
            {c.checkpoint.replaceHuman}
          </label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={busy === "send"}
              loadingLabel={c.checkpoint.sending}
              disabledReason={short ? c.checkpoint.feedbackShort : undefined}
              onClick={async () => {
                setBusy("send");
                const ok = await onSendBack(feedback.trim(), replace);
                setBusy(null);
                if (ok) setSendingBack(false);
              }}
            >
              {c.checkpoint.sendBackSubmit}
            </Button>
            <Button variant="ghost" onClick={() => setSendingBack(false)}>
              {c.edit.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
          <span className="mr-auto text-caption text-muted">
            {c.checkpoint.selected(selected.size)}
          </span>
          <Button variant="ghost" onClick={() => setSendingBack(true)}>
            {c.checkpoint.sendBack}
          </Button>
          <Button
            loading={busy === "approve"}
            loadingLabel={c.checkpoint.approving}
            disabledReason={selected.size === 0 ? c.checkpoint.selectAtLeastOne : undefined}
            onClick={async () => {
              setBusy("approve");
              await onApprove([...selected]);
              setBusy(null);
            }}
          >
            {c.checkpoint.approveSolutions}
          </Button>
        </div>
      )}
    </div>
  );
}
