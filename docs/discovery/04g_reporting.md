# 04g Reporting and sensitivity review

Specialist S4g, WRT data discovery. British English. Read-only: nothing in the source folder was changed.

Evidence is cited as `file › sheet › range`. Folder shorthand: "Plants Out Master" means `_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx`. Items I worked out myself rather than took from a scout are marked "(checked by script)". Inferences carry a `confidence` rating and a reason. No seed-source locations, coordinates, landowner names, personal names, emails or phone numbers appear in this report; where a file or sheet name itself holds a personal name I have replaced it with a placeholder such as `<name>`.

Companion file: `04g_sensitivity_register.csv` (174 rows, location and type only).

---

## 1. Summary for WRT staff

1. **Trees That Count (TTC) reporting is assembled by hand inside the Plants Out Master workbook.** Three sheets (`Trees that Count`, `Trees that Count Audit 2025`, `Trees that Count Audit 2025 Sit`) are copies of numbers from the `MASTER` sheet. Most of the figures are typed in, not linked. The headline TTC block (Jardine, Other, system total, remaining, requested) is typed and does not tie to the sheet's own column totals.
2. **TTC counts only trees that reach more than 5 m.** A "Y" flag marks those species. The flag is held in at least six places and they disagree: 49 species in the Plants Out Master, 50 in the stocktake and allocation masters, 39 in the 2025/26 pricking-out list.
3. **What TTC needs versus what the data holds.** Species counts by season: yes, but typed. Geolocated planting sites: no. There is no coordinates column and no polygon in any workbook (checked by script across every sheet header in the folder). Photos: no. There is no photo reference column and the only embedded images in the whole folder are two site-plan pictures in one Word file. The one GPX file (94 waypoints) records remnant kōwhai trees (a seed-source layer, inferred from its file name, low confidence), not planting sites.
4. **Paper4Trees is a plant-order scheme for schools and early-learning centres, not a reporting channel.** The 2025 and 2026 Excel forms in `Paper 4 Trees/` are blank templates. The actual orders are in PDFs that no scout read. The per-school split is held in PDFs and in cell comments, and the totals in the PDFs do not match the Paper4Trees column in the allocation masters.
5. **Sensitivity.** 174 register rows across 84 files. Seed and cutting source locations are the biggest exposure (36 rows, 32 files). Personal names turn up in many more places than the scouts first listed, including file names, sheet names, file properties and cell comments. A scan of every file under `discovery/` found no coordinates, emails or phone numbers. It found one coarse place name quoted in a scout file that matches a seed-source value (section 6).

---

## 2. Task A: what is assembled for funders and partners

### 2.1 Who receives what

| Recipient | What the data shows | Where | Confidence |
|---|---|---|---|
| Trees That Count | Plant counts by species and season, split by "tree over 5 m", with a Jardine Park carve-out and a Slope Hill "Coronation" carve-out (2024). A 2024 funding block says "16000 trees funded", with a typed "to go" figure. | Plants Out Master › `Trees that Count`, `SUMMARY PLANTS` D119:F125 | high |
| TTC audit (2025) | A 2020 species-by-season extract and a 2019 species-by-site extract | Plants Out Master › `Trees that Count Audit 2025`, `Trees that Count Audit 2025 Sit` | high |
| Paper4Trees | Order forms with a bin-based entitlement calculator; orders by school and early-learning centre in PDFs; allocation columns in the masters | `Paper 4 Trees/` (xlsx, docx, pdf); `Paper4Trees2` sheets; "Paper 4 Trees" columns in allocation masters | high |
| QLDC | Plants supplied by the council appear as supplier columns ("QLDC supplying E4N", "QLDC general supply", "From QLDC"); the council is also named as a landowner or partner on some keystone-site forecast sheets; a scanned seed-collection approval letter exists | Spring 2026 allocations › `Plant Allocations ` M, N, AL; Autumn 2026 master › `Autumn 2026` I, AG; Autumn 2027 allocations › L, M; `QLDC Seed Collection Approval Letter.pdf` | medium (what "E4N" means is not stated) |
| DOC | Appears only as a landowner label on sites (for example Slope Hill Road, Bush Creek, a Skippers site) and in the site-list landowner column. No DOC-specific report or roll-up was found. | Forecasting 2026-27 › `Slope Hill Rd (11)` B, `Bush Creek (13C)` B; Plants Out Master › `SUMMARY SITES` D | medium |
| Home Creek, Springburn, Pukerau, Matukituki Natives (bought-in suppliers) | Spring 2024 order sheet; 2023 invoice; 2025 quote; supplier columns and order sheets in the allocation masters and the Jardine Park plant list | `Plant Orders/JMN Plant Orders for Spring 2024.xlsx`; invoice and quote PDFs; Spring 2025 master › `Spring 2025` H, I; `Jardine Park plant list 2025.xlsx` | high |

