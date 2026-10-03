# 07: Migration plan (S7, Phase 2)

Question: how does fifteen years of planting history, plus today's stock, targets and potting, move into clean data without touching the originals? Assumptions as the brief: the Google Sheets are live and match the export; WRT keeps typing weekly in Sheets; nothing historical is edited in place; seed-source locations stay out. Roles, not names. Evidence: `02` §2, `04a` §2, `01f` §5, `04e` §3, Phase 1 `04d` §3. **Level B** (clean canonical data beside the Sheets); nothing here needs Level C.

I built the history step, not only described it. `scripts/build_history_prototype.py` read `MASTER` read-only and wrote `prototype/planting_history.csv` (5,449 rows), `site_crosswalk.csv` and `history_reconciliation.csv`. `scripts/history_queries.py` answers WRT's questions from that table (`prototype/history_queries_output.md`). Run output: `scripts/build_history_prototype_output.txt`.

## 1. The six steps at a glance

| Step | Automated | Manual review | Basis |
|---|---|---|---|
| 1. Preserve raw source | about 80% | about 20% | Checksums, manifest and verification are scripted; copying the ten live Sheets is by hand unless Drive access is given (confidence: medium) |
| 2. Canonical mapping tables | about 85% | about 15% | 88 of 99 `MASTER` species rows clear; 97 of 115 header texts clear (measured) |
| 3. Historical planting import | **87.8% of rows** | **12.2% of rows** (8.8% a ruling, 3.5% confirm once) | Measured. About 23 decisions, not 667 row edits |
| 4. Current operational baseline | about 85% | about 15% | Estimate: same species-name share as the stocktake lists (`02` §3); one date ruling (confidence: low) |
| 5. Validation | 100% of checks | one page read per run | Measured: 8 self-checks pass |
| 6. User-facing views | about 90% | about 10% | Views are formulas; someone chooses layouts and checks once (confidence: medium) |

By plants the history split is different: 68.4% unflagged, 31.6% flagged, because two 2024 Slope Hill columns (29,000 plants) await decision 4.

## 2. The steps

### Step 1: preserve the raw source

- Folder `Snapshots YYYY-MM` (the one in `04e` Stage 0), one dated subfolder per run, viewer access only. Original file name plus `__YYYY-MM-DD`. Never opened for editing, never overwritten.
- `manifest.csv` per snapshot: file, sheet names, bytes, sha256, snapshot date, live link. The import scripts read the snapshot, never the live Sheet, and print the checksum first. Same checksum as last run means nothing changed; a different one means a new diff report (step 5).
- Take a new snapshot before each import and before any ruling is applied. Rulings change the mapping tables, not the snapshot.
- The prototype's source: 460,012 bytes, sha256 `2df0e137…4033`, unchanged across runs.
- Seed and cutting logs are snapshotted into a restricted folder only (decision 6).

### Step 2: canonical mapping tables

- **Species** (`04a`): `Aliases` seeded from `species_crosswalk.csv` (728 strings to 164 IDs; 614 rows need no ruling). Matching is on a normalised key; abbreviations are import-only; contested pairs keep two IDs with no merge. All 99 `MASTER` strings are exact crosswalk rows; 11 are contested, which is seven rulings (C1 Leptecophylla/Cyathoides, C2 cupressoides, C3 Carex, C5 Ozothamnus, C6 Carmichaelia, C7 Olearia, C8 Veronica hectorii).
- **Sites**: `site_crosswalk.csv` maps masked header text × typed ID to a proposed site (134 rows). 76 IDs: 64 from the register and 12 provisional `NEW-` IDs for sites that never had a number (the Sites master replaces them). 39 groups, taken from the number (9A to 9H are Lake Hayes). The typed ID is kept as `site_id_as_typed`, never used alone as a key. The nine Autumn 2015 old numbers and the five known ID faults (`04d` §3.2) are tables, not edits. Class (K/C/S) disagreements stay on the Sites list, not on each row.
- **Names**: a header not in the Phase 1 table is treated as carrying a personal name and written `[name]` (a known stem is kept: `SHOTOVER RIVER [name]`). The unmasked text is written nowhere.
- **Seasons and dates**: a label is `Autumn|Spring` plus year, any case. Spring is September to November and Autumn March to May. `Springburn` is a supplier; `Winter`/`Summer` are stocktake moments. Production year (August to July) is computed from a date. Store the chain offset (sown Y-3, pricked (Y-2)/(Y-1), potted (Y-1)/Y), not one year. Potting dates: take the sheet's month and the production year, ignore the typed year, undo day/month swaps (`04f` §4 and §6).
- **Tag-era rule** (seed and cutting lots, not needed for planting history): lot key = normalised tag plus era. Era A is first use (sown, else collected) before 1 March 2022; era B is on or after. Date-coded tags are self-dating. That makes 773 of 792 seed lots unique (97.6%) and 507 of 524 cutting batches (`02` §6). The new log mints its own lot ID and keeps the tag as a label.

