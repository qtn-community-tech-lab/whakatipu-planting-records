# 06 Verification (S6 Sceptic / Verifier)

Read-only checks against the source workbooks in `/home/claude/_source_copy/_ALL Plant Lists/`. Cached values and formulas were both opened with openpyxl. British English; no seed-source values, coordinates or personal names appear below.

## 1. Method

**Candidate list (20 claims).** Written down before choosing.

| ID | Claim | Source of claim |
|---|---|---|
| C01 | Core master list is 98 rows; one species entered twice, so 97 after merging | 04a section 4 |
| C02 | Docx list has 97 rows; ladder to 93 and 92; 9 core species missing, 4 extra | 04a section 4 |
| C03 | 8,937 tray-code cells in the seed-results species column | 04a |
| C04 | Coprosma propinqua hop-by-hop trace | 04c section 7 |
| C05 | 2026/27 forecast roll-up empty; AK34 = 20; SUMMARY is #REF! because SCHOOLS is missing | 04c, B01, B02 |
| C06 | T28 species list (four consistent, one in practice) | 04b section 3 |
| C07 | Stage 3 T28 column holds three species (298, 156, 140) | 04b |
| C08 | No WH-06-style area codes anywhere | 04d section 3.3 |
| C09 | Location precision by year (site, sub-site, area) | 04d section 7.1 |
| C10 | Plants Out totals 139,948 and Keystone 110,343; class table | 04d sections 1 and 9 |
| C11 | Stock is a snapshot, not a running tally | 04e section 3 |
| C12 | Stocktake date table, 26 rows | 04e section 2.1 |
| C13 | 44 of 50 potting-on headers have day and month swapped | 04f |
| C14 | 15 of 24 real-date cells in the 2026 seed-collecting record are later than the file's own "updated 15 May 26" | 04f |
| C15 | Stage 4 sheet differs from Master for 34 of 59 species | B16 scout |
| C16 | Plants Out grand totals 140,049 / 139,948 / 135,413 | B23, 04e, 04g |
| C17 | SUMMARY #REF! and missing SCHOOLS sheet | B01, B02 |
| C18 | Spring 2026 allocation columns E:J are typed copies of Master; totals 10,589, 5,872 vs 5,706 | 04e section 4 |
| C19 | Pricking-out 2025/26 columns A and B list different species from about row 28 | 04b |
| C20 | Only four season columns in SUMMARY PLANTS link to MASTER (383 links) | 04g |

**Selection.** Python `random.seed(20261003)`. The task named eleven of the items as high-impact (C01, C02, C04, C06, C08, C09, C11, C12, C13, C15, C16), so these were given weight 2 and the rest weight 1. Ten were drawn in turn without replacement with `random.choices`.

**Result of the draw, in order:** C01, C18, C08, C04, C11, C12, C14, C10, C02, C15.

Not drawn: C03, C05, C06, C07, C13, C16, C17, C19, C20. C05, C16 and C17 were touched in passing while checking C04 and C10, and the results are in section 4.

## 2. Pass/fail table

