"use client";

import { DropdownMenu as M } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-elev-1",
          "duration-fast data-[state=open]:animate-in data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex min-h-9 cursor-default select-none items-center gap-2 rounded-sm px-2 text-small outline-none data-[highlighted]:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return (
    <M.Label className={cn("px-2 py-1.5 text-caption text-text-muted", className)} {...props} />
  );
}

export const DropdownMenuSeparator = (props: ComponentProps<typeof M.Separator>) => (
  <M.Separator className="my-1 h-px bg-border" {...props} />
);
