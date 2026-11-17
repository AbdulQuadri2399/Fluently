import type { IntakeRow } from "./service";

export type Missing = "business_objective" | "behavioural_objective" | "sector" | "assets";

/** AC9.1, AC8.6: what still stops the brief being approved, in screen order. */
export function missingForApproval(
  intake: Pick<
    IntakeRow,
    "business_objective" | "behavioural_objective" | "sector" | "sector_other"
  >,
  mode: string,
  assetCount: number,
): Missing[] {
  const missing: Missing[] = [];
  if (!intake.business_objective?.trim()) missing.push("business_objective");
  if (!intake.behavioural_objective?.trim()) missing.push("behavioural_objective");
  if (!intake.sector?.trim() || (intake.sector === "Other" && !intake.sector_other?.trim()))
    missing.push("sector");
  if (mode === "optimise" && assetCount === 0) missing.push("assets");
  return missing;
}
