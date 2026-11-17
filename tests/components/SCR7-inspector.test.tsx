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
  stageRunId: null,
  version: 1,
  updatedByName: "",
  confidence: null,
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

  it("editing (MI6): Edit → change title and notes → Save sends the version", async () => {
    const onSave = vi.fn(async () => ({ ok: true as const, data: { version: 2 } }));
    render(
      <Inspector
        node={node()}
        nodes={[node()]}
        edges={[]}
        running={false}
        runningStage={null}
        loadHistory={history}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: c.edit.edit }));
    const title = screen.getByLabelText(c.edit.titleLabel);
    await userEvent.clear(title);
    await userEvent.type(title, "Sources, checked");
    await userEvent.type(screen.getByLabelText(c.edit.bodyLabel), "Removed duplicates");
    await userEvent.click(screen.getByRole("button", { name: c.edit.save }));
    expect(onSave).toHaveBeenCalledWith({
      nodeId: "s1",
      title: "Sources, checked",
      body: "Removed duplicates",
      version: 1,
    });
    expect(screen.queryByLabelText(c.edit.titleLabel)).not.toBeInTheDocument();
  });

  it("conflict (FF10): canvas.editConflict with See latest; your text kept", async () => {
    const onSave = vi.fn(async () => ({ ok: false as const, code: "conflict" as const }));
    const onSeeLatest = vi.fn();
    render(
      <Inspector
        node={node({ updatedByName: "Ada" })}
        nodes={[node()]}
        edges={[]}
        running={false}
        runningStage={null}
        loadHistory={history}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onSave={onSave}
        onSeeLatest={onSeeLatest}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: c.edit.edit }));
    await userEvent.type(screen.getByLabelText(c.edit.bodyLabel), "My note");
    await userEvent.click(screen.getByRole("button", { name: c.edit.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.edit.conflict("Ada"));
    expect(screen.getByLabelText(c.edit.bodyLabel)).toHaveValue("My note");
    await userEvent.click(screen.getByRole("button", { name: c.edit.seeLatest }));
    expect(onSeeLatest).toHaveBeenCalled();
  });

  it("objectives, ethics and overrides explain why they aren't edited here", () => {
    const save = vi.fn();
    const { unmount } = render(
      <Inspector
        node={objective}
        nodes={[objective]}
        edges={[]}
        running={false}
        runningStage={null}
        loadHistory={history}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onSave={save}
        projectId="p1"
      />,
    );
    expect(screen.getByText(c.edit.objectiveHint)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: c.edit.goToBrief })).toHaveAttribute(
      "href",
      "/projects/p1/brief",
    );
    expect(screen.queryByRole("button", { name: c.edit.edit })).not.toBeInTheDocument();
    unmount();
    render(
      <Inspector
        node={node({ type: "ethics", stage: "ethics" })}
        nodes={[]}
        edges={[]}
        running={false}
        runningStage={null}
        loadHistory={history}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onSave={save}
      />,
    );
    expect(screen.getByText(c.edit.ethicsHint)).toBeInTheDocument();
  });

  it("locked: Edit explains it waits for the running stage", () => {
    render(
      <Inspector
        node={node()}
        nodes={[node()]}
        edges={[]}
        running={false}
        runningStage="research"
        loadHistory={history}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: c.edit.edit })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  describe("research labels (AC12.4, AC12.7, AC12.9)", () => {
    const evidence = vi.fn(async () => ({
      sources: [
        {
          id: "x",
          title: "The goal-gradient hypothesis resurrected",
          url: "https://doi.org/10.1509/jmkr.43.1.39",
          type: "paper",
          handle: "S1",
        },
      ],
      external: [
        {
          name: "Endowed progress",
          mechanism: "Motivation",
          sourceTitle: "The goal-gradient hypothesis resurrected",
        },
      ],
    }));
    const show = (n: TreeNode) =>
      render(
        <Inspector
          node={n}
          nodes={[n]}
          edges={[]}
          running={false}
          runningStage={null}
          loadHistory={history}
          loadEvidence={evidence}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />,
      );

    it("sources with links", async () => {
      show(
        node({
          id: "f1",
          type: "finding",
          title: "People speed up near the goal",
          data: { sources: ["S1"] },
        }),
      );
      const link = await screen.findByRole("link", {
        name: "The goal-gradient hypothesis resurrected",
      });
      expect(link).toHaveAttribute("href", "https://doi.org/10.1509/jmkr.43.1.39");
    });

    it("confidence and its reason", () => {
      show(
        node({
          id: "o1",
          type: "opportunity",
          title: "Explain where the ID photo goes",
          confidence: "Low",
          data: { confidenceReason: "low_single" },
        }),
      );
      expect(screen.getAllByText("Low confidence").length).toBeGreaterThan(0);
      expect(screen.getByText(c.labels.confidenceReason.low_single!)).toBeInTheDocument();
    });

    it("Qualitative signal · n sources", () => {
      show(
        node({
          id: "f2",
          type: "finding",
          title: "Reviews mention the photo step",
          data: { sources: ["S7", "S8"], socialCount: 2 },
        }),
      );
      expect(screen.getAllByText(c.labels.qualitative(2)).length).toBeGreaterThan(0);
    });

    it("AI inference", () => {
      show(
        node({
          id: "f3",
          type: "finding",
          title: "Maybe a trust issue",
          data: { sources: [], aiInference: true },
        }),
      );
      expect(screen.getAllByText(c.labels.aiInference).length).toBeGreaterThan(0);
    });

    it("External principle, not yet in toolkit", async () => {
      show(
        node({
          id: "o2",
          type: "opportunity",
          title: "Show progress",
          confidence: "High",
          data: { confidenceReason: "high_multi_type" },
        }),
      );
      expect(await screen.findByText(c.labels.external)).toBeInTheDocument();
      expect(screen.getByText("Endowed progress · Motivation")).toBeInTheDocument();
    });
  });
});
