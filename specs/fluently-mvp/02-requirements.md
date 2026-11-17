# 02: Requirements

*Plain English: everything Fluently must do, written as checks that either pass or fail.*

Feature: Fluently MVP | Platform: web app | Version: 1 | Date: 2026-11-16 | Status: draft

Format: user stories (US) link to job stories (JS) in 01 and carry a priority. Acceptance criteria (AC) use EARS: `WHEN … THE SYSTEM SHALL …`, `WHILE …`, `IF … THEN …`, `WHERE …`. Screens (SCR), flows (FL/FF) and edge cases (EC) are in 03. Exact copy for every message is in 03 §7; ACs refer to it by key, e.g. `[copy: auth.notAllowed]`.

**Terms used below**
- *Workspace:* the team's shared space; owns all data. v1 has one.
- *Member / admin:* the two roles. Admins also manage the allowlist, toolkit, model settings and cost cap.
- *Stage:* one of `intake`, `ethics`, `research`, `solutions`, `lofi`, `testplan`.
- *Node:* an item on the canvas: objective, source, finding, theme, opportunity, gap, recommendation, lofi variant, annotation, test plan, override, reference.
- *Provenance:* `ai`, `ai_edited` (AI-made, edited by a person), `human` (added by a person).
- *Valid principle:* a principle ID present in the project's pinned toolkit version, or an *external principle* with a stored source.

---

## Access and workspace

### US1: Sign up and sign in (Must) — JS1
As a team member, I want to sign up and sign in with my work email, so that only our team can use Fluently.
- **AC1.1** WHEN a person signs up with an email that is on the allowlist or matches an allowed domain THE SYSTEM SHALL send a verification link and, once verified, create a member account in the workspace.
- **AC1.2** IF a person signs up with an email that is not allowlisted and does not match an allowed domain THEN THE SYSTEM SHALL not create an account and SHALL show `[copy: auth.notAllowed]`.
- **AC1.3** WHEN a verified member signs in with a correct email and password THE SYSTEM SHALL open the projects list (SCR3), or onboarding (SCR2) if they have not completed it.
- **AC1.4** IF sign-in fails because the email or password is wrong THEN THE SYSTEM SHALL show `[copy: auth.wrongCredentials]` without saying which one was wrong.
- **AC1.5** WHEN a member chooses "Forgot password" THE SYSTEM SHALL send a reset link to allowlisted emails and show `[copy: auth.resetSent]` in every case (no account enumeration).
- **AC1.6** IF a signed-out person opens any page other than sign-in, sign-up or reset THEN THE SYSTEM SHALL redirect them to sign-in and return them to that page after signing in.
- **AC1.7** WHEN the first person ever signs up (no workspace exists) and their email matches the `BOOTSTRAP_ADMIN_EMAIL` setting THE SYSTEM SHALL create the workspace and make them admin.

### US2: Short onboarding (Must) — JS2
As a new member, I want a short introduction to how Fluently works, so that I can run my first project without help.
- **AC2.1** WHEN a member signs in for the first time THE SYSTEM SHALL show the 3-step onboarding (SCR2) explaining the tree, the checkpoints and the trace path.
- **AC2.2** WHEN the member finishes or skips onboarding THE SYSTEM SHALL record it and not show it again automatically.
- **AC2.3** WHEN a member opens "How Fluently works" from the help menu THE SYSTEM SHALL show the onboarding again.
- **AC2.4** WHEN a member opens their first project canvas THE SYSTEM SHALL show the checkpoint panel with the next action described in plain words (SCR8), so the next step is always visible (LEMES: learnability).

### US3: Manage the allowlist (Must) — JS1
As an admin, I want to control who can join, so that client data stays inside the team.
- **AC3.1** WHEN an admin adds an email or a domain (e.g. `@company.com`) on SCR12 THE SYSTEM SHALL save it and allow sign-ups from it immediately.
- **AC3.2** IF an admin enters an invalid email or domain THEN THE SYSTEM SHALL not save it and SHALL show `[copy: settings.invalidAllowEntry]`.
- **AC3.3** WHEN an admin removes an allowlist entry THE SYSTEM SHALL block new sign-ups from it and SHALL leave existing accounts active (removing members is done separately, AC3.4).
- **AC3.4** WHEN an admin deactivates a member THE SYSTEM SHALL end that member's sessions within 5 minutes and block their sign-in; their work stays in the workspace.
- **AC3.5** IF an admin tries to deactivate or demote the last admin THEN THE SYSTEM SHALL refuse and show `[copy: settings.lastAdmin]`.
- **AC3.6** WHEN a member who is not an admin opens SCR12 THE SYSTEM SHALL show the usage section read-only and hide allowlist, models, cost cap and toolkit upload controls.

---

## Toolkit

