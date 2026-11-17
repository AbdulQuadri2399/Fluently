import Papa from "papaparse";

// Toolkit file checks (AC4.1–AC4.4, AC4.6, AC4.7). Pure: no database, no network.

export const REQUIRED_COLUMNS = [
  "ID",
  "Principle",
  "General Goal",
  "Sub-Goal",
  "Mechanism",
] as const;
export const SUPPORTED_COLUMNS = [
  "ID",
  "General Goal",
  "Sub-Goal",
  "Sense",
  "Principle",
  "Quick Insight Summary",
  "Extended Explanation",
  "Related Principles",
  "Examples",
  "Link to paper",
  "Reference",
  "Mechanism",
  "Design lever",
  "Outcome",
  "Sense (new)",
  "Evidence",
] as const;
type Column = (typeof SUPPORTED_COLUMNS)[number];

export const MAX_BYTES = 10 * 1024 * 1024;

export type ToolkitError =
  | { kind: "file" }
  | { kind: "unreadable" }
  | { kind: "empty" }
  | { kind: "missingColumns"; columns: string[] }
  | { kind: "missingId"; row: number }
  | { kind: "duplicateId"; rows: number[]; id: string };

export type ToolkitWarning =
  | { kind: "unknownColumns"; columns: string[] }
  | { kind: "relatedNotFound"; row: number; text: string };

export type EvidenceLevel = "strong" | "some" | "none";

/** Shaped like the principles table so it can be saved as-is (snake_case). */
export type ParsedPrinciple = {
  principle_key: string;
  name: string;
  general_goal: string;
  sub_goal: string;
  mechanism: string;
  sense: string | null;
  quick_insight: string | null;
  extended_explanation: string | null;
  examples: string | null;
  link_to_paper: string | null;
  reference: string | null;
  design_lever: string | null;
  outcome: string | null;
  evidence: string | null;
  related_raw: string | null;
  evidence_level: EvidenceLevel;
};

export type ParseResult =
  | {
      ok: true;
      rowCount: number;
      principles: ParsedPrinciple[];
      relations: { from: string; to: string }[];
      warnings: ToolkitWarning[];
      evidence: Record<EvidenceLevel, number>;
    }
  | { ok: false; rowCount: number; errors: ToolkitError[]; warnings: ToolkitWarning[] };

type Row = Record<string, unknown>;

function fileKind(fileName: string): "csv" | "json" | null {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext === "csv" ? "csv" : ext === "json" ? "json" : null;
}

function readRows(text: string, kind: "csv" | "json"): { rows: Row[]; headers: string[] } | null {
  if (kind === "csv") {
    const res = Papa.parse<Row>(text.replace(/^﻿/, ""), {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    if (!res.meta.fields) return null;
    return { rows: res.data, headers: res.meta.fields };
  }
  try {
    const data: unknown = JSON.parse(text);
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object"
        ? Object.values(data).find(Array.isArray)
        : null;
    if (
      !Array.isArray(list) ||
      !list.every((r) => r && typeof r === "object" && !Array.isArray(r))
    ) {
      return null;
    }
    const rows = (list as Row[]).map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v])),
    );
    const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    return { rows, headers };
  } catch {
    return null;
  }
}

const text = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());
const orNull = (s: string): string | null => (s === "" ? null : s);

/** AC4.6: strong = link or reference AND evidence text; some = one of them; none = neither or "No source". */
export function evidenceLevel(link: string, reference: string, evidence: string): EvidenceLevel {
  if (/^no source\.?$/i.test(evidence.trim())) return "none";
  const hasLink = link.trim() !== "" || reference.trim() !== "";
  const hasEvidence = evidence.trim() !== "";
  if (hasLink && hasEvidence) return "strong";
  if (hasLink || hasEvidence) return "some";
  return "none";
}

/** AC4.6: the newer Sense column wins when both are filled. */
export function mergeSense(oldSense: string, newSense: string): string | null {
  return orNull(newSense.trim() || oldSense.trim());
}

