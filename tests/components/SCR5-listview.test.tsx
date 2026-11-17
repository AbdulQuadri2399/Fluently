import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListView } from "@/components/canvas/ListView";
import { canvasCopy as c } from "@/components/canvas/copy";
import type { TreeNode } from "@/lib/canvas/load";

const n = (id: string, type: string, title: string, over: Partial<TreeNode> = {}): TreeNode => ({
  id,
  type,
  title,
  stage: "intake",
  data: {},
  status: "ok",
  stale: false,
  lowSpecificity: false,
  provenance: "ai",
  model: null,
  sortOrder: 0,
  createdAt: "2026-11-17T10:00:00Z",
  ...over,
});

describe("SCR5 list view (NFR3)", () => {
  it("every node reachable as a list item with its type, markers and actions", async () => {
    const onSelect = vi.fn();
    const nodes = [
      n("o1", "objective", "Business objective", {
        data: { text: "Raise ID checks by 15%" },
        lowSpecificity: true,
      }),
      n("e1", "ethics", "Ethics check flagged", { status: "flagged", data: { reasons: [{}] } }),
      n("s1", "source", "Academic papers · 12 found", { stale: true }),
    ];
    render(<ListView nodes={nodes} running={false} selectedId={null} onSelect={onSelect} />);
    expect(screen.getByRole("heading", { name: "Objectives" })).toBeInTheDocument();
    const evidence = screen.getByRole("region", { name: "Evidence" });
    const item = within(evidence).getByRole("button", { name: /Academic papers · 12 found/ });
    expect(item).toHaveTextContent("Source");
    expect(item).toHaveTextContent(c.markers.stale);
    expect(screen.getByRole("button", { name: /Raise ID checks by 15%/ })).toHaveTextContent(
      c.markers.lowSpecificity,
    );
    expect(screen.getByRole("button", { name: /Ethics check/ })).toHaveTextContent(
      c.markers.flagged,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    await userEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith("s1");
  });
});
