# Fluently.ai — Concept Brief (shared understanding)

> Status: concept agreed, pre-PRD. Next step: run **product-thinking-engine** on this brief → PRD + hand-off pack → **tech-spec-planner** → **build-from-spec**.

## 1. What Fluently is

An AI-run **Opportunity Solution Tree (OST)** for comms. It creates new comms, or optimises existing ones, rooted in behavioural science, behavioural design, neuroscience and neurodesign. The company's **Behavioural Design Toolkit** is the knowledge base behind it.

**The differentiator:** every design decision traces back to a principle, the evidence and both objectives.

**Non-negotiable rule:** every recommendation and every design element links to **≥1 behavioural or neuro principle**, plus its **research evidence** and **both objectives**. If it has no principle, it doesn't ship. This is enforced in the prompts *and* by a code check (a valid principle ID is required).

## 2. Audience and positioning

- **Internal first, productised later.** Your own team is both the user and the client.
- No billing, tiers or client logins in the MVP. Data is owned by **workspace**, not by individual user, so productising later doesn't need a rebuild.

## 3. Channels in scope

- **v1:** app and web screens and flows (onboarding, checkout, KYC…) **+ emails**.
- Later: push, SMS, ads, social.

## 4. Pipeline: stages, deliverables, human checkpoints

| # | Stage | Deliverable | Human checkpoint |
|---|---|---|---|
| 0 | **Intake** | Brief with **two objectives**: business (with a metric) and behavioural (who does what, when) | Approve objectives |
| 0b | **Ethics gate** | Brief, objectives and sector screened *before* research | Pass, or override with a recorded reason |
| 1 | **Research & asset audit** | **Behavioural Audit Report:** sourced findings → themes → opportunities, each with an evidence-confidence rating | Choose which opportunities to pursue |
| 2 | **Evidence gaps** (section of the Audit Report) | Open questions + the method that would answer them (IRT, behavioural interviews…) → leads to paid agency work | — |
| 3 | **Solutions** | **Recommendations:** ideas for each opportunity, each citing a principle + research themes + both objectives | Choose / adjust / add |
| 4 | **Lo-fi** | Annotated, coded greyscale wireframes (screens + emails), 2 variants each by default (1–3 configurable), each variant built on a different principle | Approve before hi-fi |
| 5 | **Hi-fi** *(post-MVP)* | Coded HTML/React prototype with micro-interactions, shareable by link, pushed to Figma. Emails as real HTML. | Final |
| 6 | **Testing** | Tier 1: **test plan** (hypotheses, metrics, method, sample, success criteria). Tier 2: **synthetic test** (paid). Tier 3: **human tests run by the agency** | — |

Every checkpoint supports **approve / edit / send back with feedback**.

### Intake details
- Fields: business objective, behavioural objective, audience and context, current assets (in optimise mode: Figma link or screenshots for screens; HTML, screenshots or a forwarded email for emails), optional client data (reviews, tickets, analytics), constraints (brand, design system, regulation).
- **AI coaching on every field:** the user drafts → Fluently suggests a sharper version and says why → the user accepts, edits or keeps their own. Vague objectives may proceed but carry a **"low-specificity"** flag through to the outputs.

### Research sources (stage 1)
- Behavioural Design Toolkit (cited by ID)
- Academic papers (Semantic Scholar / OpenAlex — real, retrieved papers only)
- Desk / market research (web search)
- **Competitive research** (its own step)
- **Social signal via web search** (Reddit, Trustpilot, app stores, forums). No paid APIs and no scraping. Labelled as a *qualitative signal* with a count of sources.
- Client uploads (reviews, tickets, analytics)
- Past agency work (v1.5, once converted to structured records)
- **Not in research:** Mobbin and Very Good Emails. These are references for the **solution and design** stages.

**Evidence rule:** every finding links to its source, or is labelled "AI inference".

### Evidence gaps
- Each opportunity gets an **evidence confidence rating** (High/Med/Low), based on how many sources there are, what kind they are and whether they agree.
- A gap is flagged **only** when confidence is Low or the sources contradict each other. Each gap states the specific open question and the method that would answer it.
- Low-confidence opportunities stay usable, just labelled as low confidence. This keeps Fluently from reading as a sales funnel.

### Annotation format (lo-fi; hi-fi later)
```
What:        progress bar "3 of 4"
Principle:   Goal-gradient effect (toolkit ID) — mechanism, in plain language
Evidence:    Theme T2 "drop-off at step 3" (app reviews, client analytics)
→ Behavioural objective: complete KYC in one session
→ Business objective:    +10% activation
Ethics:      helps the user achieve their own goal ✔
```
Principles that come from research but aren't in the toolkit are cited as **"external principle, not yet in toolkit"** and flagged as candidates for the team's existing Pending Insights → Toolkit review.

