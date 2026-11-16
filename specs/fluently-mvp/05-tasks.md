# 05: Tasks

*Plain English: the build, broken into thin working slices, each with checks that prove it's done.*

Feature: Fluently MVP | Platform: web app | Version: 1 | Date: 2026-11-16 | Status: approved

Conventions: sizes S (≤ half a day) / M (≤ 1.5 days). `[P]` = can run in parallel with the previous task. Every slice ends with a slice check and a **stop for the user**. Screenshots go to `e2e/screenshots/<SCR>-<state>.png` (created by `e2e/helpers/shoot.ts`, T0.9) and are compared with the matching row of 03b §5–6. All copy is quoted from 03 §7 into `components/<area>/copy.ts`.

---

## Slice 0: Walking skeleton (US1)
Goal: the app runs locally and on a Vercel preview, CI is green, and an allowlisted person can sign up, verify, sign in and sign out.
You'll be able to see: the sign-in page, sign-up with the invite-list rule, and an empty "Projects" page after signing in.

- [x] T0.1 Scaffold Next.js (App Router, TS strict, Tailwind v4, ESLint, Prettier, pnpm), pin versions in `package.json`, update 04 §2 versions — S — Refs: 04 §2 — Depends on: —
  Done when: `pnpm lint && pnpm typecheck && pnpm build` exit 0.
- [x] T0.2 Vitest + Testing Library + Playwright set up; `tests/` and `e2e/` folders; scripts `test`, `test:int`, `test:e2e` — S — Refs: 04 §11 — Depends on: T0.1
  Done when: `pnpm test` runs `tests/unit/smoke.test.ts` (passes) and `pnpm test:e2e -- --trace off` runs `e2e/smoke.spec.ts` (home page responds 200) and passes.
- [x] T0.3 Supabase local (`supabase init`, `supabase start`), Drizzle config, first migration: `workspaces`, `members`, `allowlist_entries`, `events` with RLS enabled + policies + `is_member`/`is_admin`/`is_email_allowed` + `updated_at` trigger; `pnpm db:reset` script; generated types committed — M — Refs: 04 §4, NFR5 — Depends on: T0.1
  Done when: `pnpm db:reset` applies migrations + seed with no errors; `tests/rls/members.test.ts` passes: member A sees own workspace, signed-out client gets 0 rows.
- [x] T0.4 Auth trigger `auth_users_allowlist` (before insert refuse, after insert create member; bootstrap admin creates workspace) — S — Refs: AC1.1, AC1.2, AC1.7, D13 — Depends on: T0.3
  Done when: `tests/integration/O1-signup.test.ts` passes: 'allowlisted email creates member', 'non-allowlisted email is refused at the database', 'bootstrap email creates workspace and admin'.
- [x] T0.5 Design tokens from 03b §3 into `app/globals.css` (`@theme` CSS variables for light/dark colours, node accents, type scale, spacing, radius, elevation, motion durations/easings, reduced-motion rule); `lib/motion.ts` exporting the token names; shadcn init with Button, Input, Label, Dialog, Toast (sonner), Tooltip, Tabs, Badge, Checkbox, RadioGroup, Textarea, Table, Skeleton, Sheet — M — Refs: 03b §3, §6, MI12, NFR3 — Depends on: T0.1
  Done when: `tests/unit/tokens.test.ts` passes: every 03b colour pair parsed from `globals.css` has contrast ≥ 4.5:1 (script computes); `tests/components/Button.test.tsx` passes: renders primary/secondary/ghost/danger, disabled has `aria-disabled` and reason tooltip, loading shows label "…ing"; under `prefers-reduced-motion` the press scale class is absent (MI12).
- [x] T0.6 `@supabase/ssr` clients, `middleware.ts` session refresh, `(app)` group redirect to `/sign-in?next=` (AC1.6); `(auth)` pages SCR1: sign in, sign up, reset request, reset update, with every SCR1 state and copy (`components/auth/copy.ts`) — M — Refs: AC1.1–AC1.6, SCR1 (all states), O1–O3 — Depends on: T0.4, T0.5
  Done when: `tests/components/SCR1-auth.test.tsx` passes one test per SCR1 state (default, loading, wrong credentials, not allowlisted, check email, reset sent, link expired, offline) asserting 03 copy; `e2e/FL1.spec.ts` 'sign up → verify via local mail catcher → sign in → lands on /projects' passes; `e2e/FF1.spec.ts` 'non-allowlisted sign-up shows auth.notAllowed' passes.
- [x] T0.7 Placeholder `/projects` page with top bar (logo, Projects, Toolkit, Settings, help menu, account menu with Sign out) — S — Refs: 03 §1 — Depends on: T0.6
  Done when: `e2e/smoke.spec.ts` 'signed-in user sees top bar and can sign out' passes.
- [ ] T0.8 GitHub Actions CI: install, lint, typecheck, unit/component tests, `supabase start` + `db:reset` + `test:int`, Playwright e2e, `gitleaks`, `scripts/check-toolkit-fixture.sh` (NFR9) — M — Refs: NFR5, NFR9 — Depends on: T0.2, T0.3
  Done when: CI run on the branch is green (link in slice report).
