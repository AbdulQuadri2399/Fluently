import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Position, ReactFlowProvider, type EdgeProps } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import { DashedEdge } from "@/components/canvas/DashedEdge";
import { Inspector } from "@/components/canvas/Inspector";
import { TreeCanvas } from "@/components/canvas/TreeCanvas";
import { canvasCopy as c } from "@/components/canvas/copy";
import type { TreeNode } from "@/lib/canvas/load";

// Trace mode (AC23.1, AC23.3, MI5).
const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => reduced.value }));

const node = (id: string, type: string, title: string, sortOrder = 0): TreeNode => ({
  id,
  type,
  stage: type === "objective" ? "intake" : "research",
  title,
  data: type === "objective" ? { text: title } : {},
  status: "ok",
  stale: false,
  lowSpecificity: false,
  provenance: "ai",
  model: null,
  sortOrder,
  createdAt: "2026-11-17T10:00:00Z",
  stageRunId: null,
  version: 1,
  updatedByName: "",
  confidence: null,
});
const nodes = [
  node("biz", "objective", "Raise ID checks"),
  node("src", "source", "Research sources"),
  node("f1", "finding", "Every extra step loses people"),
  node("other", "finding", "Unrelated finding", 1),
  node("t1", "theme", "Effort at the ID step"),
  node("o1", "opportunity", "Make the ID step shorter"),
];
const edges = [
  { id: "1", from: "biz", to: "src" },
  { id: "2", from: "src", to: "f1" },
  { id: "3", from: "src", to: "other" },
  { id: "4", from: "f1", to: "t1" },
  { id: "5", from: "t1", to: "o1" },
];

function canvas(tracePath: Set<string> | null, onSelect = vi.fn()) {
  return render(
    <div style={{ width: 1200, height: 800 }}>
      <TreeCanvas
        nodes={nodes}
        edges={edges}
        running={false}
        selectedId={null}
        onSelect={onSelect}
        tracePath={tracePath}
      />
    </div>,
  );
}
const card = (id: string) => document.querySelector(`[data-testid="card-${id}"]`)!;

describe("SCR5 trace", () => {
  it("off-path cards fade to 35% and can't be clicked; path cards stay", () => {
    canvas(new Set(["o1", "t1", "f1", "src", "biz"]));
    for (const id of ["o1", "t1", "f1", "src", "biz"])
      expect(card(id).className).not.toContain("opacity-35");
    expect(card("other").className).toContain("opacity-35");
    expect(card("other").className).toContain("pointer-events-none");
  });

  it("no trace: nothing is dimmed", () => {
    canvas(null);
    for (const n of nodes) expect(card(n.id).className).not.toContain("opacity-35");
  });

  it("path lines turn ink and thicken", () => {
    const props = {
      id: "e",
      source: "a",
      target: "b",
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 50,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    } as unknown as EdgeProps;
    const { container } = render(
      <ReactFlowProvider>
        <svg>
          <DashedEdge {...props} data={{ traced: true }} />
        </svg>
      </ReactFlowProvider>,
    );
    const path = container.querySelector("path")!;
    expect(path.getAttribute("style")).toContain("var(--ink)");
    expect(path.getAttribute("style")).toContain("1.75");
  });

  it("MI5: with reduced motion the fade has no transition", () => {
    reduced.value = true;
    canvas(new Set(["o1"]));
    expect(card("other").className).not.toMatch(/transition|duration|animate/);
    reduced.value = false;
  });
});

describe("SCR7 trace in the details panel", () => {
  function panel(tracePath: TreeNode[] | null, onTrace = vi.fn()) {
    const onSelect = vi.fn();
    render(
      <Inspector
        node={nodes[5]!}
        nodes={nodes}
        edges={edges}
        running={false}
        runningStage={null}
        loadHistory={async () => []}
        onClose={() => undefined}
        onSelect={onSelect}
        onTrace={onTrace}
        tracePath={tracePath}
      />,
    );
    return { onSelect, onTrace };
  }

  it("Trace starts trace mode", async () => {
    const { onTrace } = panel(null);
    await userEvent.click(screen.getByRole("button", { name: c.trace.button }));
    expect(onTrace).toHaveBeenCalledWith(true);
  });

  it("lists the path in order, opportunity back to the objective; Clear trace ends it", async () => {
    const path = [nodes[5]!, nodes[4]!, nodes[2]!, nodes[1]!, nodes[0]!];
    const { onSelect, onTrace } = panel(path);
    const list = screen.getByRole("region", { name: c.trace.title });
    const items = list.querySelectorAll("li");
    expect([...items].map((li) => li.textContent)).toEqual([
      "1Opportunity · Make the ID step shorter",
      "2Theme · Effort at the ID step",
      "3Finding · Every extra step loses people",
      "4Source · Research sources",
      "5Objective · Raise ID checks",
    ]);
    expect(screen.getByText(c.trace.hint)).toBeInTheDocument();
    await userEvent.click(items[1]!.querySelector("button")!);
    expect(onSelect).toHaveBeenCalledWith("t1");
    await userEvent.click(screen.getByRole("button", { name: c.trace.clear }));
    expect(onTrace).toHaveBeenCalledWith(false);
  });
});
