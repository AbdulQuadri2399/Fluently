import { describe, expect, it } from "vitest";
import { keepKeysByName } from "@/lib/toolkit/keys";
import type { ParsedPrinciple } from "@/lib/toolkit/parse";

const p = (key: string, name: string): ParsedPrinciple => ({
  principle_key: key,
  name,
  general_goal: "g",
  sub_goal: "s",
  mechanism: "m",
  sense: null,
  quick_insight: null,
  extended_explanation: null,
  examples: null,
  link_to_paper: null,
  reference: null,
  design_lever: null,
  outcome: null,
  evidence: null,
  related_raw: null,
  evidence_level: "none",
});

// AC33.5: later versions of a sheet without IDs keep IDs by principle name.
describe("keepKeysByName", () => {
  const previous = [
    { principle_key: "P001", name: "Short Lines" },
    { principle_key: "P002", name: "Calm Colours" },
    { principle_key: "P003", name: "Price Anchor" },
  ];

  it("a re-ordered sheet keeps every ID; new principles get the next free numbers", () => {
    const next = [
      p("P001", "price anchor"),
      p("P002", "New One"),
      p("P003", "Short Lines"),
      p("P004", "Another"),
    ];
    const out = keepKeysByName(next, [{ from: "P001", to: "P003" }], previous);
    expect(out.principles.map((x) => [x.name, x.principle_key])).toEqual([
      ["price anchor", "P003"],
      ["New One", "P004"],
      ["Short Lines", "P001"],
      ["Another", "P005"],
    ]);
    expect(out.relations).toEqual([{ from: "P003", to: "P001" }]);
  });

  it("with no earlier version the generated IDs stay as they are", () => {
    const next = [p("P001", "A"), p("P002", "B")];
    expect(keepKeysByName(next, [], []).principles.map((x) => x.principle_key)).toEqual([
      "P001",
      "P002",
    ]);
  });

  it("a principle removed from the sheet keeps its number retired: new ones don't reuse it", () => {
    const out = keepKeysByName([p("P001", "Short Lines"), p("P002", "Brand New")], [], previous);
    expect(out.principles.map((x) => x.principle_key)).toEqual(["P001", "P004"]);
  });
});
