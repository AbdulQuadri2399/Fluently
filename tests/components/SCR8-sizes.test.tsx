import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CheckpointBar } from "@/components/canvas/CheckpointBar";
import { canvasCopy as c } from "@/components/canvas/copy";

// AC25.5: the decision panel can be minimised, standard or expanded.
const opportunities = [
  {
    id: "o1",
    title: "Make the ID step feel shorter",
    confidence: "High" as const,
    themes: 2,
    principles: [],
  },
  { id: "o2", title: "Show progress", confidence: "Med" as const, themes: 1, principles: [] },
];

function panel() {
  return render(
    <CheckpointBar
      projectId="p1"
      state={{
        kind: "choose",
        run: {
          id: "r1",
          stage: "research",
          status: "succeeded",
          steps: [],
          startedAt: null,
          finishedAt: null,
        },
        partial: false,
      }}
      onStart={async () => undefined}
      onCancel={async () => undefined}
      opportunities={opportunities}
      onApprove={async () => true}
      onSendBack={async () => true}
    />,
  );
}
const section = () => screen.getByRole("region", { name: c.checkpoint.panelName });

describe("SCR8 panel sizes", () => {
  beforeEach(() => window.localStorage.clear());

  it("selection survives minimise and expand", async () => {
    panel();
    await userEvent.click(screen.getByLabelText(/Make the ID step feel shorter/));
    await userEvent.click(screen.getByRole("button", { name: c.panel.minimise }));
    expect(section()).toHaveAttribute("data-size", "minimised");
    expect(screen.getByText(`${c.checkpoint.chooseOpportunities} · 1 selected`)).toBeVisible();
    expect(
      screen.getByRole("button", { name: c.checkpoint.approveSolutions, hidden: true }),
    ).not.toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: c.panel.expand }));
    expect(section()).toHaveAttribute("data-size", "expanded");
    expect(screen.getByLabelText(/Make the ID step feel shorter/)).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText(c.checkpoint.selected(1))).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: c.panel.standard }));
    expect(section()).toHaveAttribute("data-size", "standard");
  });

  it("minimised shows what's waiting and the main action; Show what's next brings it back", async () => {
    render(
      <CheckpointBar
        projectId="p1"
        state={{ kind: "readyResearch", noToolkit: null }}
        onStart={async () => undefined}
        onCancel={async () => undefined}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: c.panel.minimise }));
    // One line with the message and the main action; the full panel stays mounted but hidden.
    const [line, full] = screen.getAllByText(c.checkpoint.readyResearch);
    expect(line).toBeVisible();
    expect(full).not.toBeVisible();
    expect(screen.getByRole("button", { name: c.checkpoint.startResearch })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: c.checkpoint.expand }));
    expect(section()).toHaveAttribute("data-size", "standard");
  });

  it("size remembered", async () => {
    panel();
    await userEvent.click(screen.getByRole("button", { name: c.panel.expand }));
    cleanup();
    panel();
    expect(section()).toHaveAttribute("data-size", "expanded");
  });
});
