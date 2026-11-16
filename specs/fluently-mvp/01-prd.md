# 01: Product requirements (PRD)

*Plain English: why Fluently exists, who it's for, what success looks like, and what's in and out of the first version.*

Feature: Fluently MVP | Platform: web app | Version: 1 | Date: 2026-11-16 | Status: draft

---

## 1. Overview
*The one-paragraph version.*

Fluently is an internal web app that takes a comms brief (app/web screens and flows, or emails) through an AI-run Opportunity Solution Tree: intake and objectives → ethics gate → research and Behavioural Audit Report → recommendations → annotated lo-fi wireframes → test plan. Every output traces to a principle from the company's Behavioural Design Toolkit, its evidence and both objectives, and is shown on a node canvas where any annotation can be traced back to its sources. People approve, edit or send back the work at each checkpoint.

- **Platform:** web app, desktop-first (the canvas needs a large screen). `[Assumption]` Phone and tablet widths get read-only access to the report and a message that editing needs a wider screen.
- **Status:** draft. **Owner:** product owner of Fluently (the team lead). **Date:** 2026-11-16.
- **Recommendation:** *Build, with the riskiest assumptions tested inside the MVP* (confidence: medium). The concept is internal, the team is both user and client, and the MVP success test (2–3 past briefs) is itself the cheap test. The biggest risk is AI quality and citation trust, so the MVP builds trust checks in code (principle IDs and source records) rather than relying on prompts alone.

## 2. Problem & evidence
*What's going wrong, how sure we are, and why now.*

**Problem.** Turning a comms brief into evidence-based, principle-led recommendations and wireframes takes the team days of desk research, synthesis and annotation per brief. The reasoning (which principle, what evidence, which objective) is often held in people's heads or scattered slides, so it is hard to defend to clients, hard to reuse, and inconsistent between team members.

**Who.** The company's behavioural design team: strategists and designers who run briefs today (primary); the team lead who owns the toolkit and approves work (secondary); later, clients.

**Evidence rating: partial.**
- Evidence (team, concept brief): the team already runs this process by hand and owns a structured toolkit (principle, mechanism, design lever, evidence, link to paper).
- Evidence (team, concept brief): an existing "Pending Insights → Toolkit" review process shows the toolkit is maintained and valued.
- `[Assumption]` By-hand time per brief (brief → lo-fi) is several days; the MVP's < 1 working day target depends on it. To be measured on the 2–3 past briefs (OQ8).
- `[Assumption]` Clients value traceable reasoning enough for it to differentiate paid work.

**Cost of doing nothing.** Each brief keeps costing days of senior time; reasoning stays undocumented; the toolkit stays under-used; no path to a productised offer.

**Why now.** Current Claude models can retrieve and cite real papers, read screenshots and PDFs, and return structured outputs that code can check, which makes "every claim sourced, every element principled" enforceable rather than aspirational. `[Assumption]` no external deadline.

## 3. Target user & JTBD
*Who exactly, in what moment, and what they're trying to get done.*

**Primary group:** a strategist or behavioural designer on the internal team who has just received a comms brief (new, or optimising an existing flow or email) and needs to get to a defensible direction quickly.

**Job stories**
- **JS1:** **When** a client brief lands and the asks are fuzzy, **I want to** turn it into one sharp business objective and one sharp behavioural objective, **so I can** aim the whole project at a clear target everyone agrees on.
- **JS2:** **When** I start researching a comms problem, **I want to** see sourced findings grouped into themes and opportunities with an honest confidence level, **so I can** choose where to focus without days of desk research.
- **JS3:** **When** I propose ideas to a client, **I want to** show that every idea rests on a named principle, real evidence and both objectives, **so I can** defend each decision and build trust.
- **JS4:** **When** a direction is chosen, **I want to** see annotated lo-fi variants built on different principles, **so I can** compare approaches and get sign-off before anyone invests in hi-fi.
- **JS5:** **When** a design is agreed, **I want to** have a test plan with hypotheses, metrics and success criteria, **so I can** propose how to validate it (and the agency testing that would do it).
- **JS6:** **When** a brief or idea edges into manipulative or harmful territory, **I want to** be stopped and asked to justify going ahead, **so I can** be sure we never ship comms that work against people.

**Current workarounds.** Manual desk research (Google Scholar, app reviews, Trustpilot, competitor screenshots), synthesis in slides or Miro, principles chosen from memory or the toolkit spreadsheet, annotations written by hand on wireframes in Figma.