### 2.2 The Trees That Count sheets, field by field

All in the Plants Out Master. Counts below were taken by script.

**`Trees that Count`** (A1:N966, species rows 4 to 102)

| Column | Content | Linked or typed |
|---|---|---|
| A | row number | formula |
| B | "Tree over 5m" flag (Y on 49 rows) | typed |
| C | unlabelled number on every row (meaning unclear) | typed |
| D | plant name | typed |
| E, F | Autumn 2025, Spring 2025 counts | typed (98 and 99 cells) |
| G | "Jardine Park Project" counts (50 rows filled) | typed |
| H, I | Total 2025; Total 2025 less Jardine Park | formulas on E, F, G |
| J | "Coronation" (Slope Hill 2024 special planting) | formula, `=MASTER!MG` row-offset link (98 cells) |
| K, L | Autumn 2024, Spring 2024 counts | typed (98 cells each) |
| M, N | Total 2024; Total less Coronation | formulas |

Evidence: Plants Out Master › `Trees that Count` › A4:N102. Only column J (98 cells) links to `MASTER`. Everything else that a person would key from the planting record is typed.

Totals and checks (checked by script):
- Row 103 sums rows 4 to 101 only. Row 102 (a species not on the master list under that name, 19 Spring 2025 plants) is outside every total in E103:F103.
- Row 104 holds the "tree over 5 m" SUMIF totals, but only for the 2024 columns (K104:N104: 9,545 / 4,716 / 14,261 / 8,361). E104:I104 are blank, so there is **no formula for the 2025 over-5 m total**. D104 holds a broken `#REF!` formula.
- Typed values against the `MASTER` sheet: Autumn 2025 differs from `MASTER` Autumn 2025 TOTAL in 21 of 99 species rows (sheet total 4,465 against 4,469); Spring 2025 differs in 1 row; Autumn 2024 in 2 rows; Spring 2024 in 34 rows. I did not establish why the Spring 2024 rows differ (it may be deliberate exclusion of special plantings; confidence: low).
- Summary block F106:I111 is **typed**: Jardine 2,503; Other 752; TTC system total 8,306; Other 2,305; Remaining 5,999; Requested 2,000. Only G108 (over-5 m = Jardine minus Other, 1,751), G110 (249 under 5 m) and G111 (ratio about 12.5%) are formulas. The typed Jardine figure (2,503) is 50 higher than the column G total (2,453), and the typed system total (8,306) is 41 higher than the I-column total (8,265).
- The note "Within 15% tolerance for >5m" next to the ratio suggests TTC allows up to about 15% of funded trees to be under 5 m. (confidence: medium; the rule itself is not written anywhere in the folder, only this note and the 12.5% result.)
- Species spellings differ from the master list in at least seven rows (for example misspellings of Myrsine, Olearia fragrantissima and Prumnopitys taxifolia), so a join by name would fail.

**`Trees that Count Audit 2025`** (A1:J966). One species per row for **2020** (Autumn, Spring, Total, then a Whitechapel subset). F4:F102 and J4:J102 are formulas; D, E, H, I are typed. F104 (over-5 m total 5,496) is a formula over the flag column, and it equals `SUMMARY PLANTS` BA11. The sheet name says 2025 but the data is 2020.

**`Trees that Count Audit 2025 Sit`** (A1:AL857). One species per row for **2019**, by 17 autumn and 16 spring sites. Rows 2 to 5 carry location group, site name, site ID and landowner for each column. Site columns are typed. Only the two total columns (U, AL) are formulas. This is the only place where a per-site TTC breakdown is laid out, and it is for one year.

