"use client";

import { LANES, laneOf } from "@/lib/canvas/layout";
import type { TreeNode } from "@/lib/canvas/load";
import { cardView } from "@/lib/canvas/card";
import { laneNames } from "./copy";

/** Accessible alternative to the canvas (NFR3, AC22.4): every card as a list item, by lane. */
export function ListView({
  nodes,
  running,
  selectedId,
  onSelect,
}: {
  nodes: TreeNode[];
  running: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[880px] gap-8 overflow-y-auto px-14 py-11">
      {LANES.map((lane) => {
        const items = nodes
          .filter((n) => laneOf(n.type) === lane)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (!items.length) return null;
        return (
          <section key={lane} aria-labelledby={`list-${lane}`} className="grid gap-2">
            <h2
              id={`list-${lane}`}
              className="font-mono text-[11px] tracking-wide text-muted uppercase"
            >
              {laneNames[lane]}
            </h2>
            <ul className="border-t border-line">
              {items.map((n) => {
                const v = cardView(n, running);
                return (
                  <li key={n.id} className="border-b border-line">
                    <button
                      type="button"
                      aria-current={n.id === selectedId || undefined}
                      onClick={() => onSelect(n.id)}
                      className="grid w-full gap-0.5 px-2 py-3 text-left hover:bg-soft aria-[current=true]:bg-soft"
                    >
                      <span className="text-caption text-muted">{v.typeLabel}</span>
                      <span className="text-small font-medium">{v.title}</span>
                      <span className="text-caption text-muted">
                        {v.status}
                        {v.markers.map((m) => ` · ${m.label}`).join("")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
