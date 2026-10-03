# Phase 2 — shared brief for every agent

**Goal of Phase 2:** *How do we make WRT's real working system significantly better with the least disruption?* Not "what database tables should we build". Do NOT repeat the Phase 1 discovery. Do NOT jump to designing a bespoke app.

## Read first (in this order)
1. `/home/claude/planning/00_evidence_summary.md` — what Phase 1 established and which decisions block what.
2. `/home/claude/planning/_sources/staff_context.md` — what Anna, Sarah and the files say staff actually do. Distinguish CURRENT BEHAVIOUR / DESIRED BEHAVIOUR / HISTORICAL DATA / IDEAS FOR THE FUTURE; never treat a future idea as a current requirement.
3. `/home/claude/discovery/DATA_SHAPE.md` — the Phase 1 synthesis (entity table in §3; hotspots §4; species §5; precision §6; quality §7; sensitivity §8; migration candidates §9).
4. The Phase 1 reports relevant to your question: `/home/claude/discovery/04a`…`04g` (.md and .csv), `05_lineage_edges.csv`, `05_lineage.mmd`, `06_verification.md`, `03_sheet_catalogue.csv`, scout JSONs in `02_scouts/`, and `scripts/WRT_SUMMARY_LINKS.md` (the ten live records → folder files).
5. You may open specific source ranges read-only (`/home/claude/_source_copy/_ALL Plant Lists/…`, `.xls` via `/home/claude/_converted/`) with openpyxl or `python3 /home/claude/discovery/scripts/profile_workbook.py "<rel path>"` **only to check a point**. Never paste whole sheets. Never write to the source copy.

## Hard rules
- Read-only on sources. All outputs under `/home/claude/planning/`.
- British English; plain language readable by WRT staff and developers; cite evidence as `file › sheet › range` or as a Phase 1 report section; mark inferences `confidence: low|medium|high`.
- **Sensitive data:** never include seed-source locations, coordinates, landowner names, personal names, emails, phones or bank details. Staff first names appearing in sheet/file names are written `[name]`. Role names (nursery manager, propagation lead) are fine; "Anna" and "Sarah" may be used as the roles the brief names.
- Each agent answers ONE question. Do not design an entire competing product. Do not force the same answer on every workflow.
- Consider three levels for anything you recommend: **Level A** fix the current Sheets; **Level B** clean canonical data + hybrid; **Level C** small purpose-built software — and say which applies and why.
- Product principles: preserve before replacing; simplify before coding; one fact, one home; humans keep familiar language (IDs underneath, not in the interface); do not manufacture history; current and historical data are different problems; progressive transition; WRT must be able to run it after Tech Lab leaves.
- Finish with a ≤250-word reply summarising findings and the paths written. Do not paste the report into the reply.
