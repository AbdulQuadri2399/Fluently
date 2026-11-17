"use client";

import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  CheckIcon,
  MinusIcon,
  PulseIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { stageNames } from "@/components/projects/copy";
import { Button } from "@/components/ui/button";
import type { RunInfo, TreeNode } from "@/lib/canvas/load";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";
import { ResearchCheckpoint, type OpportunityOption } from "./ResearchCheckpoint";

export type BarState =
  | { kind: "intakeFirst" }
  | { kind: "ethicsRunning" }
  | { kind: "ethicsWaiting" }
  | { kind: "ethicsFailed" }
  | { kind: "readyResearch"; noToolkit: null | "admin" | "member" }
  | { kind: "running"; run: RunInfo }
  | { kind: "partial"; run: RunInfo }
  | { kind: "failed"; run: RunInfo }
  | { kind: "cancelled"; run: RunInfo }
  | { kind: "researchDone" }
  | { kind: "choose"; run: RunInfo; partial: boolean }
  | { kind: "solutionsNext" }
  | { kind: "pausedCost"; run: RunInfo; isAdmin: boolean };

/** Works out what the decision bar should say from the project's state (SCR8). */
export function barState(input: {
  intakeApproved: boolean;
  currentStage: string;
  nodes: TreeNode[];
  latestRun: RunInfo | null;
  hasToolkit: boolean;
  isAdmin: boolean;
}): BarState {
  const { latestRun: run } = input;
  if (!input.intakeApproved) return { kind: "intakeFirst" };
  if (run && (run.status === "queued" || run.status === "running")) {
    return run.stage === "ethics" ? { kind: "ethicsRunning" } : { kind: "running", run };
  }
  if (run?.status === "paused_cost") return { kind: "pausedCost", run, isAdmin: input.isAdmin };
  if (input.currentStage === "solutions") return { kind: "solutionsNext" };
  const ethics = input.nodes.find((n) => n.type === "ethics");
  if (!ethics || ethics.status === "failed") return { kind: "ethicsFailed" };
  if (ethics.status === "flagged") return { kind: "ethicsWaiting" };
  if (run?.stage === "research") {
    const hasOpportunities = input.nodes.some((n) => n.type === "opportunity");
    if ((run.status === "succeeded" || run.status === "partial") && hasOpportunities) {
      return { kind: "choose", run, partial: run.status === "partial" };
    }
    if (run.status === "succeeded") return { kind: "researchDone" };
    if (run.status === "partial") return { kind: "partial", run };
    if (run.status === "failed") return { kind: "failed", run };
    if (run.status === "cancelled") return { kind: "cancelled", run };
  }
  return {
    kind: "readyResearch",
    noToolkit: input.hasToolkit ? null : input.isAdmin ? "admin" : "member",
  };
}

export type PanelSize = "minimised" | "standard" | "expanded";
const SIZE_KEY = "fluently.checkpointSize";
const SIZE_EVENT = "fluently:checkpoint-size";

/** AC25.5: the panel size is remembered in this browser for the signed-in person. */
function usePanelSize(): [PanelSize, (s: PanelSize) => void] {
  const size = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(SIZE_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(SIZE_EVENT, onChange);
      };
    },
    (): PanelSize => {
      try {
        const v = window.localStorage.getItem(SIZE_KEY);
        return v === "minimised" || v === "expanded" ? v : "standard";
      } catch {
        return "standard";
      }
    },
    (): PanelSize => "standard",
  );
  const set = (next: PanelSize) => {
    try {
      window.localStorage.setItem(SIZE_KEY, next);
    } catch {
      // Private windows: the size still changes for this visit.
    }
    window.dispatchEvent(new Event(SIZE_EVENT));
  };
  return [size, set];
}

