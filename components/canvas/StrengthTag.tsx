import { Badge } from "@/components/ui/badge";
import { canvasCopy as c } from "./copy";

export type Level = "High" | "Med" | "Low";

/** AC12.12: one pastel tag everywhere: High green, Med amber, Low red, always with the word. */
export const LEVEL_TONE = { High: "ok", Med: "warn", Low: "bad" } as const;

export function strengthLabel(level: Level, of: "confidence" | "strength") {
  return of === "confidence" ? c.checkpoint.confidenceLabel(level) : c.strengthLabel(level);
}

export function StrengthTag({
  level,
  of,
  className,
}: {
  level: Level;
  /** Opportunities carry confidence; themes carry strength (AC12.6, AC12.11). */
  of: "confidence" | "strength";
  className?: string;
}) {
  return (
    <Badge kind="status" tone={LEVEL_TONE[level]} className={className} data-level={level}>
      {strengthLabel(level, of)}
    </Badge>
  );
}
