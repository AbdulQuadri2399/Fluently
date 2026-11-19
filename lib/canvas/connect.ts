// Which cards a line may join (AC30.2) and which links a card needs (AC24.2, AC30.5).
// Mirrors public.can_connect and the checks in the add / disconnect database functions.
const PAIRS = new Set([
  "objective>source",
  "source>finding",
  "finding>theme",
  "theme>opportunity",
  "opportunity>gap",
]);

export const canConnect = (fromType: string, toType: string) => PAIRS.has(`${fromType}>${toType}`);

/** The kind of card each added card is built from (finding ← evidence, theme ← finding, …). */
export const REQUIRED_SOURCE: Record<string, string> = {
  finding: "source",
  theme: "finding",
  opportunity: "theme",
  gap: "opportunity",
};

/** Types a person can add, by lane (AC24.2). */
export const ADDABLE_BY_LANE: Record<string, string[]> = {
  evidence: ["finding"],
  themes: ["theme"],
  opportunities: ["opportunity", "gap"],
};

export const DELETABLE = new Set(["finding", "theme", "opportunity", "gap"]);
export const MERGEABLE = DELETABLE;

/** Everything built from a card, through its saved lines (AC24.5: how many depend on it). */
export function downstreamIds(edges: { from: string; to: string }[], id: string): Set<string> {
  const out = new Set<string>();
  let frontier = [id];
  while (frontier.length) {
    const next = edges.filter((e) => frontier.includes(e.from) && !out.has(e.to)).map((e) => e.to);
    next.forEach((n) => out.add(n));
    frontier = next;
  }
  return out;
}
