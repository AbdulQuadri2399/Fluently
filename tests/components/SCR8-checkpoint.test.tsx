import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { barState, CheckpointBar, type BarState } from "@/components/canvas/CheckpointBar";
import { canvasCopy as c } from "@/components/canvas/copy";
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

  it("partial failure: stage.partialFail names the steps; Try again", () => {
    bar({ kind: "partial", run: run("partial", steps) });
    expect(screen.getByText(c.checkpoint.partialFail("Web and market"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.checkpoint.retry })).toBeInTheDocument();
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
});
