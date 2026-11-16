# Fluently

Internal web app that runs an AI Opportunity Solution Tree for comms, with every output traced to a toolkit principle, evidence and both objectives. Product spec: `specs/fluently-mvp/` (01 PRD, 02 requirements, 03 UX flows + copy, 03b design, 04 tech spec, 05 tasks).

@AGENTS.md

## Stack (see specs/fluently-mvp/04-tech-spec.md)

Next.js 16 App Router (`proxy.ts` replaces middleware; Cache Components off, D21) · Tailwind v4 + hand-written shadcn-style components (D22) · Supabase (Postgres, Auth, Storage, Realtime) · Drizzle schema → migrations in `supabase/migrations` · Inngest jobs · Anthropic SDK behind `lib/ai` · Vitest + Playwright.

## Commands

- Install: `pnpm install`
- Local Supabase: `pnpm db:start` (Docker; pulls from Docker Hub) · stop: `pnpm exec supabase stop`
- Env: copy `.env.example` → `.env.local` and `.env.test`, fill from `pnpm exec supabase status -o env`
- Reset DB (migrations + seed + types): `pnpm db:reset`
- New migration from schema: edit `lib/db/schema.ts`, then `pnpm db:generate`; SQL-only: `pnpm exec drizzle-kit generate --custom --name=<name>`
- Dev: `pnpm dev` · Build: `pnpm build`
- Lint / types / format: `pnpm lint` · `pnpm typecheck` · `pnpm format`
- Unit + component tests: `pnpm test`
- Integration + RLS tests (needs local Supabase): `pnpm test:int`
- End-to-end: `pnpm test:e2e -- --trace off` (builds and serves on port 3100)
- Bootstrap admin for a new environment: `pnpm tsx scripts/set-bootstrap-admin.ts`
- Seeded accounts: `admin@fluently.test` / `member@fluently.test`, password `password-dev-123`

## Rules

- Work slice by slice from `specs/fluently-mvp/05-tasks.md`; tick a task only when its `Done when` check passes, and show the command output.
- Commit per task: `T<n>.<m>: <task> (<AC IDs>)`. This repo's cloud sessions build on the session's assigned branch, not a branch per slice.
- Copy comes word for word from 03 §7 into `components/<area>/copy.ts`. Missing copy is a question for the user; add agreed copy to 03 first.
- Every table has RLS with explicit policies and a two-user test in `tests/rls/`. Never weaken a policy to pass a test.
- No secrets in client code: only `NEXT_PUBLIC_*` reaches the browser. The service role key and `DATABASE_URL` are server/test only.
- Never commit the real Behavioural Design Toolkit; only `fixtures/toolkit/` (invented data).
- Tests live in `tests/` and `e2e/`, never under `app/`.
- Update 04 when a technical decision changes.
