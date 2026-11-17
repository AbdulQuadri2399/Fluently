# Fluently MVP: hand-off pack

*Plain English: the index for everything Claude Code needs to build the first version of Fluently.*

Feature: Fluently MVP | Platform: web app | Version: 1 | Date: 2026-11-16 | Status: draft

## Summary

Fluently is an internal web app that runs an AI-powered **Opportunity Solution Tree (OST)** for communications work (app and web screens, and emails). A strategist enters a brief with two objectives (business and behavioural), the brief passes an ethics gate, and Fluently then researches the problem, groups sourced findings into themes and opportunities, proposes recommendations, and produces annotated greyscale lo-fi wireframes and a test plan. Everything lives on a **node canvas** that *is* the tree: Objectives → Sources → Themes → Opportunities → Solutions → Lo-fi → Tests. The rule that sets it apart: **every recommendation and every design element links to at least one principle from the company's Behavioural Design Toolkit (or a flagged external principle), its evidence, and both objectives.** Anything without a valid principle ID is not shown. People approve, edit or send back the work at each checkpoint.

**v1 (MVP)** covers: sign-up limited to an allowlist, toolkit upload (versioned, read-only), projects in *new* and *optimise* mode, intake with AI coaching, the ethics gate, the research stage and Behavioural Audit Report (with evidence gaps), recommendations, lo-fi screens then lo-fi emails, the tier-1 test plan, and AI usage logging per stage. Hi-fi, Figma export, synthetic testing and client access come later.

## Files

| File | What it holds |
|---|---|
| `README.md` | This index. |
| `01-prd.md` | Why we're building it, for whom, what success looks like, scope, constraints, risks, open questions. |
| `02-requirements.md` | User stories US1… with pass/fail acceptance criteria (EARS), non-functional requirements NFR1…, analytics events, traceability table. |
| `03-ux-flows.md` | Screens SCR1…, navigation, state matrix per screen, flows FL1…, failure flows FF1…, edge cases EC1…, validation, microcopy, behavioural notes, web platform notes. |
| `03b-design-direction.md` | Look, motion and feel: tokens (colour, type, spacing, motion) as values, per-screen and per-component direction, micro-interactions MI1…. |
| `inputs/` | Research inputs: `inputs/mobbin-research.md` (Mobbin UI research and the three design directions). The concept brief stays at `docs/concept-brief.md`. |
| `04-tech-spec.md` | *Added by Claude Code (tech-spec-planner):* stack, architecture, data model, operations. |
| `05-tasks.md` | *Added by Claude Code (tech-spec-planner):* the build as vertical slices with runnable checks. |

## Inputs

| Input | What it contributed |
|---|---|
| `inputs/figma-taste-notes.md` (the user's Figma taste board, 17 Nov 2026) | Nine things the user loves on Firecrawl, TheyDo and Cofounder screens (sidebar grouping, search with shortcut, account at the bottom, quiet comments, two badge types, card icons, done ticks, freshness labels, dashed connectors). Applied to the calm design screens. |
| `inputs/mobbin-research.md` (Mobbin UI research, 16 Nov 2026) | Screen-by-screen patterns from about 90 real web apps, three design directions (A Quiet Workbench, B Research Notebook, C Colour-coded Pipeline) and the parts list. The chosen direction will be written into 03b. |
| `docs/concept-brief.md` (Fluently.ai concept brief, agreed pre-PRD) | Everything: the pipeline and checkpoints, the evidence and principle rules, ethics rules, toolkit columns and import rules, the canvas concept, users and access, releases, MVP success criteria, open items. Where this pack goes further than the brief, it is marked `[Assumption]`. |

## How to build from this

1. In Claude Code, start in plan mode and read this whole folder.
2. Run **tech-spec-planner** to write `04-tech-spec.md` and `05-tasks.md` as vertical slices; get them approved.
3. Run **build-from-spec** to build one slice at a time, running the checks in each acceptance criterion, and stop after each slice to look at it.
4. Open questions marked **service test** (this is a web app, so there are no device tests) need a real account or key (Anthropic API, Semantic Scholar, the real toolkit export). The user answers them at the start of the build; until then the build uses the fixtures described in 02.
5. **Never commit the real Behavioural Design Toolkit to the repo.** Development and tests use a small invented sample toolkit (see NFR9).

## ID conventions

| Prefix | Meaning |
|---|---|
| JS | Job story (the moment someone reaches for Fluently) |
| US | User story |
| AC | Acceptance criterion (`AC<story>.<n>`) |
| NFR | Non-functional requirement (speed, accessibility, security, privacy, analytics) |
| SCR | Screen |
| FL / FF | Flow (happy or alternate path) / failure flow |
| EC | Edge case |
| MI | Micro-interaction (03b) |
| OQ | Open question |
| T | Theme node on the canvas (inside product copy only, e.g. "Theme T2") |
