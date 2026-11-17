"use client";

import "@xyflow/react/dist/style.css";
import { ArrowsOutIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import {
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChangeset,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import {
  CARD_H,
  LANE_PAD,
  LANE_W,
  LANES,
  laneX,
  layoutTree,
  nextFocus,
  TOP,
  type Lane,
} from "@/lib/canvas/layout";
import type { TreeEdge, TreeNode } from "@/lib/canvas/load";
import { canvasCopy as c, laneNames } from "./copy";
import { DashedEdge } from "./DashedEdge";
import { NodeCard, type CardData } from "./NodeCard";

const nodeTypes = { card: NodeCard, lane: LaneBackground };
const edgeTypes = { dashed: DashedEdge };

function LaneBackground({ data }: { data: { height: number } }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg bg-canvas"
      style={{ width: LANE_W, height: data.height }}
    />
  );
}

type Props = {
  nodes: TreeNode[];
  edges: TreeEdge[];
  running: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder?: (id: string, laneOrder: string[]) => void;
  onAddCard?: (lane: Lane) => void;
  onAddSource?: () => void;
  onMoveAssets?: (uploadIds: string[], toNodeId: string | null) => void;
  /** The active stage run: lines into the cards it is producing animate (MI15). */
  runningRunId?: string | null;
};

/** Lane names stay pinned at the top while the canvas pans (AC22.12). */
function LaneStrip({
  viewport,
  onAddCard,
}: {
  viewport: Viewport;
  onAddCard?: (lane: Lane) => void;
}) {
  return (
    <div
      data-testid="lane-strip"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-11 overflow-hidden border-b border-line bg-paper"
    >
      {LANES.map((lane) => (
        <div
          key={lane}
          className="absolute top-0 flex h-11 items-center px-4 font-mono text-[11px] tracking-wide text-muted uppercase"
          style={{ left: laneX(lane) * viewport.zoom + viewport.x, width: LANE_W * viewport.zoom }}
        >
          <span className="truncate">{laneNames[lane]}</span>
          <button
            type="button"
            aria-label={c.addCard(laneNames[lane]!)}
            title={c.addCard(laneNames[lane]!)}
            onClick={() => onAddCard?.(lane)}
            className="pointer-events-auto ml-auto grid size-6 shrink-0 place-items-center rounded-xs text-muted hover:bg-soft hover:text-ink"
          >
            <PlusIcon aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function Toolbar() {
  const rf = useReactFlow();
  const btn =
    "grid size-8 place-items-center rounded-sm text-muted hover:bg-soft hover:text-ink [&_svg]:size-4";
  return (
    <div className="absolute right-4 bottom-4 z-10 flex gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-elev-1">
      <button
        type="button"
        className={btn}
        aria-label={c.zoomOut}
        onClick={() => void rf.zoomOut()}
      >
        <MinusIcon aria-hidden="true" />
      </button>
      <button type="button" className={btn} aria-label={c.zoomIn} onClick={() => void rf.zoomIn()}>
        <PlusIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label={c.fit}
        onClick={() => void rf.fitView({ padding: 0.15 })}
      >
        <ArrowsOutIcon aria-hidden="true" />
      </button>
    </div>
  );
}

function Canvas({
  nodes,
  edges,
  running,
  selectedId,
  onSelect,
  onReorder,
  onAddCard,
  runningRunId = null,
  onAddSource,
  onMoveAssets,
}: Props) {
  const rf = useReactFlow();
  const [viewport, setViewport] = useState<Viewport>({ x: 24, y: 0, zoom: 1 });
  const [dragged, setDragged] = useState<Record<string, number>>({});
  // The canvas measures each card and reports its size; cards passed back without it are hidden.
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = useCallback(
    (id: string) =>
      setExpanded((cur) => {
        const next = new Set(cur);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );

  // Cards below an expanded card move down: the layout uses each card's measured height.
  const placed = useMemo(
    () =>
      layoutTree(
        nodes.map((n) => ({
          id: n.id,
          type: n.type,
          sortOrder: n.sortOrder,
          createdAt: n.createdAt,
          height: sizes[n.id]?.height,
        })),
      ),
    [nodes, sizes],
  );

  // MI3: cards that weren't there when the canvas opened arrive with a short stagger (max 5).
  const [initialIds] = useState(() => new Set(nodes.map((n) => n.id)));
  const fresh = useMemo(
    () => ({ added: nodes.filter((n) => !initialIds.has(n.id)).map((n) => n.id) }),
    [nodes, initialIds],
  );

  const laneHeight = Math.max(
    560,
    ...placed.map((p) => p.y + (sizes[p.id]?.height ?? CARD_H) + 80),
  );

  const flowNodes: Node[] = useMemo(() => {
    const lanes: Node[] = LANES.map((lane) => ({
      id: `lane-${lane}`,
      type: "lane",
      position: { x: laneX(lane), y: 0 },
      data: { height: laneHeight },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      ...(sizes[`lane-${lane}`] ? { measured: sizes[`lane-${lane}`] } : {}),
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const cards: Node<CardData>[] = placed.map((p) => {
      const added = fresh.added.indexOf(p.id);
      return {
        id: p.id,
        type: "card",
        position: { x: p.x, y: dragged[p.id] ?? p.y },
        data: {
          node: byId.get(p.id)!,
          running,
          isNew: added >= 0,
          delayMs: Math.min(Math.max(added, 0), 4) * 40,
          dimmed: false,
          expanded: expanded.has(p.id),
          onToggle: toggle,
          onAddSource: byId.get(p.id)!.type === "source" ? onAddSource : undefined,
          onMoveAssets: byId.get(p.id)!.type === "asset_set" ? onMoveAssets : undefined,
        },
        selected: p.id === selectedId,
        ariaLabel: byId.get(p.id)!.title,
        ...(sizes[p.id] ? { measured: sizes[p.id] } : {}),
      };
    });
    return [...lanes, ...cards];
  }, [
    placed,
    nodes,
    running,
    selectedId,
    dragged,
    fresh,
    laneHeight,
    sizes,
    expanded,
    toggle,
    onAddSource,
    onMoveAssets,
  ]);

  const runOf = useMemo(() => new Map(nodes.map((n) => [n.id, n.stageRunId])), [nodes]);
  // Lines run between lanes; cards in the same lane (objectives → ethics) sit one under the other.
  const flowEdges: Edge[] = useMemo(() => {
    const lane = new Map(placed.map((p) => [p.id, p.lane]));
    return edges
      .filter((e) => lane.has(e.from) && lane.has(e.to) && lane.get(e.from) !== lane.get(e.to))
      .map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        type: "dashed",
        selectable: false,
        focusable: false,
        data: { running: runningRunId !== null && runOf.get(e.to) === runningRunId },
      }));
  }, [edges, placed, runningRunId, runOf]);

  // D24: cards move only up and down inside their lane.
  const onNodesChange = useCallback((changes: NodeChangeset) => {
    const next: Record<string, number> = {};
    const measured: Record<string, { width: number; height: number }> = {};
    for (const ch of changes.toArray()) {
      if (ch.type === "position" && ch.position && !ch.id.startsWith("lane-"))
        next[ch.id] = Math.max(TOP, ch.position.y);
      if (ch.type === "dimensions" && ch.dimensions) measured[ch.id] = ch.dimensions;
    }
    if (Object.keys(next).length) setDragged((d) => ({ ...d, ...next }));
    if (Object.keys(measured).length) setSizes((d) => ({ ...d, ...measured }));
  }, []);

  const onDragStop = useCallback(
    (_: unknown, node: Node) => {
      const p = placed.find((x) => x.id === node.id);
      if (!p || !onReorder) return;
      const lane: Lane = p.lane;
      const order = placed
        .filter((x) => x.lane === lane)
        .map((x) => ({ id: x.id, y: x.id === node.id ? node.position.y : x.y }))
        .sort((a, b) => a.y - b.y)
        .map((x) => x.id);
      setDragged({});
      onReorder(node.id, order);
    },
    [placed, onReorder],
  );

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
    const id = el?.dataset.id;
    if (!id || id.startsWith("lane-")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onSelect(id);
    } else if (e.key === "Escape") {
      onSelect(null);
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      e.preventDefault();
      e.stopPropagation();
      const target = nextFocus(placed, id, e.key);
      const p = placed.find((x) => x.id === target);
      document.querySelector<HTMLElement>(`.react-flow__node[data-id="${target}"]`)?.focus();
      if (p)
        void rf.setCenter(p.x + LANE_PAD + 140, p.y + CARD_H / 2, {
          zoom: rf.getZoom(),
          duration: 0,
        });
    }
  }

  return (
    <div className="relative h-full w-full" onKeyDownCapture={onKeyDown}>
      <LaneStrip viewport={viewport} onAddCard={onAddCard} />
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onDragStop}
        onNodeClick={(_, n) => !n.id.startsWith("lane-") && onSelect(n.id)}
        onPaneClick={() => onSelect(null)}
        onViewportChange={setViewport}
        defaultViewport={{ x: 24, y: 44, zoom: 1 }}
        // The canvas can't be moved further than the tree's edges, so cards never leave the view.
        translateExtent={[
          [-160, -80],
          [laneX("tests") + LANE_W + 160, laneHeight + 160],
        ]}
        minZoom={0.25}
        maxZoom={2}
        nodesConnectable={false}
        elementsSelectable
        disableKeyboardA11y
        proOptions={{ hideAttribution: true }}
        className="bg-paper"
      >
        <MiniMap
          pannable
          zoomable
          className="!bottom-16 !right-4 !rounded-md !border !border-line"
          nodeColor="var(--line-strong)"
          maskColor="rgba(31,33,35,0.06)"
        />
        <Toolbar />
      </ReactFlow>
    </div>
  );
}

/** SCR5 tree canvas (AC22.1, AC22.2, AC22.4, D24). */
export function TreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
