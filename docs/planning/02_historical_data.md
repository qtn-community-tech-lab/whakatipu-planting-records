# 02 — Historical data: what can become a clean dataset WRT can browse

S2, historical data analyst, 3 Oct 2026. Sources read-only; every count comes from a re-runnable script (section 7).

Assumptions (from the brief): the Google Sheets are the live records and match the export; WRT keeps using Sheets for weekly entry; nothing historical is edited in place; planting areas are a future concept; seed-source locations stay out of any shared dataset until WRT decides who may see them. No place names of seed sources or personal names appear here; staff first names found in headers are written `[name]`.

## 1. Verdicts

| Dataset | Recommendation | Level | Volume produced | Manual-review share | Reason |
|---|---|---|---|---|---|
| Planting history (`Plants Out Master › MASTER`) | **NORMALISE NOW** | B | 5,448 records, 140,068 plants, 23 seasons | 14.3% of records need a ruling; 4.2% more fixed by a rule WRT confirms once | Large, complete, reconciles to its own totals, unbrowsable as a wide matrix |
| Stocktakes: March V150 series 2023–26 and three whole-nursery counts Oct 2024–May 2025 | **NORMALISE LATER** | B | 7 events, about 550 cells | about 15% (species rulings); readiness flagged inferred | Comparable enough to show the production loop; not needed for release one |
| Stocktakes: other 16 events | **KEEP SEARCHABLE AS ARCHIVE** | A | 23-row index | n/a | Readiness, containers and nurseries cannot be aligned |
| Potting on 2023-24 to 2025-26 (2022-23 at month grain) | **NORMALISE LATER** | B | 152 sessions, 509 cells | 16% of sessions lack an exact date (nearly all 2022-23) | Cheap, rule-based, modest answer |
| Potting `Summary` and `Annual` sheets | **DO NOT MIGRATE** | n/a | none | n/a | Derived, over-typed; rebuild from sessions |
| Allocation quantities (Spring 2025, Autumn 2026, Spring 2026; 2022–25 PDFs) | **DO NOT MIGRATE** | n/a | none | n/a | Spring 2025 is a 100% copy of Plants Out, Autumn 2026 about two-thirds; Spring 2026 is current work |
| Allocation planting dates | **NORMALISE LATER** (by hand) | A | about 42 values | 100% manual, tiny | Only thing allocations hold that Plants Out lacks |
| Allocation PDFs 2022–25 | **KEEP SEARCHABLE AS ARCHIVE** | A | 46 files | n/a | Plans, not records; 40 do parse if ever wanted |
| Seed and cutting logs, non-sensitive columns | **NORMALISE LATER** | B | 792 seed lots, 524 cutting batches | 21% seed, 25% cuttings (species) | Value for collection planning, none for release one |
| Seed and cutting results register | **KEEP SEARCHABLE AS ARCHIVE** | A | none | n/a | No row ID; 84–93% joinable |
| Seed-source, collection-place and comment columns | **DO NOT MIGRATE** | n/a | none | n/a | Sensitive; blocked by decision 6 |

Level: A fix or index current Sheets; B clean canonical data plus hybrid; C purpose-built software. Nothing here needs Level C to hold history.

## 2. Planting history

### 2.1 Can MASTER become the requested rows?

Yes, for quantities. Script `scripts/history_count.py` (openpyxl read-only; `--emit PATH` writes the long CSV elsewhere); output `history_count_output.txt`.

**Structure** (`MASTER › G1:PZ107`): 23 season blocks (Autumn 2015 to Autumn 2026, no Spring 2026); 386 site columns and 23 TOTAL columns (409 header cells, as `04f` §6.5); 99 species rows (98 numbered at rows 8–105, plus an unnumbered "Cyathoides juniperina" at row 106, below the `SUM` range). Spring 2020 is one block split by a blank spacer column; a parser keyed on contiguous labels loses it.

