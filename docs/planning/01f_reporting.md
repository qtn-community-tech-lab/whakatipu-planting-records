# 01f: Reporting from the planting history (internal summaries, charts, TTC, website, funders)

*S1F, Phase 2. Sources: `04g` §2, B23, `04d` §7 and §9, `05_lineage_edges.csv`, `DATA_SHAPE.md`, `staff_context.md`. The brief did not list the ten standard questions, so I use the same ten as `01e`. I also opened `_JMN Plants Out Master.xlsx` read-only to check points, and unpivoted `MASTER` into a scratch table (not saved in the project) to test what one table can generate. Assumptions as in `00_evidence_summary.md`. Second-hand staff material is marked (2H).*

## 1. The ten questions

**1. What is the job?** Tell funders and the public what has been planted: species counts by season, trees over 5 m for Trees That Count (TTC), a "running tally of total number planted by the trust" (Summary of Records, record 10), charts, and class totals (Keystone, Community, School). Current behaviour, high confidence. The person who assembles TTC and Paper4Trees does this by copying numbers by hand (`03_staff_needs.md`).

**2. Where does it live?** `Plants Out Master › MASTER` (99 species rows by 23 season blocks) feeds `SUMMARY SITES`, `SUMMARY PLANTS`, `CHART DATA`, `CHARTS` and three `Trees that Count*` sheets. `MASTER` is the only place the numbers originate. Everything else is derived, typed, or both.

**3. What goes in?** The `MASTER` season block, itself retyped from the allocation (98/98 species equal for Spring 2025; `05_lineage_edges.csv`). So "planted" means "allocated". Rows `MASTER` 8–106, one column per site per season.

**4. What comes out?** About 1,900 typed summary cells: `SUMMARY PLANTS` has 1,605 typed against 384 linked, `SUMMARY SITES` 428 typed against 63 linked, and the TTC sheets are pasted extracts (177 of 230 cells match `MASTER`).

**5. What goes wrong?** Section 5 shows four grand totals, each with a nameable cause. Other faults:
- The over-5 m list exists in three versions (49, 50 and 39 species).
- The 2025 over-5 m total has no formula at all.
- The 2017 and 2018 over-5 m totals are long hand-built sums.
- `SUMMARY SITES` links by row offset.

**6. What is worth keeping?** The `MASTER` counts (they reconcile to `SUMMARY SITES` for 2015–2024), the species × season layout TTC has been given since 2017, and the K/C/S class idea.

**7. How does it hand off?** It is the end of the chain. Nothing downstream reads it except the typed summaries.

**8. What can be simplified before software?** All of the summary layer. It is a pivot of one table, retyped every season.

**9. Which level?** Level A for every report WRT produces now. A small Level B dependency (site and species IDs, one import). Level C is not justified (section 7).

**10. Out of scope:** the Paper4Trees order trail (`01e`), annual propagation totals (production sheets; today prose, `04g` §2.8), GIS polygons (Project 2).

## 2. Could one clean table do it?

Yes, for everything except locations and photos. I unpivoted `MASTER` once (by script, nothing typed): **5,448 rows**, 23 seasons, 94 species with data, 114 site-header spellings. Every row carries a non-zero quantity, so there are no blanks to carry. The grain is the one `04d` §3 says exists: species × site × season.

| Column | Content | Note |
|---|---|---|
| `season`, `year` | `Autumn`, `2026` | The label ("Autumn 2026") is a formula, never typed. Calendar and production years are views, not columns. |
| `site_id` | `15`, `9G`… | Mapped per `MASTER` column, not copied from row 5 (see below). |
| `species_id` | from the Species tab | Shown to people as the scientific name. |
| `quantity` | whole number | |
| `source` | `nursery`, `Paper4Trees`, `QLDC`, `bought-in`, `unknown` | Supply route, as in `01e`. History is `unknown`, except the Paper4Trees columns (1,457 plants). |
| `confidence` | `allocation`, `recorded`, `unverified` | Confirmed `allocation` for Spring 2025 and Autumn 2026 only. Everything earlier is `unverified` until WRT says. Never upgraded silently. |
| `imported_from` | `MASTER › OG8` style cell | Audit trail. Hidden from reports. |

The flags (over 5 m, threatened), class (K/C/S) and landowner are **not** columns. They live once on the Species and Site tabs and are looked up. That is what "without repeating values" means here.

