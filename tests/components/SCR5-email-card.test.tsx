import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardBody } from "@/components/canvas/NodeCard";
import { canvasCopy as c } from "@/components/canvas/copy";
import { emailCopy as ec } from "@/components/email/copy";
import type { TreeNode } from "@/lib/canvas/load";

// An email card says there is an email behind it, and where to see it (the side panel).
const node = (type: string): TreeNode => ({
  id: "n1",
  type,
  stage: "objectives",
  title: "Welcome to Examplebank",
  data: {},
  status: "done",
  stale: false,
  lowSpecificity: false,
  provenance: "human",
  model: null,
  sortOrder: 1,
  createdAt: new Date().toISOString(),
  stageRunId: null,
  version: 1,
  updatedByName: "A",
  confidence: null,
});

describe("email card attachment strip", () => {
  it("says an email is attached and that its phone preview is in the side panel", () => {
    render(<CardBody node={node("email")} running={false} />);
    const strip = screen.getByTestId("attachment-strip");
    expect(strip).toHaveTextContent(ec.card.attached);
    expect(strip).toHaveTextContent(ec.card.attachedHint);
    expect(strip).toHaveTextContent(c.attachment.open);
  });

  it("says so when the card is the one showing in the panel", () => {
    render(<CardBody node={node("email")} running={false} selected />);
    expect(screen.getByTestId("attachment-strip")).toHaveTextContent(c.attachment.showing);
  });

  it("a screens card with screens, and an evidence card with sources, have one too", () => {
    const { unmount } = render(
      <CardBody node={{ ...node("asset_set"), data: { count: 3 } }} running={false} />,
    );
    expect(screen.getByTestId("attachment-strip")).toHaveTextContent(c.attachment.assets.title);
    unmount();
    render(
      <CardBody
        node={{ ...node("source"), data: { groups: [{ count: 0 }, { count: 4 }] } }}
        running={false}
      />,
    );
    expect(screen.getByTestId("attachment-strip")).toHaveTextContent(c.attachment.sources.title);
    expect(screen.getByTestId("attachment-strip")).toHaveTextContent(c.attachment.sources.hint);
  });

  it("cards with nothing behind them have no strip", () => {
    const { unmount } = render(<CardBody node={node("objective")} running={false} />);
    expect(screen.queryByTestId("attachment-strip")).not.toBeInTheDocument();
    unmount();
    render(<CardBody node={{ ...node("asset_set"), data: { count: 0 } }} running={false} />);
    expect(screen.queryByTestId("attachment-strip")).not.toBeInTheDocument();
    unmount();
    render(
      <CardBody node={{ ...node("source"), data: { groups: [{ count: 0 }] } }} running={false} />,
    );
    expect(screen.queryByTestId("attachment-strip")).not.toBeInTheDocument();
  });
});
