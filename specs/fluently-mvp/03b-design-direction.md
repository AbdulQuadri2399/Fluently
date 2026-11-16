# 03b: Design direction

*Plain English: how Fluently should look, move and feel, given as exact values so the build doesn't have to guess.*

Feature: Fluently MVP | Platform: web app | Version: 1 | Date: 2026-11-16 | Status: draft

## 1. Sources

- No visual or motion references were provided, and no personal taste skill is set up. This direction uses **neutral, accessible defaults** in a calm editorial style (warm greys, one blue accent, flat surfaces). `[Assumption]` Replace it if the team has a house style; the build reads values only from the tokens below, so swapping is cheap.
- Pattern references are described in words (node-canvas tools generally: column layouts, side inspector, bottom panel), not copied from any product.

## 2. Design language

**Calm, precise, evidential.** Fluently is a thinking tool used for hours at a time by experts. The interface should feel like a well-set research document: quiet surfaces, strong typography, colour reserved for meaning (node type, confidence, flags). Lo-fi wireframes are strictly greyscale so they read as *direction*, not design. Motion is quick and quiet: it shows cause and effect (a node appears because a step finished; a path lights up because you traced it), never decoration.

## 3. Tokens

### Colour roles (all text pairs checked ≥ 4.5:1 against bg, surface and surface-2)

| Role | Light | Dark |
|---|---|---|
| bg | #FAFAF9 | #121211 |
| surface | #FFFFFF | #1B1B19 |
| surface-2 (panels, columns) | #F2F2EF | #262623 |
| border | #E2E2DD | #34342F |
| text | #1C1C1A | #F1F1EE |
| text-muted | #5C5C57 | #A9A9A2 |
| primary (buttons, links, focus) | #3451C7 (white text 6.7:1) | #8FA6FF (text #121211, 8.1:1) |
| danger | #B42318 | #FF8A80 |
| success | #1F7A35 | #6CD685 |
| warning (stale, low confidence, low specificity) | #8F5200 | #F5B451 |
| focus ring | primary, 2 px, 2 px offset | primary |

**Node type accents** (used as a 4 px left border, an icon colour and the type label; the label text always carries the meaning):

| Type | Light | Dark | Icon (Lucide) |
|---|---|---|---|
| Objectives | #5B3CC4 | #B49CFF | `target` |
| Sources / findings | #1A63A8 | #7DB8F0 | `book-open` |
| Themes | #0A6672 | #5CCAD6 | `layers` |
| Opportunities / gaps | #1F7A35 | #6CD685 | `lightbulb` / `circle-help` |
| Solutions | #B23D0A | #FF9966 | `sparkles` |
| Lo-fi | #4A4F55 | #B8BEC5 | `layout-template` |
| Tests | #A11D4B | #FF8FB3 | `flask-conical` |
| Ethics / override | danger / warning | danger / warning | `shield-check` / `shield-alert` |

**Lo-fi palette (inside wireframes only):** #FFFFFF, #F1F3F5, #DEE2E6, #ADB5BD, #495057, #212529. Annotation pins: primary fill, white number.

### Type
- Family: **Inter** (UI), **JetBrains Mono** (IDs such as `P-042`, error IDs). System fallback stack.
- Scale (px / line-height): 12/16 (caption, badges), 14/20 (body small, nodes), 16/24 (body, inspector), 18/26 (section), 22/30 (page title), 28/36 (report title).
- Weights: 400, 500 (labels, buttons), 600 (titles).

### Spacing, radius, elevation
- Spacing scale (px): 2, 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 6 (inputs, buttons, chips), 10 (nodes, cards), 14 (dialogs, panels).
- Elevation: level 0 flat with 1 px border; level 1 (nodes on hover, popovers) `0 1px 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.06)`; level 2 (dialogs) `0 8px 32px rgba(0,0,0,.16)`. In dark mode, use border + surface lightness instead of shadows.
- Node size: 240 px wide, min 72 px tall; column gap 120 px; row gap 16 px.

### Motion
| Token | Value |
|---|---|
| duration-fast | 120 ms |
| duration-base | 200 ms |
| duration-slow | 320 ms |
| ease-standard | cubic-bezier(0.2, 0, 0, 1) |
| ease-exit | cubic-bezier(0.3, 0, 1, 1) |
| ease-emphasis | cubic-bezier(0.05, 0.7, 0.1, 1) |
| Springs | none (CSS transitions only) |
| Reduced motion | `prefers-reduced-motion: reduce` → all movement replaced by opacity fades at duration-fast, or no animation; progress spinners become a static "…" with text |

## 4. Motion direction

- **Personality:** quick and quiet.
- **What motion is for:** cause and effect (new nodes appearing as steps finish), orientation (trace path, panel open/close), confirmation (saved, approved).
- **Panels:** inspector slides in from the right 16 px + fade, duration-base, ease-standard; checkpoint panel rises 16 px + fade. Exit with ease-exit at duration-fast.
- **Dialogs:** fade + scale from 0.98, duration-base.
- **New nodes during a run:** fade in + 8 px rise, duration-base, staggered 40 ms when several arrive together (cap 5 staggers, then all at once).
- **Trace path:** non-path nodes fade to 30% opacity over duration-base; path connections thicken from 1.5 px to 3 px in primary.
- **Loading to content:** skeleton cross-fades to content at duration-fast.
- **Never animates:** canvas pan/zoom inertia, column reflow, report text, lo-fi wireframes themselves, cost numbers.

## 5. Per screen

