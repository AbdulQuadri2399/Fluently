import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Inspector } from "@/components/canvas/Inspector";
import { canvasCopy as c } from "@/components/canvas/copy";
import type { TreeNode } from "@/lib/canvas/load";

const node = (over: Partial<TreeNode> = {}): TreeNode => ({
  id: "s1",
  type: "source",
  stage: "research",
  title: "Academic papers · 12 found",
  data: {},
  status: "ok",
  stale: false,
  lowSpecificity: false,
  provenance: "ai",
  model: "claude-haiku-5-5",
  sortOrder: 0,
  createdAt: "2026-11-17T10:00:00Z",
  ...over,
});
const objective: TreeNode = {
  ...node(),
  id: "o1",
  type: "objective",
  stage: "intake",
  title: "Business objective",
  data: { text: "Raise ID checks" },
};
const history = vi.fn(async () => [{ change: "created", at: "17 Nov, 10:00", by: "Ada" }]);

function renderIt(n: TreeNode, runningStage: string | null = null) {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  render(
    <Inspector
      node={n}
      nodes={[n, objective]}
      edges={[{ id: "e", from: "o1", to: n.id }]}
      running={false}
      runningStage={runningStage}
      loadHistory={history}
      onClose={onClose}
      onSelect={onSelect}
    />,
  );
  return { onClose, onSelect };
}

describe("SCR7 details panel", () => {
  it("default: type, title, properties incl. model used, connections, history", async () => {
    const { onClose, onSelect } = renderIt(node());
    expect(screen.getByRole("complementary", { name: "Source" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Academic papers · 12 found" })).toBeInTheDocument();
    expect(screen.getByText(c.inspector.model)).toBeInTheDocument();
    expect(screen.getByText("claude-haiku-5-5")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Raise ID checks" }));
    expect(onSelect).toHaveBeenCalledWith("o1");
    expect(await screen.findByText(/Created · 17 Nov, 10:00 · Ada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.inspector.close }));
    expect(onClose).toHaveBeenCalled();
  });

  it("locked: canvas.lockedWhileRunning while its stage runs", () => {
    renderIt(node(), "research");
    expect(screen.getByRole("status")).toHaveTextContent(c.lockedWhileRunning("Research"));
  });

  it("flagged: lists each rule and reason", () => {
    renderIt(
      node({
        type: "ethics",
        stage: "ethics",
        status: "flagged",
        data: { reasons: [{ rule: "Hidden costs", reason: "Mentions a surprise fee." }] },
      }),
    );
    expect(screen.getByText("Hidden costs.")).toBeInTheDocument();
    expect(screen.getByText("Mentions a surprise fee.")).toBeInTheDocument();
    expect(screen.getAllByText(c.ethicsStatus.flagged(1)).length).toBeGreaterThan(0);
  });
});
