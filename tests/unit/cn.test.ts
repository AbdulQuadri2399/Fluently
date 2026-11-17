import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps a named text size alongside a text colour", () => {
    expect(cn("text-caption text-muted")).toBe("text-caption text-muted");
    expect(cn("text-small font-semibold", "text-ink")).toBe("text-small font-semibold text-ink");
  });
  it("still lets a later size replace an earlier one", () => {
    expect(cn("text-caption", "text-small")).toBe("text-small");
  });
});
