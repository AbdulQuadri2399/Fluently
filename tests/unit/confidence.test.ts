import { describe, expect, it } from "vitest";
import { confidence, needsGap, type EvidenceInput, type SourceType } from "@/lib/rules/confidence";

const src = (...types: SourceType[]) => types.map((type, i) => ({ id: `s${i}`, type }));
const input = (
  sources: EvidenceInput["sources"],
  over: Partial<EvidenceInput> = {},
): EvidenceInput => ({
  sources,
  aiInference: false,
  contradicts: false,
  ...over,
});

describe("confidence (AC12.6)", () => {
  it("High: 3+ sources of 2+ types that agree", () => {
    expect(confidence(input(src("paper", "paper", "upload")))).toEqual({
      level: "High",
      reason: "high_multi_type",
    });
  });
  it("Med: 2 sources that agree", () => {
    expect(confidence(input(src("paper", "desk")))).toEqual({
      level: "Med",
      reason: "med_two_agree",
    });
  });
  it("Med: 3+ sources of one type", () => {
    expect(confidence(input(src("social", "social", "social")))).toEqual({
      level: "Med",
      reason: "med_three_one_type",
    });
  });
  it("Low: 1 source", () => {
    expect(confidence(input(src("paper")))).toEqual({ level: "Low", reason: "low_single" });
  });
  it("Low: only AI inference", () => {
    expect(confidence(input([], { aiInference: true }))).toEqual({
      level: "Low",
      reason: "low_ai_only",
    });
  });
  it("Low: sources that contradict, however many", () => {
    expect(
      confidence(input(src("paper", "upload", "desk", "social"), { contradicts: true })),
    ).toEqual({ level: "Low", reason: "low_contradict" });
  });
  it("the same source linked twice counts once", () => {
    expect(
      confidence(
        input([
          { id: "a", type: "paper" },
          { id: "a", type: "paper" },
        ]),
      ).level,
    ).toBe("Low");
  });
});

describe("gaps (AC13.1, AC13.2)", () => {
  it("contradiction → Low + gap", () => {
    const i = input(src("paper", "upload", "desk"), { contradicts: true });
    expect(confidence(i).level).toBe("Low");
    expect(needsGap(i)).toBe(true);
  });
  it("Low → gap; Med and High that agree → no gap", () => {
    expect(needsGap(input(src("paper")))).toBe(true);
    expect(needsGap(input(src("paper", "desk")))).toBe(false);
    expect(needsGap(input(src("paper", "desk", "upload")))).toBe(false);
  });
});

// AC12.11: a theme's strength uses the same rule over its findings' sources.
describe("theme strength", () => {
  it("High: three agreeing sources of two kinds behind the theme's findings", () => {
    expect(confidence(input(src("paper", "social", "social"))).level).toBe("High");
  });
  it("Med: two sources, or three of one kind", () => {
    expect(confidence(input(src("social", "social"))).level).toBe("Med");
    expect(confidence(input(src("desk", "desk", "desk"))).reason).toBe("med_three_one_type");
  });
  it("Low: one source, AI inference only, or findings that disagree", () => {
    expect(confidence(input(src("paper"))).level).toBe("Low");
    expect(confidence({ sources: [], aiInference: true, contradicts: false }).reason).toBe(
      "low_ai_only",
    );
    expect(
      confidence({ sources: src("paper", "desk", "upload"), aiInference: false, contradicts: true })
        .level,
    ).toBe("Low");
  });
});
