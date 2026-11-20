import { describe, expect, it } from "vitest";
import { FOLD_PX, isAboveFold, linkKey, measureLinks } from "@/lib/email/fold";

// The fold (AC31.3b): the first 650 px at phone width.
describe("fold", () => {
  it("a link above 650 px is above the fold; at or below is not", () => {
    expect(FOLD_PX).toBe(650);
    expect(isAboveFold(0)).toBe(true);
    expect(isAboveFold(649)).toBe(true);
    expect(isAboveFold(650)).toBe(false);
    expect(isAboveFold(1200)).toBe(false);
  });

  it("link keys ignore extra spaces", () => {
    expect(linkKey("  Verify   my identity ", "https://x.test")).toBe(
      linkKey("Verify my identity", "https://x.test"),
    );
    expect(linkKey("A", null)).toBe("A|");
  });

  it("finds each link by text and address and reads where it starts", () => {
    const doc = new DOMParser().parseFromString(
      '<a href="https://x.test/a">Verify my identity</a><a href="https://x.test/b">remind me later</a><a href="https://x.test/c"><img alt="Shop now" src="x"></a>',
      "text/html",
    );
    const tops: Record<string, number> = {
      "https://x.test/a": 420,
      "https://x.test/b": 900,
      "https://x.test/c": 100,
    };
    for (const a of Array.from(doc.querySelectorAll("a")))
      a.getBoundingClientRect = () => ({ top: tops[a.getAttribute("href")!]! }) as DOMRect;
    const found = measureLinks(doc, [
      { text: "Verify my identity", href: "https://x.test/a" },
      { text: "remind me later", href: "https://x.test/b" },
      { text: "Shop now", href: "https://x.test/c" },
      { text: "Not in the email", href: "https://x.test/zzz" },
    ]);
    expect(found[linkKey("Verify my identity", "https://x.test/a")]).toEqual({ top: 420 });
    expect(found[linkKey("remind me later", "https://x.test/b")]).toEqual({ top: 900 });
    expect(found[linkKey("Shop now", "https://x.test/c")]).toEqual({ top: 100 });
    expect(Object.keys(found)).toHaveLength(3);
  });
});