**`SUMMARY PLANTS`** (species rows 6 to 104, 11 years of Autumn / Spring / Total):
- Only four season columns link to `MASTER` (Autumn 2021, Autumn 2022, Autumn 2024, Spring 2025: 383 link cells, checked by script). Every other season column is typed. The grand total (AW4 135,413) excludes 2026.
- Column B is the over-5 m flag (49 Y). Column C is a **threatened species** flag (13 T). The same two flags sit in `Master Plant List` columns A and B.
- D106:E117 "THREATENED SPECIES COUNT": a SUMIF on the T flag for each year 2015 to 2023 (586 up to 1,596 a year, total 12,810). 2024 and 2025 are missing.
- D119:F125 "TREES THAT COUNT 2024 - 16000 TREES FUNDED": E120 is a SUMIF on the over-5 m flag (32,656; it sums column AQ, which by the four-column pattern is the 2024 year total although the label says SPRING; confidence: medium). F120 is `=16000-9530`, so the "to go" figure (6,470) uses a **typed constant** whose source is not recorded. E123 (Slope Hill 7,000) is typed, and E124 deducts that typed 7,000 from the Autumn total.
- BA:BB "TOTAL NO. OF TREES OVER 5M": 2017 (5,459) and 2018 (4,326) are long hand-built sums of chosen cells; 2019 (5,991) is a typed number; 2020 (5,496) is a SUMIF on the flag. Nothing for 2021 onwards. This is the clearest example of a figure rebuilt by hand each time.

**`SUMMARY SITES`**: site totals by year. Of the cells in F4:AZ82, 428 are typed numbers and 63 link to `MASTER` (row-offset links, several pointing at empty `MASTER` rows). Class roll-ups (Keystone, Community, Schools) in BB84:BC86 are formulas over a typed K/C/S class code in column BD. This is the nearest thing to a "by partner type" total. There is no total by landowner.

**`CHART DATA` and `CHARTS`**: yearly and cumulative totals 2015 to 2024 are links to `SUMMARY PLANTS` row 4 (10 cells); cumulative 2024 is 100,532. `CHARTS` holds one chart with no cell data. These stop at 2024.

Grand totals that disagree (from the scouts, B23): `MASTER` 140,049; `SUMMARY SITES` 139,948; `SUMMARY PLANTS` 135,413; `CHART DATA` cumulative 100,532 to 2024. Any figure given to a funder depends on which sheet it came from.

### 2.3 The over-5 m flag and the threatened flag across files

| Place | Flag column | Count of Y | Note |
|---|---|---|---|
| Plants Out Master › `Master Plant List` | A "Trees that Count >5m (Y)" | 49 | the reference list |
| Plants Out Master › `Trees that Count`, `SUMMARY PLANTS`, `Trees that Count Audit 2025` | B | 49 each | same species as the master list apart from three spelling variants on the TTC sheet (checked by script) |
| Stocktake Master CURRENT › `Autumn 2026 Master Stocktake`; allocation masters (Autumn 2026, Spring 2025, Spring 2026, Autumn 2027, template) | A ">5m" (no header text on some) | 50 | one more than the master list: in the Autumn 2026 allocation master the extra species is a Carmichaelia (checked by script) |
| `Archive/Pricking Out List for 2025_2026.xlsx` › `Sheet1` | G "TTC" | 39 | 11 of the 49 are not flagged (Aristotelia fruticosa, Discaria toumatou, Elaeocarpus hookerianus, Hoheria sexstylosa, Lophozonia menziesii, Melicope simplex, Pennantia corymbosa, Podocarpus totara, Pseudopanax arboreus, Streblus heterophyllus, Weinmannia racemosa); Olearia odorata is flagged but is not in the 49 |

In the pricking-out list, H (a per-row SUMIF of the TTC target) sums to 6,728 of 11,384 projected for 2025/26 (B05). That is the only forward-looking TTC figure: "how many of next season's planting-ready trees are TTC species". Its total range starts at row 2, outside the data block, a small error.

The allocation masters carry an over-5 m subtotal per season (`TREES > 5M` rows by SUMIF on the flag), so planners can see how many qualifying trees a season's allocation delivers, but not by site once the sheet is split into site pick-lists (B19, B20, B21, B22).

Threatened species: the `T` flag exists only in the Plants Out Master (13 species). No allocation, stocktake or pricking-out sheet carries it.

