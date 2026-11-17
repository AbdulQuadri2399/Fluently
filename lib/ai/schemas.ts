import { z } from "zod";

// Structured outputs (D7): each AI step returns one of these, validated again here.

/** O13 coachField (AC8.2, AC8.5). */
export const coachSchema = z.object({
  suggestion: z.string().min(1).max(1500),
  reason: z.string().min(1).max(300),
  lowSpecificity: z.boolean(),
});
export type CoachOutput = z.infer<typeof coachSchema>;

export const ETHICS_RULES = [
  "Deception",
  "Fake urgency or scarcity",
  "Hard to cancel or opt out",
  "Hidden costs",
  "Exploiting vulnerable groups",
  "Sensitive sector",
] as const;

/** J1 ethicsGate (AC10.1): pass, or flag with one reason per rule broken. */
export const ethicsSchema = z.object({
  result: z.enum(["pass", "flag"]),
  reasons: z
    .array(z.object({ rule: z.enum(ETHICS_RULES), reason: z.string().min(1).max(400) }))
    .max(10),
});
export type EthicsOutput = z.infer<typeof ethicsSchema>;