| SCR | Direction |
|---|---|
| SCR1 | Centred 400 px card on bg; logo wordmark; single column form. |
| SCR2 | 640 px dialog; each step one simple diagram (built in SVG from tokens), one heading, two sentences; step dots. |
| SCR3 | Full-width table on surface; status chips (running = primary outline + spinner; waiting for you = warning fill text; failed = danger; complete = success). Empty state: centred heading, body, one primary button. |
| SCR4 | 480 px dialog; mode and channel as large radio cards with one-line explanations. |
| SCR5 | Canvas on bg with a faint 24 px dot grid; columns as surface-2 bands with sticky headers (type icon, name, count, progress). Inspector 400 px right panel; checkpoint panel bottom, max 40% height, collapsible to one line. Toolbar top-left: zoom, fit, list view, *Regenerate stale (n)*. |
| SCR6 | Single 720 px column; fields grouped in cards; coaching suggestion card sits directly under its field with a 4 px primary left border. |
| SCR7 | Sections in order: header (type, provenance, markers), body, Principle(s), Evidence (sources), Objectives, History. Actions sticky at bottom. |
| SCR8 | Left: stage name + status + next action sentence; centre: decision content; right: primary *Approve* + secondary *Send back*. |
| SCR9 | 720 px reading column, 16/24 body, citation markers as superscript primary links; right gutter (≥ 1280 px) shows source cards on hover/focus. |
| SCR10 | Device frame (1 px border, radius 14) centred on surface-2; pins 24 px circles; annotation list on right in pin order. |
| SCR11, SCR12 | Settings layout: left section nav, right content cards. |

## 6. Per component

| Component | Pattern and states |
|---|---|
| Button | Primary (filled), secondary (outline), ghost, danger. States: default, hover (+4% darker), pressed (scale 0.98, duration-fast), focused (ring), disabled (40% opacity, `aria-disabled` with reason in tooltip), loading (spinner replaces icon, label changes to "…ing"). Min height 36 px; 44 px target in touch layouts. |
| Node card | surface, radius 10, 4 px left accent; title (14/20, 600, 2 lines max), type label, badges row. States: default, hover (elevation 1), selected (2 px primary border), focused (ring), stale (warning dashed border + "Out of date" badge), running (shimmer bar on top edge; reduced motion: static "Working…" badge), failed (danger border + "Failed" badge), dimmed (trace mode, 30% opacity). |
| Badge / chip | 12/16, radius 6, icon + text. Provenance: `AI`, `Edited`, `Added`. Confidence: `High`, `Med`, `Low` (Low uses warning). `Low specificity`, `Flagged`, `Overridden`, `AI inference`, `Qualitative signal · n sources`, `External principle`. |
| Form field | Label above, helper text below, error replaces helper in danger with icon; character counter where limits apply. |
| Coaching card | surface-2, primary left border; suggestion text; "Why:" line in text-muted; three buttons. |
| Dialog | surface, radius 14, elevation 2, focus trapped, `Esc` closes. |
| Toast | Bottom-left, surface + border, 5 s (10 s with Undo), pauses on hover/focus, announced politely. |
| Tooltip | On hover and focus, 400 ms delay, text 12/16. |
| Progress step list | ✓ success, spinner running, ✕ danger failed, ○ pending; each with text status. |
| Annotation pin | 24 px primary circle with number; focusable; selected = 2 px ring + annotation card. |
| Tabs | Underline style; *Canvas / Intake / Report*. |
| Table | Row hover surface-2; sortable headers with arrow icon and `aria-sort`. |
| Principle picker | Combobox with search by ID/name/mechanism; results grouped by General Goal; shows evidence level. |

## 7. Micro-interactions

| ID | Moment (SCR, state change) | Trigger | Feedback | Timing | Reduced-motion version | Why |
|---|---|---|---|---|---|---|
| MI1 | SCR6 coaching suggestion appears | Leave a coached field | Card fades in + 8 px rise | base, emphasis | Fade only, fast | Feedback at the moment of drafting |
| MI2 | SCR6 *Use suggestion* | Click | Field text cross-fades to new text; "Saved" tick | fast | Instant swap + "Saved" | Confirms the change landed |
| MI3 | SCR5 node arrives during run | Step result saved | Fade + 8 px rise, stagger 40 ms | base | Fade, fast | Shows cause and effect: work is happening |
| MI4 | SCR8 step completes | Step done | Spinner → ✓, live region announces | fast | Static icon swap | Progress feedback reduces uncertainty |
| MI5 | SCR5 trace path | Click pin or *Trace* | Others dim to 30%; path edges thicken to 3 px | base | Instant dim, no thicken animation | Orientation: shows the chain of evidence |
| MI6 | SCR7 save | *Save* | Button "Saving…" → "Saved" tick 1.5 s | fast | Text only | Confirmation |
| MI7 | SCR5 node becomes stale | Upstream change | Border switches to dashed warning; badge "Out of date" | fast | Instant | Makes consequences of edits visible without loss |
| MI8 | SCR8 checkpoint approved | *Approve* | Panel content fades; next stage header starts progress | base | Instant | Confirms decision and shows what's next |
| MI9 | SCR5 delete with Undo | Confirm delete | Node fades out; toast with *Undo* 10 s | fast | Instant removal | Recovery from errors (LEMES) |
| MI10 | SCR10 pin select | Click / Enter on pin | Pin ring; annotation card slides 8 px from right | base | Fade | Links element to its reasoning |
| MI11 | SCR7 override recorded | *Record override* | Flag badge changes to "Overridden" with the reviewer's initials | fast | Instant | Visible accountability |
| MI12 | Any button press | Press | Scale 0.98 | fast | None | Tactile acknowledgement |

No haptics or sound (desktop web). Essential information is always carried by text, never only by motion or colour.

## 8. Conflicts

None with the spec. Where any pattern conflicts with accessibility (e.g. dimming in trace mode lowering contrast of dimmed nodes), the dimmed nodes are not interactive targets and the inspector lists the path as text, so information remains available.