### 2.4 What TTC needs and what the data can supply today

The brief states TTC needs photos, species counts and geolocated planting sites. No TTC submission form or portal export is in the folder, so I cannot confirm the exact fields TTC asks for (see Questions).

| TTC need | Can the data supply it? | Evidence | Confidence |
|---|---|---|---|
| Species counts of trees planted | **Yes at season and site level**, but the TTC sheets are typed extracts, not queries. Counts for 2015 to Autumn 2026 exist in `MASTER`. | Plants Out Master › `MASTER` 8 to 106; the three TTC sheets | high |
| Tree height class (over 5 m) | **Yes**, via the flag, but there are three different flag lists (section 2.3) | as above | high |
| Planting date | **Season only** (Autumn or Spring of a year). Allocation masters have collection and planting dates as free text for the current season. No event dates for earlier plantings. | `MASTER` header rows; Spring 2026 allocations › `Nursery Collection Schedule` C5:C15 | high |
| Geolocated planting sites (coordinates or polygon) | **No.** Site names and site ID codes (for example "9G") only. A column-header scan of every sheet found no latitude, longitude, easting, northing, grid, polygon or area column. The 94-point GPX file has no names, heights or times and is the remnant kōwhai layer, not planting sites. One Word file holds two aerial site-plan images (zones A to E and a measured 151 m² polygon) that identify one planting area visually but carry no coordinates. | `Remnant_kowhai_2019.gpx`; `Archive/2025 Spring Planting Lists/Untitled document.docx`; header scan (checked by script) | high |
| Planting areas inside a site (for example WH-06) | **No.** The "Location" column on every site pick-list is empty. | B19, B20, B21 | high |
| Photos | **No.** No photo column anywhere; images exist only in the one Word file above (2 PNG files, plans not photos). | file scan (checked by script) | high |
| Site landowner | Yes, as an organisation name on the site list and in header rows | `SUMMARY SITES` D; `Trees that Count Audit 2025 Sit` row 5 | high |
| Number of seedlings that went through the nursery (supply side) | Yes, in other workbooks, but not linked to the TTC sheets | pricking-out and potting-on logs | high |

Plain-language summary: today WRT can say "this many of these species were planted at these named sites in this season, and this many were over 5 m". WRT cannot yet say where each planting is on a map or show a photo against it.

### 2.5 What is calculated by hand

1. All 2024 and 2025 season figures on `Trees that Count` (E, F, G, K, L) are keyed in.
2. The TTC summary block `Trees that Count` F106:I107, I108, G106, G107, G109 is typed.
3. The "to go" figure for the 16,000-tree funding block uses a typed `9530` constant (`SUMMARY PLANTS` F120).
4. The over-5 m yearly totals for 2017 and 2018 are cell-by-cell sums written by hand, and 2019 is a typed number (`SUMMARY PLANTS` BA6, BA8, BA9).
5. The Slope Hill Coronation figure of 7,000 is typed in `SUMMARY PLANTS` E123 and subtracted by hand in E124.
6. `SUMMARY SITES`: 428 typed year-by-site cells against 63 links.
7. The `Trees that Count Audit 2025` and `Sit` sheets are pasted extracts for 2020 and 2019; their per-site and per-species cells are typed.
8. Annual propagation report: the only annual pricking-out total is a rounded prose figure (see 2.7).
9. Paper4Trees: some allocation cells are typed arithmetic (for example `=5+7`), and totals are re-added in several places.
10. The archive copy of the Plants Out Master has an extra sheet, `Copy of Trees that Count Audit `, with a year header of 2027 and different totals. It looks like an experiment.

### 2.6 Paper4Trees in detail

**What it is.** A scheme where the trust is entitled to plants for schools and early-learning centres. The order form has two parts: a bin-size calculator (litres divided by 2,000, rounded up, gives "plants earned") and a picklist of species with a quantity column.

