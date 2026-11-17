"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

/** Connecting line (03b, note T9): dashed 5/4 in wire, small circle at the receiving end. */
export function DashedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const traced = Boolean((data as { traced?: boolean } | undefined)?.traced);
  // MI15: while a stage works on the card this line feeds, the dashes flow toward it.
  const running = Boolean((data as { running?: boolean } | undefined)?.running);
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={running ? "dash-flow" : undefined}
        style={{
          stroke: traced || running ? "var(--ink)" : "var(--wire)",
          strokeWidth: traced ? 1.75 : 1.5,
          strokeDasharray: "5 4",
        }}
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={3.5}
        fill="var(--surface)"
        stroke="var(--wire)"
        strokeWidth={1.5}
      />
    </>
  );
}