**Records**: **5,448** non-zero species × site × season cells. 397 explicit zeros are dropped. One text cell (`TBC ` at `OP50`) sits beside a 19 at `OP106`; probably one entry (confidence: medium). No negatives or decimals; one typed sum (`=5+7`).

| Check | Result |
|---|---|
| Records per season against each TOTAL column | 23 of 23 equal (rows 8–106) |
| Spring 2025 | 6,248 against block header 6,229: the 19 is row 106 |
| All records | 140,068 plants |
| `PY107` | 140,049: records minus the same 19 |
| `SUMMARY SITES › BC3` | 139,948 (120 below) |
| `SUMMARY PLANTS › AW3` | 135,413; excludes 2026 (records without 2026: 135,512) |

So the two lower totals are other sheets that drifted, not subsets of MASTER. WRT still chooses a trusted total (decision 4). Yearly totals agree with `04d` §7 (2024: 621 records, 43,483 plants). Two columns, Slope Hill HGF (22 records, 22,000 plants) and Coronation (16, 7,000), are 0.7% of records and 20.7% of plants.

### 2.2 Mapping: automatic against review

**Site headers** (`04d_sites_variants.csv`; key = lower case, punctuation removed, which reproduces 399 of 400 CSV keys). Of 360 non-zero columns (386 with zero-only):

| Route | Columns | Records | Share |
|---|---|---|---|
| Automatic, row-5 ID agrees | 268 | 4,377 | 80.3% |
| Automatic, ID blank in sheet | 48 | 531 | 9.7% |
| Automatic, Autumn 2015 (old numbering) | 8 | 81 | 1.5% |
| **Automatic total** | **324 (90%)** | **4,989** | **91.6%** |
| Documented rule, confirm once: nine Shotover River headers with a first name appended (strip it; ID 28A/28B); nine ID faults already in `04d` §3.2 (13C/11 swap, `!!A`, 9E/9F, 13A/13D) | 18 | 228 | 4.2% |
| New sites never given an ID (Preschool, Paererewa, Little Difference) | 3 | 45 | 0.8% |
| Paper4Trees scheme columns (not a place) | 11 | 160 | 2.9% |
| Human decision (one 2015 header, two "1 Mile", one Gorge Road) | 4 | 26 | 0.5% |

The 360 columns collapse to 75 proposed sites. 67 non-zero columns have no row-5 ID, so key on the mapped site and keep the typed ID as `site_id_as_typed`.

**Species** (`04a_species_variants.csv`): of 99 rows, 84 map automatically (4,883 records, 89.6%); 15 are flagged (565 records, 10.4%). All 15 are exact MASTER strings whose proposed group is *contested* (Carex maorica versus secta, the Ozothamnus trio, Melicope versus Raukaua simplex, Sophora, and so on): about 11 merge-or-split rulings, not unreadable names. The two duplicate pairs (Leonohebe/Veronica cupressoides, rows 51 and 99; Leptecophylla/Cyathoides, rows 50 and 106) merge with **zero** collisions, since no cell is filled in both rows. 94 of 99 rows have records.

**Confidence rule** (per record): high = site automatic, ID agrees, species automatic and unmerged; medium = site automatic but ID blank or 2015, species merged or awaiting ruling, or site fixed by rule; low = site uncertain, not found, or scheme. Result: **high 3,859 (70.8%)**, medium 1,403 (25.8%), low 186 (3.4%); by plants 56.9%, 41.9%, 1.2%.

**Needing a human ruling**: 779 records (14.3%): 565 species-only, 231 site-only, some overlap. In decisions that is about 11 species rulings, 4 headers, 3 new site IDs, one Paper4Trees policy, one confirmation of the 18 rule columns, and whether the two 2024 Slope Hill columns are real plantings: roughly 40 decisions, a few hours with the nursery manager, not 779 edits.

### 2.3 Kept, dropped, left empty

