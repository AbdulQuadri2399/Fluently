import { describe, expect, it } from "vitest";
import { relativeTime } from "@/components/projects/copy";

describe("relativeTime (03 time.relative)", () => {
  const now = new Date(2026, 10, 17, 15, 0, 0);
  it.each([
    [new Date(2026, 10, 17, 14, 59, 40), "just now"],
    [new Date(2026, 10, 17, 14, 48), "12 min ago"],
    [new Date(2026, 10, 17, 13, 0), "2 hours ago"],
    [new Date(2026, 10, 16, 20, 0), "Yesterday"],
    [new Date(2026, 10, 3, 9, 0), "3 Nov"],
  ])("%s → %s", (then, expected) => {
    expect(relativeTime(then.toISOString(), now)).toBe(expected);
  });
});
