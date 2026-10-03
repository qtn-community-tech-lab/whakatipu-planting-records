# 00 — Evidence summary and decision triage (Phase 2 start)

Phase 1 (`/home/claude/discovery/`) is the authority for *what exists*. This note restates it in the form Phase 2 needs and sorts the open questions by what they block. Do not re-profile the 381 sheets.

## What Phase 1 established

| Area | Finding | Evidence |
|---|---|---|
| Process | One yearly loop: site needs → pricking-out target (typed, tray-rounded) → sowing list → March V150 count → potting-on Goal Set (= the count, 47/50) → PB3/T28 stocktake → allocation (ready + buy-in + council + schools) → "planted" (allocation retyped, 98/98) → summaries/TTC (typed). "Two seasons later" holds. | `DATA_SHAPE.md` §2, `04c`, `05_lineage_edges.csv` |
| Linkage | No links between workbooks; 35 retyped hops; ~1,900 typed summary cells; formulas only inside a workbook; row-position links break on insertion | `05_*`, `04b` §4 |
| Species | 98-row block copied into every current file; 97 real + 1 duplicate (Leonohebe/Veronica cupressoides); 93 = the 2026 docx after repeats; 664 raw strings → ~160 groups; shared misspellings; no stable ID (running number is a row counter) | `04a`, `04a_species_variants.csv` (820 rows, 208 flagged uncertain) |
| Sites | 116 header spellings → 77 groups; site ID (`15`, `9G`, `13C`) is the best key but faulty (2015 old numbering; two swapped 2024–25; `!!A`; none for Autumn 2026; 14 sites never given one); K/C/S class in `SUMMARY SITES`; no planting-area codes anywhere | `04d`, `04d_sites_variants.csv` |
| Stock | Snapshot, overwritten in place; 24 count events 2018–2026; 4 layouts; V150-includes-T28 trap; current master is Stage 2/3/4 with T28 columns; no loss field | `04e` |
| Potting | Species × dated session on month sheets; Summary formula-linked but over-typed; headers day/month-swapped; weekly pricking-out tallies never filled in | B13–B15, B06, `04f` §4 |
| Allocation | Species × ~30 site columns per season; 4–6 competing totals; `#REF!` site sheets; "available" includes plants WRT doesn't hold; Location column empty | B19–B22, `04e` §4,§7 |
| History | `Plants Out Master › MASTER`: 98 species × 23 season blocks (Autumn 2015 → Autumn 2026), ~411 site columns, 140,049 plants (two other totals: 139,948; 135,413); site-level only; two 2024 Slope Hill columns = 21% of all-time | B23, `04d` §7 |
| Reporting | TTC sheets are pasted extracts; `>5m` flag in 49/50/39 species; no coordinates, no photos; Paper4Trees = order forms | `04g` |
| Dates/IDs | ≥9 date formats; swaps; impossible years; three year systems (calendar / Aug–Jul production / Spring-Autumn planting); seed tags not unique (restart 2022) | `04f` |
| Sensitive | 36 seed-source location columns in 32 files; GPX of remnant kōwhai; personal names in comments/headers/file names/properties; one bank account on an invoice | `04g_sensitivity_register.csv` |
| Live copies | The ten WRT records are Google Sheets; the folder is an export; some "archive" copies are newer than "masters" | `scripts/WRT_SUMMARY_LINKS.md` |

## Unresolved decisions, sorted by what they block

**Blocks any change (must settle before touching the live Sheets)**
1. Which Google Sheet is the live copy of each record, and are records 9 and 10 one workbook? (Needed before any restructuring.)
2. Who at WRT owns the species list and may rule on the contested pairs (Leonohebe/Veronica cupressoides; Cyathoides/Leptecophylla; Carex maorica vs secta; which Kunzea; the three Ozothamnus)? — a *process* decision; the ruling itself can come during build.

**Blocks migration only (history import can wait for these; current work cannot)**
3. Is Plants Out Master "planted" = actual or allocation? (Affects the `confidence` field of imported history, not whether to import.)
4. Which all-time total WRT trusts (140,049 / 139,948 / 135,413) and whether the 2024 Slope Hill HGF/Coronation columns are real plantings.
5. Site ID corrections (13C/11 swap; 9E/9F; 13A/13D; `!!A`) and IDs for the 14 ID-less sites.
6. Who may see seed-source locations; may the GPX be held. (Blocks importing the Site/Source columns only.)
7. Day/month confirmation for the 2026 seed-collecting dates and potting-on headers (import with a flag otherwise).

**Blocks future software only**
8. TTC's real export fields, portal access, photo/coordinate expectations.
9. Stack and hosting agreed with council; MOU licence; who maintains after Tech Lab.
10. Whether existing products (Terraware, Spriggo, SeedSource) cover batches/stock well enough — Sarah asked for this test.
11. GIS project funding (November) and polygon ownership.

**Useful but non-blocking**
12. Whether the 10–15% contingency is ever calculated (no formula exists; treat as judgement + tray rounding).
13. The T28 species list for this year; what red font means; what "35F" was.
14. Where weekly pricking-out actuals are kept (paper?); where losses should be recorded.
15. Meaning of HGF, Coronation, Paererewa, "Spare FH, PPk, QR, Apt", "Neill", E4N.
16. Whether the forecast workbook is meant to be live (assume not).

**Assumptions Phase 2 will run on (state them in every output):** the Google Sheets are the live records and match the export; WRT keeps using Sheets for weekly entry during Tech Lab; volunteers keep paper; nothing historical is edited in place; planting areas are a *future* concept (none exist in data); seed-source locations stay out of any shared dataset until decision 6.
