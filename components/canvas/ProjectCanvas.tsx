"use client";

import { ListIcon, TreeStructureIcon } from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import type { ActionResult } from "@/lib/actions/result";
import type { ProjectTree } from "@/lib/canvas/load";
import { AddSourceDialog, type AddSourceFns } from "./AddSourceDialog";
import { barState, CheckpointBar } from "./CheckpointBar";
import { canvasCopy as c } from "./copy";
import { Inspector, type HistoryItem } from "./Inspector";
import { ListView } from "./ListView";
import { TreeCanvas } from "./TreeCanvas";

export type CanvasActions = {
  startStage: (projectId: string) => Promise<ActionResult<{ stageRunId: string }>>;
  cancelStage: (projectId: string, runId: string) => Promise<ActionResult>;
  reorderNodes: (projectId: string, ids: string[]) => Promise<ActionResult>;
  getNodeHistory: (nodeId: string) => Promise<HistoryItem[]>;
  addSource?: AddSourceFns;
  updateNode: (
    projectId: string,
    input: { nodeId: string; title: string; body: string | null; version: number },
  ) => Promise<ActionResult<{ version: number }>>;
};

/** SCR5 project canvas: tree or list, details panel (?node=), decision bar, live updates. */
export function ProjectCanvas({ tree, actions }: { tree: ProjectTree; actions: CanvasActions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("node");
  const view = params.get("view") === "list" ? "list" : "canvas";
  const run = tree.latestRun;
  const active = Boolean(run && (run.status === "queued" || run.status === "running"));
  useRealtimeProject(tree.project.id, active);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      // Only the address changes; Next keeps useSearchParams in step without a server round trip.
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname],
  );

  const selected = tree.nodes.find((n) => n.id === selectedId) ?? null;
  const [adding, setAdding] = useState(false);
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
            onSelect={(id) => setParam("node", id)}
          />
        </div>
      ) : (
        <TreeCanvas
          nodes={tree.nodes}
          edges={tree.edges}
          running={ethicsRunning}
          selectedId={selectedId}
          onSelect={(id) => setParam("node", id)}
          onAddCard={() => toast(c.addCardLater)}
          onAddSource={actions.addSource ? () => setAdding(true) : undefined}
          runningRunId={active ? (run?.id ?? null) : null}
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
          onClose={() => setParam("node", null)}
          onSelect={(id) => setParam("node", id)}
          projectId={tree.project.id}
          onSave={async (input) => {
            const res = await actions.updateNode(tree.project.id, input);
            if (res.ok) router.refresh();
            return res;
          }}
          onSeeLatest={() => router.refresh()}
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
      />
    </div>
  );
}