| # | Claim | Source of claim | What was checked (file › sheet › range) | Result | Fix needed |
|---|---|---|---|---|---|
| C01 | Core list = 98 rows, 97 after merging the cupressoides pair | 04a section 4 | `Standard Annual Plant List … › Sheet1 › B4:B101` (98 non-blank, 98 distinct, totals row at B102, strays at B107:B108); `_JMN Plants Out Master › Master Plant List › D4:D101` (98); pricking-out 2026-27 Sheet1 A3:A101; forecast KEYSTONE SITES B7:B104 and SUMMARY B7:B104; Template B8:B102; Autumn 2026 C6:C119; Spring 2026 C6:C107; Stocktake CURRENT B5:B108; Potting On Summary B4:B103; Sheet2 B3:B100 | **PARTIAL** | Headline holds and 11 of 12 raw row counts reproduce. Three problems. (a) The earlier-list row is wrong: `Master plant list 2024 (4).xlsx › Sheet1` runs to B95, not B93 (Veronica propinqua and Weinmania racemosa sit at B94:B95), with one blank at B75, so raw rows = 91, not 90. The report's own arithmetic (98 − 9 + 2) gives 91. (b) The Standard list's B47 is spelt with a double "p", while Plants Out D47 has the single-p spelling. 12 strings differ between the two lists, so "same 98 rows" is true only after normalisation. (c) Minor: "pricking-out A3:A101" includes a TOTAL row at A100. Correct 04a section 4 and the "same rows" sentence. |
| C02 | Docx list: 97 rows, ladder 97→96→95→94→93→92; 9 core species absent, 4 extra, 88 shared | 04a section 4 | `Nursery plant names list.docx` table 1 (98 rows incl. header); rows 94 and 97 repeat rows 5 and 22; rows 37/93, 38/86, 45/98 as stated; set comparison with the Standard list after folding spelling variants | **PASS** | None required. Wording note: "after removing four re-entries it gives 93" counts two contested items (old name, site-tagged entry) as re-entries; say so. Confidence: high. |
| C04 | Coprosma propinqua trace (about 45 cells) | 04c section 7 | Neill D25:R25 (values and formulas); Flagship, forecast AC26:AI26; pricking-out 2023/24 to 2026/27 rows; Sheet2 C24:H24; V150 stocktakes 2025 and 2026 row 22; Potting On 2025/26 D25:R25 and 2026/27 D25:K25; Master Stocktake D26:J26; Spring 2026 allocation row 27; Autumn 2026 H27, M27; 2022/23 projections B20:E20 | **PARTIAL** | Every cell value and formula quoted reproduces exactly. The narrative at 7.2, third bullet, is wrong: it says plants pricked out in 2024/25 reached the ready bench "from 987 in V150 on 31/03/26". The 987 is the 2025/26 batch (header and 04c section 8 give the rule: potted 2026/27). The 478 potted (28/04/26) and 417 ready (13/05/26) come from the 2024/25 batch (1,104 counted March 2025, 1,039 potted 2025/26). Section 8's version is the correct one. Rewrite 7.2 bullet 3. |
| C08 | No planting-area codes of the WH-06 kind anywhere | 04d section 3.3 | Regex scan of every string cell in all 111 `.xlsx` files (source and converted): `^[A-Z]{2,3}-\d{1,3}[A-Z]?$` and `\b[A-Z]{2}-\d{2}\b`. Also read the Autumn 2026 allocation site tabs and the "Location" columns | **PASS** | None. Zero code-like hits. Site tabs: the "Location" columns (C, F, I from row 5) are empty on every tab that has them; the only values in those columns are the plant-count total at I40. (Not checked: PDFs and the two .docx images.) |
| C09 | Location precision by year: site everywhere, sub-site 2015 to 2023, area only 2026 | 04d section 7.1 | `MASTER › LY4:NH5` (2024), `PC4:PV4` (2026), `MS` (LH South infill = 0), `MG` (Coronation 7,000), `MU` (HGF 22,000), `PW` (2026 total 4,556); Autumn 2026 allocation `O4:AO4` | **PASS** | None. Note for clarity: `MASTER › PC4:PV4` shows one infill block and the Rowing Club; the three Whitechapel areas are in the allocation master `O4:Q4`, not MASTER. The evidence column cites both, which is fine but could say so. |
| C10 | 139,948 total; Keystone 110,343 = 78.8%; HGF 22,000 + Coronation 7,000 ≈ 21%; class table | 04d sections 1 and 9 | `SUMMARY SITES › BC3` (139,948), `BC84:BC86` (21,213 / 110,343 / 7,058), `BD4:BD82` row counts (K 18, C 48, S 8, blank 3), blank-class sum 1,334; MASTER `MG`, `MU` | **PASS** | None. Arithmetic is exact (29,000 / 139,948 = 20.7%). |
| C11 | Stock is a snapshot, not a running tally | 04e section 3 | `Rolling Stocktakes Feb 2024 › Sheet1` (E = D + C, B excluded; totals 3,311 / 9,608 / 439 / 10,047); `20 May 2025 › Oct 24 › C7:C8` (`=48+18-15`, `=41+47-15-5`; 20 subtraction formulas); `18 October 24 › D17` (`=41-10` plus a dated comment); `2024 prop stocktake › G30, G34, G70` notes; `Master Stocktake › F4` overwritten stamp; Autumn 2026 allocation `Notes › A21:B32` (running total 94,000 to 100,170) | **PASS** | Minor slips only. The multiplication-formula count is 10, not 9. "71 more since stocktake" is G34's text with "after", and G70 says "47 more since". Nothing found that adds flows to a stock balance. |
| C12 | Stocktake date table (26 rows) | 04e section 2.1 | Re-summed rows 1, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25 from source (column sums, typed totals, species counts); Feb 2026 list `D5:D88` | **PARTIAL** | Rows 15, 16, 18, 19, 20 and 23-25 reproduce, and row 1 was not re-summed (for example 18 Oct 2024: 557 / 2,841 / 2,341 / 105 / 137 / 5,009; Master stages 9,245 / 2,068 / 5,109 / 594 / 4,702 / 1,004; Rolling Feb 2024 totals). Three errors. (a) Row 21 (20 May 2025) gives the typed totals (1,362; 4,175; 10,092) although the section header says figures are column sums; the sums are 1,400; 4,201; 374; 459; 3,722 and total 10,118. Row 19 handles this correctly. (b) Row 22: the Stage 4 sheet has 60 species with a count and 99 names (`A5:H39`), not 59 and 98; the 5,390 total reproduces. (c) Row 22 "9,551 across 78 species" in the Feb 2026 list: 9,551 is right, but I count 62 species with stock above zero, 67 non-blank stock cells and 83 named rows. 78 is not reproducible. Fix rows 21 and 22. |
| C14 | 15 of 24 real-date cells in the 2026 seed-collecting record are later than the "updated 15 May 26" stamp | 04f section 2 | `4. Seed collecting record 2026 updated May 15 26 AA.xlsx › Sheet1 › B3:B75`: 24 datetime cells, 25 text dates (d/m/yy); 15 later than 15 May 2026; 22 of 24 have day ≤ 12 | **PASS** | None. Note the "stamp" is in the file name, not a cell. The Nov 2026 cell is also later than today, which strengthens the swap reading. Confidence: high. |
| C15 | Stage 4 sheet differs from Master H+I for 34 of 59 species | B16 scout (also 04e) | `_Stocktake Master CURRENT.xlsx › Stage 4 Stocktake Sheet › B,E,H rows 5-39` against `Autumn 2026 Master Stocktake › H+I` by species name | **PARTIAL** | I get 35 of 60 differ (25 equal). Same direction and scale, off by one on both numbers. The `#REF!` name at A21 has no count, so it is not the cause. Likely a species with a blank or zero Master value handled differently. Restate as "about 35 of 60" or document the rule. |
| C18 | Spring 2026 allocation E:J are typed copies of Master D:I, with match counts; totals 10,589; own ready 5,872 vs Master 5,706 | 04e section 4 | `_JMN Plant Allocations Spring 2026 › Plant Allocations › E6:O107, R6:R107, R108`; `Master Stocktake › D:I rows 5-108`; name-aligned comparison | **PASS** | None. Column sums (I 4,644, J 1,228, K 0, L 242, M 1,285, N 740, O 2,450), R total 10,589 (`R108 =SUM(R6:R105)`), I+J 5,872, Master H+I 5,706 and remainder 4,717 all reproduce. Match counts reproduce on a numeric-only comparison (V150 100/101). On a strict comparison V150 is 97/101, because three cells hold typed text such as "(416)". Say which rule was used. |

