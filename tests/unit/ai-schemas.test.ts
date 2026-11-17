import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeCoach, fakeEthics } from "@/lib/ai/fake";
import { coachSchema, ethicsSchema } from "@/lib/ai/schemas";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(`tests/fixtures/ai/${name}.json`, "utf8"));

describe("AI schemas and made-up answers", () => {
  it("fixtures match their schemas", () => {
    expect(coachSchema.safeParse(fixture("coach-business")).success).toBe(true);
    expect(ethicsSchema.safeParse(fixture("ethics-flag")).success).toBe(true);
  });

  it("ethics rejects unknown rules and missing reasons", () => {
    expect(
      ethicsSchema.safeParse({ result: "flag", reasons: [{ rule: "Other", reason: "x" }] }).success,
    ).toBe(false);
    expect(ethicsSchema.safeParse({ result: "pass" }).success).toBe(false);
  });

  it("fake coach: vague objectives are low specificity; specific ones aren't", () => {
    expect(fakeCoach("business_objective", "Get more people to sign up").lowSpecificity).toBe(true);
    expect(
      fakeCoach("business_objective", "Raise sign-ups by 10% this quarter").lowSpecificity,
    ).toBe(false);
    expect(fakeCoach("behavioural_objective", "Upload their ID").lowSpecificity).toBe(true);
    expect(
      fakeCoach("behavioural_objective", "New customers upload their ID within the first day")
        .lowSpecificity,
    ).toBe(false);
    for (const f of [
      "business_objective",
      "behavioural_objective",
      "audience_context",
      "constraints",
    ]) {
      expect(coachSchema.safeParse(fakeCoach(f, "Some brief text here")).success).toBe(true);
    }
  });

  it("fake ethics: passes a plain brief, flags urgency with the rule name, flags listed sectors", () => {
    expect(fakeEthics("Help people finish their ID check", "Banking", ["gambling"])).toEqual({
      result: "pass",
      reasons: [],
    });
    const flag = fakeEthics("Add a countdown so they hurry", "Banking", []);
    expect(flag.result).toBe("flag");
    expect(flag.reasons[0]?.rule).toBe("Fake urgency or scarcity");
    expect(fakeEthics("Plain brief", "gambling", ["gambling"]).reasons[0]?.rule).toBe(
      "Sensitive sector",
    );
    expect(ethicsSchema.safeParse(flag).success).toBe(true);
  });
});
