"use client";

import { Tooltip as T } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** 03b: on hover and focus, 400 ms delay, 12/16 text. */
export function TooltipProvider(props: ComponentProps<typeof T.Provider>) {
  return <T.Provider delayDuration={400} {...props} />;
}
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof T.Content>) {
  return (
    <T.Portal>
      <T.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-sm bg-ink px-2 py-1 text-caption text-paper shadow-elev-1",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 duration-fast",
          className,
        )}
        {...props}
      />
    </T.Portal>
  );
}