**Totals: 6 PASS, 4 PARTIAL, 0 FAIL.**

## 3. Leak scan

**Method.**
1. Seed and cutting Site strings were read from `2. Seed records MASTER.xlsx › Sheet1 › C4:C956` (798 populated) and `1. Cuttings records MASTER.xlsx › Sheet1 › C3:C538` (522 populated): 258 distinct normalised strings.
2. Planting-site vocabulary was removed: all `raw_string`, `normalised_key`, `proposed_site` and `proposed_area_or_subsite` values in `04d_sites_variants.csv`, plus every word in the two inventory CSVs.
3. Two match types were run, whole word, case-insensitive, length 4 or more: whole-value phrases (205 not in the vocabulary, 6+ characters) and 99 distinctive tokens, of which 46 generic words were dropped by hand, leaving 53.
4. Pattern scans: email, NZ phone, decimal latitude/longitude (44-46 S, 168-169 E), degree signs, seven-digit grid references, GPX tags, URLs.
5. Name scans: the surname that appears in two seed-record file names, and the redaction-list names that appear in `scripts/`. The GPX waypoints were not re-opened: the pattern scan for coordinates found nothing.
6. Scope: all 77 files under `/home/claude/discovery/` at the time of scanning, including `02_scouts/*.json`, `04*`, `05_*`, `live/progress.html` and `scripts/`. The scouts' sensitive-column `examples` arrays were checked separately (all empty).

