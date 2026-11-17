import { describe, expect, it } from "vitest";
import { checkCitations } from "@/lib/rules/citationCheck";

const run = ["S1", "S2", "S3"];

describe("citation check (AC12.2, AC12.3, NFR4)", () => {
  it("unknown handle dropped and reported for citation_rejected", () => {
    const res = checkCitations(
      [{ text: "ID step causes drop-off", sourceHandles: ["S1", "S99"], aiInference: false }],
      run,
    );
    expect(res.kept).toEqual([
      { text: "ID step causes drop-off", sourceHandles: ["S1"], aiInference: false },
    ]);
    expect(res.rejectedHandles).toEqual(["S99"]);
  });

  it("finding with no valid source becomes AI inference only if the model labelled it so", () => {
    const res = checkCitations(
      [
        { text: "Probably a trust issue", sourceHandles: ["S42"], aiInference: true },
        { text: "Made-up paper says so", sourceHandles: ["S77"], aiInference: false },
        { text: "No source at all", sourceHandles: [], aiInference: false },
      ],
      run,
    );
    expect(res.kept).toEqual([
      { text: "Probably a trust issue", sourceHandles: [], aiInference: true },
    ]);
    expect(res.dropped.map((d) => d.text)).toEqual(["Made-up paper says so", "No source at all"]);
    expect(res.rejectedHandles.sort()).toEqual(["S42", "S77"]);
  });

  it("a finding with a real source is never labelled AI inference, and duplicates collapse", () => {
    const res = checkCitations(
      [{ text: "x", sourceHandles: ["S2", "S2"], aiInference: true }],
      run,
    );
    expect(res.kept).toEqual([{ text: "x", sourceHandles: ["S2"], aiInference: false }]);
  });
});
