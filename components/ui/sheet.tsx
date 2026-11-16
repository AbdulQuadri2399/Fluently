"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetTitle = D.Title;
export const SheetDescription = D.Description;

/** 03b: panels slide in 16 px from the right + fade (duration-base), exit with ease-exit. */
export function SheetContent({
  className,
  children,
  closeLabel = "Close",
  ...props
}: ComponentProps<typeof D.Content> & { closeLabel?: string }) {
  return (
    <D.Portal>
      <D.Content
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-[400px] max-w-full flex-col border-l border-border bg-surface p-6",
          "duration-base ease-standard data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-right-4",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:ease-exit",
          className,
        )}
        {...props}
      >
        {children}
        <D.Close className="absolute right-4 top-4 rounded-sm p-1 text-text-muted hover:text-text">
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">{closeLabel}</span>
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
