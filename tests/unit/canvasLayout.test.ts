import { describe, expect, it } from "vitest";
import { CARD_GAP, CARD_H, laneOf, LANES, layoutTree, nextFocus, TOP } from "@/lib/canvas/layout";

const n = (id: string, type: string, sortOrder = 0, createdAt = "2026-11-17T10:00:00Z") => ({
  id,
  type,
  sortOrder,
  createdAt,
});

describe("tree layout (D24)", () => {
  it("seven lanes in order", () => {
    expect(LANES).toEqual([
      "objectives",
      "evidence",
      "themes",
      "opportunities",
      "solutions",
      "wireframes",
      "tests",
    ]);
  });

  it("places each card type in its lane; objectives, then assets, then ethics", () => {
    const placed = layoutTree([
      n("e", "ethics"),
      n("s", "source"),
      n("b", "objective", 1),
      n("a", "asset_set"),
      n("o", "objective", 0),
      n("t", "theme"),
    ]);
    const lane = (id: string) => placed.find((p) => p.id === id)!;
    expect(lane("s").lane).toBe("evidence");
    expect(lane("t").lane).toBe("themes");
    expect(
      placed
        .filter((p) => p.lane === "objectives")
        .sort((x, y) => x.y - y.y)
        .map((p) => p.id),
    ).toEqual(["o", "b", "a", "e"]);
    expect(lane("o").y).toBe(TOP);
    expect(lane("b").y).toBe(TOP + CARD_H + CARD_GAP);
    expect(lane("s").x).toBeGreaterThan(lane("o").x);
    expect(laneOf("recommendation")).toBe("solutions");
    expect(laneOf("lofi_variant")).toBe("wireframes");
    expect(laneOf("test_plan")).toBe("tests");
  });

  it("ArrowRight moves focus to nearest node in next column; up/down stays in the lane", () => {
    const placed = layoutTree([
      n("o1", "objective", 0),
      n("o2", "objective", 1),
      n("s1", "source", 0),
      n("s2", "source", 1),
      n("t1", "theme"),
    ]);
    expect(nextFocus(placed, "o2", "ArrowRight")).toBe("s2");
    expect(nextFocus(placed, "s1", "ArrowRight")).toBe("t1");
    expect(nextFocus(placed, "t1", "ArrowLeft")).toBe("s1");
    expect(nextFocus(placed, "o1", "ArrowDown")).toBe("o2");
    expect(nextFocus(placed, "o1", "ArrowUp")).toBe("o1");
    expect(nextFocus(placed, "t1", "ArrowRight")).toBe("t1");
  });
});
