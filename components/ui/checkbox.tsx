"use client";

import { Check } from "lucide-react";
import { Checkbox as C } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "grid size-5 place-items-center rounded-sm border border-border bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5" aria-hidden="true" />
      </C.Indicator>
    </C.Root>
  );
}
