import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-sm border border-border bg-surface px-3 text-small text-text placeholder:text-text-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "aria-invalid:border-danger disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
