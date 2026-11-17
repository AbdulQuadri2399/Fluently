# The user's design taste notes (Figma)

*Plain English: what the user marked as "I love this" on three real app screens, and what each note means for Fluently.*

Source: Figma file "Work Design Taste", page "Web | Dashboards" (https://www.figma.com/design/ntlsScCtv2d9F33h33hHTG/Work-Design-Taste). Read 2026-11-17 from the Dev Mode annotations on each image. The images are Mobbin screenshots and are not stored in this repo.

## Image 1: Firecrawl dashboard (sidebar)
User's notes, verbatim:
> I love 3 things here: 1. The way the menu tabs are chunked with the divider line 2. I also love the search bar above with a hot key; I also love how the email and what's new is placed at the bottom here. It aligns with how most tools do this

For Fluently:
- **T1 Grouped navigation:** sidebar items in small groups separated by a hairline divider.
- **T2 Search at the top of the sidebar** with its keyboard shortcut shown (⌘K).
- **T3 Account and "What's new" at the bottom of the sidebar**, with a collapse control. ("What's new" is not in the requirements yet; see open question below.)

## Image 2: TheyDo insights with a details panel
User's notes, verbatim:
> I love how it's possible to leave a comment about an insight or an item on the right hand side. From a visual perspective, i love how it's not too salient but also aligns with our mental model of wanting to consume information before being able to leave a comment. Hence, why it's place at the bottom right section.
> I love the two types of badges we have here. The rounded with icons and the less rounded without an icon

For Fluently:
- **T4 Comments at the bottom of the details panel**, after all the information, visually quiet. (Commenting on nodes is not in the requirements yet; see open question below.)
- **T5 Two badge types:** fully rounded with an icon for **status** (e.g. Passed, Flagged, Weak evidence, Strong evidence); squarer (4 px corners) without an icon for **type or category** (e.g. Behavioural, Business, Observation).

## Image 3: Cofounder staged plan (the tree)
User's notes, verbatim:
> I love how the nodes have a: 1. A subtle quiet icon on the left in a box 2. I also love the subtle pastel green tick denoting that a node has succesfuly ran. 3. I also love the gentle label on the top right corner of the node box denoting the freshness status of the node feature. For example, how this says example showcasing that it's a new feature.
> The dashed style of the connecting node lines also helps guide the eyes, subtly, towards the next node. i also love how only the right end of the line has a circle.

For Fluently:
- **T6 Card icon:** a quiet icon in a small box on the left of each tree card, one icon per card type (objective, evidence, theme, opportunity, solution, wireframe, test).
- **T7 Done tick:** a small pastel-green tick on cards whose AI step finished successfully.
- **T8 Freshness label** on the card's top-right edge: "New" (made since you last looked) and "Out of date" (built on something that changed; the spec's "stale" state).
- **T9 Connecting lines:** dashed, with a small circle only at the receiving (right) end.

## Open questions raised by these notes
- **Comments on items (T4):** the requirements file (02) has no commenting. Adding it means a new user story (comment on any node, @mention a teammate). Needs the user's yes.
- **"What's new" (T3):** a small changelog panel isn't in the requirements either. Needs the user's yes, or leave it out.
