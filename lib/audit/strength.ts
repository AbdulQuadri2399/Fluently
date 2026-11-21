import type { Confidence } from "@/lib/rules/confidence";

// Evidence strength of an email finding (AC31.7, an adaptation of the AC12.6 rule, 04 D46).
// A research finding rests on several stored sources; an email finding rests on one toolkit
// principle, so its strength is how well backed that principle is in the toolkit itself:
//   High: the toolkit marks the evidence strong and links the paper behind it.
//   Med: some evidence, or strong with no paper linked.
//   Low: the toolkit marks it as having no evidence yet.
// Computed in code, never by the model.
export function principleStrength(p: {
  evidenceLevel: string;
  linkToPaper?: string | null;
}): Confidence {
  const linked = Boolean(p.linkToPaper?.trim());
  if (p.evidenceLevel === "strong" && linked) return "High";
  if (p.evidenceLevel === "strong" || p.evidenceLevel === "some") return "Med";
  return "Low";
}