## 4. Outcome & success metrics
*The behaviour we want to see change, and how we'll measure it.*

**Target behaviour:** strategists on the team run each new comms brief through Fluently from intake to approved lo-fi, and present its traced recommendations to clients, instead of producing them by hand.

**MVP success test** (run on 2–3 past briefs already done by hand, client details removed; OQ8):

| Measure | Pass bar | How it's measured |
|---|---|---|
| Audit Report quality | As good as or better than the original on ≥2 of 3 briefs; ≥1 useful insight the team missed | Blind side-by-side rating by 2 team members |
| Trust (primary guardrail) | 100% of claims sourced or labelled "AI inference"; **0 made-up citations** in a spot-check of 20 | Spot-check against source records (NFR4) |
| Principles applied correctly | ≥80% of recommendations and annotations judged correct | Behavioural designer review |
| Speed (primary metric) | Brief → approved lo-fi in < 1 working day (baseline: `[Assumption]` 3–5 days by hand) | Timestamps of intake start and lo-fi approval (analytics, NFR13) |
| Cost | < £10 of AI usage per project | Usage log per stage (US27) |
| Learnability (LEMES) | A teammate who's never used it reaches the Audit Report without help | Moderated first-use session |

**Guardrails (must not get worse):** made-up citations (must be 0); ethics overrides without a reason (must be 0, enforced in code); AI cost per project (≤ £10).

**Early signs:** share of intake suggestions accepted or edited (coaching is useful); share of recommendations approved without edits; number of trace-path openings per project (people use the traceability).

## 5. Solution
*The chosen approach, and why it should change behaviour.*

**Chosen approach:** a fixed-pipeline AI OST on a node canvas, with a human checkpoint at each stage and a code-enforced principle-and-evidence rule.

**Behavioural mechanism.**
- *Capability:* the AI does the heavy lifting of retrieval and synthesis, and the toolkit's goal hierarchy (General Goal → Sub-Goal → Principle) narrows candidate principles, reducing the effort of finding and applying the right principle.
- *Motivation (trust):* every element shows its path back to evidence and objectives, so strategists can defend it, which is what makes them willing to use AI output with clients.
- *Opportunity:* checkpoints (approve / edit / send back) keep the strategist in control and make the tool fit the existing review rhythm instead of replacing judgement.
- *Coaching at intake* uses feedback at the moment of drafting (suggest a sharper version and say why) to raise objective quality without blocking (low-specificity flag instead of a hard stop).

**Alternatives considered and rejected**
- *A chat assistant over the toolkit:* low build, but no structure, no traceability, no reusable artefacts. Rejected: fails JS3.
- *A document generator (brief in, report out):* simpler UI, but hides the tree and makes partial edits and regeneration hard. Rejected: fails JS2/JS4 control and the "trace back" differentiator.
- *Open node-building canvas (any node, any connection):* flexible but hard to learn and hard to keep traceable. Deferred to "Later".
- *No-build option, toolkit + templates + manual process:* cheapest, and remains the fallback if the MVP test fails, but doesn't change the days-per-brief cost.

## 6. Scope & non-goals
*What's in v1, what can follow, and what we're deliberately not doing.*

**v1 Must**
- Sign-up limited to an allowlist (invited emails or company domain), short onboarding, one shared workspace. (US1–US3)
- Toolkit snapshot upload (CSV/JSON), validated, versioned, read-only, evidence level computed. (US4)
- Projects: *new* or *optimise* mode; channel *screens* or *email*; pinned to a toolkit version. (US7)
- Intake with AI coaching on every field and a low-specificity flag; approve objectives. (US8, US9)
- Ethics gate before research; flags overridable with a recorded reason. (US10, US26)
- Research stage as a background job with live progress: toolkit, academic papers (Semantic Scholar / OpenAlex), desk research, competitive research, social signal via web search, client uploads. Findings → themes → opportunities with confidence ratings; evidence gaps. Choose opportunities. (US11–US14)
- Behavioural Audit Report view. (US15)
- Recommendations citing a principle, themes and both objectives, with an ethics check; choose / adjust / add. (US16, US17)
- Lo-fi screens: annotated greyscale coded wireframes, 2 variants by default (1–3), each on a different principle, with numbered annotation pins and an ethics check; approve. (US18, US20)
- Lo-fi emails, built after screens. (US19)
- Tier-1 test plan. (US21)
- Node canvas: node types, provenance (AI / edited / added by a person), trace path, edit / regenerate / add / delete / merge, stale marking, checkpoint actions. (US22–US25)
- AI usage logged by stage from day one; a model setting per stage. (US27, US28)