/** Checks a toolkit export and turns it into principles ready to save (AC4.1). */
export function parseToolkit(content: string, fileName: string, byteSize?: number): ParseResult {
  const kind = fileKind(fileName);
  const size = byteSize ?? new TextEncoder().encode(content).length;
  if (!kind || size > MAX_BYTES)
    return { ok: false, rowCount: 0, errors: [{ kind: "file" }], warnings: [] };
  const read = readRows(content, kind);
  if (!read) return { ok: false, rowCount: 0, errors: [{ kind: "unreadable" }], warnings: [] };

  // Match columns without caring about case, so "sub-goal" still counts.
  const canonical = new Map<string, Column>(SUPPORTED_COLUMNS.map((c) => [c.toLowerCase(), c]));
  const headerMap = new Map<string, Column>();
  const unknown: string[] = [];
  for (const h of read.headers) {
    const col = canonical.get(h.toLowerCase());
    if (col) headerMap.set(h, col);
    else if (h !== "") unknown.push(h);
  }
  const present = new Set(headerMap.values());
  const warnings: ToolkitWarning[] = unknown.length
    ? [{ kind: "unknownColumns", columns: unknown }]
    : [];
  const rowCount = read.rows.length;

  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  if (missing.length)
    return {
      ok: false,
      rowCount,
      errors: [{ kind: "missingColumns", columns: missing }],
      warnings,
    };
  if (rowCount === 0) return { ok: false, rowCount, errors: [{ kind: "empty" }], warnings };

  const firstRow = kind === "csv" ? 2 : 1; // CSV row 1 is the header.
  const rows = read.rows.map((r, i) => {
    const get = (c: Column) => {
      for (const [h, col] of headerMap) if (col === c) return text(r[h]);
      return "";
    };
    return { row: firstRow + i, get };
  });

  const errors: ToolkitError[] = [];
  const byId = new Map<string, number[]>();
  for (const { row, get } of rows) {
    const id = get("ID");
    if (!id) errors.push({ kind: "missingId", row });
    else byId.set(id.toLowerCase(), [...(byId.get(id.toLowerCase()) ?? []), row]);
  }
  for (const [, list] of byId) {
    if (list.length > 1) {
      const first = rows.find((r) => r.row === list[0]);
      errors.push({ kind: "duplicateId", rows: list, id: first?.get("ID") ?? "" });
    }
  }
  if (errors.length) return { ok: false, rowCount, errors, warnings };

  const principles: ParsedPrinciple[] = rows.map(({ get }) => ({
    principle_key: get("ID"),
    name: get("Principle"),
    general_goal: get("General Goal"),
    sub_goal: get("Sub-Goal"),
    mechanism: get("Mechanism"),
    sense: mergeSense(get("Sense"), get("Sense (new)")),
    quick_insight: orNull(get("Quick Insight Summary")),
    extended_explanation: orNull(get("Extended Explanation")),
    examples: orNull(get("Examples")),
    link_to_paper: orNull(get("Link to paper")),
    reference: orNull(get("Reference")),
    design_lever: orNull(get("Design lever")),
    outcome: orNull(get("Outcome")),
    evidence: orNull(get("Evidence")),
    related_raw: orNull(get("Related Principles")),
    evidence_level: evidenceLevel(get("Link to paper"), get("Reference"), get("Evidence")),
  }));

  // AC4.6, AC4.7: related principles match an ID first, then a name; unmatched text is kept.
  const keyOf = new Map<string, string>();
  for (const p of principles) keyOf.set(p.principle_key.toLowerCase(), p.principle_key);
  for (const p of principles)
    if (p.name && !keyOf.has(p.name.toLowerCase()))
      keyOf.set(p.name.toLowerCase(), p.principle_key);
  const relations: { from: string; to: string }[] = [];
  rows.forEach(({ row }, i) => {
    const p = principles[i]!;
    for (const part of (p.related_raw ?? "").split(/[;,\n]+/)) {
      const t = part.trim();
      if (!t) continue;
      const to = keyOf.get(t.toLowerCase());
      if (to && to !== p.principle_key) relations.push({ from: p.principle_key, to });
      else if (!to) warnings.push({ kind: "relatedNotFound", row, text: t });
    }
  });

  const evidence = { strong: 0, some: 0, none: 0 };
  for (const p of principles) evidence[p.evidence_level] += 1;
  return { ok: true, rowCount, principles, relations, warnings, evidence };
}
