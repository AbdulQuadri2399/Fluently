import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** 03b: 12/16, radius 6, icon + text. Meaning is always carried by the text. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-caption font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-text",
        primary: "border-primary text-primary",
        warning: "border-warning text-warning",
        danger: "border-danger text-danger",
        success: "border-success text-success",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