**Later in v1 / Should**
- Toolkit browser and person-approved import suggestions (channel fit, "when not to use", outcome split). (US5, US6)
- Audit Report export (Markdown and PDF). (AC15.4)

**Could**
- "Inspired by" reference nodes from Mobbin on lo-fi. (US29) Depends on OQ9.

**Non-goals (v1)**
- Hi-fi coded prototype and Figma export (v1.1); synthetic testing (v1.2); bringing test results back in, past-work knowledge base (v1.3).
- Client logins, tiers, billing; channels beyond screens and email; paid social listening APIs; any scraping.
- Writing anything back to the toolkit source; open node-building on the canvas.
- Real-time co-editing of the same node (projects are shared, but concurrent edits are handled by a conflict message, EC6).
- Fetching designs from Figma links automatically `[Assumption]` (a Figma link is stored as a reference; screens come in as screenshots; see OQ10).

## 7. Constraints for engineering
*Limits the build must respect. Constraints, not technology decisions.*

- **Principle rule in code:** every recommendation, lo-fi variant and annotation must carry ≥1 principle ID that exists in the project's pinned toolkit version, or be an "external principle, not yet in toolkit" with a source. Items failing the check are never shown. (AC16.2, AC18.4)
- **Citation rule in code:** every finding links to a stored source record (retrieved paper, page, upload) or is labelled "AI inference". Papers must come from a real Semantic Scholar / OpenAlex retrieval, never from model memory. (AC12.2, NFR4)
- **Toolkit is company IP:** not committed to the repo; uploaded by the team; read-only; every upload is a version; each project records its version. Approval from the toolkit owner is needed before the real toolkit is imported (OQ5).
- **No scraping, no paid social APIs.** Social signal comes only from web search results, labelled "qualitative signal" with a count of sources.
- **AI:** Claude only in v1, via the Anthropic API, with a separate model setting per stage. Defaults: Haiku-class for development and bulk extraction; Sonnet-class for synthesis, recommendations and lo-fi code in demos; Opus-class per stage only if quality requires. Uses Claude's built-in web search and web fetch, image and PDF input, and structured outputs.
- **Cost:** < £10 of AI usage per project; usage logged per stage from day one (feeds pricing later).
- **Long-running stages** must run in the background and survive the user closing the tab; progress is shown live.
- **Data ownership by workspace,** not by user, so productising later needs no rebuild.
- **Client data** (reviews, tickets, analytics, screenshots) is confidential; only the workspace can see it.
- **Preference:** Next.js + Supabase following the team's frontend and backend conventions skills; React Flow for the canvas. The data is stored as a graph (nodes + connections) so trace-back is a lookup.
- **Preference:** hi-fi (v1.1) will be built as code and pushed to Figma via the Figma MCP; lo-fi output in v1 should be code that hi-fi can later build on.

## 8. Risks, assumptions & planned tests
*What could go wrong, what we're betting on, and how we'll find out cheaply.*

**Four risks**

| Risk | Rating | Why |
|---|---|---|
| Will people want it and choose it? | Med | Internal team asked for it, but they'll only use it if output quality matches theirs. |
| Can they figure it out easily? | Med | Node canvases can overwhelm first-time users; mitigated by a fixed pipeline, guided checkpoints and onboarding (LEMES ACs). |
| Can the team build it? | Med–High | Multi-stage background AI jobs, retrieval, a graph canvas and sandboxed lo-fi rendering are a lot for an MVP. |
| Does it work for the business? | Med | Toolkit IP approval needed; cost per project must stay < £10; reputational risk if citations are wrong. |

**Riskiest assumptions** (matter most × least evidence)

| # | Assumption | Cheapest test | Pass line | Built into the product? |
|---|---|---|---|---|
| A1 | The AI's Audit Report is as good as the team's | Run 2–3 past briefs through the research stage as soon as it exists (before lo-fi is built) | ≥2 of 3 rated as good or better | Yes: research slice comes before lo-fi |
| A2 | Retrieval + code checks give 0 made-up citations | Spot-check 20 citations per test brief | 0 made up | Yes: source records + spot-check view (US12) |
| A3 | A full project costs < £10 | Read the usage log after each test brief | < £10 each | Yes: usage log (US27) |
| A4 | Principles are applied correctly | Behavioural designer rates recommendations and annotations | ≥80% correct | No |
| A5 | A newcomer can reach the Audit Report unaided | Moderated first-use session with one teammate | Reaches it without help | No |

