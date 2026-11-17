import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { activityLine, ActivityPanel } from "@/components/canvas/ActivityPanel";
import { barState, CheckpointBar } from "@/components/canvas/CheckpointBar";
import { canvasCopy as c } from "@/components/canvas/copy";
import type { RunInfo, TreeNode } from "@/lib/canvas/load";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
    realtime: { setAuth: async () => undefined },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: async () => undefined,
  }),
}));

const run = (status: string): RunInfo => ({
  id: "r1",
  stage: "research",
  status,
  steps: [{ key: "papers", status: "done", count: 12 }],
  startedAt: null,
  finishedAt: null,
});

describe("SCR8 AI budget pause (AC27.4, FF12)", () => {
  beforeEach(() => window.localStorage.clear());

  it("barState: a run paused at the budget", () => {
    const nodes = [{ type: "ethics", status: "ok" } as TreeNode];
    expect(
      barState({
        intakeApproved: true,
        currentStage: "research",
        nodes,
        latestRun: run("paused_cost"),
        hasToolkit: true,
        isAdmin: true,
      }),
    ).toEqual({ kind: "pausedCost", run: run("paused_cost"), isAdmin: true });
  });

  it("members can continue anyway; admins can also raise the budget", async () => {
    const onContinue = vi.fn(async () => undefined);
    const onRaise = vi.fn();
    const { rerender } = render(
      <CheckpointBar
        projectId="p1"
        state={{ kind: "pausedCost", run: run("paused_cost"), isAdmin: false }}
        onStart={async () => undefined}
        onCancel={async () => undefined}
        capLabel="£10.00"
        onContinueOverCap={onContinue}
        onRaiseCap={onRaise}
      />,
    );
    expect(screen.getByText(c.atCap("£10.00"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.budget.raise })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: c.budget.continue }));
    expect(onContinue).toHaveBeenCalledWith("r1");

    rerender(
      <CheckpointBar
        projectId="p1"
        state={{ kind: "pausedCost", run: run("paused_cost"), isAdmin: true }}
        onStart={async () => undefined}
        onCancel={async () => undefined}
        onContinueOverCap={onContinue}
        onRaiseCap={onRaise}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: c.budget.raise }));
    expect(onRaise).toHaveBeenCalled();
  });
});

describe("See what it's doing (AC11.9, AC11.10)", () => {
  it("the decision panel offers it for a research run", async () => {
    const onOpen = vi.fn();
    render(
      <CheckpointBar
        projectId="p1"
        state={{ kind: "running", run: run("running") }}
        onStart={async () => undefined}
        onCancel={async () => undefined}
        onOpenActivity={onOpen}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: c.activity.open }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("shows the research questions, then the log in plain words", async () => {
    const load = vi.fn(async () => ({
      questions: ["Where do people stop?", "What do competitors do?", "Which principles apply?"],
      events: [
        { id: "1", kind: "questions", step: null, count: 3, at: "2026-11-17T10:00:00Z" },
        { id: "2", kind: "started", step: "papers", count: null, at: "2026-11-17T10:00:01Z" },
        { id: "3", kind: "found", step: "papers", count: 12, at: "2026-11-17T10:00:02Z" },
        { id: "4", kind: "dropped", step: "findings", count: 2, at: "2026-11-17T10:00:03Z" },
        { id: "5", kind: "failed", step: "web", count: null, at: "2026-11-17T10:00:04Z" },
      ],
    }));
    render(
      <ActivityPanel open onOpenChange={() => undefined} runId="r1" active={false} load={load} />,
    );
    expect(await screen.findByText("Where do people stop?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: c.activity.questions })).toBeInTheDocument();
    for (const line of [
      "Wrote 3 research questions",
      "Academic papers started",
      "Academic papers: 12 found",
      "2 citations dropped: not in the search results",
      "Web and market didn't work",
    ])
      expect(screen.getByText(line)).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("r1");
  });

  it("empty before anything starts", async () => {
    const load = vi.fn(async () => ({ questions: [], events: [] }));
    render(<ActivityPanel open onOpenChange={() => undefined} runId="r1" active load={load} />);
    await waitFor(() => expect(screen.getByText(c.activity.empty)).toBeInTheDocument());
  });

  it("unknown kinds are left out", () => {
    expect(activityLine({ id: "x", kind: "mystery", step: null, count: null, at: "" })).toBeNull();
  });
});
