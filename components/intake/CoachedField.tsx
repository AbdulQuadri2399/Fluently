"use client";

import { SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { CoachOutput } from "@/lib/ai/schemas";
import { mi } from "@/lib/motion";
import type { CoachedField as Field } from "@/lib/schemas/intake";
import { cn } from "@/lib/utils";
import { intakeCopy as c } from "./copy";

export type CoachState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "suggestion"; output: CoachOutput };

/** One coached brief field (AC8.2–AC8.5): text box, then a suggestion card after leaving it. */
export function CoachedField({
  field,
  value,
  maxLength,
  coach,
  lowSpecificity,
  disabled,
  textareaRef,
  onChange,
  onBlur,
  onUse,
  onEdit,
  onKeep,
}: {
  field: Field;
  value: string;
  maxLength: number;
  coach: CoachState;
  lowSpecificity: boolean;
  disabled?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onChange: (v: string) => void;
  onBlur: () => void;
  onUse: () => void;
  onEdit: () => void;
  onKeep: () => void;
}) {
  const reduced = useReducedMotion();
  const id = `intake-${field}`;
  const copy = c.fields[field];
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{copy.label}</Label>
        {lowSpecificity ? (
          <Badge kind="status" tone="warn">
            {c.lowSpecificity}
          </Badge>
        ) : null}
      </div>
      <Textarea
        id={id}
        ref={textareaRef}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        aria-describedby={`${id}-help`}
        rows={field.endsWith("_objective") ? 2 : 3}
        className="min-h-0 resize-y text-body"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <p id={`${id}-help`} className="text-caption text-muted">
        {lowSpecificity ? c.lowSpecificityNote : copy.help}
      </p>
      {coach.status === "loading" ? (
        <p role="status" className="flex items-center gap-2 text-small text-muted">
          <span
            aria-hidden="true"
            className="size-3 animate-spin rounded-full border-2 border-line-strong border-t-ink"
          />
          {c.coachLoading}
        </p>
      ) : null}
      {coach.status === "unavailable" ? (
        <p role="status" className="flex items-center gap-2 text-small text-muted">
          <WarningCircleIcon aria-hidden="true" className="size-4" />
          {c.coachUnavailable}
        </p>
      ) : null}
      {coach.status === "suggestion" ? (
        <section
          aria-label={`${c.suggested}: ${copy.label}`}
          data-testid={`suggestion-${field}`}
          className={cn(
            "grid gap-2 rounded-md bg-soft p-4",
            reduced ? mi.suggestionInReduced : mi.suggestionIn,
          )}
        >
          <p className="flex items-center gap-1.5 text-caption font-medium text-muted">
            <SparkleIcon aria-hidden="true" weight="bold" className="size-3.5" />
            {c.suggested}
          </p>
          <p className="text-body">{coach.output.suggestion}</p>
          <p className="text-small text-muted">{c.why(coach.output.reason)}</p>
          <div className="mt-1 flex gap-2">
            <Button size="sm" onClick={onUse}>
              {c.useSuggestion}
            </Button>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              {c.editSuggestion}
            </Button>
            <Button size="sm" variant="ghost" onClick={onKeep}>
              {c.keepMine}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