Kept: season, year, mapped site, mapped species, quantity, source cell (`MASTER!MU80`), plus original header and species strings. Dropped as derived or empty: TOTAL columns, grand total, zeros, spacer columns; row 3 groups (derivable) and row 6 landowner organisation (keep as a site attribute; blank 2024–26). Left empty rather than invented: planting date, event type, planting area, volunteer count, coordinates.

Add `quantity_basis = "as recorded; planted or allocated, unconfirmed"` (Spring 2025 allocation is a column-for-column copy, section 5); decision 3 settles it.

### 2.4 Value and recommendation

Whitechapel alone has about 580 records and 27,000 plants over 22 seasons (235 in Autumn 2015, 2,156 in Autumn 2024; confidence: medium on the site match): the baseline for the forecast end-to-end test and any funder total. **NORMALISE NOW at Level B**: generate the long CSV, publish it read-only as "Planting history (clean)", keep the workbook as archive. Skip the derived summary and Trees That Count sheets.

## 3. Historic stocktakes

`04e` §2.1 lists 26 dated items; three are not counts (blank form, form-only, an update stamp), leaving **23 events**, three surviving only as text-layer PDFs. `scripts/stocktake_count.py` finds roughly 1,600 non-zero count cells in the 18 spreadsheet sources (layout heuristic, ±10%). Four layouts plus the separate March V150 series: 2018–20 pot sizes, PB3, V150/35F; 2020–23 North/South with V150/35F, T28, PB3; 2024–25 South/North × large/small; 2026 Stage 2/3/4 with T28 columns, overwritten in place.

| Question | Answer |
|---|---|
| Ready stock over time? | **Not before late 2023.** No earlier sheet separates ready from growing PB3 (Oct 2020 age bands are a rough proxy). Later figures read 9,608 (Feb 2024, "Ready incl T28"), 6,885 (Feb 2025, large only, excluding 1,763 V150/T28), 4,634 (May 2025, excluding 1,362), 5,390 (Feb 2026), 5,706 (May 2026, Stage 4 incl. T28). The fall is mostly definition. |
| Nursery trend? | No. Totals run 5,009 to 12,757 because different containers were counted on different dates (V150 absent Oct 2023). |
| V150 and T28? | From 2025 T28 sits *inside* the V150 count (Carex secta 467 = 420 T28 + 47 V150); the 2026 master lists T28 separately, so combining them double counts (`04e` §2.3). Before 2025 T28 is unrecorded in the March series. |
| Dates? | Trust the in-sheet header, not file name or save date (2025 tabs still read "Oct 24"). |
| Species? | 91–104 rows per list, 141 distinct strings; 83–86% map automatically per list, the rest are section 2's rulings. |

**Subset and grain**: `date × species × container_state × nursery (optional) × quantity × basis_flag`, with state in {V150-incl-T28, T28, PB3-ready, PB3-growing, PB3-unspecified}.
- **March V150 series** (31 Mar 2023, 27 Mar 2024, 31 Mar 2025, 31 Mar 2026): about 250 cells. Shows stock, pricked out and target together, WRT's loop; pricked-out and target are events and targets, so they belong with the production-target dataset. Four points per species cannot give a loss rate (`04e` §5.3 leaves 3,000–4,100 plants a year unexplained; low confidence).
- **Whole-nursery counts** 18 Oct 2024, 19 Feb 2025, 28 May 2025: about 300 cells, `readiness = inferred (large = ready)`, resting on one cell note.
- Excluded: Feb 2022 (text values like "360+", bench codes); the 2026 master (current stock).

**Recommendation**: these seven events **NORMALISE LATER** (Level B), once the Stage 2/3/4 snapshot model is tested on live data. The other sixteen **KEEP SEARCHABLE AS ARCHIVE**, with a 23-row index (date, file, layout, what was counted, reliability): minutes of work that answers "did we ever count this?" without pretending the figures line up.

## 4. Potting history

Script `scripts/potting_count.py`. A session is a dated month-sheet column; a cell is a non-zero species × session value.

