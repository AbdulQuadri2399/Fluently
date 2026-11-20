import { z } from "zod";

// Brief fields and limits (03 section 6).
export const COACHED_FIELDS = [
  "business_objective",
  "behavioural_objective",
  "audience_context",
  "constraints",
] as const;
export type CoachedField = (typeof COACHED_FIELDS)[number];
export const INTAKE_FIELDS = [
  ...COACHED_FIELDS,
  "sector",
  "sector_other",
  "figma_link",
  "competitors",
] as const;
export type IntakeField = (typeof INTAKE_FIELDS)[number];

export const FIELD_MAX: Record<IntakeField, number> = {
  business_objective: 500,
  behavioural_objective: 500,
  audience_context: 1500,
  constraints: 1500,
  sector: 80,
  sector_other: 80,
  figma_link: 500,
  competitors: 500,
};

/** AC32.6: up to five competitors, one per line. */
export const MAX_COMPETITORS = 5;
export const competitorLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export const FIGMA_LINK = /^https:\/\/(www\.)?figma\.com\/\S+$/;

export const saveFieldSchema = z
  .object({
    projectId: z.uuid(),
    field: z.enum(INTAKE_FIELDS),
    value: z.string(),
    version: z.number().int().min(1),
  })
  .refine((v) => v.value.length <= FIELD_MAX[v.field], { path: ["value"] })
  .refine((v) => v.field !== "competitors" || competitorLines(v.value).length <= MAX_COMPETITORS, {
    path: ["value"],
  })
  .refine(
    (v) => v.field !== "figma_link" || v.value.trim() === "" || FIGMA_LINK.test(v.value.trim()),
    {
      path: ["value"],
    },
  );
export type SaveFieldInput = z.input<typeof saveFieldSchema>;

export const coachInputSchema = z.object({
  projectId: z.uuid(),
  field: z.enum(COACHED_FIELDS),
  text: z.string().trim().min(10).max(1500),
});
export type CoachInput = z.input<typeof coachInputSchema>;

export const resolveSchema = z.object({
  projectId: z.uuid(),
  field: z.enum(COACHED_FIELDS),
  action: z.enum(["use", "edit", "keep"]),
  value: z.string().max(1500),
  lowSpecificity: z.boolean(),
  version: z.number().int().min(1),
});
export type ResolveInput = z.input<typeof resolveSchema>;

/** Sectors offered in the brief; "Other" asks for free text. */
export const SECTORS = [
  "Banking",
  "Insurance",
  "Energy",
  "Telecoms",
  "Retail",
  "Healthcare",
  "Pharmacy",
  "Public sector",
  "Education",
  "Travel",
  "Gambling",
  "High-interest credit",
  "Alcohol",
  "Other",
] as const;