**Results (file, line, type only).**

| Type | Files and lines | Assessment |
|---|---|---|
| Coordinates, emails, NZ phone numbers, URLs with data | None. Phone-shaped and grid-reference-shaped hits were file sizes, hash digits, "1048576" row limits and an invoice number inside a file name: `00_inventory.csv` 26, 48, 52, 64, 84, 102, 161; `00_sheets.csv` 35, 63, 212, 232; `04g_reporting.md` 146; `04e_stock_and_losses.md` 204; `04g_sensitivity_register.csv` 141, 173; `B24` 759; `B17` 6, 143, 194, 336 | False positives. URLs: `live/progress.html` 84 is a font stylesheet; `scripts/WRT_SUMMARY_LINKS.md` 7-17 are documentation links |
| Seed-source value (a lake name), not a planting site | `02_scouts/B24_funders_orders_docs.json` 91, 232, 378 | Genuine, low severity. Agrees with 04g |
| Seed-source value that is a supplier nursery name (two distinct names) | `02_scouts/B22_allocation_small_and_templates.json` 1; `02_scouts/B24_funders_orders_docs.json` 439, 496, 504, 572, 769; `04g_reporting.md` 32, 143, 145, 148, 225, 226; `04e_stock_and_losses.md` 14, 32, 201, 203, 212, 283 | Business names, not locations, low severity. But 04g and 04e themselves repeat them, so the statement in 04g section 4.3 that values are "not reproduced" is not accurate for these two |
| Seed-source and personal-name redaction list in code | `scripts/species_census.py` 272, 294 (first names, a surname, and two seed-source place words) | Genuine, medium: a list of the very strings to hide, in a shareable folder. 04g excluded `scripts/` from its scan |
| Personal surname, in the seed-record file names | `00_inventory.csv` 56, 62, 189; `00_sheets.csv` 108, 117, 118, 369; `01_batches.json` 285, 303, 345, 369, 385; `03_sheet_catalogue.csv` 100, 106, 107, 108, 115, 116; `04a_species_variants.csv` 178 lines; `02_scouts/B08_seed_cutting_masters.json` 162, 181, 182, 191; `02_scouts/B10_seed_records_archive.json` 9, 768, 772, 881, 918, 919, 922, 1415; `scripts/batch_B08…md` 8; `scripts/batch_B10…md` 2, 9; `scripts/WRT_SUMMARY_LINKS.md` 9; `scripts/lineage_check.py` 77 | A name inside a source file name, not a data value. Matches 04g's own finding; the register and 04g file themselves are clean |
| Personal name of a comment author | `scripts/lineage_check.py` 77 (name mask) | Low, code only |
| Seed-source tokens in `04a`, `04b`, `04c`, `04d`, `04f`, `04g_sensitivity_register.csv`, `live/progress.html`, `05_*` | None | Clean |

**Do I agree with 04g section 4?** Mostly yes. I independently reach the same conclusions on coordinates, emails, phones and URLs (none), on the lake note in B24 (one genuine low hit), and on the two supplier names being business names. I add three things: (1) 04g and 04e both reproduce the two supplier values, contrary to 04g's "values not reproduced"; (2) `scripts/` was out of 04g's scope and holds name and place redaction lists (`species_census.py`, `lineage_check.py`); (3) my surname hit count is lower than 04g's for `04a_species_variants.csv` (178 against 187) because 04g also counted a first-name token. I could not corroborate 04g's "28 lines in 04c" for the surname; 04c has none. Verdict: **no coordinates or contact details leaked; one low-severity seed-source value (B24) and two redaction lists in `scripts/` need action.**

