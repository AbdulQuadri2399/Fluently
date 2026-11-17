import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Two badge kinds (03b section 6, the user's note T5):
 * - status: fully rounded, icon + words, pastel tone (Strong, Passed, Weak evidence, Flagged)
 * - type: 4 px corners, no icon, neutral (Behavioural, Business, Progress feedback)
 * Meaning is always carried by the words, never colour alone.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap text-caption font-medium [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      kind: {
        status: "rounded-full py-px pr-2 pl-1.5",
        type: "rounded-xs bg-canvas px-1.5 py-px text-ink",
      },
      tone: {
        neutral: "",
        ok: "bg-ok-bg text-ok",
        warn: "bg-warn-bg text-warn",
        bad: "bg-bad-bg text-bad",
        info: "bg-info-bg text-info",
      },
    },
    compoundVariants: [{ kind: "status", tone: "neutral", className: "bg-canvas text-ink" }],
    defaultVariants: { kind: "type", tone: "neutral" },
  },
);

export function Badge({
  className,
  kind,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ kind, tone }), className)} {...props} />;
}
