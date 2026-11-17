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
  /** MI1: a suggestion appears under the field (fade + 8 px rise). */
  suggestionIn: "animate-in fade-in-0 slide-in-from-bottom-2 duration-base ease-emphasis",
  /** MI1 with reduced motion: fade only, quickly. */
  suggestionInReduced: "animate-in fade-in-0 duration-fast",
  /** MI3: a card arrives during a run (fade + 8 px rise; stagger set inline). */
  cardIn:
    "animate-in fade-in-0 slide-in-from-bottom-2 duration-base ease-standard fill-mode-backwards",
  /** MI3 with reduced motion: fade only. */
  cardInReduced: "animate-in fade-in-0 duration-fast fill-mode-backwards",
  /** MI11: badge swaps to "Overridden". */
  badgeSwap: "animate-in fade-in-0 duration-fast",
} as const;