### Step 3: historical planting import

One row per non-zero species × site-column × season cell. Kept on every row: `species_original`, `site_original` (line breaks shown as `\n`), `season_label_original`, `source_file`, `source_sheet`, `source_cell` (`MASTER!MU80`), plus `confidence`, `precision` (site, subsite, area, scheme, unknown) and `needs_review` with a `review_reason`.

- Zero and blank cells are skipped (397 zeros). One text cell (`TBC`, `OP50`) is kept as an exception row with no quantity.
- Nothing is merged, corrected or invented. No planting date, event type or area is set. A site that cannot be placed leaves `site_id_proposed` blank (177 rows: 160 Paper4Trees, 17 Shotover River with no parcel ID).
- Reasons carry a kind. **RULING**: a person decides. **CONFIRM**: a documented rule was applied; WRT confirms once. **FYI**: information only (blank row-5 ID, old numbering, typed sum). Only the first two set `needs_review = Y`.
- Rulings are entered as mapping rows (with date and role), then the script re-runs. Quantities never change on a re-run; if they do, step 5 fails the run.
- `quantity_basis` ("as recorded; planted or allocated unconfirmed", decision 3) is one constant on the published table. From Spring 2026, rows come from `planted_qty` on the allocation, not from `MASTER`.

### Step 4: current operational baseline

Entered once, dated, then append-only. Not back-filled from older books.

- **Stock snapshot** (`Autumn 2026 Master Stocktake`, about 200 non-zero cells): Stage 2 V150 and T28 (columns D, E) dated 31 March 2026; Stage 3 PB3 growing and T28 (F, G) 28 April; Stage 4 PB3 ready and T28 (H, I) 13 May. F and H carry an "Updated 12/08" stamp over earlier values, so those rows import with date 12 August 2026, `date_nominal`, the stamp in the note (`01d`; the nursery manager confirms). V150 and T28 are separate states, never summed (the March file includes T28 inside V150).
- **2026/27 production targets**: pricking-out targets (55 species, 51 whole tray multiples) and the potting Goal Set (50 goals, 47 equal to the March V150 count). Loaded as typed values with their source cell; a target marked `?` stays blank and flagged.
- **2026/27 potting**: 5 sessions, 20 lines, 1,148 plants (August and September 2026), dated by the month-and-production-year rule. The August "0" typed on `Summary` hides 139 plants, so the log, not `Summary`, is the record.
- Not migrated: `Summary`, `Annual`, allocation quantities (`02` §1).

### Step 5: validation

Every script prints, before it writes anything:
1. source checksum and size;
2. counts: cells read, zeros skipped, rows written, exception rows;
3. sums per season against the stated `TOTAL` column, and the grand total against every other stated total, each difference with its cause (§3);
4. self-checks: every numeric cell appears once (independent matrix sum), `record_id` unique, every blank ID has `needs_review = Y`, every flag has a reason, each species row equals its all-time cell (99 of 99), no unmasked header text;
5. a **diff report** against the previous run by `record_id`: added, removed, changed. After a ruling only `*_id_proposed`, flags and confidence may change.

Never clean silently: a change is a flag with a reason, unmatched text goes to an `Unmapped` list and is never dropped, and a difference is shown, not absorbed. Any failed check stops the run.

### Step 6: user-facing views

Read-only `Planting history (clean)` Sheet, then three views that need no old workbook. The Python in `history_queries.py` is the tested equivalent. The Sheets formulas below are untested (confidence: medium).

| Question | View | Answer from the prototype |
|---|---|---|
| What did we plant at Whitechapel in 2019? | Pick site name and year; `=QUERY(view!A:T,"select K, sum(L) where F='"&B1&"' and B="&B2&" group by K",1)` | 32 species, 2,105 plants (Autumn 1,005, Spring 1,100); 136 plants on flagged rows |
| How many mānuka? | Pick common name; `SUMIFS` on the species ID looked up from the Species list | 2,182 plants in 109 rows, 2015 to 2026; 148 flagged |
| What was planted in Autumn 2024? | Pick season; `QUERY` grouped by site | 16 site columns, 13,657 plants; 7,296 on flagged rows (7,000 of it Slope Hill Coronation) |