| Year | Sessions | Cells | Plants (month sheets) | Summary shows | Months differing |
|---|---|---|---|---|---|
| 2022-23 | 22 | 80 | 7,664 | 6,333 | 4 of 11 |
| 2023-24 | 41 | 130 | 8,012 | 8,012 | 0 |
| 2024-25 | 49 | 150 | 8,800 | 8,800 | 0 |
| 2025-26 | 40 | 149 | 7,710 | 7,710 | 0 |
| **Four years** | **152** | **509** | **32,186** | | |
| 2026-27 so far (current) | 5 | 20 | 1,148 | | |

**Over-typing is narrower than Phase 1 implied.** Month cells on `Summary` are formulas in 2023-24 to 2025-26. The typing sits elsewhere: 2022-23 has 4 of 11 monthly totals disagreeing with the month sheets (September 579 against 1,158; March 1,245 against 2,490); 2025-26 "Total to be potted on" is typed in 71 of 95 filled rows (DATA_SHAPE §3 counted 73 of 100); in 2026-27 the August column holds typed zeros (97 of 196 filled month cells). Month sheets are consistent: rebuild Summary and Annual from sessions.

**Dates are recoverable by rule**: take the sheet's month and the production year (August to July), ignore the typed year, undo day/month swaps, accept dotted text (`5.2.25`). Wednesday volunteer mornings validate it: 2023-24, 38 of 41 columns dated (31 Wednesdays); 2024-25, 48 of 49 (40); 2025-26, 39 of 40 (37); 2026-27, 5 of 5. 2022-23 is month grain only: 19 of 22 columns are "Wk 1…Wk 5".

**Value**: the only event-level production data, but about 130 cells a year. Potting totals (7.7–8.8k) trail V150 outflow by 3,000–4,100 plants, so sessions cannot explain losses; they show pace and mix, useful for planning volunteer days.

**Recommendation: NORMALISE LATER (B)** for 2023-24 to 2025-26 at session grain and 2022-23 at month grain, with `date_precision`. Start 2026-27 clean in the new log; do not back-fill it from the workbook. Review share: 24 of 152 sessions (16%) lack an exact date, 19 in 2022-23. Summary and Annual: **DO NOT MIGRATE**.

## 5. Historical allocations

Scripts `allocation_count.py` and `allocation_pdf_count.py`. Comparison is by column content (species → quantity), so it needs no site-name mapping.

| Source | Non-zero cells | Plants | Against Plants Out |
|---|---|---|---|
| Spring 2025 master | 174 (9 site columns) | 6,248 | **Identical**: 9 of 9 columns, 174 of 174 cells |
| Autumn 2026 master | 222 (14 columns) | 4,294 | 9 of 14 columns identical (143 of 222 cells; 2,851 plants), 1 near, 4 without counterpart; Plants Out has 202 cells, 4,556 plants |
| Spring 2026 plan | 312 (22 columns) | 8,829 | No Plants Out block yet; in progress |
| 2022–25 PDFs | 589 records, 40 lists | 15,382 | Plans, not copies |

**The 98/98 duplication is exact for Spring 2025 and about two-thirds for Autumn 2026.** The Autumn 2026 differences (typed subtractions such as `=275-63`, Whitechapel split into areas) are plan-versus-recorded gaps, too few to be a dataset.

**PDFs**: 46 with a text layer (Spring 2022 13; Autumn 2023 14; Autumn 2024 2; Spring 2024 14; Autumn 2025 3). 40 are per-site lists and the parsed sum equals the printed total in 40 of 40; one collates several sites (needs a page split); five are schedules or a wide master. Only 15 of 40 titles match the variants table, and 6 of those 15 equal the Plants Out column. At season level they differ (Spring 2022 5,481 against 5,014; Autumn 2023 4,551 against 4,886; Spring 2024 4,890 against 7,826 without the Slope Hill pair), so they are plans. 17 of 40 carry a typed planting date.

