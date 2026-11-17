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
    expect(noIdColumn).toMatchObject({
      ok: false,
      errors: [{ kind: "missingColumns", columns: ["ID"] }],
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