- `Paper 4 Trees/Whakatipu Reforestation Trust 2025.xlsx` (15 species) and `...2026.xlsx` (16 species): **blank templates**. All order quantities and bin inputs are empty, so the entitlement evaluates to 0. The 2025 total cell A37 sums A17:A21 and so omits A22 (Leptospermum scoparium). The Archive copy of the 2025 form has the same cell values. Offered species change year to year (2026 adds Sophora microphylla, Austroderia richardii and Olearia odorata; drops Fuscospora fusca and Coprosma rugosa). (B24)
- **Orders actually placed** are in PDFs: `2025 General and Specific Orders...pdf`, `Queenstown-Lakes 2026 General and Specific Orders...pdf`, `Paper4Trees Order 2019.pdf` (and a docx twin), `Paper4Trees Order 2020-1.pdf`, `2020-2.pdf`. I read the totals lines by script (the scouts listed these PDFs by name only):
  - 2019: 6 specific orders (37, 13, 5, 23, 5, 5 plants = 88) plus 1 general order of 41.
  - 2025: 8 specific orders (40, 6, 13, 24, 6, 17, 6, 14 = 126) plus 2 general orders (5 and 30 = 35).
  - 2026: 6 specific orders (12, 19, 5, 25, 5, 28 = 94) plus 2 general orders (10 and 27 = 37).
- Each order lists the recipient organisation, status, a contact block (person, phone, street address), then type, scientific name, common name and quantity. The contact blocks are personal data (register).
- **Inside the workbooks:**
  - Spring 2026 allocations › `Paper4Trees2`: a school-by-school grid, 94 plants in total in column L. This equals the 2026 PDF specific-orders total. Column L leaves out the BestStart column K, and the total row appears twice (rows 4 and 107) with different sums.
  - Spring 2026 master column AV "Paper 4 Trees" totals 120 (19 species rows), with the school-by-school split held **only in cell comments**. 120 does not equal 94 + 37 = 131.
  - Spring 2025 master column AL totals 133. The 2025 PDFs total 161 (126 + 35). The `Paper4Trees2` sheet in that workbook is empty (all totals 0).
  - Autumn 2026 master: `Paper4Trees2` is empty and column AO is 0. Site pick-list sheet `Paper for Trees` has all quantities as `#REF!`, and its title names a different site.
  - These match B19, B20, B21, B24 and my reading of the PDFs. Conclusion: Paper4Trees quantities cannot currently be traced from order to allocation to plants-out total. (confidence: medium, because I compared totals only, not species-by-species.)
- Whether Paper4Trees plants count as WRT plants out or as bought-in is not recorded (question).

### 2.7 Bought-in orders (Home Creek, Springburn, Pukerau, Matukituki)

- `JMN Plant Orders for Spring 2024.xlsx`: 19 species rows, requested total 2,550 in B24, but that total sums rows 5 to 16 only (the other columns sum rows 5 to 23). The Home Creek and Pukerau columns are mostly empty. Emailed 14 March 2024 (B24).
- `Inv_2013279_from_Home_Creek_Nursery_Ltd.pdf` (12 Oct 2023): 23 plant lines and a freight line for 820 plants. It pre-dates the Spring 2024 order file, so the two do not reconcile with each other; the invoice relates to an earlier order. (read by script; confidence: high on dates)
- `Quote QU0467.pdf` (Springburn, 7 Aug 2025, for an October event with delivery to Jardine Park): 9 species lines, 380 plants. (read by script)
- Allocation masters carry "Springburn" and "Home Creek" stock columns (Spring 2025 `Spring 2025` H, I) and the Jardine Park plant list has `Springburn Order`, `Home Creek Order` and `QT Nursery order` sheets plus a "Matukituki Natives" column (B21, B22).
- The invoice carries the supplier's bank account number and a named addressee; the invoice and quote carry supplier contact details. Prices and GST are visible. These files are commercial records, not planting data.

### 2.8 Annual propagation reports

`Propagation Report for the year ended December 2024.docx` gives "over 8,000" seedlings pricked out between late August and the Christmas break and 915 on the last nursery day of December 2024, as prose. `Annual Propagation summary April 2021.docx` has no totals and says targets were met except for three species. Neither can be tied to a workbook total without calculation. (B24, B24 paragraphs 2 and 8.) The five other annual-report files in that folder were not read by a scout.

### 2.9 What a reporting model would need (for the build team)

For a TTC export from a proper database, the missing fields are:
- a planting event (date, type, site, optional planting area);
- coordinates or a polygon per planting site (and for the site boundary);
- a photo reference per event or site;
- a single species list with an over-5 m flag and a threatened flag held once;
- supplier or scheme tag on each quantity (nursery-grown, bought-in, council-supplied, Paper4Trees).

