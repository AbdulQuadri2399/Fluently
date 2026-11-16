"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

/** True when the person has asked the system to reduce motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
