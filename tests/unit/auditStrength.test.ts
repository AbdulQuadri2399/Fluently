import { describe, expect, it } from "vitest";
import { principleStrength } from "@/lib/audit/strength";

// Evidence strength of an email finding comes from the toolkit's own evidence for the principle.
describe("principleStrength", () => {
  it("strong evidence with a paper linked is High", () => {
    expect(principleStrength({ evidenceLevel: "strong", linkToPaper: "https://doi.org/x" })).toBe(
      "High",
    );
  });
  it("strong without a paper, or some evidence, is Med", () => {
    expect(principleStrength({ evidenceLevel: "strong", linkToPaper: null })).toBe("Med");
    expect(principleStrength({ evidenceLevel: "strong", linkToPaper: "  " })).toBe("Med");
    expect(principleStrength({ evidenceLevel: "some", linkToPaper: "https://doi.org/x" })).toBe(
      "Med",
    );
  });
  it("no evidence yet is Low", () => {
    expect(principleStrength({ evidenceLevel: "none", linkToPaper: "https://doi.org/x" })).toBe(
      "Low",
    );
  });
});
