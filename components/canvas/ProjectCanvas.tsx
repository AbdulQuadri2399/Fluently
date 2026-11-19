"use client";

import { ListIcon, TreeStructureIcon } from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import type { ActionResult } from "@/lib/actions/result";
import { formatGbp } from "@/lib/ai/cost";
import type { ProjectTree } from "@/lib/canvas/load";
import type { RunActivity } from "@/lib/canvas/service";
import { LANES, laneOf } from "@/lib/canvas/layout";
import { ActivityPanel } from "./ActivityPanel";
import { RaiseCapDialog } from "./RaiseCapDialog";
import { AddSourceDialog, type AddSourceFns } from "./AddSourceDialog";
import { barState, CheckpointBar } from "./CheckpointBar";
import { canvasCopy as c } from "./copy";
import { Inspector, type HistoryItem, type NodeEvidenceView } from "./Inspector";
import { ListView } from "./ListView";
import { TreeCanvas } from "./TreeCanvas";

export type CanvasActions = {
  startStage: (projectId: string) => Promise<ActionResult<{ stageRunId: string }>>;
  cancelStage: (projectId: string, runId: string) => Promise<ActionResult>;
  reorderNodes: (projectId: string, ids: string[]) => Promise<ActionResult>;
  getNodeHistory: (nodeId: string) => Promise<HistoryItem[]>;
  addSource?: AddSourceFns;
  moveAssets?: (
    projectId: string,
    uploadIds: string[],
    toNodeId: string | null,
  ) => Promise<ActionResult<{ nodeId: string }>>;
  getNodeEvidence?: (nodeId: string) => Promise<NodeEvidenceView>;
  approveResearch?: (
    projectId: string,
    selection: string[],
  ) => Promise<ActionResult<{ checkpointId: string }>>;
  sendBackResearch?: (
    projectId: string,
    feedback: string,
    replaceHuman: boolean,
  ) => Promise<ActionResult<{ stageRunId: string }>>;
  retryResearch?: (
    projectId: string,
    runId: string,
    synthesisOnly: boolean,
  ) => Promise<ActionResult<{ stageRunId: string }>>;
  updateNode: (
    projectId: string,
    input: { nodeId: string; title: string; body: string | null; version: number },
  ) => Promise<ActionResult<{ version: number }>>;
  getRunActivity?: (runId: string) => Promise<RunActivity>;
  getTrace?: (nodeId: string) => Promise<ActionResult<string[]>>;
  confirmOverCap?: (
    projectId: string,
    runId: string,
  ) => Promise<ActionResult<{ stageRunId: string }>>;
  raiseProjectCap?: (
    projectId: string,
    capGbp: number,
  ) => Promise<ActionResult<{ resumedRunId: string | null }>>;
};

export type Budget = { spentGbp: number; capGbp: number };

