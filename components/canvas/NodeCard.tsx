"use client";

import {
  BookOpenIcon,
  CheckIcon,
  FlaskIcon,
  HandPalmIcon,
  ImagesIcon,
  LayoutIcon,
  LightbulbIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PushPinIcon,
  PuzzlePieceIcon,
  QuestionIcon,
  ShieldCheckIcon,
  StackIcon,
  TargetIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ComponentType } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cardView, type Marker } from "@/lib/canvas/card";
import { CARD_W } from "@/lib/canvas/layout";
import type { TreeNode } from "@/lib/canvas/load";
import { mi } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  objective: TargetIcon,
  asset_set: ImagesIcon,
  ethics: ShieldCheckIcon,
  override: HandPalmIcon,
  source: BookOpenIcon,
  finding: MagnifyingGlassIcon,
  theme: StackIcon,
  opportunity: LightbulbIcon,
  gap: QuestionIcon,
  recommendation: PuzzlePieceIcon,
  lofi_variant: LayoutIcon,
  annotation: PushPinIcon,
  test_plan: FlaskIcon,
  reference: LinkIcon,
};

const MARKER_TONE: Record<Marker["kind"], string> = {
  stale: "bg-warn-bg text-warn",
  lowSpecificity: "bg-warn-bg text-warn",
  failed: "bg-bad-bg text-bad",
  flagged: "bg-bad-bg text-bad",
  overridden: "bg-info-bg text-info",
  running: "bg-canvas text-ink",
};

export type CardData = {
  node: TreeNode;
  running: boolean;
  isNew: boolean;
  delayMs: number;
  dimmed: boolean;
};

/** The card body, shared by the canvas and the list view (03b Tree card, T6–T8). */
export function CardBody({
  node,
  running,
  selected,
}: {
  node: TreeNode;
  running: boolean;
  selected?: boolean;
}) {
  const v = cardView(node, running);
  const Icon = ICONS[node.type] ?? BookOpenIcon;
  const stale = v.markers.find((m) => m.kind === "stale");
  const others = v.markers.filter((m) => m.kind !== "stale");
  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-md border border-line bg-surface p-3 text-left",
        selected && "border-ink shadow-[0_0_0_3px_var(--line)]",
        node.status === "failed" && "border-bad",
      )}
      style={{ width: CARD_W }}
    >
      {stale ? (
        <span className="absolute -top-2.5 right-3 rounded-full border border-surface px-2 text-caption font-medium bg-warn-bg text-warn">
          {stale.label}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="grid size-[30px] shrink-0 place-items-center rounded-sm border border-line bg-soft text-muted"
      >
        {v.markers.some((m) => m.kind === "running") ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
        ) : (
          <Icon aria-hidden className="size-4" />
        )}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-small font-semibold">{v.title}</span>
        <span className="line-clamp-2 text-caption text-muted">{v.status}</span>
        {others.length ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {others.map((m) => (
              <span
                key={m.kind}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 text-caption font-medium",
                  MARKER_TONE[m.kind],
                )}
              >
                {m.kind === "failed" || m.kind === "flagged" ? (
                  <WarningCircleIcon aria-hidden className="size-3" />
                ) : null}
                {m.label}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {v.done ? (
        <span
          aria-hidden="true"
          className="grid size-4 shrink-0 place-items-center rounded-full bg-ok-bg text-ok"
        >
          <CheckIcon className="size-2.5" />
        </span>
      ) : null}
    </div>
  );
}

/** React Flow node: card plus hidden connection points, arrival animation (MI3) and dimming. */
export function NodeCard({ data, selected }: NodeProps<Node<CardData>>) {
  const reduced = useReducedMotion();
  return (
    <div
      data-testid={`card-${data.node.id}`}
      className={cn(
        "group",
        data.isNew && (reduced ? mi.cardInReduced : mi.cardIn),
        data.dimmed && "opacity-35",
      )}
      style={data.isNew ? { animationDelay: `${data.delayMs}ms` } : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-2 !border-wire !bg-surface opacity-0 group-hover:opacity-100"
      />
      <CardBody node={data.node} running={data.running} selected={selected} />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-2 !border-wire !bg-surface opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}
