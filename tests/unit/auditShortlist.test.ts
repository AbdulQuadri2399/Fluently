import { describe, expect, it } from "vitest";
import {
  shortlist,
  scorePrinciple,
  SHORTLIST_SIZE,
  type ShortlistPrinciple,
} from "@/lib/audit/shortlist";

// The toolkit shortlist (AC31.6, AC33.5): about 20 principles, best fit first, thin ones last.
const p = (key: string, over: Partial<ShortlistPrinciple> = {}): ShortlistPrinciple => ({
  id: key,
  principleKey: key,
  name: key,
  generalGoal: "Motivation",
  subGoal: "Start",
  mechanism: "Nudge",
  quickInsight: "Something to read",
  extendedExplanation: null,
  examples: null,
  designLever: null,
  outcome: null,
  evidenceLevel: "some",
  ...over,
});
const many = (n: number) =>
  Array.from({ length: n }, (_, i) => p(`P${String(i).padStart(3, "0")}`));
const ctx = { behaviouralObjective: "New customers upload their ID on day one" };

describe("shortlist", () => {
  it("is about 20 principles out of a bigger toolkit", () => {
    expect(SHORTLIST_SIZE).toBe(20);
    expect(shortlist(many(111), ctx)).toHaveLength(20);
  });

  it("returns them all when the toolkit is smaller than the list", () => {
    expect(shortlist(many(7), ctx)).toHaveLength(7);
  });

  it("puts principles that match the objective first", () => {
    const list = [
      p("A-unrelated", { name: "Anchoring prices", mechanism: "Shows a high price first" }),
      p("B-match", {
        name: "Commitment on day one",
        mechanism: "People who start an upload tend to finish it",
        outcome: "More customers upload ID",
      }),
    ];
    expect(shortlist(list, ctx, 2).map((x) => x.principleKey)).toEqual(["B-match", "A-unrelated"]);
  });

  it("uses what the email contains, the audience and the sector too", () => {
    const base = p("X", { name: "Loss aversion", mechanism: "People dislike losing things" });
    const plain = scorePrinciple(base, ctx);
    expect(scorePrinciple(base, { ...ctx, emailHints: ["loss", "urgency"] })).toBeGreaterThan(
      plain,
    );
    expect(scorePrinciple(base, { ...ctx, audience: "people who dislike losing" })).toBeGreaterThan(
      plain,
    );
  });

  it("keeps principles with no description but ranks them after equally good, fuller ones", () => {
    const same = {
      name: "Commitment on day one",
      mechanism: "People who start an upload finish it",
    };
    const thin = p("A-thin", {
      ...same,
      quickInsight: null,
      extendedExplanation: null,
      examples: null,
    });
    const full = p("B-full", same);
    const out = shortlist([thin, full], ctx, 2).map((x) => x.principleKey);
    expect(out).toEqual(["B-full", "A-thin"]);
  });

  it("prefers well-evidenced principles when nothing else separates them, then orders by key", () => {
    const list = [
      p("B", { evidenceLevel: "none" }),
      p("A", { evidenceLevel: "none" }),
      p("C", { evidenceLevel: "strong" }),
    ];
    expect(shortlist(list, ctx).map((x) => x.principleKey)).toEqual(["C", "A", "B"]);
  });
});