### US4: Upload a toolkit snapshot (Must) — JS3
As an admin, I want to upload a snapshot of the Behavioural Design Toolkit, so that Fluently cites our principles by ID.
- **AC4.1** WHEN an admin uploads a CSV or JSON file (≤ 10 MB) on SCR11 THE SYSTEM SHALL validate it and show a preview: row count, principles count, and any errors and warnings, before anything is saved.
- **AC4.2** IF the file has no `ID` column, or any row has an empty or duplicate `ID` THEN THE SYSTEM SHALL reject the upload and list each problem with its row number `[copy: toolkit.errorMissingId]` / `[copy: toolkit.errorDuplicateId]`.
- **AC4.3** IF a required column is missing (`ID`, `Principle`, `General Goal`, `Sub-Goal`, `Mechanism`) THEN THE SYSTEM SHALL reject the upload and name the missing columns `[copy: toolkit.errorMissingColumns]`.
- **AC4.4** IF the file contains columns outside the supported list (01 §7 / concept brief §7) THEN THE SYSTEM SHALL ignore them and list them as a warning, not an error.
- **AC4.5** WHEN the admin confirms a valid preview THE SYSTEM SHALL save it as a new, numbered, read-only toolkit version with the uploader, date and file name, and make it the default for new projects.
- **AC4.6** WHEN a version is saved THE SYSTEM SHALL compute for each principle: evidence level `strong` (has a link to paper or reference and Evidence text), `some` (one of them), or `none` (neither, or Evidence says "No source"); a merged `Sense` value from the two Sense columns (new column wins when both are filled); and `Related Principles` as connections between principles where the referenced ID or name exists.
- **AC4.7** IF a `Related Principles` entry doesn't match any principle THEN THE SYSTEM SHALL keep the text, skip the connection, and list it as a warning.
- **AC4.8** THE SYSTEM SHALL never modify a saved toolkit version and SHALL never write to the toolkit's source.
- **AC4.9** IF no toolkit version exists THEN THE SYSTEM SHALL block starting the research stage and show `[copy: toolkit.noneYet]` with a link to SCR11 for admins.

### US5: Browse the toolkit (Should) — JS3
As a member, I want to browse and search principles in the current version, so that I can check what Fluently can cite.
- **AC5.1** WHEN a member opens the toolkit browser THE SYSTEM SHALL list principles grouped by General Goal → Sub-Goal, with search by principle name, ID or mechanism.
- **AC5.2** WHEN a member opens a principle THE SYSTEM SHALL show all supported columns, its evidence level, its related principles and (if approved) channel fit and "when not to use".

### US6: Review import suggestions (Should) — JS6
As an admin, I want Fluently to suggest channel fit, "when not to use", and a behavioural vs emotional split of Outcome for each principle, and approve them, so that the toolkit is more useful without anyone editing the source.
- **AC6.1** WHEN an admin starts "Suggest enrichments" on a version THE SYSTEM SHALL generate suggestions per principle as a background job and show them as pending.
- **AC6.2** WHEN an admin approves, edits or rejects a suggestion THE SYSTEM SHALL store the decision against that version as an enrichment layer, leaving the version's original data unchanged.
- **AC6.3** WHILE a suggestion is pending THE SYSTEM SHALL not use it in any stage.

---

## Projects and intake

### US7: Create a project (Must) — JS1
As a member, I want to create a project for a brief, so that all its work lives in one place.
- **AC7.1** WHEN a member creates a project with a name, mode (`new` or `optimise`), channel (`screens` or `email`) and optional client label THE SYSTEM SHALL create it in the workspace, pin it to the current default toolkit version, and open its intake (SCR6).
- **AC7.2** IF the name is empty or longer than 80 characters THEN THE SYSTEM SHALL not create the project and show `[copy: project.nameInvalid]`.
- **AC7.3** WHEN any member opens the projects list THE SYSTEM SHALL show all workspace projects with name, mode, channel, current stage, status (`in progress`, `waiting for you`, `running`, `failed`), last edited by and when, newest first.
- **AC7.4** WHEN a newer toolkit version exists than the one a project is pinned to THE SYSTEM SHALL show the pinned version on the project and SHALL not change it. `[Assumption]` Re-pinning is out of scope for v1.
- **AC7.5** WHEN a member archives a project THE SYSTEM SHALL hide it from the default list and show it under "Archived"; un-archiving restores it unchanged.
- **AC7.6** WHEN a member renames a project or changes its client label, from the projects list or from the project header, THE SYSTEM SHALL save it with the same rules as AC7.1–AC7.2 and show the new name everywhere. *(Added 2026-11-17 from icebox IB5.)*
- **AC7.7** WHEN a member archives or restores a project from the project header THE SYSTEM SHALL behave as AC7.5 and return them to the projects list. *(Added 2026-11-17 from icebox IB5.)*
- **AC7.8** WHEN an admin deletes a project, after typing its exact name to confirm, THE SYSTEM SHALL permanently remove the project, everything in it (brief, tree, sources, runs) and its uploaded files, keep its AI cost rows for usage totals (without the project link), and record who deleted it. Members SHALL not see *Delete*, and the server SHALL refuse it from anyone but an admin. *(Added 2026-11-17 from icebox IB5; user decision: admins only.)*
- **AC7.9** THE SYSTEM SHALL let only admins change a project's AI budget (AC27.4); other project fields stay editable by any member. *(Added 2026-11-17.)*

