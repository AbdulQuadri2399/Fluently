import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { canvasCopy as c } from "@/components/canvas/copy";
import { EvidenceExpanded, type EvidenceGroup } from "@/components/canvas/EvidenceExpanded";

const items = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    title: `${prefix} ${i + 1}`,
    sub: i === 0 ? "CSV, 1,240 rows" : "example.org",
    url: null,
  }));

const groups: EvidenceGroup[] = [
  {
    key: "client_data",
    title: "Client uploads",
    count: 3,
    status: "done",
    items: items(3, "Upload"),
  },
  { key: "papers", title: "Academic papers", count: 6, status: "done", items: items(6, "Paper") },
  { key: "web", title: "Web and market", count: 5, status: "done", items: items(5, "Web") },
  { key: "competitors", title: "Competitors", count: 0, status: "done", items: [] },
  {
    key: "reviews",
    title: "Reviews and forums",
    count: 4,
    status: "done",
    items: items(4, "Review"),
  },
];

describe("SCR5 opened Evidence card (AC22.9)", () => {
  it("groups in order with counts; the first two open; qualitative label on reviews", () => {
    render(<EvidenceExpanded groups={groups} />);
    const headers = screen
      .getAllByRole("button", { expanded: undefined })
      .filter((b) => b.hasAttribute("aria-expanded"));
    expect(headers.map((h) => h.textContent)).toEqual([
      "Client uploads3",
      "Academic papers6",
      "Web and market5",
      "Competitors0",
      `Reviews and forums${c.evidence.qualitative}4`,
    ]);
    expect(headers.map((h) => h.getAttribute("aria-expanded"))).toEqual([
      "true",
      "true",
      "false",
      "false",
      "false",
    ]);
    expect(screen.getAllByText("CSV, 1,240 rows").length).toBeGreaterThan(0);
  });

  it("3 items then 'Show n more'; Show fewer goes back", async () => {
    render(<EvidenceExpanded groups={groups} />);
    const papers = screen.getByRole("button", { name: /Academic papers/ }).closest("section")!;
    expect(within(papers).getAllByRole("listitem")).toHaveLength(4); // 3 papers + the Show more row
    await userEvent.click(within(papers).getByRole("button", { name: c.evidence.showMore(3) }));
    expect(within(papers).getByText("Paper 6")).toBeInTheDocument();
    await userEvent.click(within(papers).getByRole("button", { name: c.evidence.showFewer }));
    expect(within(papers).queryByText("Paper 6")).not.toBeInTheDocument();
  });

  it("collapse a group, open another; empty groups can't open", async () => {
    render(<EvidenceExpanded groups={groups} />);
    await userEvent.click(screen.getByRole("button", { name: /Client uploads/ }));
    expect(screen.queryByText("Upload 1")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reviews and forums/ }));
    expect(screen.getByText("Review 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Competitors/ })).toBeDisabled();
  });

  it("Add source with its hint", async () => {
    const onAddSource = vi.fn();
    render(<EvidenceExpanded groups={groups} onAddSource={onAddSource} />);
    expect(screen.getByText(c.evidence.addHint)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.evidence.addSource }));
    expect(onAddSource).toHaveBeenCalled();
  });
});
