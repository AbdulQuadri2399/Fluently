"use client";

import { Toaster as Sonner } from "sonner";

/** 03b: bottom-left, 5 s (10 s with Undo), pauses on hover/focus, announced politely. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-left"
      duration={5000}
      toastOptions={{
        className: "!bg-surface !text-text !border !border-border !rounded-md !text-small",
      }}
    />
  );
}
export { toast } from "sonner";
