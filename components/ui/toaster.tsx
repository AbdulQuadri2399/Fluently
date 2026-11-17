"use client";

import { Toaster as Sonner } from "sonner";

/** 03b: bottom-left, 5 s (10 s with Undo), pauses on hover/focus, announced politely. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-left"
      duration={5000}
      // Clear of the 232 px sidebar (03b SCR3).
      offset={{ left: 256, bottom: 24 }}
      toastOptions={{
        className: "!bg-surface !text-ink !border !border-line !rounded-md !text-small",
      }}
    />
  );
}
export { toast } from "sonner";