function elapsed(from: string | null, now: number) {
  if (!from) return "0:00";
  const s = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** SCR8 decision bar (AC25.1, AC25.3, AC2.4, MI4, MI8): what's done, what to decide, one main action. */
export function CheckpointBar({
  projectId,
  state,
  onStart,
  onCancel,
  opportunities = [],
  hasFindings = false,
  onApprove,
  onSendBack,
  onRetry,
  onOpenActivity,
  capLabel = "£10.00",
  onContinueOverCap,
  onRaiseCap,
}: {
  projectId: string;
  state: BarState;
  onStart: () => Promise<void>;
  onCancel: (runId: string) => Promise<void>;
  opportunities?: OpportunityOption[];
  hasFindings?: boolean;
  onApprove?: (selection: string[]) => Promise<boolean>;
  onSendBack?: (feedback: string, replaceHuman: boolean) => Promise<boolean>;
  onRetry?: (runId: string, synthesisOnly: boolean) => Promise<void>;
  /** Opens "See what it's doing" for the latest research run (AC11.10). */
  onOpenActivity?: () => void;
  /** The project's AI budget, formatted (AC27.4). */
  capLabel?: string;
  onContinueOverCap?: (runId: string) => Promise<void>;
  /** Admins only: opens the raise-budget dialog. */
  onRaiseCap?: () => void;
}) {
  const [size, setSize] = usePanelSize();
  const [chosen, setChosen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const runningRun = state.kind === "running" ? state.run : null;
  useEffect(() => {
    if (!runningRun) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningRun]);

  const brief = (
    <Button asChild variant="secondary">
      <Link href={`/projects/${projectId}/brief`}>
        {state.kind === "intakeFirst" ? c.checkpoint.goToBrief : c.checkpoint.review}
      </Link>
    </Button>
  );
  const start = (label: string) => (
    <Button
      loading={busy}
      loadingLabel={c.checkpoint.starting}
      disabledReason={
        state.kind === "readyResearch" && state.noToolkit
          ? state.noToolkit === "admin"
            ? c.checkpoint.noToolkit
            : c.checkpoint.noToolkitMember
          : undefined
      }
      onClick={async () => {
        setBusy(true);
        await onStart();
        setBusy(false);
      }}
    >
      {label}
    </Button>
  );

  const retryButton = (
    runId: string,
    synthesisOnly: boolean,
    label: string,
    variant: "primary" | "secondary" = "primary",
  ) => (
    <Button
      key={label}
      variant={variant}
      loading={busy}
      loadingLabel={c.checkpoint.starting}
      onClick={async () => {
        setBusy(true);
        await onRetry?.(runId, synthesisOnly);
        setBusy(false);
      }}
    >
      {label}
    </Button>
  );

  let message: string;
  let action: React.ReactNode = null;
  let steps: RunInfo["steps"] | null = null;
  switch (state.kind) {
    case "intakeFirst":
      message = c.intakeFirst;
      action = brief;
      break;
    case "ethicsRunning":
      message = c.checkpoint.ethicsRunning;
      break;
    case "ethicsWaiting":
      message = c.checkpoint.ethicsWaiting;
      action = brief;
      break;
    case "ethicsFailed":
      message = c.checkpoint.ethicsFailed;
      action = brief;
      break;
    case "readyResearch":
      message = state.noToolkit
        ? state.noToolkit === "admin"
          ? c.checkpoint.noToolkit
          : c.checkpoint.noToolkitMember
        : c.checkpoint.readyResearch;
      action =
        state.noToolkit === "admin" ? (
          <Button asChild>
            <Link href="/toolkit">{c.checkpoint.uploadToolkit}</Link>
          </Button>
        ) : (
          start(c.checkpoint.startResearch)
        );
      break;
    case "running":
      message = c.checkpoint.running(
        stageNames[state.run.stage] ?? state.run.stage,
        elapsed(state.run.startedAt, now),
      );
      steps = state.run.steps;
      action = (
        <Button
          variant="secondary"
          loading={busy}
          loadingLabel={c.checkpoint.cancelling}
          onClick={async () => {
            setBusy(true);
            await onCancel(state.run.id);
            setBusy(false);
          }}
        >
          {c.checkpoint.cancel}
        </Button>
      );
      break;
    case "partial":
      message = c.checkpoint.partialFail(
        state.run.steps
          .filter((s) => s.status === "failed")
          .map((s) => c.researchSteps[s.key] ?? s.key)
          .join(", "),
      );
      steps = state.run.steps;
      action = retryButton(state.run.id, false, c.checkpoint.retryFailed);
      break;
    case "failed":
      message = c.checkpoint.failed(stageNames[state.run.stage] ?? state.run.stage);
      steps = state.run.steps;
      action =
        state.run.stage === "research" && onRetry ? (
          <span className="flex gap-2">
            {hasFindings
              ? retryButton(state.run.id, true, c.checkpoint.retrySynthesis, "secondary")
              : null}
            {retryButton(state.run.id, false, c.checkpoint.retry)}
          </span>
        ) : (
          start(c.checkpoint.retry)
        );
      break;
    case "solutionsNext":
      message = c.checkpoint.solutionsNext;
      break;
    case "choose":
      message = "";
      break;
    case "cancelled":
      message = c.checkpoint.cancelled(stageNames[state.run.stage] ?? state.run.stage);
      action = start(c.checkpoint.startResearch);
      break;
    case "researchDone":
      message = c.checkpoint.researchDone;
      break;
    case "pausedCost":
      message = c.atCap(capLabel);
      steps = state.run.steps;
      action = (
        <span className="flex gap-2">
          {state.isAdmin && onRaiseCap ? (
            <Button variant="secondary" onClick={onRaiseCap}>
              {c.budget.raise}
            </Button>
          ) : null}
          <Button
            loading={busy}
            loadingLabel={c.budget.continuing}
            onClick={async () => {
              setBusy(true);
              await onContinueOverCap?.(state.run.id);
              setBusy(false);
            }}
          >
            {c.budget.continue}
          </Button>
        </span>
      );
      break;
  }
  const activityButton =
    onOpenActivity && "run" in state && state.run.stage === "research" ? (
      <button
        type="button"
        onClick={onOpenActivity}
        className="mr-auto inline-flex items-center gap-1 rounded-xs px-1.5 py-1 text-caption text-muted hover:bg-soft hover:text-ink"
      >
        <PulseIcon aria-hidden="true" className="size-3.5" />
        {c.activity.open}
      </button>
    ) : null;

  const sizeButton = (to: PanelSize) => {
    const label =
      to === "minimised"
        ? c.panel.minimise
        : to === "expanded"
          ? c.panel.expand
          : size === "minimised"
            ? c.checkpoint.expand
            : c.panel.standard;
    const Icon =
      to === "minimised" ? MinusIcon : to === "expanded" ? ArrowsOutSimpleIcon : ArrowsInSimpleIcon;
    return (
      <button
        key={to}
        type="button"
        onClick={() => setSize(to)}
        className="inline-flex items-center gap-1 rounded-xs px-1.5 py-1 text-caption text-muted hover:bg-soft hover:text-ink"
      >
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </button>
    );
  };
  const minimised = size === "minimised";
  const expanded = size === "expanded";
  return (
    <section
      aria-label={c.checkpoint.panelName}
      data-size={size}
      className={cn(
        "absolute left-1/2 z-10 grid -translate-x-1/2 gap-3 rounded-[10px] border border-line bg-surface p-4 shadow-elev-1 duration-base animate-in fade-in-0",
        expanded
          ? "top-14 bottom-4 w-[960px] max-w-[calc(100%-2rem)] content-start overflow-y-auto"
          : "bottom-4 w-[780px] max-w-[calc(100%-2rem)]",
        minimised && "py-2.5",
      )}
    >
      {minimised ? (
        <div className="flex items-center gap-4">
          <p aria-live="polite" className="flex-1 truncate text-small">
            {state.kind === "choose"
              ? `${c.checkpoint.chooseOpportunities} · ${c.checkpoint.selected(chosen)}`
              : message}
          </p>
          {sizeButton("standard")}
          {sizeButton("expanded")}
          {state.kind === "choose" ? null : action}
        </div>
      ) : (
        <div className="-my-1 flex justify-end gap-1">
          {activityButton}
          {sizeButton("minimised")}
          {expanded ? sizeButton("standard") : sizeButton("expanded")}
        </div>
      )}
      {/* Minimised keeps the content mounted (hidden), so choices and typed feedback survive. */}
      <div className="contents" hidden={minimised}>
        {state.kind === "choose" && onApprove && onSendBack ? (
          <ResearchCheckpoint
            opportunities={opportunities}
            note={
              state.partial ? (
                <div className="flex items-center gap-3 rounded-sm bg-warn-bg px-3 py-2 text-small text-warn">
                  <span className="flex-1">
                    {c.checkpoint.partialFail(
                      state.run.steps
                        .filter((s) => s.status === "failed")
                        .map((s) => c.researchSteps[s.key] ?? s.key)
                        .join(", "),
                    )}
                  </span>
                  {retryButton(state.run.id, false, c.checkpoint.retryFailed, "secondary")}
                </div>
              ) : null
            }
            onApprove={onApprove}
            onSendBack={onSendBack}
            onSelectionChange={setChosen}
            expanded={expanded}
          />
        ) : null}
        <div className={cn("flex items-center gap-4", state.kind === "choose" && "hidden")}>
          <p aria-live="polite" className="flex-1 text-small">
            {state.kind === "ethicsRunning" || state.kind === "running" ? (
              <span
                aria-hidden="true"
                className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-line-strong border-t-ink align-[-1px]"
              />
            ) : null}
            {message}
          </p>
          {action}
        </div>
        {steps?.length ? (
          <ol
            aria-live="polite"
            className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-3 text-caption"
          >
            {steps.map((s) => (
              <li
                key={s.key}
                className={cn("flex items-center gap-1.5", s.status === "waiting" && "text-muted")}
              >
                {s.status === "done" ? (
                  <CheckIcon aria-hidden="true" weight="bold" className="size-3 text-ok" />
                ) : s.status === "failed" ? (
                  <XIcon aria-hidden="true" weight="bold" className="size-3 text-bad" />
                ) : s.status === "running" ? (
                  <span
                    aria-hidden="true"
                    className="size-2.5 animate-spin rounded-full border-2 border-line-strong border-t-ink"
                  />
                ) : (
                  <span aria-hidden="true" className="size-2 rounded-full bg-line-strong" />
                )}
                <span>
                  {c.researchSteps[s.key] ?? s.key}: {c.stepStatus[s.status]}
                  {s.status === "done" && s.count !== undefined ? ` · ${s.count}` : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
