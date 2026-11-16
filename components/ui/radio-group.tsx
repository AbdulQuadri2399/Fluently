"use client";

import { RadioGroup as R } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }: ComponentProps<typeof R.Root>) {
  return <R.Root className={cn("grid gap-2", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof R.Item>) {
  return (
    <R.Item
      className={cn(
        "grid size-5 place-items-center rounded-full border border-border bg-surface data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <R.Indicator className="size-2.5 rounded-full bg-primary" />
    </R.Item>
  );
}
