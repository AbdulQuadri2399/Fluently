import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddCardDialog, MergeDialog } from "@/components/canvas/AddCardDialog";
import { ConnectionsSection, DeleteCardSection } from "@/components/canvas/CardActions";
import { canvasCopy as c } from "@/components/canvas/copy";
import { canConnect, downstreamIds } from "@/lib/canvas/connect";
import type { TreeNode } from "@/lib/canvas/load";

// Slice 8 editing: add (AC24.2), delete (AC24.5, AC24.8), merge (AC24.6), connections (AC30.4, AC30.5, AC30.7).
const node = (id: string, type: string, title: string): TreeNode => ({
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
  sortOrder: 0,
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
  node("f2", "finding", "Reviews mention the photo step"),
  node("t1", "theme", "Effort at the ID step"),
  node("t2", "theme", "Unclear data use"),
  node("o1", "opportunity", "Make the ID step shorter"),
];
const edges = [
  { id: "e1", from: "src", to: "f1" },
  { id: "e2", from: "f1", to: "t1" },
  { id: "e3", from: "t1", to: "o1" },
];

describe("connection rules", () => {
  it("lines run from one stage to the next", () => {
    expect(canConnect("theme", "opportunity")).toBe(true);
    expect(canConnect("finding", "theme")).toBe(true);
    expect(canConnect("theme", "finding")).toBe(false);
    expect(canConnect("theme", "gap")).toBe(false);
  });
  it("downstream counts everything built from a card", () => {
    expect(downstreamIds(edges, "f1")).toEqual(new Set(["t1", "o1"]));
    expect(downstreamIds(edges, "o1").size).toBe(0);
  });
});

describe("Add card (AC24.2)", () => {
  it("only offers cards of the needed kind, needs a title and a link", async () => {
    const onAdd = vi.fn(async () => ({ ok: true as const, data: { id: "n" } }));
    render(
      <AddCardDialog types={["theme"]} nodes={nodes} onClose={() => undefined} onAdd={onAdd} />,
    );
    expect(screen.getByRole("heading", { name: c.editing.addTitle("Theme") })).toBeInTheDocument();
    const checks = screen.getAllByRole("checkbox");
    expect(checks).toHaveLength(2); // the two findings only
    await userEvent.type(screen.getByLabelText(c.edit.titleLabel), "People fear the test");
    await userEvent.click(screen.getByRole("button", { name: c.editing.add }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.editing.chooseOne("Finding"));
    expect(onAdd).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText(/Every extra step/));
    await userEvent.click(screen.getByRole("button", { name: c.editing.add }));
    expect(onAdd).toHaveBeenCalledWith({
      type: "theme",
      title: "People fear the test",
      body: "",
      links: ["f1"],
    });
  });

  it("opportunities lane can add an opportunity or a gap; the links change with the type", async () => {
    render(
      <AddCardDialog
        types={["opportunity", "gap"]}
        nodes={nodes}
        onClose={() => undefined}
        onAdd={async () => ({ ok: true, data: { id: "n" } })}
      />,
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(2); // themes
    await userEvent.click(screen.getByLabelText("Gap"));
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(1); // the one opportunity
  });

  it("says so when there's nothing to build from", () => {
    render(
      <AddCardDialog
        types={["theme"]}
        nodes={nodes.filter((n) => n.type !== "finding")}
        onClose={() => undefined}
        onAdd={async () => ({ ok: true, data: { id: "n" } })}
      />,
    );
    expect(screen.getAllByText(c.editing.noneToLink("Finding")).length).toBeGreaterThan(0);
  });

  it("a locked stage shows the running message", async () => {
    render(
      <AddCardDialog
        types={["theme"]}
        nodes={nodes}
        onClose={() => undefined}
        onAdd={async () => ({ ok: false, code: "locked" })}
      />,
    );
    await userEvent.type(screen.getByLabelText(c.edit.titleLabel), "x");
    await userEvent.click(screen.getByLabelText(/Every extra step/));
    await userEvent.click(screen.getByRole("button", { name: c.editing.add }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.editing.locked("research"));
  });
});

describe("Delete (AC24.5, AC24.8)", () => {
  it("confirm says how many cards depend on it, then deletes", async () => {
    const onDelete = vi.fn(async () => true);
    render(
      <DeleteCardSection
        node={nodes[2]!}
        nodes={nodes}
        edges={edges}
        disabled={false}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: c.editing.delete }));
    expect(screen.getByText(c.editing.deleteConfirm("Finding", 2))).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: c.editing.delete }));
    expect(onDelete).toHaveBeenCalledWith("f1");
  });

  it("objectives can't be deleted: points to the brief", () => {
    render(
      <DeleteCardSection
        node={nodes[0]!}
        nodes={nodes}
        edges={edges}
        disabled={false}
        onDelete={async () => true}
      />,
    );
    expect(screen.getByText(c.editing.cantDeleteObjective)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.editing.delete })).toBeNull();
  });

  it("while its stage runs the button is disabled with the reason", () => {
    render(
      <DeleteCardSection
        node={nodes[2]!}
        nodes={nodes}
        edges={edges}
        disabled
        onDelete={async () => true}
      />,
    );
    expect(screen.getByRole("button", { name: c.editing.delete })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("Merge (AC24.6)", () => {
  it("asks for the new title and merges", async () => {
    const onMerge = vi.fn(async () => ({ ok: true as const, data: { id: "m" } }));
    render(
      <MergeDialog nodes={[nodes[4]!, nodes[5]!]} onClose={() => undefined} onMerge={onMerge} />,
    );
    expect(screen.getByText(c.editing.mergeHint)).toBeInTheDocument();
    const input = screen.getByLabelText(c.editing.mergeLabel);
    expect(input).toHaveValue("Effort at the ID step");
    await userEvent.clear(input);
    await userEvent.type(input, "Effort and data worries");
    await userEvent.click(screen.getByRole("button", { name: c.editing.merge }));
    expect(onMerge).toHaveBeenCalledWith("Effort and data worries");
  });
});

describe("Connections section (AC30.7)", () => {
  function section(over: Partial<Parameters<typeof ConnectionsSection>[0]> = {}) {
    const onConnect = vi.fn(async () => true);
    const onDisconnect = vi.fn(async () => true);
    render(
      <ConnectionsSection
        node={nodes[4]!}
        nodes={nodes}
        edges={edges}
        disabled={false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onSelect={() => undefined}
        {...over}
      />,
    );
    return { onConnect, onDisconnect };
  }

  it("lists what it's built from and what it leads to, with a way to remove each", async () => {
    const { onDisconnect } = section();
    const region = screen.getByRole("region", { name: c.editing.connections });
    expect(within(region).getByText(/Every extra step/)).toBeInTheDocument();
    expect(within(region).getByText(/Make the ID step shorter/)).toBeInTheDocument();
    await userEvent.click(
      within(region).getByRole("button", {
        name: `${c.editing.removeLine}: Every extra step loses people`,
      }),
    );
    expect(onDisconnect).toHaveBeenCalledWith("e2");
  });

  it("offers only cards that can connect; connects in the chosen direction", async () => {
    const { onConnect } = section();
    const select = screen.getByLabelText(c.editing.addConnection);
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);
    // Findings not yet linked (built from), nothing downstream that's unlinked.
    expect(options).toEqual([c.editing.chooseCard, "Reviews mention the photo step"]);
    await userEvent.selectOptions(select, "in:f2");
    await userEvent.click(screen.getByRole("button", { name: c.editing.connect }));
    expect(onConnect).toHaveBeenCalledWith("f2", "t1");
  });

  it("downstream choices connect from this card", async () => {
    const { onConnect } = section({ node: nodes[5]! });
    await userEvent.selectOptions(screen.getByLabelText(c.editing.addConnection), "in:f2");
    await userEvent.click(screen.getByRole("button", { name: c.editing.connect }));
    expect(onConnect).toHaveBeenCalledWith("f2", "t2");
  });

  it("connect is disabled until a card is chosen", () => {
    section();
    expect(screen.getByRole("button", { name: c.editing.connect })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