**Two mapping jobs, both small:**
- **Sites.** 23.5% of plants (32,969) sit under a blank or faulty header ID, mostly the two 2024 Slope Hill columns (22,000 and 7,000). A first-pass join on ID then exact name classifies 92% of plants (Keystone 106,543; Community 16,871; School 5,402) and leaves 11,252 plants in 36 header/ID pairs for a hand-made mapping table (for example "P4T" 1,030). `04d_sites_variants.csv` already groups the spellings. Register ID `6` is duplicated. Confidence: medium, because the first-pass join cannot yet be compared with the typed register (110,343 / 21,213 / 7,058 / 1,334 blank).
- **Species.** `MASTER` holds one species list for all 23 seasons, so history needs no per-season matching. Only the contested pairs matter. *Leonohebe cupressoides* (row 51, 181 plants, 2015–) and *Veronica cupressoides* (row 99, 661 plants, 2019–) are one species split across time. One line in the mapping table fixes its history without editing a cell.

This table and `01e`'s `Allocation` tab are the same table seen at two moments. History arrives once by import. From Spring 2026, rows come from `planted_qty` on the allocation. Do not keep two.

## 3. Report → source view → tool level

Cadence is seasonal, twice a year (plus audit requests). That favours the simplest tool.

| Report | Source view (from `Planting`) | Tool level |
|---|---|---|
| Site history (what, when, where) | Pivot or filter: site rows, species columns | **Sheets pivot** |
| Species history | Pivot: species rows, season columns | **Sheets pivot** |
| Annual and season totals | Pivot: year × season | **Sheets pivot** |
| Running tally for the trust | One `SUM` cell on a Reconciliation tab (section 5) | **Sheets** |
| Class totals (K/C/S), landowner totals | Pivot with class and landowner looked up from the Site tab (none by landowner exists today) | **Sheets pivot**, after the site map |
| TTC species counts by season, over 5 m | Pivot filtered on the looked-up flag (section 4) | **Sheets pivot** |
| Threatened-species totals | Same, with the T flag; 2024 and 2025 can then be added | **Sheets pivot** |
| Funder audit extracts (2019 by site, 2020 by species) | Filtered pivots | **Sheets pivot** |
| Internal charts (yearly, cumulative) | Chart over the annual pivot | **Sheets chart** |
| Public chart or dashboard with filters | Same pivots as a data source | **Looker Studio** (only if a public, filterable view is wanted) |
| Website number | One published cell, or typed twice a year from the Reconciliation tab | **Sheets**; page edit by hand |
| Map of plantings, TTC geolocation | Needs coordinates or polygons | **GIS (Project 2)**; Looker Studio can show points once they exist |
| Photos for TTC | Needs a field routine and storage | **Behaviour first**; a log of file links is Level A |
| TTC upload in a fixed schema | Depends on TTC's real fields (unknown) | **Code only if** TTC requires an API or a rigid file; a Sheets CSV export first |

Nothing in this list needs code on current evidence. Pivots over about 5,500 rows are trivial for Sheets. The one trap is that pivots cannot join tabs, so lookups (flag, class, landowner) go in a view tab with `XLOOKUP`, not into the `Planting` table. I found no evidence of what the website shows (confidence: low that it needs more than one headline figure).

## 4. TTC: typed sheet versus generated view

**Today.** `Trees that Count` has typed season columns (E, F, K, L), a typed headline block (Jardine 2,503; system total 8,306; remaining 5,999), a totals row that stops at row 101 (a species on row 102 sits outside it), and a `#REF!` cell where the 2025 over-5 m total should be.

**Generated.** One row per species with its flag looked up, one column per season, `SUMIFS` over `Planting`, totals over the whole column rather than a fixed row range. The over-5 m row is a `SUMIFS` on the flag. I built the equivalent from the scratch table using the 49-species list on `Master Plant List` (the same 49 as `SUMMARY PLANTS` and the TTC sheet):

| Figure | Typed today | Generated | Typed − generated |
|---|---|---|---|
| Over 5 m 2017 | 5,459 | 5,370 | +89 |
| 2018 | 4,326 | 4,548 | −222 |
| 2019 | 5,991 | 6,337 | −346 |
| 2020, 2021, 2022 | 5,496 / 5,488 / 6,636 | 5,496 / 5,488 / 6,636 | 0 |
| Autumn 2024 | 9,545 | 9,545 | 0 |
| Year 2024 (`SUMMARY PLANTS` E120) | 32,656 | 32,656 | 0 |
| 2025 | none | 5,708 (Autumn 2,193, Spring 3,515) | n/a |
| Threatened 2018 / 2019 | 1,325 / 1,755 | 1,360 / 1,776 | −35 / −21 |

The exact matches (2020–2022, 2024) show the generated view reproduces what WRT already reports when the same flag list is used. The 2017–2019 gaps show the hand-built sums drifted, or used an older flag list I cannot see (confidence: medium). This also settles a point in `04g`: E120 is the 2024 year total, although labelled "SPRING" (now high). The `Trees that Count` Spring 2024 column (7,871) is 29,826 less the 22,000 Slope Hill HGF plants, within 45; the 2024 over-5 m figures (4,716, and 5,900 for Coronation) match the same carve-out. So the sheet deliberately leaves HGF out (medium). That carve-out should be an attribute on the site-season (a reporting group, once TTC says what it counts), not a typed subtraction.