### US8: Intake with AI coaching (Must) — JS1
As a strategist, I want Fluently to suggest a sharper version of what I write and say why, so that my objectives are specific enough to drive the work.
- **AC8.1** THE SYSTEM SHALL show these intake fields: business objective (with metric), behavioural objective (who does what, when), audience and context, current assets (optimise mode only), client data uploads (optional), constraints (brand, design system, regulation; optional), sector.
- **AC8.2** WHEN the member leaves a coached field (business objective, behavioural objective, audience and context, constraints) with at least 10 characters THE SYSTEM SHALL request a suggestion and show, within 10 seconds at the 95th percentile, a suggested version and a one-sentence reason, with actions *Use suggestion*, *Edit suggestion* and *Keep mine*.
- **AC8.3** WHEN the member chooses any of the three actions THE SYSTEM SHALL save the field value accordingly and record which action was taken (analytics `intake_suggestion_resolved`).
- **AC8.4** IF a suggestion fails or takes longer than 20 seconds THEN THE SYSTEM SHALL keep the member's text, show `[copy: intake.coachUnavailable]` and allow them to continue.
- **AC8.5** WHEN the coach judges an objective as low specificity (no metric for business; missing who/what/when for behavioural) and the member keeps their own text THE SYSTEM SHALL mark the objective with a **low-specificity** flag that appears on the objective node and in every output that cites it.
- **AC8.6** WHERE mode is `optimise` THE SYSTEM SHALL require at least one current asset: for screens, one or more images (PNG/JPG/WebP, ≤ 10 MB each, ≤ 20 files) and an optional Figma link; for emails, pasted HTML, an uploaded `.html` or `.eml` file, or images.
- **AC8.7** IF an upload is the wrong type or too big THEN THE SYSTEM SHALL reject that file only and show `[copy: upload.typeOrSize]` naming the file.
- **AC8.8** WHEN the member uploads client data (CSV, TXT, PDF, XLSX; ≤ 20 MB each, ≤ 10 files) THE SYSTEM SHALL store it privately in the workspace and list it as a source for research.
- **AC8.9** WHILE the member types, THE SYSTEM SHALL autosave the intake within 2 seconds of the last change, and show the save state (`Saving…` / `Saved` / `[copy: common.saveFailed]`).

### US9: Approve the objectives (Must) — JS1
As a strategist, I want to approve the two objectives before anything else runs, so that the work aims at an agreed target.
- **AC9.1** IF the business objective or the behavioural objective is empty THEN THE SYSTEM SHALL disable *Approve objectives* and say which is missing.
- **AC9.2** WHEN the member approves the objectives THE SYSTEM SHALL create the two objective nodes on the canvas, mark the intake checkpoint approved (who, when), and start the ethics gate.
- **AC9.3** WHEN an approved objective is edited later THE SYSTEM SHALL mark every node built from it as stale (AC24.4) and require re-approval of the intake checkpoint.

### US10: Ethics gate (Must) — JS6
As a strategist, I want the brief screened for ethical risk before research starts, so that we never put effort into manipulative work.
- **AC10.1** WHEN objectives are approved THE SYSTEM SHALL screen the brief, objectives and sector against the "won't do" list (deception, fake urgency or scarcity, making it hard to cancel or opt out, hidden costs, exploiting vulnerable groups) and the sector flag list, and return `pass` or `flag` with reasons, each reason naming the rule.
- **AC10.2** WHEN the result is `pass` THE SYSTEM SHALL show the ethics node as passed and enable *Start research*.
- **AC10.3** WHEN the result is `flag` THE SYSTEM SHALL show each reason and block research until the member either edits the brief (re-screen) or overrides with a written reason (US26).
- **AC10.4** WHERE the sector is on the admin's "refuse" list THE SYSTEM SHALL block the project with `[copy: ethics.refusedSector]` and offer no override. The refuse list is empty by default; the default flag list is gambling, high-interest credit, alcohol, addictive products (OQ4).
- **AC10.5** IF the screen fails to run THEN THE SYSTEM SHALL show `[copy: ethics.checkFailed]` with *Try again*, and SHALL NOT treat the failure as a pass.

---

## Research and Audit Report

### US11: Run research in the background (Must) — JS2
As a strategist, I want research to run on its own and show progress, so that I can do other work meanwhile.
- **AC11.1** WHEN the member starts research THE SYSTEM SHALL queue a background job and show the stage as `running`, with live progress per step: Toolkit, Academic papers, Desk research, Competitive research, Social signal, Client uploads, Synthesis.
- **AC11.2** WHILE research is running THE SYSTEM SHALL update the canvas within 5 seconds as each source and finding node is created.
- **AC11.3** WHEN the member closes the tab and returns THE SYSTEM SHALL show the job's current state; the job SHALL keep running.
- **AC11.4** IF a step fails (API error, timeout, rate limit) THEN THE SYSTEM SHALL retry it up to 2 times with backoff, then mark that step `failed`, keep everything already produced, and continue with the remaining steps.
- **AC11.5** WHEN synthesis completes with one or more failed steps THE SYSTEM SHALL show which steps failed, lower confidence where those sources were missing, and offer *Retry failed steps*.
- **AC11.6** IF synthesis itself fails after retries THEN THE SYSTEM SHALL mark the stage `failed`, keep all source and finding nodes, and offer *Retry synthesis* without re-running retrieval.
- **AC11.7** WHEN the member chooses *Cancel* on a running stage THE SYSTEM SHALL stop further AI calls within 30 seconds, keep what's produced, and mark the stage `cancelled`.
- **AC11.8** WHILE a stage is running THE SYSTEM SHALL prevent edits to that stage's nodes and to the nodes it is built from, and say why `[copy: canvas.lockedWhileRunning]`.
- **AC11.9** WHEN research starts THE SYSTEM SHALL have the AI write 3–6 research questions from the behavioural and business objectives, store them on the stage run, and use them to steer the search steps. *(Added 2026-11-17 from icebox IB11.)*
- **AC11.10** WHILE research runs, and after it ends, THE SYSTEM SHALL let the member open *See what it's doing*: the research questions, then a time-ordered activity log (step started, sources found, sources kept, citations dropped by the citation check, step done or failed), updated live. *(Added 2026-11-17 from icebox IB11.)*

