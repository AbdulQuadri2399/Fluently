import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { barState, CheckpointBar, type BarState } from "@/components/canvas/CheckpointBar";
import { canvasCopy as c } from "@/components/canvas/copy";
import type { OpportunityOption } from "@/components/canvas/ResearchCheckpoint";
import type { RunInfo, TreeNode } from "@/lib/canvas/load";

const run = (status: string, steps: RunInfo["steps"] = []): RunInfo => ({
  id: "r1",
  stage: "research",
  status,
  steps,
  startedAt: new Date().toISOString(),
  finishedAt: null,
});
const steps: RunInfo["steps"] = [
  { key: "client_data", status: "done", count: 1 },
  { key: "papers", status: "running" },
  { key: "web", status: "failed" },
  { key: "competitors", status: "waiting" },
];

function bar(state: BarState) {
  const onStart = vi.fn(async () => undefined);
  const onCancel = vi.fn(async () => undefined);
  render(<CheckpointBar projectId="p1" state={state} onStart={onStart} onCancel={onCancel} />);
  return { onStart, onCancel };
}

describe("SCR8 decision bar", () => {
  it("ready to research: checkpoint.readyResearch with Start research", async () => {
    const { onStart } = bar({ kind: "readyResearch", noToolkit: null });
    expect(screen.getByText(c.checkpoint.readyResearch)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.checkpoint.startResearch }));
    expect(onStart).toHaveBeenCalled();
  });

  it("no toolkit: admins get Upload toolkit; members are told who to ask", () => {
    bar({ kind: "readyResearch", noToolkit: "admin" });
    expect(screen.getByRole("link", { name: c.checkpoint.uploadToolkit })).toHaveAttribute(
      "href",
      "/toolkit",
    );
  });

  it("running (MI4): step list with done / running / didn't work, live region, elapsed, Cancel", async () => {
    const { onCancel } = bar({ kind: "running", run: run("running", steps) });
    expect(screen.getByText(/Research is running · 0:0\d/)).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-live", "polite");
    expect(list).toHaveTextContent("Client data: Done · 1");
    expect(list).toHaveTextContent("Academic papers: Running");
    expect(list).toHaveTextContent("Web and market: Didn't work");
    expect(list).toHaveTextContent("Competitors: Waiting");
    await userEvent.click(screen.getByRole("button", { name: c.checkpoint.cancel }));
    expect(onCancel).toHaveBeenCalledWith("r1");
  });

  it("partial failure: stage.partialFail names the steps; Retry failed steps", () => {
    bar({ kind: "partial", run: run("partial", steps) });
    expect(screen.getByText(c.checkpoint.partialFail("Web and market"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.checkpoint.retryFailed })).toBeInTheDocument();
  });

  it("failed: stage.failed; Try again", () => {
    bar({ kind: "failed", run: run("failed") });
    expect(screen.getByText(c.checkpoint.failed("Research"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.checkpoint.retry })).toBeInTheDocument();
  });

  it("cancelled: stage.cancelled; can start again", () => {
    bar({ kind: "cancelled", run: run("cancelled") });
    expect(screen.getByText(c.checkpoint.cancelled("Research"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.checkpoint.startResearch })).toBeInTheDocument();
  });

  it("collapsed: Hide folds it to one button that brings it back", async () => {
    bar({ kind: "readyResearch", noToolkit: null });
    await userEvent.click(screen.getByRole("button", { name: c.checkpoint.collapse }));
    expect(screen.queryByText(c.checkpoint.readyResearch)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.checkpoint.expand }));
    expect(screen.getByText(c.checkpoint.readyResearch)).toBeInTheDocument();
  });

  it("intake first and ethics states link back to the brief", () => {
    bar({ kind: "intakeFirst" });
    expect(screen.getByText(c.intakeFirst)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: c.checkpoint.goToBrief })).toHaveAttribute(
      "href",
      "/projects/p1/brief",
    );
  });

  it("barState works out the right state from the project", () => {
    const ethics = (status: string) => [{ type: "ethics", status } as TreeNode];
    const base = {
      intakeApproved: true,
      currentStage: "research",
      hasToolkit: true,
      isAdmin: false,
      latestRun: null,
    };
    expect(barState({ ...base, intakeApproved: false, nodes: [] }).kind).toBe("intakeFirst");
    expect(barState({ ...base, nodes: ethics("flagged") }).kind).toBe("ethicsWaiting");
    expect(barState({ ...base, nodes: ethics("ok") }).kind).toBe("readyResearch");
    expect(barState({ ...base, nodes: ethics("overridden") }).kind).toBe("readyResearch");
    expect(barState({ ...base, nodes: ethics("ok"), latestRun: run("running") }).kind).toBe(
      "running",
    );
    expect(
      barState({ ...base, nodes: ethics("ok"), latestRun: { ...run("running"), stage: "ethics" } })
        .kind,
    ).toBe("ethicsRunning");
    expect(barState({ ...base, nodes: ethics("ok"), latestRun: run("succeeded") }).kind).toBe(
      "researchDone",
    );
    expect(barState({ ...base, hasToolkit: false, nodes: ethics("ok") })).toEqual({
      kind: "readyResearch",
      noToolkit: "member",
    });
  });

  describe("research checkpoint (AC14.1–AC14.3, AC25.2, EC4)", () => {
    const opportunities = [
      {
        id: "o1",
        title: "Make the ID step feel shorter",
        confidence: "High" as const,
        themes: 2,
        principles: ["P001", "P002"],
      },
      {
        id: "o2",
        title: "Explain where the ID photo goes",
        confidence: "Low" as const,
        themes: 1,
        principles: [],
      },
    ];
    function checkpoint(opps: OpportunityOption[] = opportunities) {
      const onApprove = vi.fn(async () => true);
      const onSendBack = vi.fn(async () => true);
      const onRetry = vi.fn(async () => undefined);
      render(
        <CheckpointBar
          projectId="p1"
          state={{ kind: "choose", run: run("succeeded"), partial: false }}
          onStart={async () => undefined}
          onCancel={async () => undefined}
          opportunities={opps}
          onApprove={onApprove}
          onSendBack={onSendBack}
          onRetry={onRetry}
        />,
      );
      return { onApprove, onSendBack };
    }

    it("lists every opportunity with confidence, themes and principles; nothing selected", async () => {
      const { onApprove } = checkpoint();
      expect(screen.getByText(c.checkpoint.chooseOpportunities)).toBeInTheDocument();
      expect(screen.getByText("High confidence")).toBeInTheDocument();
      expect(screen.getByText("2 themes · P001, P002")).toBeInTheDocument();
      expect(
        screen.getAllByRole("checkbox").every((b) => b.getAttribute("aria-checked") === "false"),
      ).toBe(true);
      const approve = screen.getByRole("button", { name: c.checkpoint.approveSolutions });
      expect(approve).toHaveAttribute("aria-disabled", "true");
      expect(screen.getAllByText(c.checkpoint.selectAtLeastOne).length).toBeGreaterThan(0);
      await userEvent.click(screen.getByLabelText(/Make the ID step feel shorter/));
      expect(screen.getByText(c.checkpoint.selected(1))).toBeInTheDocument();
      await userEvent.click(approve);
      expect(onApprove).toHaveBeenCalledWith(["o1"]);
    });

    it("all Low: checkpoint.allLow note, still selectable", () => {
      checkpoint(opportunities.map((o) => ({ ...o, confidence: "Low" as const })));
      expect(screen.getByText(c.checkpoint.allLow)).toBeInTheDocument();
    });

    it("send back needs 10+ characters; can also replace people's cards", async () => {
      const { onSendBack } = checkpoint();
      await userEvent.click(screen.getByRole("button", { name: c.checkpoint.sendBack }));
      await userEvent.type(screen.getByLabelText(c.checkpoint.feedbackLabel), "Too vague");
      expect(screen.getByRole("button", { name: c.checkpoint.sendBackSubmit })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await userEvent.type(screen.getByLabelText(c.checkpoint.feedbackLabel), ", focus on trust");
      await userEvent.click(screen.getByText(c.checkpoint.replaceHuman));
      await userEvent.click(screen.getByRole("button", { name: c.checkpoint.sendBackSubmit }));
      expect(onSendBack).toHaveBeenCalledWith("Too vague, focus on trust", true);
    });
  });
});
