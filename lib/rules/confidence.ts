// Evidence confidence (AC12.6) and evidence gaps (AC13.1, AC13.2). Computed in code from the
// stored links behind an opportunity, never by the model.

export type SourceType = "toolkit" | "paper" | "desk" | "competitor" | "social" | "upload";
export type Confidence = "High" | "Med" | "Low";
export type ConfidenceReason =
  | "high_multi_type"
  | "med_two_agree"
  | "med_three_one_type"
  | "low_single"
  | "low_ai_only"
  | "low_contradict";

export type EvidenceInput = {
  /** Distinct stored sources behind the opportunity (through its themes and findings). */
  sources: { id: string; type: SourceType }[];
  /** True when at least one finding behind it is labelled AI independent inference. */
  aiInference: boolean;
  /** True when findings behind it point in opposite directions (EC5). */
  contradicts: boolean;
};

export function confidence(input: EvidenceInput): { level: Confidence; reason: ConfidenceReason } {
  const unique = new Map(input.sources.map((s) => [s.id, s.type]));
  const count = unique.size;
  const types = new Set(unique.values()).size;
  if (input.contradicts) return { level: "Low", reason: "low_contradict" };
  if (count === 0)
    return { level: "Low", reason: input.aiInference ? "low_ai_only" : "low_single" };
  if (count === 1) return { level: "Low", reason: "low_single" };
  if (count >= 3 && types >= 2) return { level: "High", reason: "high_multi_type" };
  if (count >= 3) return { level: "Med", reason: "med_three_one_type" };
  return { level: "Med", reason: "med_two_agree" };
}

/** AC13.1, AC13.2: a gap card for Low confidence or contradicting sources; none otherwise. */
export function needsGap(input: EvidenceInput): boolean {
  return input.contradicts || confidence(input).level === "Low";
}
