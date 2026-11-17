import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardBody } from "@/components/canvas/NodeCard";
import { TreeCanvas } from "@/components/canvas/TreeCanvas";
import { canvasCopy as c } from "@/components/canvas/copy";
import { laneOf, layoutTree } from "@/lib/canvas/layout";
import type { TreeNode } from "@/lib/canvas/load";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => reduced.value }));

const node = (over: Partial<TreeNode>): TreeNode => ({
  id: crypto.randomUUID(),
  type: "objective",
  stage: "intake",
  title: "Business objective",
  data: { kind: "business", text: "Raise ID checks by 15%" },
  status: "ok",
  stale: false,
  lowSpecificity: false,
  provenance: "human",
  model: null,
  sortOrder: 0,
  createdAt: "2026-11-17T10:00:00Z",
  ...over,
});

const tree = (mode: "new" | "optimise") => [
  node({ id: "o1" }),
  node({
    id: "o2",
    sortOrder: 1,
    title: "Behavioural objective",
    data: { kind: "behavioural", text: "Upload ID on day one" },
  }),
  ...(mode === "optimise"
    ? [node({ id: "a1", type: "asset_set", title: "Current assets", data: { count: 3 } })]
    : []),
  node({
    id: "e1",
    type: "ethics",
    stage: "ethics",
    title: "Ethics check passed",
    data: { result: "pass", reasons: [] },
  }),
  node({
    id: "s1",
    type: "source",
    stage: "research",
    title: "Academic papers · 12 found",
    data: {},
  }),
];

function renderCanvas(nodes: TreeNode[]) {
  return render(
    <div style={{ width: 1200, height: 800 }}>
      <TreeCanvas
        nodes={nodes}
        edges={[]}
        running={false}
        selectedId={null}
        onSelect={() => undefined}
      />
    </div>,
  );
}

describe("SCR5 canvas", () => {
  it("nodes placed in correct lane per type", () => {
    const placed = layoutTree(
      tree("optimise").map((n) => ({
        id: n.id,
        type: n.type,
        sortOrder: n.sortOrder,
        createdAt: n.createdAt,
      })),
    );
    expect(Object.fromEntries(placed.map((p) => [p.id, p.lane]))).toEqual({
      o1: "objectives",
      o2: "objectives",
      a1: "objectives",
      e1: "objectives",
      s1: "evidence",
    });
    expect(laneOf("theme")).toBe("themes");
  });

  it("lane strip visible after panning: it lives outside the moving canvas layer", () => {
    renderCanvas(tree("new"));
    const strip = screen.getByTestId("lane-strip");
    for (const name of [
      "Objectives",
      "Evidence",
      "Themes",
      "Opportunities",
      "Solutions",
      "Wireframes",
      "Tests",
    ]) {
      expect(within(strip).getByText(name)).toBeInTheDocument();
    }
    expect(strip.closest(".react-flow__viewport")).toBeNull();
  });

  it("Current assets cards only in optimise mode", () => {
    const { unmount } = renderCanvas(tree("new"));
    expect(screen.queryByText("Current assets")).not.toBeInTheDocument();
    unmount();
    renderCanvas(tree("optimise"));
    expect(screen.getByText("Current assets")).toBeInTheDocument();
    expect(screen.getByText("3 assets")).toBeInTheDocument();
  });

  it("each marker renders its text label", () => {
    const cases: [Partial<TreeNode>, string][] = [
      [{ stale: true }, c.markers.stale],
      [{ lowSpecificity: true }, c.markers.lowSpecificity],
      [{ status: "failed" }, c.markers.failed],
      [{ type: "recommendation", status: "flagged" }, c.markers.flagged],
      [{ type: "recommendation", status: "overridden" }, c.markers.overridden],
      [{ status: "running" }, c.markers.running],
    ];
    for (const [over, label] of cases) {
      const { unmount } = render(<CardBody node={node(over)} running={false} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
    render(
      <CardBody
        node={node({ type: "ethics", status: "flagged", data: { reasons: [{}, {}] } })}
        running={false}
      />,
    );
    expect(screen.getByText(c.ethicsStatus.flagged(2))).toBeInTheDocument();
  });

  it("ArrowRight moves focus to nearest node in next column", async () => {
    const { nextFocus } = await import("@/lib/canvas/layout");
    const placed = layoutTree(
      tree("new").map((n) => ({
        id: n.id,
        type: n.type,
        sortOrder: n.sortOrder,
        createdAt: n.createdAt,
      })),
    );
    expect(nextFocus(placed, "o1", "ArrowRight")).toBe("s1");
  });
});