**Pre-mortem: it's six months later and nobody uses Fluently. Why?**
1. *Outputs felt generic.* Prevention: research grounded in client uploads and specific social signal; themes cite specific sources; quality test A1 before building lo-fi.
2. *One bad citation destroyed trust.* Prevention: code-enforced source records; "AI inference" label; spot-check before demos.
3. *The canvas was confusing and slow.* Prevention: fixed pipeline, checkpoint panel that says what to do next, onboarding, LEMES ACs, performance budgets (NFR1–NFR2).

**Assumption log**

| Assumption | Where | Confidence | How to test |
|---|---|---|---|
| Desktop-first; phone gets read-only | §1 | High | Ask the team |
| By-hand baseline is 3–5 days per brief | §4 | Low | Time logs from past briefs (OQ8) |
| Figma links are stored, not fetched, in v1 | §6 | Med | OQ10 |
| One shared workspace for the whole team in v1 | US3 | High | — |
| Roles: admin and member only | US3 | Med | Ask the team lead |
| Ethics flags are overridable by anyone on the team (with reason); only sector "refuse" list blocks outright, and there is none by default | US10 | Med | OQ4 |
| Cost cap warns at 80% and pauses at 100% of £10 | US27 | Med | Ask the team lead |
| Research shows ≤ 8 opportunities per project by default | US12 | Med | First test brief |
| Lo-fi screens render at one mobile viewport (390 px) by default, desktop optional | US18 | Med | Ask the team |

## 9. Rollout & measurement
*How it's released, what's tracked, and when we decide what next.*

- **Release:** internal only. Step 1: the team lead and one strategist use it on the 2–3 past briefs (the MVP success test). Step 2: whole team on new briefs, alongside the manual process. Step 3: default process for new comms briefs.
- **Tracked:** analytics events in NFR13 (project created, stage started/completed/failed with duration and cost, checkpoint decisions, overrides, trace-path openings), plus the AI usage log.
- **Review:** after the 2–3 past briefs, against the §4 table.
- **Decision:** all pass bars met → scale to the team (step 2) and plan v1.1 hi-fi. Quality or trust fails → iterate on research prompts and retrieval before more features. Cost fails → move stages to cheaper models or reduce sources. Two or more fail after one iteration → stop and rethink.

## 10. Open questions
*What we don't know yet, and who can answer it.*

| ID | Question | Who / what resolves it | Blocks building? |
|---|---|---|---|
| OQ1 | Does Very Good Emails have an official API or MCP? If not, we build our own tagged email reference library (post-MVP). | Team lead, checking with VGE | No (lo-fi emails don't depend on it) |
| OQ2 | The list of agency services Fluently may recommend in evidence gaps (IRT, behavioural interviews, +?) | Team lead | No: v1 uses a configurable list seeded with "Implicit response test (IRT)" and "Behavioural interviews" (AC13.3) |
| OQ3 | Pricing and tiers | Business owner | No (non-goal) |
| OQ4 | Sectors to refuse outright vs flag. Default: flag gambling, high-interest credit, alcohol, addictive products. | Team lead | No: v1 flags (overridable); "refuse" list is configurable and empty by default (AC10.4) |
| OQ5 | Toolkit owner's approval to use the toolkit in Fluently, and adding a stable `ID` column | Toolkit owner | No for building (fixture toolkit); **yes** before the MVP success test |
| OQ6 | Format of past-work case-study records | Team | No (v1.5) |
| OQ7 | Confirm React Flow; onboarding design for first-time users | Tech spec / this pack (03 SCR2) | No |
| OQ8 | Which 2–3 past briefs (client details removed) for the success test, and their by-hand time | Team lead | No for building; yes for the test |
| OQ9 | Can the app (not Claude Code) search Mobbin from the server? (Mobbin MCP access for the app) | **Service test** | No: US29 is Could |
| OQ10 | Should optimise mode fetch frames from a Figma link (needs a Figma token), or are screenshots enough for v1? | Team lead | No: v1 stores the link and asks for screenshots |
| OQ11 | Anthropic API key and spend limit for the workspace; Semantic Scholar API key (higher rate limits) | **Service test**: user creates keys at the start of the build | No: build uses mocked AI and retrieval in tests |
| OQ12 | GBP exchange rate for cost display (Anthropic bills in USD) | Team lead | No: configurable rate, default 0.79 GBP per USD (AC27.2) |
