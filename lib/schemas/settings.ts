import { z } from "zod";
import { settingsCopy as c } from "@/components/settings/copy";
import { AI_STAGES, EFFORTS, MODELS } from "@/lib/ai/models";

const domain = /^@(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** An allowlist entry is an email or "@domain.tld" (AC3.1, AC3.2, 03 section 6). */
export const allowEntrySchema = z.object({
  value: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, c.invalidAllowEntry)
    .refine((v) => domain.test(v) || z.email().safeParse(v).success, c.invalidAllowEntry),
});
export type AllowEntryInput = z.input<typeof allowEntrySchema>;

export function allowEntryKind(value: string): "email" | "domain" {
  return value.startsWith("@") ? "domain" : "email";
}

const stageModel = z.object({ model: z.enum(MODELS), effort: z.enum(EFFORTS) });
const shortList = z.array(z.string().trim().min(1).max(80)).max(30);

/** O7 updateWorkspaceSettings: every field optional, admins only (AC28.1, AC10.4, AC13.3). */
export const workspaceSettingsSchema = z.object({
  stageModels: z.object(Object.fromEntries(AI_STAGES.map((s) => [s, stageModel]))).optional(),
  costCapGbp: z.coerce.number<number>().min(1, c.capInvalid).max(500, c.capInvalid).optional(),
  gbpPerUsd: z.coerce.number<number>().min(0.1, c.rateInvalid).max(5, c.rateInvalid).optional(),
  agencyServices: shortList.optional(),
  sectorFlagList: shortList.optional(),
  sectorRefuseList: shortList.optional(),
});
export type WorkspaceSettingsInput = z.input<typeof workspaceSettingsSchema>;