### Synthetic testing (tier 2, post-MVP)
- Two kinds: **persona panels** (react to a design or email) and **click-through agents** working through the coded prototype in a browser (UXAgent-style).
- Personas are **built from the audit's evidence** (real quotes, client data), not generic.
- Results are shown as **"synthetic signal"**, a lower confidence level than results from real people. Never presented as validation.
- Known weaknesses to state openly: too positive, too little variation between personas, persona drift, and no measure of implicit or emotional responses (that's what IRTs are for).

## 5. Interface

- **A node canvas**, like Flora, Blender's shader nodes or Azure ML Designer. The canvas *is* the OST: Objectives → Sources → Themes → Opportunities → Solutions → Lo-fi → Tests.
- Clicking any annotation highlights its path back to the evidence and the objectives.
- **Guided editing:** fixed pipeline. Users can edit, regenerate, add, delete and merge nodes. An edit marks the nodes built from it as **stale (regenerate?)**. Every node shows whether it was made by AI, edited by a person or added by a person.
- Lo-fi nodes render previews with numbered **annotation pins**. Mobbin references appear as "inspired by" nodes.
- Likely library: React Flow.
- **LEMES** (Nielsen: Learnability, Efficiency, Memorability, Errors, Satisfaction) is the usability standard for **Fluently's own interface**, written as acceptance criteria in the PRD for each key flow. It is *not* used to annotate the deliverables.

## 6. Ethics

- An **ethics gate at intake**, before research starts.
- A **list of things Fluently won't do:** deception, fake urgency or scarcity, making it hard to cancel or opt out, hidden costs, exploiting vulnerable groups.
- An **ethics check on every recommendation and lo-fi variant.** Does it help the user achieve their own goal, or work against it?
- A "when not to use" note for each principle (added when the toolkit is imported).
- **People can override flags,** but each override is recorded on the canvas with a reason.

## 7. Knowledge base: the Behavioural Design Toolkit

- Company IP. **Get approval from whoever owns it at the company before importing.** Do **not** commit the toolkit data to this repo.
- Visible columns used: General Goal, Sub-Goal, Sense, Principle, Quick Insight Summary, Extended Explanation, Related Principles, Examples, Link to paper, Reference, Mechanism, Design lever, Outcome, Sense (new), Evidence. Other tabs, hidden columns and the Apps Script/Gemini pipeline are out of scope.
- The team **exports a snapshot (CSV/JSON) and uploads it** to Fluently. Each upload is a version, and every project records which toolkit version it used.
- **Read-only.** Fluently never writes back to the source.
- Needs to be added to the source data: a **stable `ID` column**.
- Handled when Fluently imports the data: an evidence level (strong / some / none, e.g. "No source" rows are shown as low-evidence), splitting Outcome into behavioural vs emotional, merging the two Sense columns, suggesting channel fit and "when not to use" (approved by a person).
- The goal hierarchy (General Goal → Sub-Goal → Principle) maps opportunities to candidate principles. "Related Principles" become connections between toolkit nodes.

## 8. Users and access (MVP)

- Your team only. **Sign-up + a short onboarding**, limited to an **allowlist** (invited emails or company domain).
- Projects are shared across the team by default. Half-finished work is fine. **No client access in the MVP.**

## 9. Technical direction (to be confirmed in the tech spec)

- Next.js + Supabase (following the existing frontend and backend conventions skills). React Flow for the canvas.
- The data is a **graph** (nodes + connections), which is what makes the "trace back to evidence" path a simple lookup.
- Each stage runs as a **background job**. The canvas shows progress live and stops at checkpoints.
- **AI:** Claude only for v1, with a separate model setting for each stage.
  - Building and testing day to day: a Haiku-class model everywhere.
  - Demo: a Sonnet-class model for synthesis, recommendations and lo-fi code. A Haiku-class model for bulk extraction.
  - Switch individual stages to an Opus-class model only if quality requires it.
  - Uses Claude's built-in web search and fetch, image and PDF input for asset audits, and structured outputs to enforce principle IDs.
- **Log AI usage by stage from day one** (this feeds pricing later).
- Hi-fi is **built as code**, then pushed to Figma via the Figma MCP.

## 10. Releases

| Release | Scope |
|---|---|
| **MVP** | Intake (+ ethics gate) → Audit Report (+ gaps) → Recommendations → **Lo-fi** → Test plan, on the node canvas. Screens first, then emails. Both new and optimise modes. |
| v1.1 | Hi-fi coded prototype + export to Figma |
| v1.2 | Synthetic testing (panels + click-through agents) |
| v1.3 | Bringing test results back in to update confidence; past-work knowledge base |
| Later | Client logins, tiers and billing, more channels, paid social listening, open node-building on the canvas |

## 11. MVP success criteria

Run on **2–3 past briefs** the team already did by hand:

| Measure | Pass bar |
|---|---|
| Quality of the Audit Report | Rated as good as or better than the team's original work on ≥2 of 3 briefs; ≥1 useful insight the team missed |
| Trust | 100% of claims sourced; **0 made-up citations** in a spot-check of 20 |
| Principles applied correctly | ≥80% of recommendations and annotations judged correct by a behavioural designer |
| Speed | Brief → lo-fi in < 1 working day |
| Cost | < £10 of AI usage per project |
| LEMES (the tool itself) | A teammate who's never seen it reaches the Audit Report without help |

## 12. Open items

1. **Very Good Emails access:** check for an official API or MCP; otherwise build our own tagged email library. No scraping.
2. **Agency services list** that Fluently may recommend (IRT, behavioural interviews, + ?).
3. **Pricing and tiers** (e.g. recommendations ≈ a few £1,000; synthetic and human tests as paid upgrades).
4. **Sectors to refuse outright** (current default: flag gambling, high-interest credit, alcohol, addictive products).
5. **Toolkit:** add an `ID` column; get the company's approval to use it in Fluently.
6. **Past work:** format for case-study records (v1.5).
7. **Canvas:** confirm React Flow; onboarding design for first-time users.
8. Choose 2–3 past briefs (with client details removed) for the success test.
