"use client";

import { useSyncExternalStore } from "react";

// One shared clock, refreshed every 30 s. The server renders without a time (null), so
// dates and greetings use the person's own time zone and never mismatch on hydration.
let cached: Date | null = null;

function getSnapshot(): Date {
  if (!cached || Date.now() - cached.getTime() > 30_000) cached = new Date();
  return cached;
}

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
