import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-sm border border-border bg-surface px-3 py-2 text-small text-text placeholder:text-text-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
