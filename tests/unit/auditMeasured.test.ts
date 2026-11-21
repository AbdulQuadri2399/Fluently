import { describe, expect, it } from "vitest";
import { measuredFindings } from "@/lib/audit/measuredFindings";
import type { Measured } from "@/lib/email/measure";

// Findings stated from measuring alone (AC31.5, AC31.8): no model involved.
const link = (over: Partial<Measured["links"][number]> = {}): Measured["links"][number] => ({
  text: "Verify my identity",
  href: "https://example.org/verify",
  kind: "button",
  primary: true,
  top: 300,
  aboveFold: true,
  width: 200,
  height: 48,
  tapTargetOk: true,
  contrast: { ratio: 6.3, passes: true },
  ...over,
});
const base = (over: Partial<Measured> = {}): Measured => ({
  imagesOn: false,
  layoutWidth: 375,
  responsive: true,
  zoom: 1,
  fullHeight: 1200,
  foldPx: 580,
  links: [link()],
  textContrast: { samples: 10, failing: 0, lowest: null },
  colours: { text: [], background: [] },
  images: { count: 1, withoutAlt: 0 },
  preheader: { present: true, length: 40 },
  words: 90,
  ...over,
});

describe("measured findings", () => {
  it("a tidy email has only the good news: the main button is above the fold", () => {
    const out = measuredFindings(base());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ part: "ctas", lens: "structure", verdict: "working" });
  });

  it("reports each measurable problem with the number behind it", () => {
    const out = measuredFindings(
      base({
        responsive: false,
        layoutWidth: 608,
        textContrast: { samples: 8, failing: 2, lowest: { snippet: "Fine print", ratio: 2.1 } },
        preheader: { present: false, length: 0 },
        images: { count: 3, withoutAlt: 2 },
        links: [
          link({
            aboveFold: false,
            top: 900,
            tapTargetOk: false,
            width: 90,
            height: 30,
            contrast: { ratio: 2.4, passes: false },
          }),
        ],
      }),
    );
    const text = out.map((f) => f.proofText).join(" | ");
    expect(text).toContain('"Fine print" at 2.1 to 1');
    expect(text).toContain("starts 900 px down");
    expect(text).toContain("90×30 px");
    expect(text).toContain("label contrast is 2.4 to 1");
    expect(text).toContain("No preheader text found");
    expect(text).toContain("2 of 3 images have no description");
    expect(text).toContain("608 px wide");
    expect(out.every((f) => f.verdict === "friction")).toBe(true);
  });

  it("says nothing about buttons when there are none", () => {
    expect(measuredFindings(base({ links: [] })).some((f) => f.part === "ctas")).toBe(false);
  });
});
