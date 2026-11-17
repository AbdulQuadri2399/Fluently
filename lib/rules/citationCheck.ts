// Citation check (D8, AC12.2, AC12.3, NFR4). A finding may only cite sources found in this run
// (by handle, e.g. "S12"). Unknown handles are dropped and reported for `citation_rejected`.
// A finding left with no valid source survives only if the model labelled it AI inference.

export type DraftFinding = { text: string; sourceHandles: string[]; aiInference: boolean };
export type CheckedFinding = { text: string; sourceHandles: string[]; aiInference: boolean };

export function checkCitations(
  findings: DraftFinding[],
  runHandles: Iterable<string>,
): { kept: CheckedFinding[]; dropped: DraftFinding[]; rejectedHandles: string[] } {
  const allowed = new Set(runHandles);
  const kept: CheckedFinding[] = [];
  const dropped: DraftFinding[] = [];
  const rejected = new Set<string>();
  for (const f of findings) {
    const valid = [...new Set(f.sourceHandles)].filter((h) => allowed.has(h));
    for (const h of f.sourceHandles) if (!allowed.has(h)) rejected.add(h);
    if (valid.length > 0) kept.push({ text: f.text, sourceHandles: valid, aiInference: false });
    else if (f.aiInference) kept.push({ text: f.text, sourceHandles: [], aiInference: true });
    else dropped.push(f);
  }
  return { kept, dropped, rejectedHandles: [...rejected] };
}
