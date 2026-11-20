import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evidenceLevel, MAX_BYTES, mergeSense, parseToolkit } from "@/lib/toolkit/parse";

const fixture = (name: string) => readFileSync(`fixtures/toolkit/${name}`, "utf8");
const parse = (name: string) => parseToolkit(fixture(name), name);

describe("toolkit parse", () => {
  it("valid CSV and JSON: 30 principles, same result either way (AC4.1)", () => {
    const csv = parse("sample-toolkit.csv");
    const json = parse("sample-toolkit.json");
    if (!csv.ok || !json.ok) throw new Error("expected valid");
    expect(csv.rowCount).toBe(30);
    expect(csv.principles).toHaveLength(30);
    expect(json.principles).toEqual(csv.principles);
    expect(csv.principles[0]).toMatchObject({
      principle_key: "P001",
      name: "Step Shrinking",
      general_goal: "Reduce effort",
    });
  });

  it("AC4.2: empty ID and duplicate ID are rejected with row numbers", () => {
    const missing = parse("bad-missing-id.csv");
    expect(missing).toMatchObject({ ok: false, errors: [{ kind: "missingId", row: 4 }] });
    const dup = parse("bad-duplicate-id.csv");
    expect(dup).toMatchObject({
      ok: false,
      errors: [{ kind: "duplicateId", rows: [3, 6], id: "P002" }],
    });
    const noIdColumn = parseToolkit(
      "Principle,General Goal,Sub-Goal,Mechanism\nA,B,C,D\n",
      "x.csv",
    );
    // Changed 2026-11-19 (AC33.5): no ID column is fine; IDs are generated.
    expect(noIdColumn).toMatchObject({ ok: true, rowCount: 1 });
    expect(noIdColumn.warnings).toContainEqual({ kind: "generatedIds" });
    expect(parseToolkit("Principle,General Goal,Mechanism\nA,B,D\n", "x.csv")).toMatchObject({
      ok: false,
      errors: [{ kind: "missingColumns", columns: ["Sub-Goal"] }],
    });
  });

  it("AC4.3: missing required columns are named", () => {
    expect(parse("bad-missing-columns.csv")).toMatchObject({
      ok: false,
      errors: [{ kind: "missingColumns", columns: ["Sub-Goal", "Mechanism"] }],
    });
  });

  it("AC4.4: unknown columns are ignored and listed as a warning", () => {
    const res = parse("sample-toolkit.csv");
    expect(res.warnings).toContainEqual({ kind: "unknownColumns", columns: ["Notes"] });
    expect(res.ok).toBe(true);
  });

  it("AC4.6: evidence strong/some/none, 'No source' is none, Sense merge with new winning", () => {
    expect(evidenceLevel("https://x", "", "Lab study")).toBe("strong");
    expect(evidenceLevel("", "Ref 2001", "Lab study")).toBe("strong");
    expect(evidenceLevel("https://x", "", "")).toBe("some");
    expect(evidenceLevel("", "", "Lab study")).toBe("some");
    expect(evidenceLevel("", "", "")).toBe("none");
    expect(evidenceLevel("https://x", "Ref", "No source")).toBe("none");
    expect(mergeSense("See", "Feel")).toBe("Feel");
    expect(mergeSense("See", "")).toBe("See");
    expect(mergeSense("", "")).toBeNull();

    const res = parse("sample-toolkit.csv");
    if (!res.ok) throw new Error("expected valid");
    expect(res.evidence.strong + res.evidence.some + res.evidence.none).toBe(30);
    expect(res.evidence.none).toBeGreaterThan(0);
    const p4 = res.principles.find((p) => p.principle_key === "P004");
    expect(p4?.evidence).toBe("No source");
    expect(p4?.evidence_level).toBe("none");
  });

  it("AC4.6, AC4.7: related principles connect by ID or name; unknown ones are kept as text and warned", () => {
    const res = parse("sample-toolkit.csv");
    if (!res.ok) throw new Error("expected valid");
    expect(res.relations).toContainEqual({ from: "P002", to: "P001" });
    // P007 also names a principle by its name rather than its ID.
    expect(res.relations.filter((r) => r.from === "P007")).toHaveLength(2);
    const p12 = res.principles.find((p) => p.principle_key === "P012");
    expect(p12?.related_raw).toContain("P999");
    expect(res.warnings).toContainEqual({ kind: "relatedNotFound", row: 13, text: "P999" });
    expect(res.relations.some((r) => r.to === "P999")).toBe(false);
  });

  it("rejects other file types, oversize files and unreadable JSON", () => {
    expect(parseToolkit("x", "toolkit.xlsx")).toMatchObject({
      ok: false,
      errors: [{ kind: "file" }],
    });
    expect(parseToolkit("x", "toolkit.csv", MAX_BYTES + 1)).toMatchObject({
      ok: false,
      errors: [{ kind: "file" }],
    });
    expect(parseToolkit("{not json", "toolkit.json")).toMatchObject({
      ok: false,
      errors: [{ kind: "unreadable" }],
    });
    expect(parseToolkit("ID,Principle,General Goal,Sub-Goal,Mechanism\n", "t.csv")).toMatchObject({
      ok: false,
      errors: [{ kind: "empty" }],
    });
  });
});