### US12: Sourced findings, themes and opportunities (Must) — JS2, JS3
As a strategist, I want findings grouped into themes and opportunities, each linked to its sources with a confidence rating, so that I can trust and choose.
- **AC12.1** THE SYSTEM SHALL gather from: the pinned toolkit (cited by ID), academic papers retrieved from Semantic Scholar or OpenAlex, desk and market research via web search, competitive research (a separate step), social signal via web search (Reddit, Trustpilot, app stores, forums), and client uploads.
- **AC12.2** WHEN a finding is created THE SYSTEM SHALL link it to ≥1 stored source record (title, URL or file, retrieval date, source type, and for papers: authors, year, DOI or Semantic Scholar/OpenAlex ID), or label it `AI inference`; any other finding SHALL be discarded.
- **AC12.3** IF the model cites a paper that was not in that run's retrieval results THEN THE SYSTEM SHALL discard the citation and log it (analytics `citation_rejected`).
- **AC12.4** WHEN social signal findings are shown THE SYSTEM SHALL label them `Qualitative signal · n sources` with the count of distinct URLs.
- **AC12.5** WHEN synthesis completes THE SYSTEM SHALL create theme nodes (each linked to its findings) and opportunity nodes (each linked to its themes, and to ≥1 candidate principle via the toolkit's General Goal → Sub-Goal → Principle hierarchy). `[Assumption]` At most 8 opportunities by default.
- **AC12.6** THE SYSTEM SHALL give each opportunity an evidence confidence of High, Med or Low by this rule: High = ≥3 sources of ≥2 source types that agree; Med = 2+ sources that agree, or 3+ of one type; Low = 1 source, only AI inference, or sources that contradict. The rule SHALL be computed in code from the stored links, not by the model.
- **AC12.7** WHEN a member opens a finding, theme or opportunity THE SYSTEM SHALL show its sources with links, the confidence and the reason for it.
- **AC12.8** WHEN a member opens *Citation check* on the Audit Report THE SYSTEM SHALL list every citation with its stored record and a link, so 20 can be spot-checked (NFR4).
- **AC12.10** WHEN a member adds a source from the Evidence card (upload or link) after research THE SYSTEM SHALL store it as a source, mark themes built from Evidence as Out of date, and offer *Regenerate stale*. *(Added 2026-11-17.)*
- **AC12.11** THE SYSTEM SHALL give each theme a strength of High, Med or Low using the AC12.6 rule over the sources of its findings, computed in code, and show the reason as for opportunities. *(Added 2026-11-17 from icebox IB7.)*
- **AC12.12** WHEREVER confidence or strength is shown (cards, details panel, decision panel, Audit Report) THE SYSTEM SHALL use the same pastel tags: High green, Med amber, Low red, each with its word so colour is never the only signal. *(Added 2026-11-17 from icebox IB7.)*
- **AC12.9** WHERE a principle from research is not in the toolkit THE SYSTEM SHALL show it as `External principle, not yet in toolkit` with its source, and add it to a "Toolkit candidates" list in SCR11 for the team's Pending Insights review.

### US13: Evidence gaps (Must) — JS2, JS5
As a strategist, I want to see where evidence is weak and what would answer it, so that I'm honest with clients and can propose research.
- **AC13.1** WHEN an opportunity's confidence is Low or its sources contradict THE SYSTEM SHALL create a gap node linked to it, stating the specific open question and the method that would answer it.
- **AC13.2** IF an opportunity is Med or High and its sources agree THEN THE SYSTEM SHALL not create a gap for it.
- **AC13.3** THE SYSTEM SHALL choose methods only from the workspace's agency services list (admin-editable; seeded with "Implicit response test (IRT)" and "Behavioural interviews") or `Desk research`.
- **AC13.4** WHILE an opportunity is Low confidence THE SYSTEM SHALL keep it selectable and show `Low confidence` on it and everything built from it.
- **AC13.5** WHEN a gap is created THE SYSTEM SHALL label it *Discovery* (to confirm or measure what we think is happening) or *Generative* (to explore needs and reasons we don't yet understand); the Audit Report SHALL open its gaps section with a summary (number of gaps, how many of each kind, the methods suggested) and group the gaps under those two headings, each with its open question, method and the opportunity it affects. *(Added 2026-11-17 from icebox IB8.)*

### US14: Choose opportunities (Must) — JS2
As a strategist, I want to pick which opportunities to pursue, so that solutions focus where I judge best.
- **AC14.1** WHEN research completes THE SYSTEM SHALL open the research checkpoint with all opportunities listed (confidence, themes, candidate principles) and none pre-selected `[Assumption]`.
- **AC14.2** IF the member tries to approve with no opportunity selected THEN THE SYSTEM SHALL disable *Approve and generate solutions* and show `[copy: checkpoint.selectAtLeastOne]`.
- **AC14.3** WHEN the member approves THE SYSTEM SHALL record the selection (who, when) and start the solutions stage for the selected opportunities only.

### US15: Behavioural Audit Report (Must; export Should) — JS2, JS3
As a strategist, I want the research as a readable report, so that I can review it and share it with the team.
- **AC15.1** WHEN research completes THE SYSTEM SHALL generate the Audit Report view (SCR9) from the graph: summary, objectives (with any low-specificity flag), sources by type with counts, themes, opportunities with confidence, evidence gaps, ethics result and any overrides, toolkit version.
- **AC15.2** THE SYSTEM SHALL show every claim in the report with an inline citation marker linking to its source record or the label `AI inference`.
- **AC15.3** WHEN graph nodes change THE SYSTEM SHALL reflect the change in the report on next open (the report is a view, not a copy).
- **AC15.4** (Should; moved into Slice 7 on 2026-11-17 at the user's request) WHEN a member exports the report THE SYSTEM SHALL produce Markdown and PDF files with the same content and citations as SCR9.

---

## Solutions

### US16: Recommendations (Must) — JS3, JS6
As a strategist, I want ideas for each chosen opportunity that cite a principle, research themes and both objectives, and pass an ethics check, so that I can defend each one.
- **AC16.1** WHEN the solutions stage runs THE SYSTEM SHALL create 2–4 recommendation nodes per selected opportunity, each with: idea (≤ 60 words), principle(s), mechanism in plain language, linked theme(s), link to the business objective and behavioural objective, ethics check result.
- **AC16.2** IF a generated recommendation has no valid principle (AC terms above) THEN THE SYSTEM SHALL reject it, retry generation once for that opportunity, and if still invalid SHALL not show it and SHALL log it (analytics `principle_check_failed`).
- **AC16.3** WHEN a recommendation's ethics check returns `works against the user's goal` THE SYSTEM SHALL show it flagged with the reason and exclude it from lo-fi unless overridden (US26).
- **AC16.4** WHERE the principle has an approved "when not to use" note THE SYSTEM SHALL show it on the recommendation.
- **AC16.5** WHERE the opportunity or objective is Low confidence or low specificity THE SYSTEM SHALL carry that label onto the recommendation.

### US17: Choose, adjust, add recommendations (Must) — JS3
As a strategist, I want to choose, edit or add recommendations, so that the final set reflects my judgement.
- **AC17.1** WHEN the solutions stage completes THE SYSTEM SHALL open the solutions checkpoint listing recommendations grouped by opportunity with select, edit and *Add recommendation*.
- **AC17.2** WHEN a member adds a recommendation THE SYSTEM SHALL require an idea and ≥1 valid principle chosen from the pinned toolkit (searchable picker), link it to an opportunity and both objectives, mark provenance `human`, and run the ethics check on it.
- **AC17.3** IF a member saves a recommendation without a principle THEN THE SYSTEM SHALL refuse and show `[copy: rec.needsPrinciple]`.
- **AC17.4** WHEN the member approves with ≥1 recommendation selected THE SYSTEM SHALL record the selection and start the lo-fi stage.

---

## Lo-fi

### US18: Lo-fi screens (Must) — JS4
As a strategist, I want annotated greyscale wireframes in variants built on different principles, so that I can compare directions.
- **AC18.1** WHEN the lo-fi stage runs for a `screens` project THE SYSTEM SHALL generate, for each selected recommendation, N variants (default 2; project setting 1–3), each built on a different principle, as self-contained greyscale HTML/CSS (no external network requests, no scripts other than Fluently's own pin layer).
- **AC18.2** THE SYSTEM SHALL render each variant in a sandboxed frame (no access to Fluently's cookies, storage or parent page) at 390 px wide by default, with a toggle to 1280 px.
- **AC18.3** THE SYSTEM SHALL attach numbered annotation pins to each annotated element; each annotation has: What, Principle (ID, name, mechanism in plain language), Evidence (theme IDs and source types), → Behavioural objective, → Business objective, Ethics.
- **AC18.4** IF an annotation lacks a valid principle, a linked theme, or either objective THEN THE SYSTEM SHALL drop that annotation; IF a variant has no valid annotations left THEN THE SYSTEM SHALL regenerate it once and otherwise mark it `failed` with *Regenerate*.
- **AC18.5** IF two variants for the same recommendation use the same primary principle THEN THE SYSTEM SHALL regenerate one of them once, and otherwise show both with `[copy: lofi.samePrinciple]`.
- **AC18.6** WHERE mode is `optimise` THE SYSTEM SHALL use the uploaded screenshots as input and annotate what changed relative to the current asset.
- **AC18.7** WHEN each variant is generated THE SYSTEM SHALL run the ethics check on it and show the result on the variant.
- **AC18.8** IF the generated HTML fails to render or exceeds 500 KB THEN THE SYSTEM SHALL mark the variant `failed` with *Regenerate* and keep the other variants.

### US19: Lo-fi emails (Must, after screens) — JS4
As a strategist, I want lo-fi emails with the same annotations, so that email briefs get the same treatment.
- **AC19.1** WHEN the lo-fi stage runs for an `email` project THE SYSTEM SHALL generate variants as greyscale HTML emails (single column, ≤ 600 px, table-based layout, inline styles) with subject line and preview text, each annotated as in AC18.3.
- **AC19.2** THE SYSTEM SHALL annotate subject line and preview text as elements where they apply a principle.
- **AC19.3** WHERE mode is `optimise` THE SYSTEM SHALL accept the current email (HTML, `.eml` or images) as input and annotate what changed.

### US20: Approve lo-fi (Must) — JS4
- **AC20.1** WHEN the lo-fi stage completes THE SYSTEM SHALL open the lo-fi checkpoint showing variants side by side per recommendation with *Approve*, *Edit annotation*, *Send back with feedback* per variant.
- **AC20.2** WHEN the member approves ≥1 variant THE SYSTEM SHALL record the decision and start the test plan stage for approved variants.

---

## Test plan

### US21: Tier-1 test plan (Must) — JS5
As a strategist, I want a test plan for the approved variants, so that I can propose how to validate them.
- **AC21.1** WHEN the test plan stage runs THE SYSTEM SHALL create one test plan node with, per approved variant or comparison: hypothesis (linked to principle and both objectives), primary metric and guardrail metric, method (A/B, usability test, IRT, behavioural interviews), suggested sample size with the assumptions used, duration, success criteria, and which agency service would run it.
- **AC21.2** THE SYSTEM SHALL compute sample size for A/B tests in code from baseline rate, minimum detectable effect, 80% power and 5% significance; WHERE the baseline is unknown THE SYSTEM SHALL ask the member for it and SHALL not invent one.
- **AC21.3** WHEN the member approves the test plan THE SYSTEM SHALL mark the project `complete` (it remains editable).

---

## Canvas

### US22: The canvas is the tree (Must) — JS2, JS3
- **AC22.1** WHEN a member opens a project THE SYSTEM SHALL show the canvas as stage **lanes** in this order: Objectives → Evidence → Themes → Opportunities → Solutions → Wireframes → Tests, with each card in its stage's lane and connections drawn as dashed lines ending in a small circle at the receiving card. In optimise mode the Objectives lane also holds the **Current assets** cards, under the objectives. *(Updated 2026-11-17: lanes chosen by the user; "Sources" renamed "Evidence" and "Lo-fi" renamed "Wireframes" in the interface; current assets sit under the objectives.)*
- **AC22.7** THE SYSTEM SHALL show the lane names in a strip pinned to the top of the canvas that stays visible while panning, and each card SHALL also show its type as an icon (with the type name on hover and focus).
- **AC22.8** WHEN a member drags a card THE SYSTEM SHALL let it move up or down within its own lane only, and SHALL save the new order for everyone on the project.
- **AC22.9** WHEN a member opens the Evidence card (click or Enter) THE SYSTEM SHALL expand it in place to show sources grouped by kind (Client uploads first, then Academic papers, Web and market, Competitors, Reviews and forums), each group with its count, at most 3 items per open group and `[copy: canvas.showMore]` for the rest, plus *Add source*.
- **AC22.10** WHERE mode is `optimise` THE SYSTEM SHALL show uploaded assets (screens, emails or both) as **Current assets** cards under the objectives in the Objectives lane, each with thumbnails and a name, each connected into Evidence. Uploads start in one card named `[copy: assets.defaultName]`.
- **AC22.11** WHEN a member splits an assets card, drags thumbnails from one assets card to another, or renames an assets card THE SYSTEM SHALL save the change, keep every asset in exactly one card, and remove a card that becomes empty. *(Added 2026-11-17.)*
- **AC22.12** THE SYSTEM SHALL show a + button in the header of each lane the member can add to (Objectives for assets, Evidence for sources, Themes, Opportunities, Solutions); it opens the add-card flow of AC24.2 for that lane. *(Added 2026-11-17.)*
- **AC22.2** THE SYSTEM SHALL show on each node: type, title, provenance badge (`AI`, `Edited`, `Added`), and where relevant confidence, low-specificity, stale, flagged or overridden markers, each as text plus icon (not colour alone).
- **AC22.3** WHEN a stage is running THE SYSTEM SHALL show its column header with progress and the step currently running.
- **AC22.4** THE SYSTEM SHALL support pan, zoom (25–200%), fit to view, a minimap, and keyboard navigation between nodes (arrow keys move focus to the nearest node in that direction; Enter opens the inspector).
- **AC22.5** WHEN a member selects a node THE SYSTEM SHALL open the inspector (SCR7) with the node's full content, sources, history (who created/edited it and when) and actions.
- **AC22.6** WHERE the browser window is narrower than 1024 px THE SYSTEM SHALL replace every signed-in screen (SCR2–SCR12) with `[copy: app.desktopOnly]`, and SHALL keep the sign-in, sign-up and reset screens (SCR1) usable at any width. Content returns as soon as the window is 1024 px or wider, without a reload.

### US23: Trace the path (Must) — JS3
- **AC23.1** WHEN a member clicks an annotation pin, or chooses *Trace* on any node THE SYSTEM SHALL highlight the full path from that item back to its sources and both objectives, dim all other nodes, and list the path in the inspector in order (annotation → variant → recommendation → principle → opportunity → themes → findings → sources → objectives).
- **AC23.2** THE SYSTEM SHALL compute the path from stored connections in under 300 ms for a project of 1,000 nodes.
- **AC23.3** WHEN the member presses Escape or clicks empty canvas THE SYSTEM SHALL clear the highlight.

### US24: Edit, regenerate, add, delete, merge, and stale (Must) — JS2–JS4
- **AC24.1** WHEN a member edits an AI node's content THE SYSTEM SHALL save it, set provenance to `ai_edited`, and record the editor and time.
- **AC24.2** WHEN a member adds a node THE SYSTEM SHALL only allow types valid for that column, require the links that type needs (e.g. a theme needs ≥1 finding; a recommendation needs an opportunity and a principle), and set provenance `human`.
- **AC24.3** WHEN a member chooses *Regenerate* on a node THE SYSTEM SHALL regenerate it from its current inputs (and optional feedback text), replace its content, keep its ID and links where still valid, and keep the previous version in history.
- **AC24.4** WHEN a node changes (edit, regenerate, delete, merge) THE SYSTEM SHALL mark every node downstream of it as `stale` and show *Regenerate stale (n)* on the canvas. Stale nodes stay usable and visible.
- **AC24.5** WHEN a member deletes a node with downstream nodes THE SYSTEM SHALL ask for confirmation stating how many nodes depend on it `[copy: canvas.deleteConfirm]`; on confirm it SHALL delete the node and mark dependents stale; it SHALL offer *Undo* for 10 seconds.
- **AC24.6** WHEN a member merges two or more nodes of the same type THE SYSTEM SHALL create one node with the combined links and a merged title for the member to edit, delete the originals, and mark downstream nodes stale.
- **AC24.7** IF two members edit the same node and the second saves a stale copy THEN THE SYSTEM SHALL refuse the save, keep the second member's text in the editor, and show `[copy: canvas.editConflict]` with *See latest*.
- **AC24.8** IF a member tries to delete an objective node THEN THE SYSTEM SHALL refuse and point them to editing the intake instead `[copy: canvas.cantDeleteObjective]`.

### US30: Connect and disconnect cards (Must) — JS2, JS3 *(added 2026-11-17)*
As a strategist, I want to draw or remove lines between cards, so that the tree reflects my judgement about what supports what.
- **AC30.1** WHILE a member hovers or focuses a card THE SYSTEM SHALL show a connection handle on its left edge (lines arrive) and right edge (lines leave); handles are hidden otherwise.
- **AC30.2** WHEN a member drags from a right handle THE SYSTEM SHALL highlight cards in the next lane that can accept the connection, fade all others, and create the connection when dropped on a highlighted card.
- **AC30.3** IF the drop lands on a card that can't accept it, or on empty canvas, THEN THE SYSTEM SHALL create nothing, return the line to its handle, and for an invalid card show `[copy: canvas.cantConnect]`.
- **AC30.4** WHEN a member hovers a line THE SYSTEM SHALL show a remove button at its midpoint; selecting a line and pressing Delete or Backspace SHALL also remove it.
- **AC30.5** IF removing a line would leave a card without a link it needs (a theme without evidence, an opportunity without a theme, a recommendation without an opportunity) THEN THE SYSTEM SHALL keep the line and show `[copy: canvas.linkRequired]`.
- **AC30.6** WHEN a connection is added or removed THE SYSTEM SHALL mark downstream cards Out of date (AC24.4), record the change in both cards' history, and offer *Undo* for 10 seconds.
- **AC30.7** THE SYSTEM SHALL offer the same connect and disconnect actions without dragging, in a *Connections* section of the details panel (keyboard and screen-reader users).

### US25: Checkpoints (Must) — JS1–JS5
- **AC25.1** WHEN a stage completes THE SYSTEM SHALL stop and show the checkpoint panel (SCR8) with: what was produced, what the member needs to decide, and actions *Approve*, *Edit* (on the canvas), *Send back with feedback*.
- **AC25.2** WHEN the member sends back with feedback (≥ 10 characters) THE SYSTEM SHALL re-run the stage with that feedback, keep the previous output in history, and keep human-added and human-edited nodes unless the member chooses to replace them.
- **AC25.3** THE SYSTEM SHALL record every checkpoint decision (stage, decision, feedback, who, when) and show it in the project history.
- **AC25.4** WHILE a checkpoint is waiting THE SYSTEM SHALL show the project as `waiting for you` on SCR3.
- **AC25.5** THE SYSTEM SHALL let the member switch the checkpoint panel between three sizes: *minimised* (one line: what's waiting and the main action), *standard*, and *expanded* (full height of the canvas, for reading); choices and typed feedback SHALL survive switching, and the size SHALL be remembered per member. *(Added 2026-11-17 from icebox IB9.)*

### US26: Override a flag with a reason (Must) — JS6
- **AC26.1** WHEN a member overrides any ethics flag (gate, recommendation or variant) THE SYSTEM SHALL require a written reason of ≥ 20 characters and record it with who and when.
- **AC26.2** THE SYSTEM SHALL show each override as an override node on the canvas linked to the flagged item, and list it in the Audit Report.
- **AC26.3** IF the reason is shorter than 20 characters THEN THE SYSTEM SHALL keep *Override* disabled and show `[copy: ethics.reasonTooShort]`.

---

## AI operations

### US27: Usage and cost by stage (Must) — JS5 (business)
As an admin, I want AI usage logged by stage, so that we can keep projects under £10 and price later.
- **AC27.1** WHEN any AI call completes or fails THE SYSTEM SHALL log: workspace, project, stage, step, model, input tokens, output tokens, cache tokens, web search count, cost in USD, duration, success.
- **AC27.2** THE SYSTEM SHALL show cost per project and per stage in GBP on SCR12 and in the project header, using a configurable rate (default 0.79 GBP/USD) and the model price table in settings.
- **AC27.3** WHEN a project reaches 80% of the cost cap (default £10) THE SYSTEM SHALL show `[copy: cost.nearCap]` in the project header.
- **AC27.4** WHEN starting a stage would be blocked because the project has reached 100% of the cap THE SYSTEM SHALL pause before the next AI call and require an admin to raise the cap for that project or a member to confirm `[copy: cost.atCap]`; WHILE a stage is mid-run when the cap is reached THE SYSTEM SHALL let the current step finish, then pause.

### US28: Model setting per stage (Must) — business
- **AC28.1** WHEN an admin sets the model for a stage on SCR12 THE SYSTEM SHALL use it for all new runs of that stage in the workspace.
- **AC28.2** THE SYSTEM SHALL default every stage to the Haiku-class model and offer Haiku-, Sonnet- and Opus-class models from a configured list.
- **AC28.3** THE SYSTEM SHALL record the model used on every node generated.

---

## Could

### US29: "Inspired by" references (Could) — JS4
- **AC29.1** WHERE Mobbin access is available to the app (OQ9) WHEN a lo-fi variant is generated THE SYSTEM SHALL attach up to 3 "inspired by" reference nodes with a link and one line on what was taken.
- **AC29.2** IF Mobbin is unavailable THEN THE SYSTEM SHALL generate lo-fi without references and show nothing about it.

---

## Non-functional requirements

| ID | Requirement | Check |
|---|---|---|
| NFR1 | **Performance (pages):** projects list and Audit Report show content within 2 s on a 2020-era laptop on office Wi-Fi (Largest Contentful Paint ≤ 2.0 s at p75). | Lighthouse / Playwright timing |
| NFR2 | **Performance (canvas):** a 500-node project opens in ≤ 3 s and pans/zooms at ≥ 45 fps; trace highlight in ≤ 300 ms at 1,000 nodes. | Playwright perf test with seeded graph |
| NFR3 | **Accessibility:** WCAG 2.2 AA for all screens. The canvas has a full keyboard path (AC22.4) and an equivalent **list view** of nodes by column for screen-reader users; markers are text + icon; focus is always visible; motion respects reduced-motion. | axe on every screen state; manual keyboard + VoiceOver pass |
| NFR4 | **Trust:** every citation shown resolves to a stored source record; 0 citations are generated from model memory. | Automated test: inject a fake citation → rejected (AC12.3); spot-check view (AC12.8) |
| NFR5 | **Security:** all data is scoped to the workspace with database-level access rules; only signed-in active members can read or write. No AI keys or secrets in client code. | RLS tests per table; secret scan in CI |
| NFR6 | **Lo-fi sandbox:** generated HTML is rendered in a sandboxed frame with no same-origin access, no network, and a strict content security policy. | Test: variant containing `fetch()` and `document.cookie` cannot reach the network or cookies |
| NFR7 | **Privacy:** personal data held = member name, email, activity history. Client uploads may contain personal data: stored privately, never sent anywhere except the Anthropic API for analysis; deleting a project deletes its uploads within 24 h. Members are told not to upload unredacted personal data `[copy: intake.uploadPrivacyHint]`. | Test: project delete removes storage objects |
| NFR8 | **Reliability:** background jobs survive a server restart and resume or fail cleanly; no job runs longer than 30 min (then marked failed with partial results kept). | Kill-worker test |
| NFR9 | **IP:** the real toolkit is never in the repo; a small invented sample toolkit (≈ 30 principles, all columns, invented content) is the only toolkit in fixtures. | CI check: no file larger than the fixture in `fixtures/toolkit` |
| NFR10 | **AI structure:** every stage's AI output is validated against a schema; invalid output is retried once, then the step fails (AC11.4). | Unit tests with malformed outputs |
| NFR11 | **Cost:** a full screens project with default settings costs < £10 at Sonnet-class demo settings. | Read usage log on the success-test briefs |
| NFR12 | **LEMES for key flows:** *Learnability* — a new member reaches the Audit Report unaided (FL1–FL3); *Efficiency* — from intake approval to research start ≤ 2 clicks; *Memorability* — the checkpoint panel always states the next action; *Errors* — every failure state has a recovery action (03 state matrix); *Satisfaction* — post-project 1-question rating (1–5) shown once per completed project, target ≥ 4. | Moderated session; state-matrix review; rating event |
| NFR13 | **Analytics events** (stored in the app's own database; no third-party analytics in v1): see table below. | Event test per event |

**Analytics events (NFR13)**

| Event | Fires when | Key properties |
|---|---|---|
| `project_created` | AC7.1 | project_id, mode, channel |
| `intake_suggestion_resolved` | AC8.3 | field, action (use/edit/keep), low_specificity |
| `checkpoint_decided` | AC25.3 | stage, decision (approve/send_back), n_selected |
| `stage_started` / `stage_completed` / `stage_failed` | stage lifecycle | stage, model, duration_ms, cost_usd, failed_steps |
| `ethics_override_recorded` | AC26.1 | level (gate/rec/variant), rule |
| `trace_opened` | AC23.1 | from_node_type |
| `node_edited` / `node_added` / `node_deleted` / `nodes_merged` / `node_regenerated` | AC24.x | node_type |
| `citation_rejected` | AC12.3 | stage |
| `principle_check_failed` | AC16.2, AC18.4 | stage |
| `report_exported` | AC15.4 | format |
| `project_rated` | NFR12 | rating |

---

## Traceability

| JS | US | AC | SCR | FL / FF |
|---|---|---|---|---|
| JS1 | US1, US3 | AC1.x, AC3.x | SCR1, SCR12 | FL1, FF1 |
| JS2 | US2 | AC2.x | SCR2, SCR8 | FL1 |
| JS1 | US7, US8, US9 | AC7.x, AC8.x, AC9.x | SCR3, SCR4, SCR6 | FL2, FF2, FF3 |
| JS6 | US10, US26 | AC10.x, AC26.x | SCR6, SCR5, SCR7 | FL2, FF4 |
| JS3 | US4, US5, US6 | AC4.x–AC6.x | SCR11 | FL7, FF9 |
| JS2 | US11–US15 | AC11.x–AC15.x | SCR5, SCR7, SCR8, SCR9 | FL3, FF5, FF6 |
| JS3 | US16, US17 | AC16.x, AC17.x | SCR5, SCR7, SCR8 | FL4, FF7 |
| JS4 | US18–US20, US29 | AC18.x–AC20.x, AC29.x | SCR5, SCR10 | FL5, FF8 |
| JS5 | US21 | AC21.x | SCR5, SCR7 | FL6 |
| JS2–JS4 | US22–US25 | AC22.x–AC25.x | SCR5, SCR7, SCR8 | FL3–FL6, FF10, FF11 |
| JS2, JS3 | US30 | AC30.x | SCR5, SCR7 | FF16 |
| JS5 | US27, US28 | AC27.x, AC28.x | SCR12, SCR5 | FF12 |
