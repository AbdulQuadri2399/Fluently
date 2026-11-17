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

/** J2 findings step (AC12.2): each finding cites source handles from this run, or says it's AI inference. */
export const findingsSchema = z.object({
  findings: z
    .array(
      z.object({
        text: z.string().min(1).max(400),
        sourceHandles: z.array(z.string().max(12)).max(10),
        aiInference: z.boolean(),
        stance: z.enum(["supports", "contradicts", "neutral"]),
      }),
    )
    .max(30),
});
export type FindingsOutput = z.infer<typeof findingsSchema>;

/** J2 synthesis step (AC12.5, AC12.9, AC13.1): themes, opportunities, gaps, external principles. */
export const synthesisSchema = z.object({
  themes: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        summary: z.string().max(600),
        findings: z.array(z.number().int().min(0)).min(1),
      }),
    )
    .max(10),
  opportunities: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        summary: z.string().max(600),
        themes: z.array(z.number().int().min(0)).min(1),
        principleKeys: z.array(z.string().max(40)).max(6),
        contradicts: z.boolean(),
        gapQuestion: z.string().max(400).nullable(),
        gapMethod: z.string().max(120).nullable(),
        // AC13.5: discovery confirms or measures; generative explores needs not yet understood.
        gapKind: z.enum(["discovery", "generative"]).nullable(),
      }),
    )
    .max(8),
  externalPrinciples: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        mechanism: z.string().max(120),
        sourceHandle: z.string().max(12),
      }),
    )
    .max(5),
});
export type SynthesisOutput = z.infer<typeof synthesisSchema>;

/** J2 questions step (AC11.9): research questions written from the objectives. */
export const questionsSchema = z.object({
  questions: z.array(z.string().min(5).max(240)).min(3).max(6),
});
export type QuestionsOutput = z.infer<typeof questionsSchema>;