describe("toolkit sheet without an ID column (AC33.5)", () => {
  const result = () => {
    const r = parse("sheet-layout.csv");
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    return r;
  };

  it("loads: the name is the key, IDs are generated in sheet order", () => {
    const r = result();
    expect(r.rowCount).toBe(9);
    expect(r.principles.map((p) => [p.principle_key, p.name])).toEqual([
      ["P001", "Short Lines"],
      ["P002", "Calm Colours"],
      ["P003", "Quiet Imagery"],
      ["P004", "Price Anchor"],
      ["P005", "Pause Prompt"],
      ["P006", "Second Look"],
    ]);
    expect(r.warnings).toContainEqual({ kind: "generatedIds" });
  });

  it("rows with the same name (any case or spacing) become one principle with combined text", () => {
    const r = result();
    const anchor = r.principles.find((p) => p.name === "Price Anchor")!;
    expect(anchor.quick_insight).toBe("Invented: the first number sets expectations.");
    expect(anchor.extended_explanation).toBe("Second note about the anchor, invented.");
    expect(anchor.examples).toBe("An invented shop shows a crossed-out price.");
    expect(r.warnings).toContainEqual({
      kind: "mergedSameName",
      name: "Price Anchor",
      rows: [5, 6, 7],
    });
  });

  it("goal spellings that mean the same thing are unified, using the most common one", () => {
    const r = result();
    const goals = new Set(r.principles.map((p) => p.general_goal));
    expect(goals).toEqual(
      new Set([
        "Ease processing",
        "Prime emotions & states",
        "Alter perceptions",
        "Prompt conscious processing",
      ]),
    );
    expect(r.warnings.filter((w) => w.kind === "goalsUnified")).toHaveLength(2);
  });

  it("a row with no name is left out, with its row number", () => {
    expect(result().warnings).toContainEqual({ kind: "noName", row: 10 });
  });

  it("principles with no summary, explanation or example are kept and counted", () => {
    const r = result();
    expect(r.principles.find((p) => p.name === "Quiet Imagery")).toBeDefined();
    expect(r.warnings).toContainEqual({ kind: "thinRows", count: 1, names: ["Quiet Imagery"] });
  });

  it("columns the app doesn't use are listed, not an error", () => {
    const w = result().warnings.find((x) => x.kind === "unknownColumns");
    expect(w).toMatchObject({
      columns: expect.arrayContaining(["SLICE", "SALIENT", "Tidy-up flag", "Decision"]),
    });
  });

  it("related principles still connect by name", () => {
    expect(result().relations).toEqual([{ from: "P002", to: "P001" }]);
  });

  it("evidence strength comes from the link, reference and evidence text", () => {
    const r = result();
    const level = (n: string) => r.principles.find((p) => p.name === n)!.evidence_level;
    expect(level("Short Lines")).toBe("strong");
    expect(level("Calm Colours")).toBe("none");
    expect(level("Pause Prompt")).toBe("some");
  });

  it("a file with an ID column still needs every ID (as before)", () => {
    expect(parse("bad-missing-id.csv")).toMatchObject({ ok: false });
  });
});