- [x] T0.9 [P] `e2e/helpers/shoot.ts` (screenshot helper at 1280 and 390 widths, light and dark) and `e2e/helpers/auth.ts` (sign-in as seeded admin/member) — S — Refs: 03b — Depends on: T0.2
  Done when: `e2e/smoke.spec.ts` saves `e2e/screenshots/SCR1-default.png` in both themes.
- [x] T0.10 `CLAUDE.md` (product line, pointer to `specs/fluently-mvp/`, stack branch and 04 link, commands, rules per tech-spec-planner §6); `.env.example` from 04 §10; Sentry init (DSN optional locally) — S — Refs: 04 §10 — Depends on: T0.1
  Done when: file exists with every command in 04 §11; `pnpm build` passes with no Sentry DSN set.
- [ ] T0.11 Vercel project linked, preview deploy per branch, env vars set (needs user: Vercel + Supabase cloud project) — S — Refs: 04 §2 — Depends on: T0.6
  Done when: preview URL shows SCR1 and sign-in works against the Supabase dev project.

Slice check: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm test:e2e -- --trace off` green; CI green; preview URL live; SCR1 screenshots match 03b §5 row SCR1. **Stop for the user.**

---

## Slice 1: Onboarding and projects (US2, US7)
Goal: a new member is introduced to Fluently and can create, list, search, archive and open projects.
You'll be able to see: the 3-step onboarding, the projects list (empty, filled, no results), the New project dialog.

- [ ] T1.1 Migration: `projects`, `intakes`, `project_ratings` tables + RLS + indexes; seed projects — S — Refs: AC7.1, 04 §4 — Depends on: T0.3
  Done when: `tests/rls/projects.test.ts` passes (member reads/writes in own workspace; other workspace user gets 0 rows; member cannot delete, admin can).
- [ ] T1.2 SCR2 onboarding dialog (3 steps, SVG diagrams from tokens), O4 `completeOnboarding`, help menu "How Fluently works" — M — Refs: AC2.1–AC2.3, SCR2 — Depends on: T0.7
  Done when: `tests/components/SCR2-onboarding.test.tsx` passes (step 1/2/3 headings and buttons; Skip records completion); `e2e/FL1.spec.ts` extended: first sign-in shows onboarding, second does not; help menu reopens it; screenshot `SCR2-step1..3` vs 03b SCR2.
- [ ] T1.3 O10 `createProject`/`archiveProject`/`unarchiveProject` with Zod schema shared with SCR4 dialog (all SCR4 states) — S — Refs: AC7.1, AC7.2, AC7.5, SCR4 — Depends on: T1.1
  Done when: `tests/integration/O10-projects.test.ts` passes: valid create pins default toolkit version (null allowed until Slice 3), empty and 81-char names return `validation`, archive/unarchive round-trips; `tests/components/SCR4-new-project.test.tsx` covers default, invalid, saving, error.
- [ ] T1.4 SCR3 projects list: O11 cursor pagination (25), search, Active/Archived filter, status chips, all SCR3 states (loading skeleton after 300 ms, empty first use, default, no results, error, no-toolkit banners admin/member) — M — Refs: AC7.3, AC25.4, SCR3, EC2 — Depends on: T1.3
  Done when: `tests/components/SCR3-projects.test.tsx` one test per state with 03 copy; `e2e/FL2.spec.ts` step 1 'create project from empty state opens intake route'; screenshots `SCR3-*` vs 03b SCR3.
- [ ] T1.5 [P] `logEvent` helper (O33) + `project_created` event — S — Refs: NFR13 — Depends on: T1.3
  Done when: `tests/integration/events.test.ts` 'project_created recorded with mode and channel' passes.

Slice check: full suite green; FL1 and FL2 step 1 pass; every SCR2/SCR3/SCR4 state renders. **Stop for the user.**

---

## Slice 2: Workspace settings (US3, US28, AC27.2 settings part, AC10.4 lists, AC13.3 services)
Goal: admins control who can join and how the AI is configured; members can see usage.
You'll be able to see: Settings with allowlist, members, models per stage, cost cap and GBP rate, agency services, sector lists, and a usage table (empty for now).

- [ ] T2.1 Migration: `ai_usage` table + RLS; workspace defaults for `stage_models` (all `claude-haiku-5-5`), `model_prices` (Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per MTok; web search per 1k from the pricing page at build time, recorded in 04), services, sector lists — S — Refs: AC28.2, AC27.2 — Depends on: T0.3
  Done when: `tests/rls/ai_usage.test.ts` passes (members read, nobody inserts from a user session).
- [ ] T2.2 O5 allowlist add/remove, O6 member role/active with last-admin guard — M — Refs: AC3.1–AC3.5 — Depends on: T0.4
  Done when: `tests/integration/O5-allowlist.test.ts` ('add email', 'add domain', 'invalid entry → validation', 'removed entry blocks new sign-up, keeps existing account') and `tests/integration/O6-members.test.ts` ('deactivated member cannot read projects', 'last admin cannot be demoted → conflict') pass.
- [ ] T2.3 O7 `updateWorkspaceSettings` (models + effort per stage, cost cap £1–£500, GBP rate, agency services, flag/refuse sector lists) — S — Refs: AC28.1, AC10.4, AC13.3 — Depends on: T2.1
  Done when: `tests/integration/O7-settings.test.ts` passes: admin saves; member gets `forbidden`; cap 0 and 501 → `validation`.
- [ ] T2.4 SCR12 UI: admin sections and member read-only usage, all SCR12 states and copy; usage table per project/stage in GBP (`lib/ai/cost.ts` conversion) — M — Refs: AC3.6, AC27.2, SCR12 — Depends on: T2.2, T2.3
  Done when: `tests/components/SCR12-settings.test.tsx` covers default admin, default member, invalid entry, last admin, saved, save failed; `tests/unit/cost.test.ts` 'USD→GBP at configured rate, per-model prices incl. cache and web search' passes; screenshots vs 03b SCR11/SCR12 row.

Slice check: suite green; a member account can't see admin controls (e2e `e2e/settings.spec.ts`). **Stop for the user.**

---

## Slice 3: Toolkit upload (US4)
Goal: an admin can upload the toolkit as a validated, versioned, read-only snapshot.
You'll be able to see: Toolkit page with upload, preview (errors and warnings), saved versions.

- [ ] T3.1 `fixtures/toolkit/sample-toolkit.csv` and `.json`: 30 invented principles, all supported columns, incl. rows with "No source", related principles (one unknown), both Sense columns; plus `bad-missing-id.csv`, `bad-duplicate-id.csv`, `bad-missing-columns.csv` — S — Refs: NFR9 — Depends on: —
  Done when: files exist; `scripts/check-toolkit-fixture.sh` passes.
- [ ] T3.2 Migration: `toolkit_versions`, `principles`, `principle_relations`, `toolkit_candidates` + RLS (no update/delete policies) — S — Refs: AC4.8 — Depends on: T0.3
  Done when: `tests/rls/toolkit.test.ts` passes: member reads; member insert refused; admin update/delete refused.
- [ ] T3.3 `lib/toolkit/parse.ts`: CSV/JSON parse, required columns, ID checks, unknown columns warning, evidence level, Sense merge, related principles resolution — M — Refs: AC4.2–AC4.4, AC4.6, AC4.7 — Depends on: T3.1
  Done when: `tests/unit/toolkitParse.test.ts` passes: one test per AC4.2, AC4.3, AC4.4, AC4.6 (strong/some/none, Sense merge), AC4.7 using T3.1 fixtures.
- [ ] T3.4 O8 preview + O9 save (atomic insert of version, principles, relations; sets workspace default) — M — Refs: AC4.1, AC4.5 — Depends on: T3.2, T3.3
  Done when: `tests/integration/O9-toolkit.test.ts` passes: valid save creates version n+1 as default; existing project keeps old pin (AC7.4); file > 10 MB → `validation`.
- [ ] T3.5 SCR11 UI: versions list, upload, validating, preview valid/invalid (row errors with 03 copy), saving, saved toast, empty admin/member, Toolkit candidates tab (empty state) — M — Refs: SCR11, FL7, FF9 — Depends on: T3.4
  Done when: `tests/components/SCR11-toolkit.test.tsx` one test per SCR11 state; `e2e/FL7.spec.ts` and `e2e/FF9.spec.ts` pass; screenshots vs 03b.
- [ ] T3.6 [P] Project header shows pinned version and "newer vN available" (EC1); `AC4.9` research guard helper `requireToolkit(project)` — S — Refs: EC1, EC2, AC4.9 — Depends on: T3.4
  Done when: `tests/unit/requireToolkit.test.ts` passes ('no version → no_toolkit').

Slice check: suite green; FL7 and FF9 pass. **Stop for the user.**

---

## Slice 4: Intake, coaching and ethics gate (US8, US9, US10, US26 for the gate, AC27.1)
Goal: a strategist writes a brief with AI coaching, approves objectives, and the brief is ethics-screened, with overrides recorded.
You'll be able to see: the intake with coaching suggestions, uploads, autosave, approval, ethics pass/flag/refuse and override.

- [ ] T4.1 `lib/ai/`: `AiClient` interface, `AnthropicAiClient` (structured output via `output_config.format`, per-stage model/effort from workspace, refusal fallbacks for Sonnet/Opus, typed error chain → `unavailable`/`rate_limited`), `FakeAiClient` reading `tests/fixtures/ai/*.json`, usage logger writing `ai_usage` with cost (AC27.1); `AI_MODE` switch — M — Refs: D6, D7, D16, AC27.1, AC28.3, NFR10 — Depends on: T2.1
  Done when: `tests/unit/ai-client.test.ts` passes: 'logs usage on success', 'logs failed call', 'malformed JSON retried once then throws'; `tests/unit/ai-schemas.test.ts` passes.
- [ ] T4.2 Migration: `uploads`, `nodes`, `edges`, `node_history`, `stage_runs`, `ethics_overrides` + RLS; private `uploads` bucket + storage policies — M — Refs: 04 §4 — Depends on: T1.1
  Done when: `tests/rls/nodes.test.ts`, `tests/rls/uploads.test.ts`, `tests/rls/storage.test.ts` pass (two-user + signed-out).
- [ ] T4.3 O12 `saveIntakeField` (versioned autosave) + O13 `coachField` (20 s timeout, low-specificity verdict) + `intake_suggestion_resolved` event — M — Refs: AC8.2–AC8.5, AC8.9 — Depends on: T4.1
  Done when: `tests/integration/O13-coach.test.ts` passes: suggestion + reason returned; fake timeout → `unavailable`; vague behavioural objective with *keep mine* sets low_specificity.
- [ ] T4.4 O14 upload URLs/confirm/remove with type/size/count rules (assets vs client data; `.eml` parsed) — M — Refs: AC8.6–AC8.8, FF3, EC10 — Depends on: T4.2
  Done when: `tests/integration/O14-uploads.test.ts` passes: allowed types accepted; 11 MB image rejected; 21st asset → `validation`; `.eml` yields subject + HTML.
- [ ] T4.5 SCR6 Intake UI: all fields (AC8.1), every SCR6 state with 03 copy, coaching card with three actions (MI1, MI2), autosave indicator, privacy hint, offline handling (FF13) — M — Refs: AC8.1–AC8.9, SCR6, MI1, MI2, EC10 — Depends on: T4.3, T4.4
  Done when: `tests/components/SCR6-intake.test.tsx` one test per SCR6 state; MI1/MI2 tests: card appears on blur, reduced-motion variant uses fade-only class; `e2e/FL2.spec.ts` steps 2–4 and `e2e/FF2.spec.ts`, `e2e/FF3.spec.ts` pass; screenshots vs 03b SCR6. User check: try MI1/MI2 in a desktop browser.
- [ ] T4.6 Inngest client + `/api/inngest` route + local dev server script; J1 `ethicsGate` (rules list + sector lists, pass/flag with reasons per rule; failure never passes) — M — Refs: D2, AC10.1, AC10.2, AC10.3, AC10.5 — Depends on: T4.1, T4.2
  Done when: `tests/jobs/J1-ethics.test.ts` passes: pass → ethics node ok; fake 'fake urgency' brief → flag with rule name; AI failure → stage failed, research not enabled.
- [ ] T4.7 O15 `approveObjectives` (missing fields/sector/assets → validation; refuse-list sector → blocked; creates objective nodes, starts J1), O16 `editApprovedIntake` (re-opens checkpoint) — M — Refs: AC9.1–AC9.3, AC10.4, EC9 — Depends on: T4.6
  Done when: `tests/integration/O15-approve.test.ts` passes: each missing item named; refused sector → `forbidden` and status `blocked`; approval creates 2 objective nodes + checkpoint row.
- [ ] T4.8 O17 `recordOverride` (≥ 20 chars; override node linked; `ethics_override_recorded`), SCR6 ethics flagged / refused / check failed states with override form (MI11) — M — Refs: AC26.1–AC26.3, FF4, MI11 — Depends on: T4.7
  Done when: `tests/integration/O17-override.test.ts` passes (19 chars → validation; 20 chars → override node + event); `e2e/FF4.spec.ts` 'flag → override → research enabled' passes; MI11 test: badge changes to "Overridden" with initials.

Slice check: suite green; FL2 end to end passes with FakeAiClient; FF2–FF4 pass. **Stop for the user.**

---

## Slice 5: Canvas and stage engine (US22, US25 shell, AC11.1–AC11.3, AC11.7, AC11.8)
Goal: the project opens as a live canvas showing objectives and ethics, with the checkpoint panel and a generic stage runner that later stages plug into.
You'll be able to see: the canvas with columns, objective and ethics nodes, the inspector, the checkpoint panel saying what to do next, list view, narrow-screen message.

- [ ] T5.1 Canvas (`@xyflow/react`): deterministic column layout, node card component with all 03b states (default, hover, selected, focused, stale, running, failed, dimmed), badges as text+icon, pan/zoom 25–200%, fit, minimap, arrow-key navigation, Enter opens inspector — M — Refs: AC22.1, AC22.2, AC22.4, 03b §6 Node card — Depends on: T4.2
  Done when: `tests/components/SCR5-canvas.test.tsx` passes: nodes placed in correct column per type; each marker renders its text label; ArrowRight moves focus to nearest node in next column; screenshot `SCR5-default` vs 03b SCR5.
- [ ] T5.2 [P] List view (accessible alternative) with same actions; toggle in toolbar — S — Refs: NFR3, AC22.4 — Depends on: T5.1
  Done when: `tests/components/SCR5-listview.test.tsx` passes: every node reachable as a list item with its type, markers and actions.
- [ ] T5.3 SCR7 inspector: default, editing (read-only until Slice 8), locked, flagged; history list; model used — S — Refs: AC22.5, AC11.8, SCR7 — Depends on: T5.1
  Done when: `tests/components/SCR7-inspector.test.tsx` covers default, locked (copy `canvas.lockedWhileRunning`), flagged.
- [ ] T5.4 Realtime hook `useRealtimeProject` (nodes, edges, stage_runs) with 250 ms re-layout throttle; MI3 node arrival (fade + rise, stagger 40 ms, cap 5) — M — Refs: AC11.2, AC22.3, MI3, D5 — Depends on: T5.1
  Done when: `e2e/realtime.spec.ts` 'node inserted by server appears within 5 s without reload' passes; MI3 test: new node gets enter class; reduced motion → fade-only class.
- [ ] T5.5 Stage engine: O18 `startStage` (prerequisites, `requireToolkit`, conflict if running), O19 `cancelStage` (stop within 30 s), stage_runs step updates, 30-min timeout, cancellation check before each AI call — M — Refs: AC11.1, AC11.3, AC11.7, NFR8, EC18, EC8 — Depends on: T4.6
  Done when: `tests/jobs/stage-engine.test.ts` passes: 'start queues run', 'second start → conflict', 'cancel marks cancelled and keeps nodes', 'timeout marks failed', 'run continues after its starter is deactivated (EC8)'.
- [ ] T5.6 SCR8 checkpoint panel: ready to research, running (step list ✓/spinner/✕ with live region, elapsed, cost), partial failure, failed, cancelled, collapsed; MI4, MI8; O20 `decideCheckpoint` + `approve_checkpoint` function (approve path) — M — Refs: AC25.1, AC25.3, AC25.4, AC2.4, SCR8, MI4, MI8 — Depends on: T5.5
  Done when: `tests/components/SCR8-checkpoint.test.tsx` one test per listed state; `tests/integration/O20-checkpoint.test.ts` 'approve records decision and sets status'; MI4 live region announces "…: done".
- [ ] T5.7 Project shell: header (name, mode · channel, toolkit version, cost so far, tabs Canvas/Intake/Report), intake-not-approved state, narrow (< 1024 px) message, offline banner, session-expired modal (FF14), URL state `?node=` — M — Refs: AC22.6, SCR5 states, FF14, 03 §9 — Depends on: T5.1
  Done when: `tests/components/SCR5-shell.test.tsx` covers intake first, narrow window, offline, session expired; `e2e/FF14.spec.ts` 'expired session → sign in modal → text kept' passes.

Slice check: suite green; seeded project renders every SCR5 state listed; a fake stage started from SCR8 shows live steps. **Stop for the user.**

---

## Slice 6: Research (US11–US14)
Goal: research runs in the background from all sources, producing sourced findings, themes, opportunities with computed confidence, and evidence gaps; the strategist chooses opportunities.
You'll be able to see: research running live on the canvas and the research checkpoint.

- [ ] T6.1 **Spike S1 / service test** (needs user's `ANTHROPIC_API_KEY`): one live call each with `web_search_20260209` and `web_search_20250305` on `claude-haiku-5-5`; record result and chosen variant per model in 04 D17 — S — Refs: 04 §12 — Depends on: T4.1
  Done when: `pnpm tsx scripts/spike-web-search.ts` output pasted in slice report and 04 D17 updated.
- [ ] T6.2 [P] `lib/retrieval/semanticScholar.ts`, `openAlex.ts` (15 s timeout, backoff, fallback) + fakes — S — Refs: D17, AC12.1 — Depends on: —
  Done when: `tests/unit/retrieval.test.ts` passes with recorded fixtures: maps to source rows; 429 → backoff then fallback.
- [ ] T6.3 Migration: `sources` table + RLS; `lib/rules/citationCheck.ts` (handles only from this run) — S — Refs: D8, AC12.2, AC12.3, NFR4 — Depends on: T4.2
  Done when: `tests/unit/citationCheck.test.ts` passes: unknown handle dropped + `citation_rejected` logged; finding with no valid source becomes `AI inference` only if model labelled it so, otherwise dropped.
- [ ] T6.4 `lib/rules/confidence.ts` (AC12.6 rule) + gap decision (AC13.1, AC13.2) — S — Refs: AC12.6, AC13.1, AC13.2, EC5 — Depends on: —
  Done when: `tests/unit/confidence.test.ts` passes one case per rule branch (High, Med ×2, Low ×3) and contradiction → Low + gap.
- [ ] T6.5 J2 retrieval steps: toolkit candidates (goal hierarchy), papers, desk, competitive, social (labelled qualitative signal), uploads (text/CSV/PDF/images) — M — Refs: AC12.1, AC12.4, AC11.4, EC3, EC19, EC20 — Depends on: T5.5, T6.2, T6.3
  Done when: `tests/jobs/J2-research.test.ts` 'retrieval steps write source rows and source nodes', 'failed step retried twice then failed, others continue', '0 papers completes' pass.
- [ ] T6.6 J2 extraction + synthesis: findings (handles only), themes, opportunities (≤ 8, candidate principles validated), gaps with methods from services list, external principles → `toolkit_candidates`; `Retry failed steps`, `Retry synthesis` (O19) — M — Refs: AC11.5, AC11.6, AC12.5, AC12.9, AC13.1–AC13.4, EC17, FF6 — Depends on: T6.4, T6.5
  Done when: `tests/jobs/J2-research.test.ts` 'synthesis creates themes/opportunities/gaps with edges', 'unknown principle dropped', 'gap methods only from services list', 'synthesis failure keeps findings and offers retry' pass.
- [ ] T6.7 Research checkpoint in SCR8: opportunity list, none pre-selected, all-low note, select ≥ 1, approve starts solutions (stub until Slice 9), send-back with feedback (≥ 10 chars; `replace_human` checkbox) — M — Refs: AC14.1–AC14.3, AC25.2, EC4, EC13 — Depends on: T5.6, T6.6
  Done when: `tests/components/SCR8-checkpoint.test.tsx` adds research checkpoint, nothing selected, send-back form; `e2e/FL3.spec.ts` (fake AI) and `e2e/FF5.spec.ts` pass.
- [ ] T6.8 [P] SCR7 shows sources with links, confidence and its reason, `Qualitative signal · n sources`, `AI inference`, `External principle` — S — Refs: AC12.4, AC12.7 — Depends on: T6.6
  Done when: `tests/components/SCR7-inspector.test.tsx` adds one test per label.

Slice check: suite green; FL3 and FF5 pass with fakes; one live research run on a seeded brief completes (user's key) and its usage appears on SCR12. **Stop for the user.**

---

## Slice 7: Audit Report, cost cap and the first success test (US15 core, AC12.8, AC27.3, AC27.4)
Goal: the research reads as a report with checkable citations, projects stay within budget, and the team runs the riskiest-assumption tests A1–A3 before more is built.
You'll be able to see: the Audit Report, the citation check table, cost warnings.

- [ ] T7.1 O27 report model from the graph (sections per AC15.1, citation numbering, labels) — M — Refs: AC15.1–AC15.3 — Depends on: T6.6
  Done when: `tests/integration/O27-report.test.ts` passes: every finding in report has a citation or `AI inference`; editing a node changes the next report.
- [ ] T7.2 SCR9 UI: loading, not yet, default, stale banner, citation check table; read-only at narrow widths — M — Refs: SCR9, AC12.8, AC22.6 — Depends on: T7.1
  Done when: `tests/components/SCR9-report.test.tsx` one test per SCR9 state (except export); screenshot vs 03b SCR9.
- [ ] T7.3 Cost cap: near-cap header chip at 80%, pause at 100% before next AI call (`paused_cost`), O31 raise cap (admin) / confirm over cap (member) — M — Refs: AC27.3, AC27.4, FF12 — Depends on: T5.5
  Done when: `tests/integration/O31-cap.test.ts` and `e2e/FF12.spec.ts` pass ('stage pauses at cap; member confirms; run continues').
- [ ] T7.4 `scripts/success-test.md` checklist for A1–A3 (how to run a past brief, rate the report blind, spot-check 20 citations from SCR9, read cost on SCR12) — S — Refs: 01 §8 A1–A3 — Depends on: T7.2
  Done when: file exists with steps and a results table.
- [ ] T7.5 **Service test (user):** run 1–3 past briefs (OQ8) through research with the demo model preset; fill the results table in `scripts/success-test.md` — S — Refs: A1, A2, A3, NFR4, NFR11 — Depends on: T7.4
  Done when: results table filled; any fail recorded with the decision (iterate prompts before Slice 9, or continue).

Slice check: suite green; report renders on seeded and live projects; A1–A3 results recorded. **Stop for the user** (go / iterate decision).

---

## Slice 8: Trace and editing (US23, US24, AC25.2 send back for all stages)
Goal: any item can be traced back to evidence and objectives, and people can edit, add, delete, merge and regenerate nodes with stale marking.
You'll be able to see: trace highlighting, editing in the inspector, stale markers, undo.

- [ ] T8.1 `trace_path` SQL function + O26 + trace mode (dim others to 30%, thicken path, list in inspector, Esc clears) — M — Refs: AC23.1–AC23.3, MI5 — Depends on: T5.1
  Done when: `tests/integration/trace.test.ts` passes incl. 1,000-node seeded graph ≤ 300 ms; `tests/components/SCR5-trace.test.tsx` passes; MI5 reduced-motion test (instant dim).
- [ ] T8.2 O21 `updateNode` with version check, provenance → `ai_edited`, history; SCR7 editing/saving/conflict (MI6) — M — Refs: AC24.1, AC24.7, FF10, EC6, MI6 — Depends on: T5.3
  Done when: `tests/integration/O21-O25-nodes.test.ts` 'edit sets ai_edited', 'stale version → conflict'; `e2e/FF10.spec.ts` (two browser contexts) passes.
- [ ] T8.3 `mark_downstream_stale` + stale on edit/regenerate/delete/merge + toolbar `Regenerate stale (n)` (MI7); EC7 intake edit path — M — Refs: AC24.4, AC9.3, EC7, MI7 — Depends on: T8.2
  Done when: integration tests 'edit theme marks downstream stale', 'intake edit marks all stale' pass; MI7 test.
- [ ] T8.4 O22 `addNode` (type/column rules, required links, principle picker combobox), O23 delete with confirm/undo 10 s (MI9), objective delete refused — M — Refs: AC24.2, AC24.5, AC24.8, FF11, EC22, MI9 — Depends on: T8.3
  Done when: integration tests for add (missing link → validation), delete + undo, objective refused; `e2e/FF11.spec.ts` passes.
- [ ] T8.5 O24 `mergeNodes` (multi-select, same type, union of edges) + O25 `regenerateNode` (J6, history, feedback) + regenerate failed state — M — Refs: AC24.3, AC24.6, EC16 — Depends on: T8.3
  Done when: `tests/jobs/J6-regenerate.test.ts` and merge integration test pass; SCR7 multi-select and regenerate-failed states have component tests.
- [ ] T8.6 Send back with feedback for any stage: re-run with feedback, keep human/edited nodes unless `replace_human` — S — Refs: AC25.2, EC13 — Depends on: T6.7
  Done when: `tests/jobs/stage-engine.test.ts` 'send back keeps human nodes' and 'replace_human replaces them' pass.

Slice check: suite green; FF10, FF11 pass; trace works on seeded graph. **Stop for the user.**

---

## Slice 9: Recommendations (US16, US17, US26 for recommendations)
Goal: chosen opportunities become principle-backed recommendations with ethics checks, which the strategist chooses, edits or adds.
You'll be able to see: recommendation nodes and the solutions checkpoint.

- [ ] T9.1 `lib/rules/principleCheck.ts` (pinned version IDs; external principle needs a source handle) — S — Refs: D9, AC16.2, EC11 — Depends on: T3.2
  Done when: `tests/unit/principleCheck.test.ts` passes (valid, unknown ID, other version's ID, external with/without source).
- [ ] T9.2 J3 solutions: 2–4 recs per opportunity, retry once, ethics check per rec, labels carried (low confidence, low specificity, "when not to use" if approved) — M — Refs: AC16.1–AC16.5, FF7, EC21 — Depends on: T9.1, T5.5
  Done when: `tests/jobs/J3-solutions.test.ts` passes: 'invalid principle retried then dropped + event', 'flagged rec excluded from lofi selection', 'labels carried'.
- [ ] T9.3 Solutions checkpoint in SCR8 (grouped by opportunity, select, edit, add with principle picker, `rec.needsPrinciple`, `rec.noneValid` on opportunity), override on flagged recs via SCR7 — M — Refs: AC17.1–AC17.4, AC26.1 — Depends on: T9.2, T8.4
  Done when: `tests/components/SCR8-checkpoint.test.tsx` adds solutions state; `e2e/FL4.spec.ts` passes.

Slice check: suite green; FL4 passes. **Stop for the user.**

---

## Slice 10: Lo-fi screens (US18, US20)
Goal: approved recommendations become annotated greyscale wireframe variants, safely rendered, with pins that trace back.
You'll be able to see: variant thumbnails on the canvas, the lo-fi preview with pins, the lo-fi checkpoint.

- [ ] T10.1 `lib/lofi/sanitize.ts` (strip scripts, handlers, external URLs; size ≤ 500 KB) + `pinScript.ts` (nonce'd, postMessage) + `<LofiFrame>` (sandbox, CSP) — M — Refs: D11, NFR6, AC18.2, AC18.8, FF15 — Depends on: —
  Done when: `tests/unit/sanitize.test.ts` passes; `e2e/lofi-sandbox.spec.ts` 'fetch and document.cookie blocked' passes.
- [ ] T10.2 J4 lofi (screens): N variants per rec (project setting 1–3), different primary principle (regenerate once, else warn), annotations validated (AC18.4), optimise mode uses screenshots, ethics per variant — M — Refs: AC18.1, AC18.3–AC18.7, EC12 — Depends on: T10.1, T9.1
  Done when: `tests/jobs/J4-lofi.test.ts` passes: 'invalid annotation dropped', 'no valid annotations → regenerate then failed', 'same principle → regenerate once', 'optimise passes images'.
- [ ] T10.3 SCR10 preview: loading, default (390/1280 toggle), pin selected (MI10) with annotation card + Trace, render failed, same principle, flagged/override — M — Refs: SCR10, AC23.1, MI10 — Depends on: T10.1, T8.1
  Done when: `tests/components/SCR10-lofi.test.tsx` one test per state; MI10 + reduced-motion test; screenshots vs 03b SCR10.
- [ ] T10.4 Lo-fi checkpoint in SCR8 (side-by-side, approve per variant, edit annotation, send back) + variants-per-rec setting — S — Refs: AC20.1, AC20.2 — Depends on: T10.2
  Done when: `e2e/FL5.spec.ts` and `e2e/FF8.spec.ts` pass.

Slice check: suite green; FL5, FF8 and sandbox test pass. **Stop for the user.**

---

## Slice 11: Lo-fi emails (US19)
Goal: email projects get annotated greyscale HTML emails with subject and preview text.
You'll be able to see: email variants at 600 px with subject/preview lines and pins.

- [ ] T11.1 J4 email branch: table layout ≤ 600 px, inline styles, subject + preview text annotated; optimise input from HTML/.eml/images — M — Refs: AC19.1–AC19.3 — Depends on: T10.2
  Done when: `tests/jobs/J4-email.test.ts` passes ('subject annotated', 'width ≤ 600', 'optimise uses parsed .eml').
- [ ] T11.2 SCR10 email layout (subject/preview above frame) — S — Refs: SCR10 — Depends on: T11.1
  Done when: component test 'email variant shows subject and preview text'; screenshot vs 03b SCR10; `e2e/FL5.spec.ts` email variant passes (ALT5).

Slice check: suite green. **Stop for the user.**

---

## Slice 12: Test plan (US21)
Goal: approved variants get a test plan with computed sample sizes; the project completes.
You'll be able to see: the test plan node, the baseline question, completion and rating.

- [ ] T12.1 `lib/rules/sampleSize.ts` (two-proportion, 80% power, α 0.05) — S — Refs: AC21.2 — Depends on: —
  Done when: `tests/unit/sampleSize.test.ts` matches 3 reference values (baseline 10% / MDE +2 pts etc., computed in the test from the formula and a published table value).
- [ ] T12.2 J5 testplan + O29 `setBaseline` (never invent baseline) — M — Refs: AC21.1, AC21.2, EC15 — Depends on: T12.1, T5.5
  Done when: `tests/jobs/J5-testplan.test.ts` passes ('missing baseline → asks', 'with baseline → sample size filled').
- [ ] T12.3 Test plan checkpoint (needs baseline input, approve → complete) + complete state + rating (O30, `project_rated`) — S — Refs: AC21.3, NFR12, SCR8 — Depends on: T12.2
  Done when: `e2e/FL6.spec.ts` passes; component tests for test plan, complete states.

Slice check: suite green; full pipeline FL1–FL6 passes end to end with fakes. **Stop for the user.**

---

## Slice 13: Should items (US5, US6, AC15.4)
Goal: browse the toolkit, approve import enrichments, export the report.
You'll be able to see: toolkit browser and enrichment review; Markdown and PDF downloads of the report.

- [ ] T13.1 Toolkit browser (grouped General Goal → Sub-Goal, search by name/ID/mechanism, principle detail) — M — Refs: AC5.1, AC5.2 — Depends on: T3.5
  Done when: `tests/components/SCR11-browser.test.tsx` passes.
- [ ] T13.2 Migration `principle_enrichments` + J7 + O32 + Enrichments tab; pending never used by stages — M — Refs: AC6.1–AC6.3 — Depends on: T13.1
  Done when: `tests/jobs/J7.test.ts` and `tests/integration/O32-enrichment.test.ts` ('pending not returned to stage prompts') pass.
- [ ] T13.3 O28 export Markdown + PDF; exporting / export failed states — M — Refs: AC15.4 — Depends on: T7.1
  Done when: `tests/integration/O28-export.test.ts` 'Markdown and PDF contain same citations as report model' passes; component tests for exporting/failed.

Slice check: suite green. **Stop for the user.**

---

## Slice 14: Could (US29) — Re-plan after OQ9
- [ ] T14.1 **Service test (user):** confirm whether the app can access Mobbin search from the server (OQ9); record in 04 — S — Refs: OQ9 — Depends on: —
  Done when: result recorded in 04 §12; if unavailable, US29 moved to "Later" in this file and AC29.2 is already satisfied (nothing shown).
- [ ] T14.2 Reference nodes ("inspired by", ≤ 3 per variant) — M — Refs: AC29.1, AC29.2 — Depends on: T14.1, T10.2 — Re-plan after T14.1
  Done when: `tests/jobs/J4-references.test.ts` passes.

---

## Slice 15: Hardening
Goal: Fluently meets its accessibility, performance, privacy, analytics and reliability bars and is ready for the internal release.

- [ ] T15.1 `e2e/a11y.spec.ts`: axe on every state of SCR1–SCR12 listed in 03 §3 (light and dark), zero serious/critical violations; fix all findings — M — Refs: NFR3 — Depends on: all screen slices
  Done when: spec passes.
- [ ] T15.2 `docs/qa/manual-a11y-checklist.md` + run: keyboard-only pass through FL1–FL6, VoiceOver on Safari for SCR5 list view, SCR6, SCR8, SCR10; focus visible on every interactive element; reduced-motion on for MI1–MI12 — S — Refs: NFR3, 03b §7 — Depends on: T15.1
  Done when: checklist filled with pass/fail per item, fails fixed.
- [ ] T15.3 `e2e/perf.spec.ts`: LCP ≤ 2 s on SCR3/SCR9; 500-node canvas opens ≤ 3 s; pan/zoom ≥ 45 fps (rAF sampling) — M — Refs: NFR1, NFR2, EC14 — Depends on: T8.1
  Done when: spec passes in CI.
- [ ] T15.4 Moderated first-use session (user runs, teammate who hasn't seen Fluently): reaches Audit Report unaided; intake approval → research start ≤ 2 clicks (`e2e/flows.spec.ts` asserts clicks) — S — Refs: NFR12, A5 — Depends on: T7.2
  Done when: result recorded in `scripts/success-test.md`; `e2e/flows.spec.ts` passes.
- [ ] T15.5 Sentry live in preview/production with PII scrubbing; test error captured — S — Refs: 04 §9 — Depends on: T0.10
  Done when: screenshot of test event in Sentry with no email in payload.
- [ ] T15.6 Privacy: J8 purge on project delete (storage + rows within 24 h), member deactivation retains work; `tests/integration/purge.test.ts` — S — Refs: NFR7 — Depends on: T4.4
  Done when: test passes.
- [ ] T15.7 `tests/integration/events.test.ts` covers every NFR13 event — S — Refs: NFR13 — Depends on: T12.3
  Done when: one passing assertion per event in the NFR13 table.
- [ ] T15.8 `tests/integration/jobs-timeout.test.ts` (worker loss / 30 min) — S — Refs: NFR8 — Depends on: T5.5
  Done when: test passes.
- [ ] T15.9 Create `docs/release-checklist.md` (production Supabase project + migrations, env vars, Inngest prod keys, Vercel prod domain, bootstrap admin, toolkit owner approval OQ5, real toolkit upload, cost cap set, Sentry, backups on, success-test results reviewed) and run it with the user — S — Refs: 01 §9 — Depends on: all
  Done when: every item ticked by the user.

Slice check: full suite and CI green; release checklist complete. **Stop for the user.**

---

## Later (ideas not in scope)
- (empty)
