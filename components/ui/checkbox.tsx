"use client";

import { Check } from "@phosphor-icons/react/dist/ssr";
import { Checkbox as C } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "grid size-5 place-items-center rounded-sm border border-line bg-surface data-[state=checked]:border-action data-[state=checked]:bg-action data-[state=checked]:text-on-action",
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
