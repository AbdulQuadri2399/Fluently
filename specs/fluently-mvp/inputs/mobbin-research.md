# Mobbin UI research: design directions for Fluently

*Plain English: what comparable real products do for each Fluently screen, the three visual directions that came out of it, and the parts (components) every direction needs.*

Feature: Fluently MVP | Platform: web app | Date: 2026-11-16 | Status: awaiting the user's choice of direction

All references are web apps on Mobbin. Every link opens the exact screen. We take patterns, never a product's brand, logos or colours.

## Searches used (platform: web)

1. node-based workflow editor canvas with connected node cards, zoom controls and minimap
2. workflow editor with a selected node and a right-side properties panel
3. AI agent running a task showing step-by-step progress with checkmarks, spinner and cancel
4. review screen where a person approves or requests changes on AI-generated items
5. form text field with an AI suggested rewrite and accept, edit or dismiss
6. AI research report with numbered inline citations and a sources panel
7. design feedback screen with numbered comment pins on a mockup and a comments list
8. projects list table with status badges, last edited and search
9. first-time product tour for a canvas tool (flows)
10. workflow run history with a failed step, error message and retry

---

## What real products do, screen by screen

### The tree canvas (screen SCR5)
- **Left-to-right pipelines read best as columns.** [WRITER](https://mobbin.com/screens/afef9286-7030-4b12-8b5f-bb2d52831bd7) shows a calm, thin-outlined node per step with a small type label above the title, a green tick when done, and a minimap and zoom in one corner. It's the closest match to Fluently's seven columns.
- **Quiet chrome keeps the content legible.** [Remote](https://mobbin.com/screens/47e863ef-2628-4119-a7d1-9e45342e8538) and [Twenty](https://mobbin.com/screens/ddc11de0-7c11-4078-9b01-cd3bda79306f) use a faint dot grid, white cards with one-line subtitles, and a floating zoom bar at the bottom.
- **Nodes can carry their own facts.** [Clay](https://mobbin.com/screens/94a857b0-f643-4807-b6d0-c61a1457e2e5) puts a metadata row under each card (rows, columns, cost per row). For Fluently that row is confidence, number of sources and who made it.
- **Colour per node type helps scanning but gets noisy.** [fal](https://mobbin.com/screens/97dcc9fb-9c4b-4622-9f9c-a08a6a9a0c27) colour-codes borders and ports by type and shows a running cost estimate in the header.
- **Failed steps are marked on the node itself.** [n8n](https://mobbin.com/screens/f70fc619-d6bf-4dff-958d-ef47afc0342e) shows green ticks on finished nodes, a red cross on the failed one, item counts on the connecting lines, and a message naming the problem node. [Copy.ai](https://mobbin.com/screens/9219e1b9-5e41-451e-8dd2-be2bd277e05a) adds a top bar: "Some steps need your attention".

### The side panel with a node's details (SCR7)
- **One right-hand panel with plain sections** is the norm: [Tines](https://mobbin.com/screens/d122e4e5-ef8d-40c9-8b0b-6a24dabb1e89), [Plain](https://mobbin.com/screens/fc2573d6-f22b-42b5-bc94-f6917a39649c), [Langdock](https://mobbin.com/screens/354a7252-81c1-4d4d-b523-b081fa98bd10).
- **A disabled button that says why.** [Zapier](https://mobbin.com/screens/1c6d23c9-0f58-4ab5-acfe-5cee9108454a) keeps a sticky footer button reading "To continue, choose an event". This matches our rule that disabled buttons explain themselves.
- **History lives in the panel.** [n8n](https://mobbin.com/screens/6fe83d86-ff04-4c34-949a-7e873288b51c) lists versions with restore and clone.

### The decision moment at each stage (checkpoint panel, SCR8)
- **A checklist of what needs a decision.** [Attio](https://mobbin.com/screens/e2ff46ba-85ec-4968-8385-52ed971570e7) shows "Make sure all issues are resolved before publishing", with each unresolved step listed. This is the strongest analogue for "here's what's done, here's what you decide".
- **Accept or decline item by item, or all at once,** with a short AI summary on top: [AirOps](https://mobbin.com/screens/6642909e-6268-45ee-8028-72f19c646023). The toast "1 item declined" confirms each action.
- **Variants side by side, with the agent asking a question** and marking one option "Recommended": [Cofounder](https://mobbin.com/screens/9b81c8d4-3e89-44eb-86f8-7733b0e0a378). A small "2 agent updates · Review" pill brings people back when work is waiting.
- **Feedback when sending something back** as a short checklist of reasons: [Runway](https://mobbin.com/screens/aa016d55-74f1-47fb-8918-2ccb33a6c9b3).

### Showing progress while the AI works (SCR8 running state)
- **A checklist with a spinner on the current step and dots for pending ones,** plus a progress bar: [AirOps](https://mobbin.com/screens/0a9b3407-3578-4f6b-b18b-b6d9ae306fc4).
- **Say how long it will take.** "Completion expected in 90 seconds" ([Churnkey](https://mobbin.com/screens/154e66c3-9a71-467b-b631-925c687db6d1)) and "This process could take up to 2 minutes" ([Customer.io](https://mobbin.com/screens/507233fa-1da3-404e-b6eb-014bc1cc0aa7)) both reduce uncertainty.
- **Don't block the screen.** Full-screen "generating" pop-ups ([Adobe Express](https://mobbin.com/screens/2ec5a72b-3cce-4ccf-a41d-536f4fc06882), [Emergent](https://mobbin.com/screens/5fa147c0-bc4c-414e-a399-00997c560b62)) suit 10-second jobs. Fluently's research takes 10–20 minutes, so progress belongs in the panel while people keep working.

### The intake with AI suggestions (SCR6)
- **Show the old and new text with a one-line reason.** [WRITER](https://mobbin.com/screens/65eaa501-c59e-47e8-8feb-82715829ec9e) strikes through the original, highlights the new version and says why ("Use sentence case for headlines"). [Grammarly](https://mobbin.com/screens/82d0d01f-8aa2-4fe4-a658-1498c92fb1ae) does the same with Accept and Dismiss. This is exactly our "suggest a sharper version and say why".
- **Coaching under the field, in an encouraging tone.** [GoFundMe](https://mobbin.com/screens/d09dcb10-d11b-4cd1-aeb2-228ab6081186) puts a "Strengthen your story" panel directly under the text box, with a status line ("Great work!") and chips for what it improves. It also shows "Saved" and "4 of 6".

### The Audit Report (SCR9)
- **Report and pipeline status side by side.** [Elicit](https://mobbin.com/screens/00c13c4c-e8c3-4638-8911-a77ba160421f) shows a scholarly report with a full reference list. Beside it sits a status panel: Gather papers (50 found) → Screen papers (10 included) → Extract data → Generate report, each with a tick and "Details". It's the closest match to Fluently's research stage.
- **Findings with evidence counts and actions.** [Ferndesk](https://mobbin.com/screens/f4103177-622f-4e98-9447-f3fda4d9792b)'s "Audit" document lists findings as expandable rows with chips like "2 observations · 2 articles", plus Dismiss and Draft. This is very close to our opportunities and their evidence.
- **Citations as small numbered or domain chips** with a sources tab: [Gemini Notebook](https://mobbin.com/screens/80c2ce7c-50a3-4d5a-b3c8-14ac3e709c7d), [ChatGPT](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e) ("Research completed in 5m · 23 sources"), [Microsoft Copilot](https://mobbin.com/screens/e631b279-cfc4-4c1c-85c9-f06c838b8df2) (a "See my thinking" timeline of searches).

### Wireframe preview with numbered pins (SCR10)
- **Numbered pins and a list beside them:** [ClickUp](https://mobbin.com/screens/857d1c1c-f536-4b75-bd53-6c14a8e41613) (numbered coloured pin, plus an empty state saying how to add one), [Curater](https://mobbin.com/screens/0e26e277-844a-48cf-975d-a7c6b16c8599) (a pins list with a "Hide pins" toggle for a clean view).
- **Label the frame with its size:** [Framer](https://mobbin.com/screens/c2cbaabb-c99b-4e13-a56a-f7ac59e6ba5e) shows "Desktop 1200" above the frame, which fits our 390 / 1280 toggle.
- **Review status on the artefact:** [Air](https://mobbin.com/screens/f9768268-7f90-4cca-a2a8-c70afa552c5f) ("Needs Review" badge), [Fiverr](https://mobbin.com/screens/5821e87b-70da-46dd-8ec1-db258849a32c) (a big "Done" to approve the deliverable).

### Projects list (SCR3)
- **Calm rows, with status as an icon plus words:** [Linear](https://mobbin.com/screens/3d3a4fae-d824-440a-961b-001c6b715a4a) ("On track", progress %), [Dribbble](https://mobbin.com/screens/c8c70667-9b13-4f08-8292-e902524b42c4) ("Proposal Submitted").
- **A "needs attention" chip beside the name:** [Remote](https://mobbin.com/screens/dbc1c245-7d82-480f-8b86-ec52a21c5a00) ("Missing details"). That's our "waiting for you".
- **Select several, then archive** from a floating bar: [Hex](https://mobbin.com/screens/301409ca-c27b-4fa6-9b28-d1014d9babe0).

### First-time introduction (SCR2)
- **A welcome that offers a choice:** [Pitch](https://mobbin.com/flows/f9bed0ed-a493-4d72-845e-15ffffd204cd) offers "I'll explore myself" or "Take a quick tour", then short steps ("5 of 5") with a small preview image.
- **Tips pointing at the real interface,** plus sample data you can clear: [Coda](https://mobbin.com/flows/b584ec58-b480-4c98-9f54-fe498e2bb5be). For Fluently, a seeded example project would show a finished tree on day one.
- **A numbered "Get started" checklist** in the sidebar: [Canva](https://mobbin.com/flows/d3237fe5-9e7c-47ec-89e6-56ccfd951dc1).

### When something fails
- **Say what went wrong in plain words, with actions next to it:** [Hex](https://mobbin.com/screens/d32d640c-3a1b-4ff4-bee5-cc783462289b) ("Your query could not be executed", then Fix / Hide details / Copy error), [Vercel](https://mobbin.com/screens/ff81f1e9-25b1-46f9-8448-31fa40a77e4b) (a red-bordered "Build Failed" card with Redeploy).
- **A run history with soft status chips:** [Cursor](https://mobbin.com/screens/4b5a6ef4-4279-4309-a07f-64aa37cd1536).

---

## Three directions

Each direction is a complete look. All three keep the same screens, flows and wording (03); only the look and feel changes.

### A. Quiet Workbench
*Calm, neutral and precise. The tool gets out of the way.*
- **Feel:** cool greys, white thin-bordered cards on a faint dot grid, one blue accent, colour used only for status. Floating toolbars at the bottom, one inspector panel on the right.
- **Why it suits Fluently:** long working sessions with dense content; low visual noise leaves attention for the reasoning. Closest to the current design direction file (03b).
- **References:** [WRITER](https://mobbin.com/screens/afef9286-7030-4b12-8b5f-bb2d52831bd7), [Remote](https://mobbin.com/screens/47e863ef-2628-4119-a7d1-9e45342e8538), [Twenty](https://mobbin.com/screens/ddc11de0-7c11-4078-9b01-cd3bda79306f), [Attio](https://mobbin.com/screens/e2ff46ba-85ec-4968-8385-52ed971570e7), [Linear](https://mobbin.com/screens/3d3a4fae-d824-440a-961b-001c6b715a4a).
- **Type:** Inter for everything, JetBrains Mono for IDs. **Corners:** 8 px. **Density:** medium.
- **Risk:** can feel generic, "another SaaS tool", unless the evidence components carry character.

### B. Research Notebook (recommended)
*Editorial and evidential. Fluently feels like a well-kept research document that happens to be interactive.*
- **Feel:** cool paper-white surfaces, deep teal ink as the accent, serif headings for titles and the report, sans-serif for controls. Evidence is the hero: citation chips, source counts and confidence sit on every card. The AI's suggestions show old text struck through, the new text highlighted, and a one-line "why".
- **Why it suits Fluently:** the product's promise is "every decision traces back to evidence". A scholarly look raises trust in the reasoning (the authority of the source), and a report-like rhythm matches how behavioural designers present to clients.
- **References:** [Elicit](https://mobbin.com/screens/00c13c4c-e8c3-4638-8911-a77ba160421f), [Ferndesk](https://mobbin.com/screens/f4103177-622f-4e98-9447-f3fda4d9792b), [WRITER suggestions](https://mobbin.com/screens/65eaa501-c59e-47e8-8feb-82715829ec9e), [Grammarly](https://mobbin.com/screens/82d0d01f-8aa2-4fe4-a658-1498c92fb1ae), [Gemini Notebook](https://mobbin.com/screens/80c2ce7c-50a3-4d5a-b3c8-14ac3e709c7d).
- **Type:** a serif for headings (Newsreader) + Inter for interface text + JetBrains Mono for IDs. **Corners:** 6 px. **Density:** relaxed.
- **Risk:** serif headings take more space; the canvas must stay compact (serif only for titles, never for small labels).

### C. Colour-coded Pipeline
*Energetic and operational. Each stage has its own colour; status is loud and instant.*
- **Feel:** each column (Objectives → Tests) has its own hue on the node header and connecting lines; step badges ("Step 3"); bold green ticks and red crosses; floating toolbars; an "Ask Fluently" bar; strong dark mode.
- **Why it suits Fluently:** fastest at-a-glance scanning of where a project is and what failed; feels like a powerful tool.
- **References:** [fal](https://mobbin.com/screens/97dcc9fb-9c4b-4622-9f9c-a08a6a9a0c27), [n8n](https://mobbin.com/screens/f70fc619-d6bf-4dff-958d-ef47afc0342e), [AirOps](https://mobbin.com/screens/d2f33c9e-15ae-4f43-aee5-04b8148acafe), [Cofounder](https://mobbin.com/screens/9b81c8d4-3e89-44eb-86f8-7733b0e0a378), [Clay](https://mobbin.com/screens/94a857b0-f643-4807-b6d0-c61a1457e2e5).
- **Type:** IBM Plex Sans + IBM Plex Mono. **Corners:** 12 px. **Density:** compact.
- **Risk:** seven colours plus status colours compete; harder to keep colour from being the only signal (an accessibility rule); can read as "automation tool" rather than "thinking tool".

**Recommendation: B, Research Notebook,** borrowing A's quiet canvas chrome. It's the only direction where the look itself argues for the product's differentiator (traced evidence). C's per-stage colour survives in every direction as a thin stripe and icon, never as the only signal.

---

## The parts every direction needs (design system inventory)

Plain name first, technical name in brackets.

### Form elements
- **Text box and long text box** (input, textarea): label above, help text below, error replaces help text, character counter where there's a limit.
- **Choice cards** (radio cards): the New project dialog (create new / optimise; screens / email).
- **Dropdown with search** (combobox): the principle picker, searchable by ID, name or mechanism and grouped by goal.
- **File drop area** (dropzone): screenshots, HTML, `.eml`, client data, with a row per file showing progress and errors.
- **Checkbox and switch** (checkbox, toggle): choosing opportunities; settings.
- **Number stepper** (stepper): variants per recommendation (1–3).

### Buttons
- Main action, secondary, quiet, and danger (primary, secondary, ghost, danger), each with pressed, focused, disabled-with-reason and working ("Signing in…") states.
- **Split approve button** (split button): "Approve" plus a menu for "Approve all".

### Status and feedback
- **Tags** (badges): made by AI / Edited / Added; High / Med / Low confidence; Low specificity; Flagged / Overridden; AI inference; Qualitative signal · n sources; External principle; Out of date.
- **Small pop-up messages** (toasts): bottom-left, with Undo where it applies.
- **Banner** (callout): info, warning and error, with an action.
- **Step checklist** (progress list): tick / spinner / cross / pending, with a time estimate.
- **Loading placeholders** (skeletons) and **empty states** with one next action.

### Panels and overlays
- **Side panel** (sheet/inspector) with sticky actions at the bottom.
- **Decision panel** (checkpoint panel) at the bottom of the canvas, collapsible to one line.
- **Dialog** (modal), **menu** (dropdown menu), **hover hint** (tooltip), **tabs**.

### Fluently-specific parts (domain components)
- **Tree card** (node card): type label, title, metadata row (confidence, sources, provenance), status edge.
- **Connecting line** (edge), including dimmed and highlighted trace states.
- **Column header** (stage header) with progress.
- **Citation chip** (citation marker): numbered, opens the source record.
- **Source card**: title, type, year/domain, link, excerpt.
- **Confidence meter**: High/Med/Low in words plus a 3-step bar, with "why" on hover or focus.
- **Principle tag**: ID + name, opens the toolkit entry; marked "External" when not in the toolkit.
- **Suggestion card** (AI coaching): your text, the suggested text, why, then Use / Edit / Keep mine.
- **Annotation pin** and **annotation card** (What · Principle · Evidence · → objectives · Ethics).
- **Wireframe frame** with a size label (390 / 1280 / Email 600).
- **Ethics flag and override note** (with the reason and who recorded it).
- **Cost meter**: spent of budget for the project.

---

## Round 2 (16 Nov 2026): calmer direction A

*Plain English: the user picked A as the closest but found it cluttered. This round looked only at calm, minimal tools that do similar jobs, guided by the user's own taste skills (minimalist-ui, design-taste-frontend).*

**What the user's taste skills ask for:** warm monochrome (off-white, warm grey, charcoal text), black for the main button, pale pastel tags only for meaning, hairline borders, almost no shadows, lots of space, a characterful sans-serif instead of Inter (Geist), Phosphor icons, no decorative dots or chips.

**Searches:** research tool themes boards; minimal card whiteboards with a side panel; minimal workspace home pages; opportunity-tree style connected cards.

**Key references**
- [Cofounder: staged plan](https://mobbin.com/screens/f0cd27fc-87c3-49e8-95d7-b9dc0661c0a5): stages as quiet columns with mono headers, each card a title plus one line in words ("Needs your input", "Needs approval"), later steps faded. The closest match to Fluently's tree.
- [Deel](https://mobbin.com/screens/ea912de7-941e-4e5c-94d3-3429ff65d029) and [Square](https://mobbin.com/screens/5650b601-9f43-470f-b4a5-cf1d074c6965): white cards on light grey, one tiny pastel tag, a black main button.
- [Dovetail](https://mobbin.com/screens/9dafd5dd-e6dc-4748-8ec7-ab0a73e9b1b7): themes as columns of plain text cards, one tag per card.
- [Maze](https://mobbin.com/screens/c58328ab-b12d-41d1-a3ef-30350a2c9f97): themes with counts ("3 highlights, 2/2 sessions"), evidence opened on demand.
- [TheyDo](https://mobbin.com/screens/340e726e-f049-4cbb-b664-474e14a3baf4): details as a property list (label, value) with tabs for evidence and opportunities.
- [Contractbook](https://mobbin.com/screens/c402174b-230f-4474-a556-3c45777b91b7), [Plane](https://mobbin.com/screens/42a0573c-e9b5-4dd0-9e6c-38dbc35c6b22), [Trello](https://mobbin.com/screens/cc220e6a-c344-4a1e-a91d-b609c367a3c0): home pages that lead with what needs you.
- Avoid: [Optimal Workshop](https://mobbin.com/screens/23e6b1ca-27ff-43a3-ac09-530eb3300b19)'s many coloured tags, [hilos](https://mobbin.com/screens/0bbf6572-0644-43d0-bbee-30f8beab4543)'s bright pastel tiles.

**Decluttering rules that came out of it**
1. One line per card: title plus one status in words. Tags only for exceptions (weak evidence, flagged).
2. Stages not reached yet are faded.
3. Sources fold into one Evidence card with a count.
4. Grey everything; black only for the action that moves work forward; pastels only for meaning.
5. Details as a quiet property list; extra sections folded.
6. Home leads with decisions waiting, then running work, then recent projects.
7. No dot grid on the canvas; flat warm grey.

Shown as four real desktop screens: https://claude.ai/artifact/ATKfnWkvsdEywWAo6q1BE1 (private to the user).
