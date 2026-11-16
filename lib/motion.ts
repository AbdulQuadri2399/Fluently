// Motion tokens from 03b §3. Use these names; never write one-off durations.
export const duration = { fast: 120, base: 200, slow: 320 } as const;
export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  exit: "cubic-bezier(0.3, 0, 1, 1)",
  emphasis: "cubic-bezier(0.05, 0.7, 0.1, 1)",
} as const;

/** Tailwind classes for each micro-interaction (03b §7), named by ID. */
export const mi = {
  /** MI12: any button press. Omitted under reduced motion. */
  press: "transition-transform duration-fast ease-standard active:scale-[0.98]",
} as const;
