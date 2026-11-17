import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StrengthTag } from "@/components/canvas/StrengthTag";
import { cardView } from "@/lib/canvas/card";
import type { TreeNode } from "@/lib/canvas/load";

// AC12.12: one pastel tag style for strength and confidence, always with the word.
describe("StrengthTag", () => {
  it.each([
    ["High", "bg-ok-bg"],
    ["Med", "bg-warn-bg"],
    ["Low", "bg-bad-bg"],
  ] as const)("%s is %s with its word", (level, bg) => {
    render(<StrengthTag level={level} of="confidence" />);
    const tag = screen.getByText(`${level} confidence`);
    expect(tag.className).toContain(bg);
  });

  it("themes say strength, opportunities say confidence", () => {
    render(
      <>
        <StrengthTag level="Med" of="strength" />
        <StrengthTag level="Med" of="confidence" />
      </>,
    );
    expect(screen.getByText("Med strength")).toBeTruthy();
    expect(screen.getByText("Med confidence")).toBeTruthy();
  });

  const node = (type: string, confidence: string | null): TreeNode => ({
    id: "n",
    type,
    stage: "research",
    title: "T",
    data: {},
    status: "ok",
    stale: false,
    lowSpecificity: false,
    provenance: "ai",
    model: null,
    sortOrder: 0,
    createdAt: "",
    stageRunId: null,
    version: 1,
    updatedByName: "",
    confidence,
  });

  it("cards: themes and opportunities get a tag; others keep the Low confidence marker", () => {
    expect(cardView(node("theme", "High"), false).tag).toEqual({ level: "High", of: "strength" });
    expect(cardView(node("opportunity", "Low"), false).tag).toEqual({
      level: "Low",
      of: "confidence",
    });
    expect(cardView(node("opportunity", "Low"), false).markers).toHaveLength(0);
    const rec = cardView(node("recommendation", "Low"), false);
    expect(rec.tag).toBeNull();
    expect(rec.markers.map((m) => m.kind)).toEqual(["lowConfidence"]);
  });
});