/** SCR5 project canvas: tree or list, details panel (?node=), decision bar, live updates. */
export function ProjectCanvas({
  tree,
  actions,
  budget = { spentGbp: 0, capGbp: 10 },
}: {
  tree: ProjectTree;
  actions: CanvasActions;
  budget?: Budget;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [raising, setRaising] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("node");
  const view = params.get("view") === "list" ? "list" : "canvas";
  const run = tree.latestRun;
  const active = Boolean(run && (run.status === "queued" || run.status === "running"));
  useRealtimeProject(tree.project.id, active);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const qs = next.toString();
      // Only the address changes; Next keeps useSearchParams in step without a server round trip.
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname],
  );
  const setParam = useCallback(
    (key: string, value: string | null) => setParams({ [key]: value }),
    [setParams],
  );
  // Choosing another card, or none, ends trace mode (AC23.3).
  const selectCard = useCallback(
    (id: string | null) => setParams({ node: id, trace: null }),
    [setParams],
  );

  // Trace mode (AC23.1, AC23.3, MI5): the card ids on the path back to the objectives.
  const traceId = params.get("trace");
  const [trace, setTrace] = useState<{ id: string; ids: string[] } | null>(null);
  const getTrace = actions.getTrace;
  useEffect(() => {
    if (!traceId || !getTrace) return;
    let live = true;
    void getTrace(traceId).then((res) => {
      if (!live) return;
      if (res.ok) setTrace({ id: traceId, ids: res.data });
      else {
        toast.error(c.trace.failed);
        setParams({ trace: null });
      }
    });
    return () => {
      live = false;
    };
    // The tree changing under a trace (new lines, deleted cards) re-reads the path.
  }, [traceId, getTrace, tree.edges.length, tree.nodes.length, setParams]);
  const tracing = Boolean(traceId && trace?.id === traceId);
  const tracePath = useMemo(() => (tracing && trace ? new Set(trace.ids) : null), [tracing, trace]);
  // Listed from the traced card back to the objectives (AC23.1): later lanes first.
  const traceNodes = useMemo(() => {
    if (!tracePath) return null;
    return tree.nodes
      .filter((n) => tracePath.has(n.id))
      .sort(
        (a, b) =>
          LANES.indexOf(laneOf(b.type)) - LANES.indexOf(laneOf(a.type)) ||
          a.sortOrder - b.sortOrder,
      );
  }, [tracePath, tree.nodes]);

  const selected = tree.nodes.find((n) => n.id === selectedId) ?? null;
  const [adding, setAdding] = useState(false);
  const opportunities = tree.nodes
    .filter((n) => n.type === "opportunity")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((o) => ({
      id: o.id,
      title: o.title,
      confidence: (o.confidence as "High" | "Med" | "Low" | null) ?? null,
      themes: tree.edges.filter(
        (e) => e.to === o.id && tree.nodes.find((n) => n.id === e.from)?.type === "theme",
      ).length,
      principles: ((o.data as { principles?: string[] }).principles ?? []).slice(0, 3),
    }));
  const ethicsRunning = Boolean(run && run.stage === "ethics" && active);
  const state = barState({
    intakeApproved: tree.intakeApproved,
    currentStage: tree.project.currentStage,
    nodes: tree.nodes,
    latestRun: run,
    hasToolkit: tree.hasToolkit,
    isAdmin: tree.isAdmin,
  });

  return (
    <div className="relative h-full min-h-[560px]">
      <div
        className={`absolute top-[52px] z-20 flex rounded-md border border-line bg-surface p-0.5 shadow-elev-1 ${selected ? "right-[400px]" : "right-4"}`}
      >
        <button
          type="button"
          aria-pressed={view === "canvas"}
          onClick={() => setParam("view", null)}
          className="flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-small text-muted aria-pressed:bg-canvas aria-pressed:text-ink [&_svg]:size-4"
        >
          <TreeStructureIcon aria-hidden="true" />
          {c.canvasView}
        </button>
        <button
          type="button"
          aria-pressed={view === "list"}
          onClick={() => setParam("view", "list")}
          className="flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-small text-muted aria-pressed:bg-canvas aria-pressed:text-ink [&_svg]:size-4"
        >
          <ListIcon aria-hidden="true" />
          {c.listView}
        </button>
      </div>
      {view === "list" ? (
        <div className="h-full overflow-y-auto pt-12 pb-32">
          <ListView
            nodes={tree.nodes}
            running={ethicsRunning}
            selectedId={selectedId}
            onSelect={(id) => selectCard(id)}
          />
        </div>
      ) : (
        <TreeCanvas
          nodes={tree.nodes}
          edges={tree.edges}
          running={ethicsRunning}
          selectedId={selectedId}
          onSelect={(id) => selectCard(id)}
          onAddCard={() => toast(c.addCardLater)}
          onAddSource={actions.addSource ? () => setAdding(true) : undefined}
          onMoveAssets={
            actions.moveAssets
              ? (ids, to) =>
                  void actions.moveAssets!(tree.project.id, ids, to).then((res) => {
                    if (!res.ok) toast.error(c.edit.saveFailed);
                    router.refresh();
                  })
              : undefined
          }
          runningRunId={active ? (run?.id ?? null) : null}
          tracePath={tracePath}
          onReorder={(_, ids) =>
            void actions.reorderNodes(tree.project.id, ids).then(() => router.refresh())
          }
        />
      )}
      {selected ? (
        <Inspector
          node={selected}
          nodes={tree.nodes}
          edges={tree.edges}
          running={ethicsRunning}
          runningStage={active ? (run?.stage ?? null) : null}
          loadHistory={actions.getNodeHistory}
          loadEvidence={actions.getNodeEvidence}
          onClose={() => selectCard(null)}
          onSelect={(id) => selectCard(id)}
          projectId={tree.project.id}
          onSave={async (input) => {
            const res = await actions.updateNode(tree.project.id, input);
            if (res.ok) router.refresh();
            return res;
          }}
          onSeeLatest={() => router.refresh()}
          onTrace={
            actions.getTrace ? (on) => setParams({ trace: on ? selected.id : null }) : undefined
          }
          tracePath={tracing && selected.id === traceId ? traceNodes : null}
        />
      ) : null}
      {actions.addSource ? (
        <AddSourceDialog
          open={adding}
          onOpenChange={setAdding}
          fns={actions.addSource}
          onAdded={() => {
            toast(c.addSource.added);
            router.refresh();
          }}
        />
      ) : null}
      <CheckpointBar
        projectId={tree.project.id}
        state={state}
        onStart={async () => {
          await actions.startStage(tree.project.id);
          router.refresh();
        }}
        onCancel={async (runId) => {
          await actions.cancelStage(tree.project.id, runId);
          router.refresh();
        }}
        opportunities={opportunities}
        hasFindings={tree.nodes.some((n) => n.type === "finding")}
        onApprove={
          actions.approveResearch
            ? async (selection) => {
                const res = await actions.approveResearch!(tree.project.id, selection);
                router.refresh();
                return res.ok;
              }
            : undefined
        }
        onSendBack={
          actions.sendBackResearch
            ? async (feedback, replace) => {
                const res = await actions.sendBackResearch!(tree.project.id, feedback, replace);
                router.refresh();
                return res.ok;
              }
            : undefined
        }
        onRetry={
          actions.retryResearch
            ? async (runId, synthesisOnly) => {
                await actions.retryResearch!(tree.project.id, runId, synthesisOnly);
                router.refresh();
              }
            : undefined
        }
        onOpenActivity={actions.getRunActivity ? () => setActivityOpen(true) : undefined}
        capLabel={formatGbp(budget.capGbp)}
        onContinueOverCap={
          actions.confirmOverCap
            ? async (runId) => {
                const res = await actions.confirmOverCap!(tree.project.id, runId);
                if (!res.ok) toast.error(c.edit.saveFailed);
                router.refresh();
              }
            : undefined
        }
        onRaiseCap={actions.raiseProjectCap ? () => setRaising(true) : undefined}
      />
      {actions.getRunActivity && run && run.stage === "research" ? (
        <ActivityPanel
          open={activityOpen}
          onOpenChange={setActivityOpen}
          runId={run.id}
          active={active}
          load={actions.getRunActivity}
        />
      ) : null}
      {actions.raiseProjectCap ? (
        <RaiseCapDialog
          open={raising}
          onOpenChange={setRaising}
          spentGbp={budget.spentGbp}
          capGbp={budget.capGbp}
          onSave={async (cap) => {
            const res = await actions.raiseProjectCap!(tree.project.id, cap);
            router.refresh();
            return res.ok;
          }}
        />
      ) : null}
    </div>
  );
}
