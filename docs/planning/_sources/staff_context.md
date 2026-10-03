# Staff context for Phase 2 (what WRT people have actually said)

Sources available to this run: (1) `_Summary of Records JM Nursery.docx` in the data folder (WRT's own description of its ten records, with Google Sheet links supplied by Kyle); (2) Sarah's email after the first Tech Lab meeting (verbatim below); (3) the first-meeting summary points and the analysis of Sarah's two scoping documents ("Project 1 — nursery information / production planning" and "Project 2 — restoration mapping framework") as recorded in a sibling chat on 3 Oct 2026. **The two documents themselves and the meeting notes are NOT in this run** — treat points under (3) as second-hand (confidence: medium) and say so. (4) Phase 1 discovery outputs in `/home/claude/discovery/`.

People and roles (as named in the files and email): **Anna** — nursery manager; **Sarah** — operations manager, wrote the scoping docs; **Helen** — propagation lead (seed sowing, seed/cutting records; the pricking-out list "needs to be provided to Helen in January every year"); **Jen** — potting on ("Jen uses these numbers to dictate how many seedlings are potted up"); **Pradeesh** — briefing developers on a technical stack agreed with council; **Julian**, **James** — Tech Lab side. Volunteers run most nursery work, mainly Wednesday mornings. Tech Lab engagement is about six weeks; a follow-up session is roughly a week after 3 Oct; stack confirmation deadline 12 October; an MOU needs the software licence written down; possible funding for the mapping project decided in November.

## (2) Sarah's email (verbatim, links removed)

> Thanks for the meeting yesterday and for sending through the summary notes. It was great to get started, although we also realised how hard our process is to explain! It highlighted how important this initial scoping stage is.
> I've spent some time today and have thrown a few things into AI...mainly to try and clarify a few things for ourselves, based on some of your questions yesterday.
> The eventual result from AI is two documents which unfortunately are very wordy but they do have a fairly good picture of our process and describe 2 separate projects - the nursery information/production planning side, and then the wider mapping work. I've left the docs as they are and you can see what is useful to you (or not!!). ....they're definitely not intended to prescribe what the solution should be.
> I also did more of a search of other systems which might be worth looking at including one open source one and a recently developed NZ one - the info is in the project 1 doc.
> We might also have a funding option for the mapping project, which I can look into more this week. We wouldn't find out until November but potentially it could follow on quite quickly if you thought that would be a good way to go.
> Links: our project folder; All Plant Lists folder; Summary list of spreadsheets (yellow are the ones covering the most basic work flow); Tānes Tree Trust Monitoring tool; Trees that Count planter dashboard — you might just want to sign in to our portal so you can see this system. I will also follow up and get the contact for the Trees that Count tech person.

## (3) What the scoping documents and first meeting said (second-hand)

**Project 1 — nursery information / production planning**
- WRT explicitly does **not** want to assume a bespoke database. Sarah lists existing tools to test first: **Terraware** (open source), **SeedSource**, **Spriggo** (NZ nursery platform), Trees That Count / Tāne's Tree Trust tools.
- Her working hypothesis: the real gap is narrow — *turning site-by-site species requirements several years ahead into this season's production targets, then comparing those targets with plants moving through the production pathways to show likely shortfalls and surpluses*. Batches, stock and stocktakes are ordinary nursery features other products may already cover.
- Section 15 of her document is an **end-to-end test**: a Whitechapel 2029 planting story that any solution should be able to run (forecast → target → pipeline → allocate → plant → report).
- Model points she made: **ready is a flag, not a container** (PB3 holds growing and ready; T28 plants become ready in T28); pricking out goes from germination trays to **V150 or T28** (there is no "move to T28"); four stages, counting starts at stage 2.
- **Volunteers may not use software.** They may keep paper sheets; the Nursery Coordinator enters each session's totals afterwards. A printable pricking-out sheet would help. The weekly logs are pricking out (germ → V150/T28) and potting up (V150 → PB3).
- Rare **seed-source locations need restricted access**; both documents say so.
- Her example figures: WH-06 established Spring 2026 with 1,300 plants, 120 infill Autumn 2028, 45 enrichment Spring 2031. Planting seasons are written "Spring 2026"; production years "2026/27".
- Scope creep was named as the main risk at the first meeting.
- Site polygons: they already use the **Field Area Measure** app; import KML/GPX rather than redraw.
- TTC: get the real export fields from TTC's software contact before designing an export; Sarah offered a portal login.

**Project 2 — restoration mapping framework**
- The GIS owns site polygons; the nursery system only refers to them. Shared vocabulary to keep consistent: species, site, planting area, planting event, seed source, season, sensitivity. Possible separate funding (November).

## (1) and (4): see `/home/claude/discovery/scripts/WRT_SUMMARY_LINKS.md` and `/home/claude/discovery/DATA_SHAPE.md`.
