"use client";

import {
  BookOpenIcon,
  CaretDownIcon,
  CaretUpIcon,
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
import type { ComponentType, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cardView, type Marker } from "@/lib/canvas/card";
import { CARD_W } from "@/lib/canvas/layout";
import type { TreeNode } from "@/lib/canvas/load";
import { mi } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";
import { EvidenceExpanded, type EvidenceGroup } from "./EvidenceExpanded";

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
  expanded?: boolean;
  onToggle?: (id: string) => void;
  onAddSource?: () => void;
};

/** What an expanded card shows (AC22.9, 03 SCR5 "Card expanded", MI13). */
function Expanded({ node, onAddSource }: { node: TreeNode; onAddSource?: () => void }) {
  const evidence = (node.data as { groups?: EvidenceGroup[] }).groups;
  if (node.type === "source" && evidence?.some((g) => Array.isArray(g.items))) {
    return <EvidenceExpanded groups={evidence} onAddSource={onAddSource} />;
  }
  const d = node.data as {
    reasons?: { rule: string; reason: string }[];
    reason?: string;
    body?: string;
    groups?: { key: string; title: string; count: number; status: string }[];
  };
  const rows: ReactNode[] = [];
  if (node.type === "ethics") {
    rows.push(
      d.reasons?.length ? (
        <ul key="r" className="grid gap-1.5">
          {d.reasons.map((r, i) => (
            <li key={i}>
              <span className="font-medium">{r.rule}.</span> {r.reason}
            </li>
          ))}
        </ul>
      ) : (
        <p key="r">{c.noRulesBroken}</p>
      ),
    );
  }
  if (node.type === "override" && d.reason) rows.push(<p key="o">{d.reason}</p>);
  if (d.groups?.length) {
    rows.push(
      <ul key="g" className="grid gap-1">
        {d.groups.map((g) => (
          <li key={g.key} className="flex justify-between gap-3">
            <span>{g.title}</span>
            <span className="font-mono text-[12px] text-muted">
              {g.status === "done" ? g.count : (c.stepStatus[g.status] ?? g.status)}
            </span>
          </li>
        ))}
      </ul>,
    );
  }
  if (d.body)
    rows.push(
      <p key="b" className="whitespace-pre-wrap">
        {d.body}
      </p>,
    );
  if (!rows.length) return null;
  return <div className="grid gap-2 border-t border-line pt-2.5 text-caption text-ink">{rows}</div>;
}

/** The card body, shared by the canvas and the list view (03b Tree card, T6–T8). */
export function CardBody({
  node,
  running,
  selected,
  expanded = false,
  onToggle,
  onAddSource,
}: {
  node: TreeNode;
  running: boolean;
  selected?: boolean;
  expanded?: boolean;
  onToggle?: (id: string) => void;
  onAddSource?: () => void;
}) {
  const v = cardView(node, running);
  const Icon = ICONS[node.type] ?? BookOpenIcon;
  const stale = v.markers.find((m) => m.kind === "stale");
  const others = v.markers.filter((m) => m.kind !== "stale");
  return (
    <div
      className={cn(
        "relative grid gap-2.5 rounded-md border border-line bg-surface p-3 text-left",
        selected && "border-ink shadow-[0_0_0_3px_var(--line)]",
        node.status === "failed" && "border-bad",
      )}
      style={{ width: CARD_W }}
    >
      {stale ? (
        <span className="absolute -top-2.5 right-10 rounded-full border border-surface bg-warn-bg px-2 text-caption font-medium text-warn">
          {stale.label}
        </span>
      ) : null}
      <div className="flex gap-3">
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
          <span className={cn("text-small font-semibold", !expanded && "line-clamp-2")}>
            {v.title}
          </span>
          <span className={cn("text-caption text-muted", !expanded && "line-clamp-2")}>
            {v.status}
          </span>
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
        <span className="flex shrink-0 flex-col items-center gap-1.5">
          {onToggle ? (
            <button
              type="button"
              aria-label={expanded ? c.collapse : c.expand}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.id);
              }}
              className="nodrag grid size-5 place-items-center rounded-xs text-muted hover:bg-soft hover:text-ink"
            >
              {expanded ? (
                <CaretUpIcon aria-hidden="true" className="size-3.5" />
              ) : (
                <CaretDownIcon aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ) : null}
          {v.done ? (
            <span
              aria-hidden="true"
              className="grid size-4 place-items-center rounded-full bg-ok-bg text-ok"
            >
              <CheckIcon className="size-2.5" />
            </span>
          ) : null}
        </span>
      </div>
      {expanded ? (
        <div className="animate-in fade-in-0 duration-base">
          <Expanded node={node} onAddSource={onAddSource} />
        </div>
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
      <CardBody
        node={data.node}
        running={data.running}
        selected={selected}
        expanded={data.expanded}
        onToggle={data.onToggle}
        onAddSource={data.onAddSource}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-2 !border-wire !bg-surface opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}
