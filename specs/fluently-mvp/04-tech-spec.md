# 04: Tech spec

*Plain English: how Fluently will be built: the tools, the data, the server operations, how errors are handled and how it's tested.*

Feature: Fluently MVP | Platform: web app | Version: 1 | Date: 2026-11-16 | Status: approved

## 1. Overview

A Next.js web app on Supabase (Postgres, Auth, Storage, Realtime). Each pipeline stage (ethics, research, solutions, lo-fi, test plan) runs as a durable background job (Inngest) that calls Claude and literature APIs, writes **nodes and edges** to Postgres, and streams progress to the canvas through Supabase Realtime. Trust rules (valid principle ID, citation must be a stored source, confidence rule) are enforced in code, not only in prompts. Product source of truth: [01-prd.md](01-prd.md), [02-requirements.md](02-requirements.md), [03-ux-flows.md](03-ux-flows.md), [03b-design-direction.md](03b-design-direction.md).

## 2. Stack and decisions

Versions checked on npm on 2026-11-16; pin exact versions at scaffold (T0.1) and update this table if they differ.

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router, React, TypeScript strict | next 16.4.6, react 19.3.0, typescript 5.9.3 (create-next-app pins TS 5; TS 7 not yet supported by Next's tooling) |
| UI | Tailwind CSS v4 + shadcn/ui (CLI 4.x), Lucide icons | tailwindcss 4.3.3 |
| Canvas | React Flow (`@xyflow/react`) | 13.0.x |
| Forms / validation | React Hook Form + Zod | zod 4.x |
| Backend | Supabase: Postgres 17, Auth (`@supabase/ssr`), Storage, Realtime | supabase-js 2.119.x, @supabase/ssr 0.12.x, CLI 3.2.x |
| DB schema + migrations | Drizzle ORM + drizzle-kit (RLS policies declared with `pgPolicy`) | drizzle-orm 0.45.x, drizzle-kit 0.31.x |
| Background jobs | Inngest | inngest 4.26.x |
| AI | Anthropic TypeScript SDK | @anthropic-ai/sdk 1.9.x |
| Literature | Semantic Scholar Graph API, OpenAlex API (plain `fetch`) | — |
| CSV | papaparse | latest |
| HTML sanitising (lo-fi) | sanitize-html | latest |
| PDF export (Should) | @react-pdf/renderer | 4.9.x |
| Tests | Vitest + Testing Library; Playwright | vitest 5.1.0, @playwright/test 1.63.0 (matches the preinstalled browser) |
| Quality | ESLint, Prettier, `tsc --noEmit`, GitHub Actions | — |
| Hosting | Vercel (app), Supabase cloud, Inngest cloud | — |
| Errors | Sentry (`@sentry/nextjs`) | 11.x |
| Package manager | pnpm | 10.x |

**Decisions**

| ID | Decision | Why | Rejected alternative |
|---|---|---|---|
| D1 | Web branch (Next.js + Supabase) as the PRD prefers | Pack platform is web; team conventions | — |
| D2 | **Inngest** for stage jobs, with one function per stage and one `step.run` per research step | Jobs run up to 30 min, need retries per step, cancellation, survive restarts, and Vercel functions time out; Inngest steps are durable and resumable | Supabase Edge Functions (wall-clock limits); self-hosted worker + pg-boss (extra server to run) |
| D3 | User-facing reads/writes go through **supabase-js with the user's session** (RLS enforced). Jobs use a **Drizzle client on a server-only connection** that bypasses RLS and always filters by `workspace_id` and `project_id` | RLS protects every user path; jobs need to write across tables in transactions | Drizzle for user requests with JWT claims set per transaction (more moving parts) |
| D4 | The graph is two tables, `nodes` and `edges`, with a typed `data jsonb` validated by a Zod schema per node type. Trace and stale propagation are recursive SQL functions | "Trace back to evidence" becomes one query; new node types need no migration | One table per node type (trace becomes many joins) |
| D5 | Supabase **Realtime** (`postgres_changes`, filtered by `project_id`) for live canvas updates on `nodes`, `edges`, `stage_runs` | Already in the stack, respects RLS | Polling (slower, more load) |
| D6 | All Claude calls go through one `AiClient` interface (`lib/ai/`) with a real implementation and a **fake** for tests. It sets model per stage, structured output schema, and logs usage on every call | Tests never spend money; usage logging can't be forgotten | Calling the SDK directly from each stage |
| D7 | Structured outputs with `output_config.format` (JSON schema generated from Zod), validated again with Zod; one retry on invalid output | NFR10; principle IDs and citation IDs are then checked in code | Free-text parsing |
| D8 | **Citation integrity by construction**: every retrieved item is stored as a `sources` row first and shown to the model as `S<n>`; the model may cite only those handles; unknown handles are dropped and logged | AC12.2–AC12.3, NFR4; 0 made-up citations | Asking the model to cite papers from memory, then verifying |
| D9 | **Principle validity by construction**: the model is given candidate principles as `P:<ID>`; outputs are checked against `principles` for the pinned version; external principles must cite a source handle | AC16.2, AC18.4 | Prompt-only rule |
| D10 | Confidence (High/Med/Low) and A/B sample size are **pure functions** in `lib/rules/` | AC12.6, AC21.2: deterministic, testable | Letting the model rate confidence |
| D11 | Lo-fi HTML is sanitised server-side (scripts, event handlers, external URLs removed), then rendered in `<iframe sandbox="allow-scripts" srcdoc>` (no `allow-same-origin`) with a CSP meta `default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-…'`; Fluently injects its own pin script, which talks to the parent via `postMessage` | NFR6: no cookie, storage or network access | Rendering in the page DOM; a separate origin (more hosting) |
| D12 | Optimistic concurrency on nodes with a `version int`; update succeeds only if the version matches | AC24.7 | Last write wins |
| D13 | Allowlist enforced twice: the sign-up Server Action checks `is_email_allowed()`, and a `before insert` trigger on `auth.users` raises if not allowed | AC1.2 holds even if someone calls the Auth API directly | Server Action check only |
| D14 | Motion with **CSS transitions and Tailwind variants only**, tokens in CSS variables; shadcn's `tw-animate-css` for dialogs. No Motion library | 03b uses no springs or gesture animation; fewer dependencies (deviation from frontend-conventions default) | Motion library |
| D15 | Analytics are rows in an `events` table; no third-party analytics | NFR13 says in-app; internal tool | PostHog |
| D16 | Models: `claude-haiku-5-5` default for every stage (development); demo preset sets `claude-sonnet-5-5` for synthesis, solutions, lo-fi and test plan, Haiku for extraction; `claude-opus-5-5` selectable per stage. Sonnet/Opus requests send server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Effort is set explicitly per stage (`low` for extraction, `medium` for synthesis, `high` for lo-fi code); thinking left at adaptive (it can't be disabled on these models) | PRD §7 and brief §9; cost < £10 | Fixed model for all stages |
| D17 | Web research uses Claude's server tools `web_search` and `web_fetch` (`*_20260209` on Sonnet/Opus; the basic variants on models that don't support those). Literature uses Semantic Scholar first, OpenAlex as fallback, with a 15 s timeout per call | PRD: no scraping, no paid social APIs | Third-party search APIs |
| D18 | Uploaded images and PDFs are passed to Claude as base64 `image` / `document` blocks; CSV/XLSX/TXT are converted to text server-side; `.eml` parsed to HTML + subject | AC8.6, AC8.8, AC19.3 | Files API (adds lifecycle to manage) |
| D19 | Report export (Should) with `@react-pdf/renderer` for PDF and a Markdown serialiser over the same report model | Same content as SCR9 (AC15.4); runs in a serverless function | Headless Chromium on Vercel (heavy) |
| D21 | `cacheComponents` and `partialPrefetching` are **off** in `next.config.ts`; Next 16 middleware is `proxy.ts` | Every page is per-user and dynamic; the static-shell model would force Suspense around every session read for no benefit in an internal tool | Keeping Cache Components on |
| D22 | shadcn/ui components are written by hand in `components/ui/` on `radix-ui`, `class-variance-authority`, `tailwind-merge` (same structure as shadcn's) | The shadcn registry host is blocked from the build environment, so the CLI can't fetch them; npm is reachable | Waiting for network access to the registry |
| D20 | Email + password sign-in only (Supabase Auth) with email verification; local email captured by the Supabase stack's mail catcher | US1 | Magic links, SSO (later) |

## 3. Architecture

```mermaid
flowchart LR
  B[Browser: Next.js pages, React Flow canvas, sandboxed lo-fi iframe] -->|Server Actions| A[Next.js server on Vercel]
  B <-->|Realtime: nodes, edges, stage_runs| S[(Supabase Postgres + RLS)]
  A -->|supabase-js as user| S
  A -->|send event| I[Inngest]
  I -->|invoke step functions| A
  A -->|Drizzle server connection: jobs only| S
  A --> C[Claude API: messages, web_search, web_fetch]
  A --> L[Semantic Scholar / OpenAlex]
  A --> ST[Supabase Storage: private uploads bucket]
  A --> SE[Sentry]
```

**Folders**
```
app/                      routes only (+ private _components folders)
  (auth)/sign-in, sign-up, reset
  (app)/projects, projects/[id]/(canvas|intake|report), projects/[id]/lofi/[nodeId]
  (app)/toolkit, settings
  api/inngest/route.ts    Inngest handler
components/ui/            shadcn
components/<area>/        canvas, intake, checkpoint, report, lofi, toolkit, settings (+ copy.ts per screen)
hooks/                    useRealtimeProject, useTrace, …
lib/schemas/              shared Zod (forms, node data per type, AI output)
lib/actions/              Server Actions (O1…)
lib/db/                   drizzle schema, server db client (jobs only)
lib/supabase/             server/browser clients, middleware helper
lib/ai/                   AiClient (real + fake), prompts/, usage logger, price table
lib/retrieval/            semanticScholar.ts, openAlex.ts (+ fakes)
lib/jobs/                 inngest client + functions: ethics, research, solutions, lofi, testplan, regenerate, enrich, purge
lib/rules/                confidence.ts, sampleSize.ts, principleCheck.ts, citationCheck.ts, staleness helpers
lib/lofi/                 sanitize.ts, pinScript.ts
supabase/                 config.toml, seed.sql
drizzle/                  generated migrations
fixtures/toolkit/         invented sample toolkit (CSV + JSON)
tests/                    unit, component, integration, rls
e2e/                      Playwright specs (FL*, FF*)
```

**Where logic lives:** UI and client state in components/hooks; all writes in Server Actions (validate → session → permission → act → typed result); multi-row writes that must be atomic in Postgres functions (`approve_checkpoint`, `merge_nodes`, `mark_downstream_stale`, `delete_node_soft`); AI and retrieval only inside Inngest steps or the coaching Server Action.

## 4. Data model

All tables: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at timestamptz default now()` (trigger updates `updated_at`), RLS enabled in the creating migration. All workspace data carries `workspace_id` (fk `workspaces`, `on delete restrict`).

| Table | Key fields (type, required, default) | Constraints / indexes |
|---|---|---|
| `workspaces` | name text!, cost_cap_gbp numeric! 10, gbp_per_usd numeric! 0.79, stage_models jsonb! (per-stage model id + effort), model_prices jsonb! (per model: input, output, cache read, cache write per MTok, web search per 1k), agency_services text[]! {'Implicit response test (IRT)','Behavioural interviews'}, sector_flag_list text[]! {gambling, high-interest credit, alcohol, addictive products}, sector_refuse_list text[]! {}, default_toolkit_version_id uuid null | cost_cap_gbp between 1 and 500 |
| `members` | id uuid! (= auth.users.id), workspace_id!, email text!, display_name text, role text! 'member', active bool! true, onboarded_at timestamptz | role in (admin, member); unique(email); idx workspace_id |
| `allowlist_entries` | workspace_id!, value text!, kind text!, created_by uuid! | kind in (email, domain); unique(workspace_id, lower(value)) |
| `toolkit_versions` | workspace_id!, number int!, file_name text!, uploaded_by!, principle_count int!, warnings jsonb! [] | unique(workspace_id, number) |
| `principles` | workspace_id!, version_id! (cascade), principle_key text! (the toolkit ID), name text!, general_goal!, sub_goal!, mechanism!, sense, quick_insight, extended_explanation, examples, link_to_paper, reference, design_lever, outcome, evidence, related_raw text, evidence_level text! | evidence_level in (strong, some, none); unique(version_id, principle_key); idx (version_id, general_goal, sub_goal) |
| `principle_relations` | version_id!, from_id!, to_id! | unique(from_id, to_id) |
| `principle_enrichments` (Should) | workspace_id!, principle_id!, kind text!, suggested text!, final text, status text! 'pending', decided_by, decided_at | kind in (channel_fit, when_not_to_use, outcome_behavioural, outcome_emotional); status in (pending, approved, rejected) |
| `toolkit_candidates` | workspace_id!, project_id!, name text!, mechanism text, source_id uuid! | |
| `projects` | workspace_id!, name text!, mode text!, channel text!, client_label text, toolkit_version_id null, status text! 'in_progress', current_stage text! 'intake', variants_per_rec int! 2, cost_cap_override_gbp numeric, archived_at, created_by!, updated_by! | name 1–80; mode in (new, optimise); channel in (screens, email); status in (in_progress, waiting, running, failed, complete, blocked); variants 1–3; idx (workspace_id, archived_at, updated_at desc) |
| `intakes` | project_id pk (cascade), business_objective text, behavioural_objective text, audience_context text, constraints text, sector text, sector_other text, figma_link text, low_specificity jsonb! {}, approved_at, approved_by, version int! 1 | lengths per 03 §6 |
| `uploads` | workspace_id!, project_id! (cascade), kind text!, storage_path text!, file_name!, mime!, size_bytes int!, uploaded_by! | kind in (asset, client_data); idx project_id |
| `stage_runs` | workspace_id!, project_id! (cascade), stage text!, status text! 'queued', steps jsonb! [], feedback text, replace_human bool! false, model text, inngest_run_id text, error_code text, started_at, finished_at, started_by! | stage in (ethics, research, solutions, lofi, testplan); status in (queued, running, succeeded, partial, failed, cancelled, paused_cost); idx (project_id, stage, created_at desc) |
| `nodes` | workspace_id!, project_id! (cascade), type text!, stage text!, title text!, data jsonb!, provenance text! 'ai', status text! 'ok', stale bool! false, confidence text, low_specificity bool! false, model text, stage_run_id, version int! 1, created_by, updated_by, deleted_at | type in (objective, ethics, source, finding, theme, opportunity, gap, recommendation, lofi_variant, annotation, test_plan, override, reference); provenance in (ai, ai_edited, human); status in (ok, failed, flagged, overridden, running); idx (project_id, type) where deleted_at is null |
| `edges` | workspace_id!, project_id! (cascade), from_id! (upstream, cascade), to_id! (downstream, cascade), kind text! 'built_from' | unique(from_id, to_id); idx from_id; idx to_id |
| `sources` | workspace_id!, project_id! (cascade), stage_run_id!, handle text! (e.g. S12), source_type text!, title text!, url text, upload_id, authors text[], year int, doi text, external_id text, excerpt text, retrieved_at! | source_type in (toolkit, paper, desk, competitor, social, upload); unique(stage_run_id, handle) |
| `node_history` | workspace_id!, node_id! (cascade), snapshot jsonb!, change text!, changed_by, | change in (created, edited, regenerated, merged, deleted, restored) |
| `checkpoints` | workspace_id!, project_id! (cascade), stage text!, decision text!, feedback text, selection uuid[], decided_by!, decided_at! | decision in (approve, send_back) |
| `ethics_overrides` | workspace_id!, project_id!, node_id!, rule text!, reason text!, decided_by! | char_length(reason) >= 20 |
| `ai_usage` | workspace_id!, project_id null, stage text!, step text!, model text!, input_tokens int!, output_tokens int!, cache_read_tokens int! 0, cache_write_tokens int! 0, web_searches int! 0, cost_usd numeric(10,5)!, duration_ms int!, success bool! | idx (project_id, stage) |
| `events` | workspace_id!, member_id null, name text!, props jsonb! {} | idx (workspace_id, name, created_at) |
| `project_ratings` | workspace_id!, project_id!, member_id!, rating int! | rating 1–5; unique(project_id, member_id) |

```mermaid
erDiagram
  workspaces ||--o{ members : has
  workspaces ||--o{ allowlist_entries : has
  workspaces ||--o{ toolkit_versions : has
  toolkit_versions ||--o{ principles : contains
  principles ||--o{ principle_relations : links
  workspaces ||--o{ projects : owns
  projects ||--|| intakes : has
  projects ||--o{ uploads : has
  projects ||--o{ stage_runs : runs
  projects ||--o{ nodes : contains
  nodes ||--o{ edges : from
  nodes ||--o{ node_history : versions
  stage_runs ||--o{ sources : retrieved
  projects ||--o{ checkpoints : decisions
  projects ||--o{ ai_usage : costs
```

**Database functions** (security definer only where stated, `search_path` pinned):
- `is_email_allowed(email text) returns bool` (definer): true if email or its domain is in any workspace's allowlist, or equals the bootstrap admin email setting.
- `is_member(ws uuid) returns bool`, `is_admin(ws uuid) returns bool` (definer, stable): active membership checks used by policies.
- `trace_path(node uuid) returns setof uuid`: recursive CTE over `edges` upstream (to → from) until objective and source nodes.
- `mark_downstream_stale(node uuid) returns int`: recursive downstream, sets `stale = true`, returns count.
- `approve_checkpoint(project uuid, stage text, selection uuid[], feedback text, decision text)`: inserts checkpoint and updates project status atomically.
- `merge_nodes(ids uuid[], title text) returns uuid`, `soft_delete_node(id uuid) returns int`, `restore_node(id uuid)`.
- Trigger `auth_users_allowlist` on `auth.users` before insert: raise if `not is_email_allowed(new.email)`; after insert: create `members` row (first user when no workspace exists and email = bootstrap → creates workspace, role admin).

**RLS policies** (all default deny; signed-out users get nothing):

| Table | select | insert | update | delete |
|---|---|---|---|---|
| workspaces | is_member(id) | none (trigger only) | is_admin(id) | none |
| members | is_member(workspace_id) | none (trigger) | is_admin(workspace_id), or self for display_name/onboarded_at (column-limited via function) | none |
| allowlist_entries | is_admin | is_admin | none | is_admin |
| toolkit_versions, principles, principle_relations | is_member | is_admin | none (immutable, AC4.8) | none |
| principle_enrichments | is_member | none (jobs) | is_admin | none |
| projects, intakes, uploads, nodes, edges, checkpoints, ethics_overrides, toolkit_candidates, project_ratings | is_member | is_member (and `created_by/decided_by = auth.uid()` where present) | is_member (using + with check same workspace) | is_admin (projects); is_member (others) |
| stage_runs, sources, node_history, ai_usage | is_member | none (jobs, server connection) | none | none |
| events | is_admin | is_member and member_id = auth.uid() | none | none |

Example SQL (nodes):
```sql
alter table nodes enable row level security;
create policy nodes_select on nodes for select using (is_member(workspace_id));
create policy nodes_insert on nodes for insert with check (is_member(workspace_id) and provenance = 'human');
create policy nodes_update on nodes for update using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy nodes_delete on nodes for delete using (is_member(workspace_id));
```
Storage: bucket `uploads` private; object path `<workspace_id>/<project_id>/<upload_id>`; policies check `is_member((storage.foldername(name))[1]::uuid)`; reads via signed URLs (60 s).

**Seed data** (`supabase/seed.sql`, development only): one workspace "Fluently Dev", allowlist `@fluently.test`, admin `admin@fluently.test` and member `member@fluently.test` (password `password-dev-123`), toolkit v1 from `fixtures/toolkit/sample-toolkit.csv` (30 invented principles, NFR9), one project at each stage with a small graph (for canvas, report and perf work).

## 5. Server operations

All Server Actions return `{ ok: true, data } | { ok: false, code }` with codes `validation | forbidden | not_found | conflict | unavailable | rate_limited | cost_cap`. Zod schemas live in `lib/schemas/`.

| ID | Operation | Input (Zod) | Who | Errors | ACs |
|---|---|---|---|---|---|
| O1 | signUp | {email, password ≥12} | anyone | validation, forbidden (not allowlisted) | AC1.1, AC1.2, AC1.7 |
| O2 | signIn / signOut | {email, password} | anyone | validation (generic message) | AC1.3, AC1.4, AC1.6 |
| O3 | requestPasswordReset / updatePassword | {email} / {password} | anyone | none surfaced (no enumeration) | AC1.5 |
| O4 | completeOnboarding | {} | member | — | AC2.2 |
| O5 | addAllowEntry / removeAllowEntry | {value} / {id} | admin | validation, forbidden | AC3.1–AC3.3 |
| O6 | setMemberRole / setMemberActive | {memberId, role} / {memberId, active} | admin | forbidden, conflict (last admin) | AC3.4, AC3.5 |
| O7 | updateWorkspaceSettings | {stageModels?, costCapGbp?, gbpPerUsd?, agencyServices?, sectorFlagList?, sectorRefuseList?} | admin | validation, forbidden | AC10.4, AC13.3, AC27.2, AC28.1–AC28.2 |
| O8 | previewToolkit | {file (csv/json ≤10 MB)} | admin | validation (row errors list) | AC4.1–AC4.4, AC4.7 |
| O9 | saveToolkitVersion | {previewToken} | admin | conflict (stale preview) | AC4.5, AC4.6 |
| O10 | createProject / archiveProject / unarchiveProject / deleteProject | {name, mode, channel, clientLabel?} / {id} | member (delete: admin) | validation, not_found | AC7.1, AC7.2, AC7.5, NFR7 |
| O11 | listProjects | {filter, search, cursor} | member | — | AC7.3, AC25.4 |
| O12 | saveIntakeField | {projectId, field, value, version} | member | validation, conflict | AC8.9 |
| O13 | coachField | {projectId, field, text} | member | unavailable (timeout 20 s) | AC8.2–AC8.5 |
| O14 | createUploadUrl / confirmUpload / removeUpload | {projectId, kind, fileName, mime, size} | member | validation (type/size/count) | AC8.6–AC8.8 |
| O15 | approveObjectives | {projectId} | member | validation (missing fields/assets), forbidden (refused sector) | AC9.1, AC9.2, AC10.1, AC10.4 |
| O16 | editApprovedIntake | {projectId} | member | — | AC9.3 |
| O17 | recordOverride | {nodeId, reason ≥20} | member | validation | AC26.1–AC26.3, AC10.3, AC16.3 |
| O18 | startStage | {projectId, stage, feedback?, replaceHuman?} | member | validation (prerequisites, no toolkit), cost_cap, conflict (already running) | AC11.1, AC4.9, AC27.4 |
| O19 | cancelStage / retryFailedSteps / retrySynthesis | {stageRunId} | member | not_found | AC11.5–AC11.7 |
| O20 | decideCheckpoint | {projectId, stage, decision, selection[], feedback?, replaceHuman?} | member | validation (≥1 selected, feedback ≥10) | AC14.2, AC14.3, AC17.4, AC20.2, AC21.3, AC25.1–AC25.3 |
| O21 | updateNode | {nodeId, patch, version} | member | validation, conflict, forbidden (locked while running) | AC24.1, AC24.7, AC11.8 |
| O22 | addNode | {projectId, type, data, links[]} | member | validation (type/column, required links, principle) | AC24.2, AC17.2, AC17.3 |
| O23 | deleteNode / undoDelete | {nodeId} | member | forbidden (objective) | AC24.5, AC24.8 |
| O24 | mergeNodes | {nodeIds[], title} | member | validation (same type) | AC24.6 |
| O25 | regenerateNode / regenerateStale | {nodeId, feedback?} / {projectId} | member | cost_cap | AC24.3, AC24.4, AC18.4, AC18.8 |
| O26 | getTrace | {nodeId} | member | not_found | AC23.1, AC23.2 |
| O27 | getReport | {projectId} | member | not_found | AC15.1–AC15.3, AC12.8 |
| O28 | exportReport (Should) | {projectId, format} | member | unavailable | AC15.4 |
| O29 | setBaseline | {projectId, metric, rate 0.1–99.9} | member | validation | AC21.2 |
| O30 | rateProject | {projectId, rating 1–5} | member | conflict (already rated) | NFR12 |
| O31 | raiseProjectCap / confirmOverCap | {projectId, capGbp} / {projectId} | admin / member | forbidden | AC27.4 |
| O32 | decideEnrichment (Should) | {id, decision, final?} | admin | — | AC6.2 |
| O33 | logEvent (internal helper, called by other operations) | {name, props} | member | — | NFR13 |

**Background jobs (Inngest functions)**

| Job | Trigger event | Steps | ACs |
|---|---|---|---|
| J1 ethicsGate | `stage/ethics.requested` | screen (AI, structured: pass/flag + reasons per rule) → write ethics node | AC10.1–AC10.5 |
| J2 research | `stage/research.requested` | toolkit candidates → papers (Semantic Scholar → OpenAlex) → desk (web_search) → competitive (web_search) → social (web_search) → uploads → extract findings per source batch → synthesis (themes, opportunities, principle candidates) → confidence + gaps (code) | AC11.x, AC12.x, AC13.x |
| J3 solutions | `stage/solutions.requested` | per opportunity: generate → principle check → retry once → ethics check | AC16.x |
| J4 lofi | `stage/lofi.requested` | per recommendation × N variants: generate HTML + annotations → sanitise → validate annotations → same-principle check → ethics check | AC18.x, AC19.x |
| J5 testplan | `stage/testplan.requested` | generate plan → sample size (code) → ask for baseline if missing | AC21.x |
| J6 regenerateNode | `node/regenerate.requested` | rebuild from inputs + feedback; history snapshot | AC24.3 |
| J7 enrichToolkit (Should) | `toolkit/enrich.requested` | suggestions per principle (batched) | AC6.1 |
| J8 purgeProject | `project/deleted` | delete storage objects and rows | NFR7 |

Every job: checks `stage_runs.status` for cancellation before each AI call; checks cost cap before each AI call (pauses with `paused_cost`); writes step status to `stage_runs.steps`; retries a failing step 2× with backoff (Inngest retries), then marks the step failed and continues; overall timeout 30 min (NFR8).

## 6. Auth and permissions

- Email + password with verification (Supabase Auth); sessions in cookies via `@supabase/ssr`, refreshed in `middleware.ts`; protected route group `(app)` redirects signed-out users to `/sign-in?next=…` (AC1.6).
- Roles: **admin** (all member rights + allowlist, members, settings, toolkit upload, enrichment decisions, project delete, raise cost cap); **member** (all project work, read toolkit, read usage).
- Deactivated members: `active = false` makes `is_member()` false (RLS denies immediately) and the middleware signs them out on next request (AC3.4 within 5 min is met by token refresh interval ≤ 5 min).
- `BOOTSTRAP_ADMIN_EMAIL` env var used by `is_email_allowed` / trigger for the very first account (AC1.7).

## 7. Client state and data flow

- Server Components fetch lists and pages (projects, report, settings, toolkit).
- Canvas: initial graph loaded on the server; client subscribes to Realtime (`useRealtimeProject`) for `nodes`, `edges`, `stage_runs` of that project and merges changes into a local store (React state via `useReducer`). Layout is computed in code: column by node type, rows by stage order then created_at (deterministic, no auto-layout library).
- Mutations via Server Actions; optimistic only for: node title/body edits (rolled back on `conflict` or failure with `[canvas.editConflict]` / `[common.saveFailed]`), and delete (Undo restores).
- Intake autosave: debounce 2 s, sends `version`; on failure keeps text and shows `[common.saveFailed]`; offline detection with `navigator.onLine` + failed fetch → `[common.offline]`, retries on `online` event (FF13).
- Session expiry: Server Action returns `forbidden` with `session_expired` → modal sign-in (FF14), editor state retained in memory.
- Coaching: client calls `coachField` on blur, with a 20 s abort.

## 8. Error handling

| FF / EC | Detected by | System does | User sees (SCR · state) | Logged | Recovery |
|---|---|---|---|---|---|
| FF1 | O1 allowlist check / trigger; Supabase expired OTP error | No account; refuse link | SCR1 · not allowlisted / link expired | event | Ask admin; resend |
| FF2 | O13 timeout 20 s or error | Keep text | SCR6 · coaching unavailable | ai_usage (failed), Sentry | Continue |
| FF3 | O14 Zod (mime, size, count) | Reject file | SCR6 · upload rejected | — | Choose another |
| FF4 | J1 result flag / J1 failure | Block research | SCR6/SCR5 · ethics flagged / check failed | stage_runs | Edit, override, retry |
| FF5 | Step throws after 2 retries | Step failed, continue | SCR8 · partial failure | stage_runs.steps, Sentry | Retry failed steps |
| FF6 | Synthesis fails / Inngest timeout 30 min / worker loss | Stage failed, keep nodes | SCR8 · failed | Sentry | Retry synthesis |
| FF7 | principleCheck() false after retry | Drop item | SCR5 node `[rec.noneValid]` | event principle_check_failed | Regenerate / add |
| FF8 | sanitise > 500 KB, iframe `error` postMessage, no valid annotations | Variant failed | SCR10 · render failed | event | Regenerate |
| FF9 | O8 validation | Nothing saved | SCR11 · preview invalid | — | Fix file |
| FF10 | O21 version mismatch | Refuse save | SCR7 · save conflict | — | See latest |
| FF11 | O23 | Soft delete + stale, undo 10 s | SCR5 toast | node_history | Undo |
| FF12 | cost check in O18/O25/jobs | Pause (`paused_cost`) | SCR8 · cost at cap | event | Confirm / raise cap |
| FF13 | fetch failure / offline | Keep local edits, retry | `[common.offline]`, `[common.saveFailed]` | — | Try again |
| FF14 | `session_expired` code | Modal sign-in | `[common.sessionExpired]` | — | Sign in |
| FF15 | CSP blocks request | Nothing | grey placeholder | — | — |
| EC1 | project.toolkit_version_id ≠ default | Keep pinned | SCR5 header note | — | — |
| EC2 | no toolkit version | O18 returns validation `no_toolkit` | SCR3 banner / SCR8 `[toolkit.noneYet]` | — | Admin uploads |
| EC3 | 0 papers | Step succeeds with 0 | SCR8 "0 papers found" | — | — |
| EC4 | all Low | Note in checkpoint | SCR8 `[checkpoint.allLow]` | — | — |
| EC5 | contradiction flag from synthesis output (sources marked agree/contradict) | Low + gap | SCR7 | — | — |
| EC6 | = FF10 | | | | |
| EC7 | O16 → `mark_downstream_stale` on objective nodes | Stale all downstream | SCR5 stale | node_history | Regenerate stale |
| EC8 | member inactive | Job continues (server connection) | — | — | — |
| EC9 | sector in refuse list in O15 | Project status `blocked` | SCR6 refused sector | event | Archive |
| EC10 | — | Privacy hint shown | SCR6 hint | — | — |
| EC11 | principleCheck() | Reject | as FF7 | event | — |
| EC12 | same primary principle across siblings | Regenerate once / warn | SCR10 same principle | — | Regenerate |
| EC13 | `replace_human=false` default | Keep human nodes on re-run | — | — | — |
| EC14 | node count > 1,000 | Disable minimap animation; offer list view | SCR5 | — | List view |
| EC15 | J5 output baseline null | Ask | SCR8 needs baseline | — | O29 |
| EC16 | `merge_nodes` unions edges | — | — | node_history | Undo not offered (merge confirm dialog) |
| EC17 | synthesis returns external principle with source handle | Candidate row | SCR11 candidates | — | — |
| EC18 | job independent of browser | — | SCR5 on return | — | — |
| EC19 | paper without abstract | Source stored, excluded from extraction | — | — | — |
| EC20 | prompts instruct English output and `(translated)` marker | — | — | — | — |
| EC21 | label dedupe in node badge renderer | — | — | — | — |
| EC22 | O23 type check | Refuse | `[canvas.cantDeleteObjective]` | — | Edit intake |

## 9. Non-functional requirements

| NFR | How it's met | How it's checked |
|---|---|---|
| NFR1 | Server Components, paginated lists (25), no client fetch on first paint | `e2e/perf.spec.ts` LCP via PerformanceObserver ≤ 2 000 ms on seeded data (Chromium, no throttling, CI) |
| NFR2 | React Flow with `onlyRenderVisibleElements`, memoised node components, trace via SQL function | `e2e/perf.spec.ts` seeded 500-node project opens ≤ 3 s; `tests/integration/trace.test.ts` 1,000-node trace ≤ 300 ms |
| NFR3 | Semantic HTML, shadcn primitives, list view of canvas, live regions, focus rings, reduced-motion variants | `@axe-core/playwright` on every screen state (`e2e/a11y.spec.ts`); manual VoiceOver checklist (T15.2) |
| NFR4 | D8 | `tests/unit/citationCheck.test.ts`; spot-check view |
| NFR5 | RLS on every table; service keys server-only | `tests/rls/*.test.ts` two-user tests; CI `gitleaks` scan; lint rule bans `SUPABASE_SERVICE_ROLE_KEY` import under `components/` and `app/` client files |
| NFR6 | D11 | `e2e/lofi-sandbox.spec.ts` |
| NFR7 | Private bucket; J8 purge | `tests/integration/purge.test.ts` |
| NFR8 | Inngest durability, 30 min timeout | `tests/integration/jobs-timeout.test.ts` (Inngest test engine) |
| NFR9 | Fixture only | CI step `scripts/check-toolkit-fixture.sh` fails if any file under `fixtures/toolkit` > 100 KB or any `*.csv` outside fixtures contains the header `Quick Insight Summary` |
| NFR10 | D7 | `tests/unit/ai-schemas.test.ts` |
| NFR11 | Usage log + price table; Haiku extraction | Manual: usage on success-test briefs (T7.6) |
| NFR12 | Checkpoint panel, state matrix, rating | Moderated session (T15.4); `e2e/flows.spec.ts` click count intake→research ≤ 2 |
| NFR13 | `logEvent` in each operation | `tests/integration/events.test.ts` one assertion per event |
| Errors | Sentry server + client, PII scrubbing (emails removed) | Test error appears in Sentry (T15.5) |
| Privacy | Personal data: `members.email`, `members.display_name`, `events.member_id`, uploads content (client data). Retention: until project or member deleted; purge within 24 h | T15.6 |

## 10. Integrations and configuration

| Service | Use | Notes |
|---|---|---|
| Supabase | DB, Auth, Storage, Realtime | local via `supabase start` (Docker) |
| Inngest | jobs | local `npx inngest-cli dev` |
| Anthropic API | all AI | key server-only |
| Semantic Scholar | papers | key optional (higher rate limit) |
| OpenAlex | papers fallback | polite pool via `mailto` param (generic team address, OQ11) |
| Sentry | errors | DSN public is fine |
| Vercel | hosting | preview per branch |

`.env.example`
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
BOOTSTRAP_ADMIN_EMAIL=
ANTHROPIC_API_KEY=
AI_MODE=fake            # fake | live
SEMANTIC_SCHOLAR_API_KEY=
OPENALEX_MAILTO=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

## 11. Testing strategy

| AC kind | Test kind | Where |
|---|---|---|
| Rules (confidence, sample size, principle/citation checks, toolkit parsing, sanitiser) | Unit (Vitest) | `tests/unit/` |
| Server operations (valid, invalid, forbidden, each failure) | Integration against local Supabase | `tests/integration/O<n>-*.test.ts` |
| RLS | Two-user tests | `tests/rls/<table>.test.ts` |
| Screen states and copy | Component (Testing Library), query by role/label | `tests/components/SCR<n>-*.test.tsx` |
| Flows FL/FF | Playwright, desktop 1280 and narrow 390 viewports | `e2e/FL<n>.spec.ts`, `e2e/FF<n>.spec.ts` |
| Jobs | Inngest test engine (`@inngest/test`) with FakeAiClient and fake retrieval | `tests/jobs/` |
| Accessibility | axe per state | `e2e/a11y.spec.ts` |

Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit + component), `pnpm test:int` (needs `supabase start`), `pnpm test:e2e -- --trace off`, `pnpm db:reset` (reset + migrate + seed). AI is faked whenever `AI_MODE=fake` (default in tests): FakeAiClient returns canned, schema-valid outputs from `tests/fixtures/ai/*.json`, plus deliberately bad ones (unknown principle, unknown citation, malformed JSON) for failure tests.

## 12. Technical risks and spikes

| Risk | Spike / mitigation |
|---|---|
| Web search / fetch tool variant on Haiku 5.5 is undocumented here | Spike S1 (T6.1): one live call per variant on `claude-haiku-5-5`; record which works in this file; fall back to Sonnet for the web steps if neither does |
| Research quality vs the team (A1) | Slice 7 runs the success-test briefs before lo-fi is built |
| Cost per project (A3) | Usage log from the first AI call; Slice 7 measures |
| Semantic Scholar rate limits without a key | Backoff + OpenAlex fallback; request key (OQ11) |
| Lo-fi HTML quality and size | Size cap 500 KB; greyscale component vocabulary in the prompt; regenerate |
| Realtime volume during research (hundreds of inserts) | Batch inserts per step; client throttles re-layout to 1/250 ms |
| Supabase local stack in CI (Docker) | CI uses `supabase/setup-cli` + `supabase start` |

## 13. Traceability

| AC group | Operation / job / component | Test |
|---|---|---|
| AC1.x | O1–O3, trigger `auth_users_allowlist`, SCR1 | `tests/integration/O1-signup.test.ts`, `e2e/FL1.spec.ts`, `e2e/FF1.spec.ts` |
| AC2.x | O4, SCR2, SCR8 | `tests/components/SCR2-onboarding.test.tsx`, `e2e/FL1.spec.ts` |
| AC3.x | O5, O6, SCR12 | `tests/integration/O5-allowlist.test.ts`, `tests/integration/O6-members.test.ts`, `tests/rls/allowlist.test.ts` |
| AC4.x | O8, O9, SCR11 | `tests/unit/toolkitParse.test.ts`, `tests/integration/O9-toolkit.test.ts`, `e2e/FL7.spec.ts`, `e2e/FF9.spec.ts` |
| AC5.x, AC6.x | toolkit browser, O32, J7 | `tests/components/SCR11-browser.test.tsx`, `tests/jobs/J7.test.ts` |
| AC7.x | O10, O11, SCR3, SCR4 | `tests/integration/O10-projects.test.ts`, `tests/components/SCR3-projects.test.tsx` |
| AC8.x | O12–O14, SCR6 | `tests/integration/O13-coach.test.ts`, `e2e/FL2.spec.ts`, `e2e/FF2.spec.ts`, `e2e/FF3.spec.ts` |
| AC9.x, AC10.x | O15, O16, J1 | `tests/jobs/J1-ethics.test.ts`, `e2e/FF4.spec.ts` |
| AC11.x | O18, O19, J2 | `tests/jobs/J2-research.test.ts` |
| AC12.x, AC13.x | J2, `lib/rules/confidence.ts`, `citationCheck.ts` | `tests/unit/confidence.test.ts`, `tests/unit/citationCheck.test.ts`, `e2e/FL3.spec.ts`, `e2e/FF5.spec.ts` |
| AC14.x | O20, SCR8 | `tests/components/SCR8-checkpoint.test.tsx` |
| AC15.x | O27, O28, SCR9 | `tests/components/SCR9-report.test.tsx`, `tests/integration/O28-export.test.ts` |
| AC16.x, AC17.x | J3, O22, `principleCheck.ts` | `tests/jobs/J3-solutions.test.ts`, `tests/unit/principleCheck.test.ts`, `e2e/FL4.spec.ts` |
| AC18.x, AC20.x | J4, SCR10, `lib/lofi/*` | `tests/jobs/J4-lofi.test.ts`, `tests/unit/sanitize.test.ts`, `e2e/FL5.spec.ts`, `e2e/lofi-sandbox.spec.ts` |
| AC19.x | J4 email branch | `tests/jobs/J4-email.test.ts` |
| AC21.x | J5, O29, `sampleSize.ts` | `tests/unit/sampleSize.test.ts`, `e2e/FL6.spec.ts` |
| AC22.x | Canvas, list view | `tests/components/SCR5-canvas.test.tsx`, `e2e/a11y.spec.ts` |
| AC23.x | O26, `trace_path` | `tests/integration/trace.test.ts` |
| AC24.x | O21–O25, DB functions | `tests/integration/O21-O25-nodes.test.ts`, `e2e/FF10.spec.ts`, `e2e/FF11.spec.ts` |
| AC25.x | O20, `approve_checkpoint` | `tests/integration/O20-checkpoint.test.ts` |
| AC26.x | O17 | `tests/integration/O17-override.test.ts` |
| AC27.x, AC28.x | AiClient usage logger, O7, O31 | `tests/unit/cost.test.ts`, `tests/integration/O31-cap.test.ts`, `e2e/FF12.spec.ts` |
| AC29.x | J4 references | `tests/jobs/J4-references.test.ts` |