**New information**: planting and collection dates by site, about 25 pairs in the 2025–26 workbooks (`04d` §6; many are stale defaults such as 1–2 May 2026) and the 17 dated PDFs, about 42 values. Type them in by hand as an optional attribute, low confidence where a default repeats.

**Recommendation**: quantities **DO NOT MIGRATE** (double counting); PDFs **KEEP SEARCHABLE AS ARCHIVE**; dates **NORMALISE LATER** by hand (A). Current Autumn and Spring 2026 allocation belongs to the live-process reports.

## 6. Seed and cutting history

Script `scripts/seed_count.py`; it never reads the Site/Source column or comment text.

| Non-sensitive field | Seed log (792 tagged rows) | Cuttings log (524) |
|---|---|---|
| Species maps automatically | 79%; 15% contested; 6% not found | 75%; 19% contested; 6% not found |
| Collection date a real date | 727 (92%); 38 text, 27 blank | not recorded |
| Sown or set date real | 757 (96%) | 522 (100%) |
| Amount | 593 volume text ("1 tsp"), 41 integers, 98 blank | 478 integers, 39 text |
| Pricked date or count present | 562 (71%) | 427 (81%) |
| Container a known code | 437; 343 blank | 223; 124 blank, 177 legacy |

**What it can answer**: seed germination is **not computable** (amounts are volumes). Cutting strike rate is: 363 rows with both counts show 10,604 of 19,607 surviving (54%). Collection timing is the prize: 576 lots have an automatic species and plausible date; 53 species have three or more lots; 67% of collections fall January to March, a clean pattern suggesting the dates are mostly sound. None of it serves release one, which needs *current* batches.

**Tag-era rule.** Tag alone is unique for only 152 of 792 seed rows (S1–S321 appear before and after the March 2022 restart). Rule: **lot key = tag + era**, era A = first-use date (sown, else collected) before 1 March 2022, era B on or after; date-coded tags (`S2091`, `S210101`; 135 seed, 121 cutting rows) are self-dating. Normalise tag text first (`S 89` to `S89`, strip trailing words, backticks, commas). Result: 773 of 792 seed lots unique (97.6%), 8 duplicated (typo repeats such as `S155`, `S275`), 11 undated; cuttings 507 of 524 (96.8%), 15 duplicated, 2 undated. For the new log mint an internal lot ID and keep the tag as a label; use the rule only to import.

**Recommendation**: non-sensitive columns **NORMALISE LATER (B)**, eras 2 and 3 first (the living log: 457 seed, 188 cutting rows), era 1 optional; manual share 21% and 25% on species, about 8% on collection date, amount kept as text. Site/Source and comment columns **DO NOT MIGRATE** until decision 6; if wanted later, a separate restricted table keyed on lot. Results register **KEEP SEARCHABLE AS ARCHIVE** (tag plus sown date joins 84% of seed and 93% of cutting rows, `04f` §7.1).

## 7. Order of work, gates, scripts

1. Species and site rulings (about 40 decisions), then the planting history load; this also yields the species and site registers everything else needs.
2. Current production (2026-27 potting, Stage 2/3/4 stock) goes in clean; history follows only where a schema exists to receive it.
3. Stocktake subset, potting sessions, seed and cutting lots in batches afterwards; allocation dates by hand whenever convenient.

Gating decisions: 3 (planted or allocated), 4 (trusted total, Slope Hill), 5 (site IDs), 6 (seed locations), 7 (day/month). None blocks section 2 beyond its flags.

Confidence: high on all counts (scripted); medium on the confidence tiers (my rule, tunable at the top of `history_count.py`); low on the unexplained-loss figure and `readiness = inferred`.

Scripts, each with a `*_output.txt`, in `/home/claude/planning/scripts/`: `history_count.py`, `potting_count.py`, `stocktake_count.py`, `allocation_count.py`, `allocation_pdf_count.py`, `seed_count.py`.