The counts, species and site names already in the Plants Out Master can seed the first three years of history at site and season level only.

---

## 3. Task B: sensitivity register

Full detail is in `04g_sensitivity_register.csv`. Method: (1) every `sensitive_columns` entry from the 24 scout reports was extracted by script (97 usable entries; entries that only describe cell comments were replaced by a script scan of every `.xlsx` for comment parts); (2) I added script scans for cell comments (15 sheets), "last updated" cells containing a name or initials (14 cells in 14 sheets), email addresses in comments (2 comments), document properties, PDFs, Word files, file names and sheet names; (3) duplicates were removed.

### 3.1 What is in the register

| data_type | Rows | Files | Main places |
|---|---|---|---|
| seed_location | 36 | 32 | Site column (C) in seed records and cuttings records (masters, archive versions, 2016-17 and 2017 tables); Source column (B) in seed-and-cutting results (masters, archive versions); "Seeds Sown and source" (D) and Notes (I, possible) in the 2024, 2025 and 2026 seed-sowing lists; Site column in the 2026 seed collecting record and `Seed record 2026`; a scanned QLDC seed-collection approval letter that could not be text-read |
| coordinates | 1 | 1 | `Remnant_kowhai_2019.gpx`: 94 waypoints, decimal degrees, no names or elevation |
| personal_name | 89 | 50 | volunteer and staff names in comments columns; "With who" in the seed collecting record; staff names and initials in "Last updated" cells and footers; person-named column headers and sheet names in pricking-out lists, plant lists and allocation masters; file names; document properties |
| contact | 16 | 15 | `WHO` columns in `SUMMARY SITES` and `HISTORIC SUMMARY SITES`; empty Contact column in the `Notes` sheets of the allocation masters; email addresses inside two cell comments; contact blocks (name, phone, street address) in Paper4Trees order files; an email thread PDF; supplier contact details on an invoice and a quote |
| comment_author | 15 | 12 | Cell comments (author name and timestamp) in stocktakes, potting-on, allocation masters and the archive Plants Out Master |
| other | 17 | 16 | Notes columns that may mix place and personal references (seed records K, results notes); landowner organisation names (role-level); volunteer group labels; tag and lot numbers that key to the Site column; site-plan images; one bank account number on an invoice |

### 3.2 Points worth acting on

1. **Seed-source text is spread across about 32 files, including the PDFs and the 2017 Word tables.** The version families (eight copies of the results register, eight of the seed records, six of the cuttings records) all carry the Site or Source column. An import must read only the lot or tag number and the species from these, and must not load the Site or Source column into any shared table without a decision from WRT (see Questions).
2. **The seed sowing lists put the source location inside a free-text "Seeds Sown and source" cell.** There is no separate column to drop. The Notes column (I) in the 2024 and 2025 sowing lists may also hold source text (the scouts mapped it to a code, so this is unconfirmed).
3. **Tag and lot numbers are keys.** Tag No. in the seed records and No. in the cuttings records link each lot to its Site value. Alone they are harmless, but anyone who holds both columns has the location.
4. **Personal data is in places the scouts did not list:**
   - 88 of 116 `.xlsx` and `.docx` files carry an author in their file properties and 45 carry a last-modified-by name (checked by script).
   - Three seed-record workbooks have the propagation lead's full name in the file name; one plant list and a few PDFs and sheet names carry a landowner's or contact's name.
   - Sixteen site sheets in the Spring 2026 allocations carry a footer with staff initials; the `Little Difference` and `WHS in school` titles carry personal names.
   - Two cell comments contain an email address.
   - The 2019 to 2026 Paper4Trees order files hold contact names, phone numbers and street addresses of school staff.
5. **Financial identifier.** One supplier invoice prints a bank account number. It must never be copied into the new system.
6. **Landowner organisations** (for example in header row 6 of `MASTER` and in `SUMMARY SITES` D) are role-level organisation names and are ordinary planting-site metadata. They are listed as low sensitivity ("other").
7. **GPX file.** Only coordinates; no names. If WRT agrees to hold it, it belongs in a restricted layer separate from planting sites. Its source and permission status is unknown.

