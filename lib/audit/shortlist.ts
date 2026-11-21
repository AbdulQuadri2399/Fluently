// The toolkit shortlist (AC31.6, 04 D40): about 20 principles chosen in code from the behavioural
// objective, the audience, the sector and what the email contains, so the model is not sent all
// of the toolkit every time. Principles with no description are kept but rank lower (AC33.5).

export type ShortlistPrinciple = {
  id: string;
  principleKey: string;
  name: string;
  generalGoal: string;
  subGoal: string;
  mechanism: string;
  quickInsight: string | null;
  extendedExplanation: string | null;
  examples: string | null;
  designLever: string | null;
  outcome: string | null;
  evidenceLevel: string;
};

export type ShortlistContext = {
  behaviouralObjective: string;
  businessObjective?: string;
  audience?: string;
  sector?: string;
  /** What this email has: a short list of words such as "cta", "urgency", "subject". */
  emailHints?: string[];
};

export const SHORTLIST_SIZE = 20;

const STOP = new Set(
  "a an and are as at be but by for from has have how if in into is it its of on or our so that the their them then there they this to was we what when which who will with you your more most can get make people customers customer user users".split(
    " ",
  ),
);

export const words = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, "").replace(/(ing|ed|es|s)$/, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));

const EVIDENCE_BONUS: Record<string, number> = { strong: 1.5, some: 0.75, none: 0 };

/** How well a principle fits this email's brief. Higher is better; ties break by key. */
export function scorePrinciple(p: ShortlistPrinciple, ctx: ShortlistContext): number {
  const objective = new Set(words(ctx.behaviouralObjective));
  const wider = new Set([
    ...words(ctx.businessObjective ?? ""),
    ...words(ctx.audience ?? ""),
    ...words(ctx.sector ?? ""),
  ]);
  const hints = new Set((ctx.emailHints ?? []).flatMap((h) => words(h)));
  let score = 0;
  const fields: [string | null, number][] = [
    [p.name, 3],
    [`${p.generalGoal} ${p.subGoal}`, 2.5],
    [p.mechanism, 2],
    [p.outcome, 2],
    [p.designLever, 2],
    [p.quickInsight, 1],
    [p.extendedExplanation, 0.5],
    [p.examples, 0.5],
  ];
  for (const [text, weight] of fields) {
    if (!text) continue;
    for (const w of new Set(words(text))) {
      if (objective.has(w)) score += weight * 2;
      else if (hints.has(w)) score += weight * 1.5;
      else if (wider.has(w)) score += weight;
    }
  }
  score += EVIDENCE_BONUS[p.evidenceLevel] ?? 0;
  // Thin principles (nothing to read) can still be chosen, but only after fuller ones.
  const thin = !p.quickInsight && !p.extendedExplanation && !p.examples;
  if (thin) score -= 5;
  return score;
}

/** About `size` principles, best fit first. Always returns up to `size`, even when little matches. */
export function shortlist(
  principles: ShortlistPrinciple[],
  ctx: ShortlistContext,
  size = SHORTLIST_SIZE,
): ShortlistPrinciple[] {
  return principles
    .map((p) => ({ p, s: scorePrinciple(p, ctx) }))
    .sort((a, b) => b.s - a.s || a.p.principleKey.localeCompare(b.p.principleKey))
    .slice(0, size)
    .map((x) => x.p);
}
