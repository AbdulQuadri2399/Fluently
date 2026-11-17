# 03b: Design direction

*Plain English: how Fluently should look, move and feel, given as exact values so the build doesn't have to guess.*

Feature: Fluently MVP | Platform: web app (desktop only) | Version: 2 | Date: 2026-11-17 | Status: approved (interim; the user's own design system will replace the token values)

*Changed 2026-11-17: version 1 (cool greys, blue accent, Inter, Lucide) replaced by the calm direction the user approved: research in `inputs/mobbin-research.md` (round 2), the user's taste skills, and the nine notes in `inputs/figma-taste-notes.md` (T1–T9). Mock-up: https://claude.ai/artifact/ATKfnWkvsdEywWAo6q1BE1.*

## 1. Sources
- The user's taste skills (`minimalist-ui`, `design-taste-frontend`): warm monochrome, black for the main action, pale pastels only for meaning, hairline borders, no Inter, Phosphor icons, no decorative dots or chips.
- The user's Figma notes T1–T9 (Firecrawl sidebar, TheyDo badges, Cofounder tree cards and lines).
- Calm references: [Cofounder staged plan](https://mobbin.com/screens/f0cd27fc-87c3-49e8-95d7-b9dc0661c0a5), [Deel](https://mobbin.com/screens/ea912de7-941e-4e5c-94d3-3429ff65d029), [Square](https://mobbin.com/screens/5650b601-9f43-470f-b4a5-cf1d074c6965), [TheyDo](https://mobbin.com/screens/340e726e-f049-4cbb-b664-474e14a3baf4), [Contractbook](https://mobbin.com/screens/c402174b-230f-4474-a556-3c45777b91b7).

## 2. Design language
**Calm, document-like, evidential.** Warm white and grey everywhere; black only for the action that moves work forward; colour only when something needs attention. Each card says one thing in plain words. Space does the grouping, not boxes.

Rules: one line per card (title + one status in words); later stages fade; sources fold into one Evidence card; details as a property list; home leads with what needs you.

## 3. Tokens

### Colour (all text pairs ≥ 4.5:1; lines ≥ 3:1 on the canvas; checked by `tests/unit/tokens.test.ts`)

| Token | Light | Dark | Use |
|---|---|---|---|
| paper | #fbfbfa | #141413 | Page background |
| canvas | #f3f3f1 | #1b1b19 | Tree canvas, segmented controls |
| surface | #ffffff | #222220 | Cards, panels, inputs |
| soft | #f7f6f3 | #2a2926 | Suggestion block, icon boxes, hover |
| line | #eaeaea | #33322f | Hairline borders, dividers |
| line-strong | #dedcd8 | #45443f | Secondary button and input borders |
| wire | #8e8c86 | #8b8983 | Connecting lines (3:1 on canvas) |
| ink | #1f2123 | #eeede9 | Text, selected borders, focus ring |
| muted | #6f6e6a | #a8a6a0 | Secondary text |
| action | #111111 | #eeede9 | Main button background |
| on-action | #ffffff | #141413 | Main button text |
| ok / ok-bg | #346538 / #edf3ec | #8fcf9a / #1f2d22 | Done, passed, strong evidence |
| warn / warn-bg | #8a5d00 / #fbf3db | #e6c06b / #332a12 | Weak evidence, low specificity, out of date |
| bad / bad-bg | #9f2f2d / #fdebec | #f0a19c / #3a1f1f | Flagged, errors, delete |
| info / info-bg | #1f6c9f / #e1f3fe | #8cc4ef / #16283a | "New" label, information |

### Type
- **Geist** for everything (400 / 500 / 600); **Geist Mono** for lane names, IDs, counts and keyboard shortcuts.
- Sizes (px / line-height): 12/16 caption and badges, 13.5/20 cards and controls, 14/21 body, 16/24 lead, 19/26 panel title, 30/36 page title (letter-spacing -0.03em on titles).

### Spacing, shape, depth
- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 44, 56, 72.
- Corners: 4 px type badges and keys, 6 px buttons and inputs, 8 px cards, 10 px floating bars, 12 px dialogs; status badges fully rounded.
- Hairline 1 px borders. Shadow only on things floating above the canvas: `0 8px 28px rgba(31,33,35,.06)`. Dark mode uses borders instead of shadows.
- Tree cards: 280 px wide; 56 px between lanes; 20 px between cards in a lane.

### Motion
| Token | Value |
|---|---|
| duration-fast | 120 ms |
| duration-base | 200 ms |
| duration-slow | 320 ms |
| ease-standard | cubic-bezier(0.2, 0, 0, 1) |
| ease-exit | cubic-bezier(0.3, 0, 1, 1) |
| ease-emphasis | cubic-bezier(0.16, 1, 0.3, 1) |
| Reduced motion | movement removed; quick fades only |

## 4. Motion direction
Quiet and nearly invisible. Motion shows cause and effect (a card appears because a step finished), keeps people oriented (panels slide 16 px, trace path darkens), and confirms actions (button press scales to 0.98). Never animates: canvas panning, report text, wireframes, numbers.

## 5. Per screen
| SCR | Direction |
|---|---|
| SCR1 Sign in | Centred 400 px card on paper; wordmark; single column form; black main button. |
| SCR2 Onboarding | 640 px dialog; one simple diagram per step; step dots. |
| SCR3 Home / Projects | Sidebar (T1–T3): search with ⌘K at the top, nav in groups with hairline dividers, projects list, "What's new" (pending decision) and account at the bottom. Main: date, greeting, *Waiting for you*, *Running*, *Recent projects* as hairline rows; one black button ("New project"). |
| SCR4 New project | 480 px dialog; mode and channel as choice cards. |
| SCR5 Tree | Stage lanes on the canvas colour with names in a pinned strip at the top (mono, uppercase, + to add). Cards (T6–T8): icon box on the left, title + one status line, pastel green tick when done, freshness label on the top-right edge. Dashed lines ending in a small circle (T9). Floating decision bar at the bottom centre; zoom bottom right. |
| SCR6 Brief | 680 px document column; fields as plain boxes; AI suggestion in a soft block under the field. |
| SCR7 Details panel | 384 px right panel: type label + Edit / Regenerate / more / close at the top; title; property list (label left, value right); folded sections (Sources, History). |
| SCR8 Decision bar | 780 px floating bar: what's done and what to decide on the left; count + secondary + black main button on the right. |
| SCR9 Report | 680 px reading column, citation markers as small numbered links. |
| SCR10 Wireframe preview | Frame with a size label above; numbered pins in ink; annotation list on the right. |
| SCR11, SCR12 | Settings layout: left section list, right content with hairline rows. |

## 6. Components
| Component | Pattern and states |
|---|---|
| Button | Main (action / on-action), secondary (surface + line-strong border), quiet (muted text), danger (bad). Pressed scale 0.98; focus ring ink 2 px; disabled-with-reason keeps focus and explains; working state swaps the label ("Signing in…"). Height 36 px. |
| Status badge (T5) | Fully rounded, icon + words, pastel bg + matching text: Strong, Passed, Weak evidence, Flagged. |
| Type badge (T5) | 4 px corners, no icon, canvas bg + ink text: Behavioural, Business, Progress feedback. |
| Tree card (T6–T8) | Surface, line border, 8 px; 30 px icon box (soft bg, line border, muted icon); title 13.5/600; status 12 muted; done tick 16 px ok-bg circle with ok check; freshness label on top edge ("New" info, "Out of date" warn); selected = ink border + 3 px line halo; dimmed 35%; hover shows connection handles. |
| Connecting line (T9) | Dashed 5/4, wire, 1.5 px; small surface circle with wire stroke at the receiving end only; traced = ink 1.75 px. |
| Lane strip | Paper band 44 px with hairline bottom; names in Geist Mono 11 px uppercase muted; count and + on the right. |
| Form field | Label above, help text below, error below in bad with icon; surface bg; line border; 6 px. |
| Suggestion block | Soft bg, 8 px; "Suggested" with sparkle icon; new text; why line muted; Use / Edit / Keep mine. |
| Sidebar | 232 px; search with `kbd`; groups split by hairlines; footer: What's new, account email (truncated), Collapse. |
| Toast | Bottom-left, surface + line border, 10 px; Undo where it applies. |
| Dialog | Surface, 12 px, focus trapped, Esc closes. |
| Icons | Phosphor, regular weight in controls, bold in small (≤ 16 px) spots; always paired with words for meaning. |

## 7. Micro-interactions
| ID | Moment | Trigger | Feedback | Timing | Reduced motion | Why |
|---|---|---|---|---|---|---|
| MI1 | Suggestion appears (SCR6) | Leave a coached field | Block fades in + 8 px rise | base, emphasis | Fade, fast | Feedback while drafting |
| MI2 | Use suggestion | Click | Field text swaps; "Saved" | fast | Instant | Confirms the change |
| MI3 | Card arrives during a run (SCR5) | Step saved | Fade + 8 px rise, 40 ms stagger (max 5) | base | Fade | Work is visibly happening |
| MI4 | Step completes (SCR8) | Step done | Spinner → tick; announced | fast | Static swap | Progress reduces uncertainty |
| MI5 | Trace path | Select a card | Off-path cards fade to 35%; path lines turn ink | base | Instant | Shows the chain of evidence |
| MI6 | Save in panel | Save | "Saving…" → "Saved" | fast | Text only | Confirmation |
| MI7 | Card goes out of date | Upstream change | "Out of date" label appears | fast | Instant | Consequence visible, nothing lost |
| MI8 | Decision made | Continue | Bar fades; next lane starts | base | Instant | Confirms and shows what's next |
| MI9 | Delete with Undo | Confirm | Card fades; toast with Undo 10 s | fast | Instant | Recovery |
| MI10 | Pin selected (SCR10) | Click / Enter | Ring + annotation card | base | Fade | Links element to its reasoning |
| MI11 | Override recorded | Record | Badge becomes "Overridden" | fast | Instant | Accountability |
| MI12 | Any button press | Press | Scale 0.98 | fast | None | Tactile acknowledgement |
| MI13 | Expand a card | Click / Enter | Card grows in place | base | Instant | Detail without losing your place |
| MI14 | Drag a connection | Drag from right handle | Valid targets stay sharp, others fade | fast | Instant | Teaches the rule by doing |

## 8. Conflicts
Dimmed cards in trace mode fall below text contrast on purpose; they aren't interactive targets while dimmed, and the details panel lists the path as text.