The view tab adds the site name by lookup on the ID; staff see names, never IDs. A running total by year and a season table come from the same data (`history_queries_output.md` (b), (d)). A public filterable page is Looker Studio on the same table, and only if WRT wants one.

## 3. Prototype results

### Reconciliation: rows against the workbook's own totals

Rows 8 to 106, 5,448 numeric records. Each cell is generated plants; it equals the `MASTER` `TOTAL` column (row 107) in all 23 seasons, difference 0.

| Year | Autumn | Spring |
|---|---:|---:|
| 2015 | 2,068 | 3,483 |
| 2016 | 3,176 | 4,331 |
| 2017 | 4,516 | 4,667 |
| 2018 | 4,589 | 3,458 |
| 2019 | 5,078 | 5,400 |
| 2020 | 996 | 7,572 |
| 2021 | 5,133 | 5,356 |
| 2022 | 5,869 | 5,014 |
| 2023 | 4,886 | 5,720 |
| 2024 | 13,657 | 29,826 |
| 2025 | 4,469 | 6,248 |
| 2026 | 4,556 | not yet |

| Total | Stated | Rows 140,068 minus stated | Cause |
|---|---:|---:|---|
| `PY107` (grand total) | 140,049 | +19 | `SUM(PY4:PY105)` stops before row 106 (*Cyathoides juniperina*, 19 plants, Spring 2025). The Spring 2025 `TOTAL` does include it. |
| `PY8:PY106` summed | 140,068 | 0 | Per-species totals include row 106. |
| `SUMMARY SITES` `BC3` | 139,948 | +120 | The 2025 per-site cells add to 10,597, not the 10,717 the site cells give (`01f` §5). |
| `SUMMARY PLANTS` `AW4` | 135,413 | +4,655 | Autumn 2026 not added (4,556), Autumn 2025 typed 4,389 not 4,469 (80), one row outside its sum (19). |
| `PZ107` | 137,273 | +2,795 | A typed adjustment (`=SUM(PZ105+1772)` over typed `=6237+129264`); not a total of the counts. |
| Text cell `OP50` | n/a | 1 row, no quantity | `TBC` on the Leptecophylla row, beside 19 on the Cyathoides row, same site and season: the contested pair C1 in one cell pair. |

The grand total is a sum of recorded rows, not WRT's answer; decision 4 still chooses which total to publish.

### Review share (5,449 rows)

| Outcome | Rows | Share | Plants | Share |
|---|---:|---:|---:|---:|
| Automatic (`needs_review = N`) | 4,782 | 87.8% | 95,778 | 68.4% |
| Ruling needed | 477 | 8.8% | 37,049 | 26.5% |
| Rule applied, confirm once | 190 | 3.5% | 7,241 | 5.2% |

Confidence: high 4,207 (77.2%), medium 1,055 (19.4%), low 187 (3.4%). Causes of rulings (rows may carry more than one): contested species 203 rows (3.7%); Paper4Trees columns 160 (2.9%); unclear header, new site or ID conflict 88 (1.6%); 2024 Slope Hill pair 38 (0.7%, 29,000 plants); text cell 1. Decisions behind them: 7 species, 10 site, scheme or quantity items, 6 confirmations.

**Against `02`** (779 rows needing a ruling, 14.3%): species rulings fall from 565 rows to 203, because the S4A crosswalk flags 11 contested `MASTER` rows where Phase 1 grouping flagged 15 (the rest are alias-level contests in other files). Added: the 38 Slope Hill rows. Confirm-once is 190 against 228 because 17 Shotover River rows now need a parcel ruling instead. Proposed sites are 76 against 75 because Shotover River's two parcels count separately.

## 4. Limits and what WRT must decide

- Decisions 3 (planted or allocated; Spring 2025 is a copy of the allocation), 4 (trusted total; Slope Hill) and 5 (site IDs) change published numbers, not the load. The table carries the flags until they are ruled.
- Site precision is read from the header and ID shape (confidence: medium); no area exists before Autumn 2026.
- The 12 provisional `NEW-` IDs and 39 groups are proposals for the Sites master.
- Step 4 shares are estimates from other measured lists, not run on the 2026/27 files.
- Not tested: Sheets formulas, Drive-access snapshotting.