## 4. Extra findings from incidental reads (outside the ten)

- **04c section 1 item 3 and section 4.2 (SUMMARY / roll-up).** The roll-up is described as "empty (one stray typed cell)" and, at line 78, as holding "only one typed species cell" for the horizon. `3 Year Plant Look Ahead (Keysto › AK` actually holds nine non-zero typed species cells and one zero (AK15, AK17, AK18, AK30, AK34, AK38, AK40, AK70, AK82, AK86), all in the Spring 2028 column. The same sentence says "10 typed cells in column AK", so the claim contradicts itself. Row 11 also holds typed site quotas (1,500 / 1,200) across L:BJ. The `#REF!` in SUMMARY C28 and the missing SCHOOLS sheet are confirmed (`SUMMARY › C28` is `='KEYSTONE SITES'!C28+'COMMUNITY GROUPS'!C25+SCHOOLS!C25`; the workbook has no SCHOOLS sheet). The 10-cell/"one cell" wording should be fixed.
- **Grand totals (C16).** `MASTER › PY107` 140,049, `SUMMARY SITES › BC3` 139,948 and `SUMMARY PLANTS › AW3` and `AW4` 135,413 all reproduce.

## 5. Fixes needed

| Owner | Output | Fix |
|---|---|---|
| S4a | `04a_species_census.md` section 4 | Correct the "Master plant list 2024" row: range B4:B95, raw rows 91, one blank at B75. Qualify "same 98 rows" (12 spelling or whitespace differences between Standard and Plants Out). Note the double-p spelling at Standard B47. Reword "four re-entries". |
| S4a | `04a_species_variants.csv` | Replace the file path that carries a personal surname with an inventory id (178 lines). |
| S4c | `04c_forecasting.md` 7.2 bullet 3 | Do not tie the 987 (31/03/26) to the 2024/25 batch; use the section 8 wording. |
| S4c | `04c_forecasting.md` line 13 and line 78 | Replace "one stray typed cell" and "only one typed species cell" with "only one season column (Spring 2028, column AK) holds typed species values: ten cells". |
| S4e | `04e_stock_and_losses.md` row 21 | Show column sums (1,400; 4,201; 374; 459; 3,722; total 10,118) or label typed totals as typed. |
| S4e | `04e_stock_and_losses.md` row 22 | 60 species with a count, 99 names; drop or re-derive "78 species". |
| S4e | `04e_stock_and_losses.md` section 4 (Spring 2026 match counts) | State that the V150 100/101 uses numeric cells only (strict match is 97/101). |
| S4e / S4g | `04e` and `04g_reporting.md` | Remove or generalise the two supplier-nursery names that equal seed Site values; correct 04g section 4.3 "values not reproduced". |
| Scout B16 | `02_scouts/B16_stocktake_current.json` (notes in B,E,H and quality issue) | "34 of 59" should read about 35 of 60, or document the exclusion rule. |
| Scout B24 | `02_scouts/B24_funders_orders_docs.json` lines 91, 232, 378 | Remove or generalise the quoted lake note. |
| Scouts B08 and B10, S1 catalogue | `02_scouts/B08…json`, `B10…json`, `00_inventory.csv`, `00_sheets.csv`, `01_batches.json`, `03_sheet_catalogue.csv` | Decide whether the surname in the two seed-record file names should be masked before sharing outside the team. |
| Pipeline | `scripts/species_census.py` 272, 294; `scripts/lineage_check.py` 77; `scripts/batch_B08…md`, `batch_B10…md`, `WRT_SUMMARY_LINKS.md` | Move the redaction lists out of the shared folder or exclude `scripts/` from anything shared. |

## 6. Verdict

**0 of 10 sampled claims failed outright; 4 of 10 are partly wrong (C01, C04, C12, C15) and need the corrections above. The leak scan found no coordinates or contact details, one low-severity seed-source value (B24), and redaction lists in `scripts/`.**