**A correction to Phase 1.** B23 read `MASTER` column B (an unlabelled "x", 48 species) as the over-5 m flag. It is not: only 23 of its 48 overlap the 49 flagged on the master list, and using it gives 7,492 for 2020 instead of the reported 5,496. Its meaning is unknown. Use `Master Plant List` column A.

**What TTC is still missing that no Sheet can fix.**
- **Coordinates or polygons.** None in any workbook (`04g` §2.4). A Site tab can hold a reference or centroid, but someone has to capture it. New sites can come from the Field Area Measure app (KML/GPX, (2H)). The 2015–2023 sites cannot be backfilled from data. Do not manufacture them.
- **Photos.** No column and no files tied to plantings. A log (site, date, link) indexes photos once they are taken. Whether any past photos exist is unknown.
- **Event date and planting area.** Season only, no areas before 2026.

**What TTC and Tāne's tools expect is unknown.** I have only the brief's list (species counts, over-5 m, geolocated sites, photos) and (2H) Sarah's offer of a portal login. No form or export is in the folder. Treat all of it as to be confirmed with TTC's software contact. Also unknown is whether the "15% under 5 m" tolerance (a note beside a 12.5% ratio) is a TTC rule.

## 5. The disagreeing totals

I do not pick one. I summed every non-zero row (140,068) and compared it with each stated figure. Every gap has a mechanical cause (confidence: high on the arithmetic):

| Stated | Value | Generated 140,068 less stated | Cause |
|---|---|---|---|
| `MASTER` grand total (PY107) | 140,049 | 19 | The range `SUM(PY4:PY105)` stops short of row 106 (*Cyathoides juniperina*, 19 plants, Spring 2025). The Spring 2025 block total (6,248) does include it, so two cells on one sheet disagree. |
| `SUMMARY SITES` (BC3) | 139,948 | 120 | 2025 per-site total cells add to 10,597, though the Autumn and Spring site cells add to 10,717, which is what its own total row shows. |
| `SUMMARY PLANTS` (AW4) | 135,413 | 4,655 | 4,556 (Autumn 2026 not added) + 80 (Autumn 2025 typed as 4,389, not 4,469) + 19 (row 104 outside the sum). |
| `CHART DATA` cumulative 2024 | 100,532 | 24,263 to the 124,795 that the 2015–2024 rows sum to | The 2024 point reads the Spring column (29,826) not the year (43,483), and the cumulative formula skips 2023. 13,657 + 10,606. |

A `Reconciliation` tab would hold these as typed "as reported" values with their cell references beside `=SUM(Planting!quantity)` and a difference column. Any new typed total disagreeing with the table shows as a non-zero cell instead of a second "truth". The table's total is a *sum of recorded rows*, not WRT's answer. Four decisions remain WRT's:
1. Whether row 106 belongs on the species list.
2. Whether the two 2024 Slope Hill columns are real plantings. They are 29,000 plants (21%). HGF is 22 species totalling exactly 22,000, which reads like a planned split. Excluding HGF alone gives 118,068, and excluding both gives 111,068.
3. Whether "planted" equals allocation (so Autumn 2026's 4,556 is a plan).
4. Whether Paper4Trees, council and bought-in plants count (decisions 3 and 4 in `00_evidence_summary.md`).

Until these are settled, any figure published on the website is a choice among them.

## 6. What to keep and not do

Keep the `MASTER` matrix frozen as the historical record, and the `Master Plant List` flags as the seed for the Species tab. Do not build a reporting tool for a twice-yearly extract. Do not import the `SUMMARY` or `TTC` sheets (derived and typed). Do not set `event_type` or area for imported rows.

## 7. Smallest useful change, and verdict

**Smallest useful change.**
1. **Today, no new structure.** Two cell fixes make the current workbook honest: `CHART DATA` L6 to read `SUMMARY PLANTS` AQ4 and L7 to `=K7+L6`, plus summary ranges extended to row 106. These are summary formulas, not historical data. Make them in a copy and tell WRT.
2. **Next.** Unpivot `MASTER` once into a `Planting` tab beside the frozen matrix, with a site-mapping tab and the over-5 m and threatened flags held only on the Species tab. Add the `Reconciliation` tab and one TTC pivot. This is a few hours' work, can be run by WRT after Tech Lab leaves, and replaces about 1,900 typed cells.
3. **Before designing any TTC export,** get TTC's real fields and ask the four questions in section 5.

**Verdict: Level A**, with a small Level B dependency (stable site and species IDs and a one-off import, shared with other workflows). **Level C is not justified for reporting.** The two things TTC may still need, coordinates and photos, are data-capture problems for GIS (Project 2) and a field routine, not for a bespoke app. Revisit only if TTC demands an API or rigid upload that a Sheets CSV cannot meet.
