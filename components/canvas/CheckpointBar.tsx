"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { stageNames } from "@/components/projects/copy";
import { Button } from "@/components/ui/button";
import type { RunInfo, TreeNode } from "@/lib/canvas/load";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";

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
  | { kind: "researchDone" };

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
  const ethics = input.nodes.find((n) => n.type === "ethics");
  if (!ethics || ethics.status === "failed") return { kind: "ethicsFailed" };
  if (ethics.status === "flagged") return { kind: "ethicsWaiting" };
  if (run?.stage === "research") {
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
}: {
  projectId: string;
  state: BarState;
  onStart: () => Promise<void>;
  onCancel: (runId: string) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
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
      action = start(c.checkpoint.retry);
      break;
    case "failed":
      message = c.checkpoint.failed(stageNames[state.run.stage] ?? state.run.stage);
      steps = state.run.steps;
      action = start(c.checkpoint.retry);
      break;
    case "cancelled":
      message = c.checkpoint.cancelled(stageNames[state.run.stage] ?? state.run.stage);
      action = start(c.checkpoint.startResearch);
      break;
    case "researchDone":
      message = c.checkpoint.researchDone;
      break;
  }

  if (collapsed) {
    return (
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <Button variant="secondary" onClick={() => setCollapsed(false)}>
          {c.checkpoint.expand}
        </Button>
      </div>
    );
  }
  return (
    <section
      aria-label={c.checkpoint.expand}
      className="absolute bottom-4 left-1/2 z-10 grid w-[780px] max-w-[calc(100%-2rem)] -translate-x-1/2 gap-3 rounded-[10px] border border-line bg-surface p-4 shadow-elev-1 duration-base animate-in fade-in-0"
    >
      <div className="flex items-center gap-4">
        <p aria-live="polite" className="flex-1 text-small">
          {state.kind === "ethicsRunning" || state.kind === "running" ? (
            <span
              aria-hidden="true"
              className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-line-strong border-t-ink align-[-1px]"
            />
          ) : null}
          {message}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-caption text-muted hover:text-ink"
        >
          {c.checkpoint.collapse}
        </button>
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
    </section>
  );
}
