# Success test: does the research hold up? (A1–A3)

_Plain English: before we build solutions and wireframes, we check that the research stage is good enough, honest about its sources, and affordable. This is the go / iterate decision at the end of Slice 7 (task T7.5)._

What we're testing (from the PRD, 01 section 8):

| ID  | What we believe                                | How we check                                            | Pass                                            |
| --- | ---------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| A1  | The AI's Audit Report is as good as the team's | Rate the report blind against the team's own write-up   | 2 or more of 3 briefs rated "as good or better" |
| A2  | Every citation is real (no made-up sources)    | Spot-check 20 citations per brief in the citation check | 0 made up                                       |
| A3  | A project costs less than £10                  | Read the AI cost in workspace settings                  | Under £10 for each brief                        |

## Before you start

1. Pick 2 or 3 past briefs the team has already done by hand (open question OQ8). Remove client names and anything identifying.
2. Note how long each one took by hand (hours), if known.
3. Make sure Fluently is in live AI mode (a real Anthropic key is set; the brief page doesn't say "made-up answers").
4. In **Settings → AI models**, choose the demo preset (Sonnet-class for research). Don't change models between briefs.
5. Check the workspace's toolkit is the real Behavioural Design Toolkit (uploaded in the app, never committed to the code).

## For each brief

1. **New project** → same mode and channel as the original work.
2. **Brief**: paste the business objective, behavioural objective, audience and context. Upload the client data the team had (CSV, PDF, screenshots). Approve the objectives.
3. Wait for the ethics check. If it flags something, note it, and override only if the original work was fine.
4. **Start research**. Note the start time. While it runs, open _See what it's doing_ and note anything odd in the research questions.
5. When research finishes, note the end time.
6. **A1, quality.** Download the Audit Report as PDF. Give it, and the team's original write-up with the author removed, to a reviewer who doesn't know which is which. Ask them to rate each 1–5 on: insight, evidence, usefulness to the client. Record "AI as good or better" if the AI's average is equal or higher.
7. **A2, citations.** Open **Report → Citation check**. Pick 20 rows at random (or all, if fewer). For each, open the link or file and check: the source exists, the title matches, and it says roughly what the finding claims. Count made-up or wrong citations.
8. **A3, cost.** Open **Settings → Usage**. Read the GBP total for this project.
9. Fill in a row below.

## Results

| Brief (no client name) | By-hand time | Fluently research time | A1 reviewer rating (AI / team) | A1 pass? | A2 citations checked | A2 made up | A2 pass? | A3 cost (GBP) | A3 pass? | Notes |
| ---------------------- | ------------ | ---------------------- | ------------------------------ | -------- | -------------------- | ---------- | -------- | ------------- | -------- | ----- |
|                        |              |                        |                                |          |                      |            |          |               |          |       |
|                        |              |                        |                                |          |                      |            |          |               |          |       |
|                        |              |                        |                                |          |                      |            |          |               |          |       |

**Overall:** A1 ___ of ___ briefs as good or better · A2 ___ made-up citations in total · A3 highest cost £___

## Decision

Tick one and add a line on why:

- [ ] **Go**: all three pass. Continue to Slice 8.
- [ ] **Iterate**: one or more fail. Improve the research prompts or sources before Slice 9 (solutions), then re-run the failing briefs.

Decided by: ________ Date: ________

If anything fails, write down which check, the brief, and what went wrong (for example "3 of 20 citations pointed to the wrong paper", "cost £14 because the papers step retried").