---

## 4. Leak scan of `/home/claude/discovery/`

Scope: every file under the folder at the time of the final run (36 files: inventory and sheet CSVs, batches JSON, 24 scout reports, `03_*`, and the `04a`, `04b`, `04c`, `04d` outputs that existed). My own two outputs and the `scripts/` folder were excluded from the first pass, and my two outputs were scanned separately after writing (section 4.4).

### 4.1 Method

- **Seed-source value set (built in memory, not saved).** Distinct Site values from `2. Seed records MASTER.xlsx › Sheet1 › C4:C956` (about 800 populated cells) and `1. Cuttings records MASTER.xlsx › Sheet1 › C3:C538` (about 520 populated cells): 260 distinct values after trimming and lower-casing.
- **Planting-site vocabulary.** Site names from `SUMMARY SITES` C, `HISTORIC SUMMARY SITES` D, the header rows of `MASTER` (rows 1 to 7), all sheet names and file names in the inventory, the master species list, and the site names listed in the brief. A seed value that is also a planting-site name was treated as ordinary.
- **Two match types.** Whole-value (the full seed Site value appears as a phrase on a line) for values of six characters or more, and token (a distinctive word from a seed Site value, four or more letters, not a planting-site, species or common word; 112 candidate words). Short abbreviations and place codes (under six characters) were not matched, so very short codes could slip through.
- **Pattern scan.** Latitude -44 to -46 and longitude 168 to 169 as decimals (three or more decimal places); degrees-minutes forms; NZTM-style seven-digit eastings and northings; GPX tags; email addresses; New Zealand phone numbers; URLs.
- **Personal-name scan.** The strict personal-name tokens found in file names, sheet names and headers (five distinct names, plus the propagation lead's name).

### 4.2 Results: coordinates, emails, phone numbers

None. No latitude, longitude, degrees-minutes, GPX tag, email address, phone number or URL in any discovery file. One apparent seven-digit "easting" hit at `00_inventory.csv` line 161 is a run of digits inside a content hash (false positive).

### 4.3 Results: seed-source values

About 1,700 raw matches were reduced by hand to the following. Almost all were planting-site, school or town names (for example the keystone sites, Glenorchy, Frankton, Kelvin Peninsula sites, Moke Lake campground, Arrow River sites, Skippers, Cecil Peak, Walter Peak, Kawarau Bridge, a Gibbston reserve), which are legitimately in the site lists, plus ordinary words ("unknown", "various", "source", "sown", "outside", "seedlings").

Genuine or borderline hits (values not reproduced):

| File | Lines | What it is | Severity |
|---|---|---|---|
| `02_scouts/B24_funders_orders_docs.json` | 91, 232, 378 | A scout quoted a note (with a typo) from a supplier file that names a lake. The lake name equals a value in the seed Site column and is not a planting-site name. Coarse, and in a supplier's growing note, but it is a seed-source-style value. | low |
| `02_scouts/B22_allocation_small_and_templates.json` | line 1 (two matches) | "Matukituki Natives": a supplier nursery name that also equals a Site value. A business name, not a seed location. | none (false positive) |
| `02_scouts/B24_funders_orders_docs.json` | 439, 496, 504, 572, 769 | "Pukerau": a bought-in supplier. It is a business name. | none (false positive) |

Recommendation: remove or generalise the quoted lake note at the three lines in `B24` before the scout files are shared outside the project team. I did not edit any file (read-only).

### 4.4 Results: personal names

No emails or phones, but personal names do appear in the discovery outputs because source file names, sheet names and headers contain them and the scouts and catalogue recorded those names as found. Counts are lines containing any of five distinct names (strict tokens only; staff first names used as role references in the brief are excluded):

| File | Lines (first ones) |
|---|---|
| `00_inventory.csv` | 11 (56, 62, 107, 112, 114, 120, 124, 133, 185, 186, 189) |
| `00_sheets.csv` | 11 (108, 117, 118, 238, 280, 282, 283, 293, 353, 355, 369) |
| `01_batches.json` | 13 (87, 101, 285, 303, 345, 369, 385, 776, 778, 779, 789, 852) |
| `03_sheet_catalogue.csv` | 14 (53, 100, 106, 107, 108, 115, 116, 278, 280, 281, 291, 304) |
| `02_scouts/B03_species_master_lists.json` | 16 |
| `02_scouts/B04_site_plant_needs.json` | 8 |
| `02_scouts/B08_seed_cutting_masters.json` | 4 |
| `02_scouts/B10_seed_records_archive.json` | 8 |
| `02_scouts/B21_allocation_spring_2025.json` | 6 |
| `02_scouts/B14`, `B20`, `B22` (line 1 each) | 1 each |
| `04a_species_census.md` | 2 |
| `04a_species_variants.csv` | 187 (a file path with a first name in brackets) |
| `04c_forecasting.md` | 28 (same file path) |

These names come from source file and sheet names. They are not data values, but a person-named file name repeated 187 times is easy to spread. Recommendation: refer to the file by its inventory row or a placeholder in downstream outputs. `04g_sensitivity_register.csv` and this report use placeholders.

`04b_container_terms.csv`, `04b_pathways.md` and `04d_*` were checked for the same names and for seed-source values and had no strict-name hits; their site matches were planting sites only.

### 4.5 My own outputs

After writing, both `04g` outputs were scanned with the same patterns: no coordinates, emails, phone numbers, personal-name tokens or seed-source values. The register's `file` column uses placeholders (`<staff-name>`, `<name>`, `<initials>`) where a real file or sheet name carries a personal name. The register's notes mention "script scan for @" as text only.

---

## 5. Limits of this review

- TTC's submission requirements are taken from the brief, not from a TTC document.
- PDFs other than the ones named were read only to count emails, phone numbers and "updated" lines; names were not extracted.
- The scanned QLDC letter is an image and was not read.
- The "last updated" name detection is a heuristic (a capitalised non-month word beside "updated"). It found 14 cells; 85 other "updated" cells held dates only.
- Spring 2024 TTC rows that differ from `MASTER` were counted, not explained.

---

## Questions for WRT

1. **TTC submissions.** What has actually been sent to Trees That Count (the 2024 "16,000 funded" claim and the 2025 audit)? Can you share the form or portal export, and say which fields TTC requires for each planting (photos, coordinates or polygon, planting date, species, count)?
2. **The 15% rule.** Is it correct that TTC allows up to about 15% of funded trees to be under 5 m, as the note beside the Requested / under-5 m ratio suggests? Where is the rule written down?
3. **Typed constants.** What do the typed TTC figures stand for: the 9,530 in the "to go" sum, and the Jardine 2,503, Other 752, system total 8,306 and Remaining 5,999 block? Which TTC report did they come from, and are they meant to equal the sheet totals?
4. **Which "over 5 m" list is right?** The Plants Out Master flags 49 species, the stocktake and allocation masters flag 50 (one extra Carmichaelia), the 2025/26 pricking-out list flags 39. Which is the official list, and should the over-5 m flag live on the species list only?
5. **Photos and locations.** Where are TTC photos kept, and are they tied to a site or a planting day? Does WRT hold coordinates or boundaries for planting sites anywhere (a GIS layer, the TTC portal, QLDC maps)? Is the aerial site plan in the 2025 spring folder meant to stand for one site?
6. **Paper4Trees.** Do Paper4Trees plants count as WRT plants out or as bought-in? Which source is correct for 2025 and 2026 (the PDFs give 161 and 131; the allocation masters give 133 and 120)? And is the Paper4Trees "entitlement" (litres of bins divided by 2,000) something WRT tracks?
7. **QLDC supply.** What does "QLDC supplying E4N" mean, and do council-supplied plants count in WRT's plants-out total and in TTC?
8. **Seed-source locations.** Who may see them (volunteers, funders, the council, the public)? Do any landowner or permit conditions (for example the QLDC seed-collection approval) restrict where collection points are stored or shown? May the 2019 remnant kōwhai GPX points be held in the new system?
9. **Personal data.** Is it acceptable to keep volunteer and staff first names (comments, "With who", cell comments, "last updated" initials) in the new system, or should the build replace them with an anonymous role or initials? Should the Paper4Trees school contact details be kept at all, or only the school name?
10. **Threatened species.** Is the threatened-species count (13 flagged species, yearly totals 2015 to 2023) reported to anyone (DOC, the council, a funder), and should 2024 onwards be added?
