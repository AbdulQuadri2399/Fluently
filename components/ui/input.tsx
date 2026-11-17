import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-sm border border-line bg-surface px-3 text-small text-ink placeholder:text-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "aria-invalid:border-bad disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
