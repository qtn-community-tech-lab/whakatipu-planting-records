# S4f: Dates, seasons and identifiers in the WRT nursery spreadsheets

Specialist report for the WRT data discovery. Written in British English for WRT staff and developers.
Read-only analysis of `/home/claude/_source_copy/_ALL Plant Lists/` (and converted `.xls` copies). Nothing was changed.

Evidence is cited as `file › sheet › range`. Inferences carry `confidence: low|medium|high` with the reason.
Where a file or folder name contains a person's name it is written `[name]`. No seed-source places, coordinates or personal names are given. Counts that mention "seed source" columns are by column only.

Shorthand used below:

- **Seed log** = `2. Propagation (cuttings and seeds)/_Seed and Cutting Records/2. Seed records MASTER.xlsx › Sheet1`
- **Cuttings log** = `…/1. Cuttings records MASTER.xlsx › Sheet1`
- **Results register** = `…/3. Seed & Cutting results MASTER.xlsx › Sheet1`
- **Sowing lists** = `…/Seed Sowing /` (2024, 2025, 2026) and the copies under `Archive seed Sowing Records annual/` and `latest from [name]/`
- **Potting-on books** = the five workbooks in `3. Potting On/` (2022-23 to 2026-27)
- **Plants Out MASTER** = `_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx`

---

## 1. Headlines

1. **There is no single date format.** At least nine ways of writing a date are in use. They range from true Excel dates to text such as `13.8.25`, `~17/02/17`, `Feb mar 17` and `22/08/2018 21/11/2018 27/3/201…` (several dates in one cell).
2. **Day and month are swapped in the cells where a person typed a date and Excel "helped".** The signature is clear and repeatable. Cells like `12/08` (12 August) were read as 8 December, so they became real dates in the wrong month. Dates that cannot be read as month-first (13th or later) stayed as text. This affects the potting-on session headers (44 of 50 real-date headers), the 2026 seed-collecting record (15 of 24 real-date cells are later than the file's own "updated 15 May 26" stamp) and the 2016-17 seed file. The three main logs (seed, cuttings, results) are not affected in bulk (section 4).
3. **Years are the other weak spot.** Single-digit typos produce impossible years (2003, 2010, 2012, 2014, 2027, 2424). Number cells formatted as dates turn `2.22` and `2021` into 1900 and 1905 dates. Stale year headers are copied forward (month sheets still say 2023 in the 2024-25 and 2025-26 books).
4. **Three year systems run side by side.** Calendar year (seed sowing), production year August to July (potting on, pricking out) and planting season (Spring or Autumn plus year). There is also a fixed lag between them (section 6).
5. **File names and sheet names are not reliable guides to content.** `Seed Sowing 2026 To be updated.xlsx` holds 2025 data. `JMN Plant Allocations Autumn 2027.xlsx` holds the 2026 stocktake dates. Three stocktake files keep a sheet called `Oct 24`.
6. **Seed and cutting tags are not unique keys.** They restart from 1 twice, drift through two date-coded styles, and carry typo variants. Species running numbers 1 to 98 are consistent in the three current workbooks but are not a stable ID (section 7).

---

## 2. Catalogue of date formats

| # | Format family | Example shape | Where it occurs (evidence) | Counts |
|---|---|---|---|---|
| D1 | Real Excel date, system short-date format | shows as `dd/mm/yyyy` or `mm/dd/yy` depending on the PC | Seed log › Sheet1 › D, G, H (number format `mm-dd-yy`, which is Excel's built-in "short date"); Cuttings log › E, F; Results register › D | Seed log D 727, G 763, H 669; Cuttings E 524, F 410; Results D 1,234, E 1,041 |
| D2 | Real date, month-and-year display only | `Mar-21` showing a full date with day 1 | Seed log › Sheet1 › D (17 cells, format `mmm-yy`), G (2 cells); e.g. D125, D126, D198, D200, D201, D308, D346 | 17 + 2. The stored value has day 1 (16 of 17) or day 20 (D765), so the day shown is not meaningful. confidence: high |
| D3 | Real date in an explicit US or NZ locale format | `[$-409]m/d/yyyy`; `d/m/yyyy;@` | `.xls` archive versions of the seed log and cuttings log (`[$-409]m/d/yyyy`); Results register › E (1,032 cells `d/m/yyyy`, 9 cells `mm-dd-yy` in the same column) | Display only. The stored value is the same date serial. The mixed formats in one column show hand-editing |
| D4 | Real date with a spaced custom format | `13  Jul  22` | `…/Archive/Archive Seed Records/2. Seed records_August 2022.xlsx › Sheet1 › D, G, H` (format `dd"  "mmm"  "yy`); `Seed & Cutting results_August 2022.xlsx`; `1. Cuttings records_August 2022.xlsx` | All dates in those columns |
| D5 | Date stored as a bare serial number (General format) | `42529` for 8 June 2016 | `…/Archive Seed Records/2. Seed records.xlsx › Sheet1 › D4:D956, G, H` | D 563, G 597, H 415 numbers. They display as five-digit integers. The values convert correctly (42529 = 2016-06-08) and agree with the `.xls` copy. confidence: high |
| D6 | Text, dotted `d.m.yy` | `13.8.25` | Sowing lists › Stratified, Sown, Collected columns (E, F, H). 2025 list: E 36, F 36, H 39 cells; 2024 list: E 30, F 40, H 32; 2026 list: E 7, F 3, H 10. Also potting-on headers in 2024-25 and 2025-26 (`5.2.25`, `29.1.25`) | The sowing lists use text dates only (no real dates, apart from one cell each in 2024 and 2025). Years are two digits |
| D7 | Text, slashed `d/m/yy` or `dd/mm/yyyy` | `17/2/26`, `10/12/2025eve` | Seed collecting 2026 › B (25 text cells, all with a day of 13 or more); Seed log › G208 (`23/9/2018`), H442 (`15/21/21`, impossible); potting-on headers; Results register › E (2 cells) | Mixed with real dates in the same column (section 4) |
| D8 | Text, day and month only (no year) | `13/12`, `24/9` | Potting-on 2022-23 to 2025-26 headers (13 cells in 2023-24, 13 in 2024-25); `WRT 2016-17 seed.xlsx › Seed › I, J` (germinated and pricked-out dates, 14 and 9 cells) | The year has to be taken from the sheet or workbook |
| D9 | Several dates in one cell | `22/08/2018 21/11/2018 27/3/2019` | Seed log › H (11 cells, e.g. H20, H26, H36); Cuttings log › F (6 cells); Results register › E419, E420, E778 | One pricking-out per batch per cell. A cell can record a second or third pricking-out |
| D10 | Date plus words | `16/07/16 in sand`, `29/11/17 discarded`, `17/1/18 35` | Seed log › G12, H35, H78, H79; Cuttings log › F | A date and a quantity or status share a cell |
| D11 | Date with approximation marks | `~17/02/17`, `?/03/17`, `? 06/17`, `5?/ 2016`, `02/-2/17` | Seed log › D48, D103, D111, D99, D65 | 7 cells begin with `?`; the rest are single cases |
| D12 | Month or month-range only | `May`, `July`, `February`, `Jan/Feb 21`, `march april 19`, `Feb mar 17`, `Sept 19` | Seed log › D21, D22, D84, D434, D471, D281, D82, H151; Seed Sowing 2026 › E (`May?`, `July`, 2 cells); `WRT Seed Collection Dates.xlsx › Sheet1 › C2:C91` | The collection-dates sheet gives 51 month-range entries on 90 species rows (e.g. `Jan-March`, `Dec-Feb`, `Autumn`, 4 single-month entries) |
| D13 | Season word plus 2-digit year in a date column | `Sown spring 19`, `Autumn 20`, `Autumn 21` | Seed log › D342:D345, D444, D449 | 6 cells. Season labels where a date should be |
| D14 | Vague or placeholder | `?`, `-`, `fresh`, `old`, `unknown`, `trenched`, `given away`, `dead` | Seed log › D, G, H; Cuttings log › F (`dead` 7+); Results register › E (`?` 13, `-` 6, `given away` 3) | Seed log › D 18 "other" + 13 vague; Results › E 22 text cells in total |
| D15 | Number in a date column | `2021`, `2023`, `2.22` | Seed log › D558 (`2021`), D856 (`2023`), D578 (`2.22`) | 3 cells; the first and third turn into 1905 and 1900 dates (section 5) |
| D16 | Time of day or session tag glued to a date | `04/03/26 AM`, `12.2.25 E`, `10/12/2025eve`, `16/10 QLDC`, `29/09` + `Youth Group` | Potting-on month sheets, row 3 (and row 2 for group labels) | In 2025-26: 16 "date plus other" header cells. In 2024-25: 7 |
| D17 | Week label instead of a date | `Wk 2`, `Wk 3` | `2022-23 JMN Potting On … › Aug, Sept, Oct, Nov › row 3` (19 cells); 5 in 2023-24 | Only in the two older books |
| D18 | Date embedded in a title or header text | `SEEDS & CUTTINGS TRAYS RESULTS 17/11/2021`; ` 21/9/2021`; `Cuttings at 31.3.26`; `stocktake 31. 3 .23`; `Stocktake 27/3/25`; `UPDATED 28/05/25 [initials]`; `31/03/26 (name)` | Results register › A1; Seed log › B1; Cuttings log › A1:B1; `4. 22-23 plant projections Final.xlsx › Sheet1 › D1`; `V150 stocktake 31.3.25.xlsx › Sheet1 › A1`; stocktake files › `Oct 24` › A2; `_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › D4, F4, H4` | See section 3 |
| D19 | Date inside a free-text note | `Germ 24/9`, `28 into PB3 20/9/17`, `tray discarded 19/9/24` | Seed log › K; Cuttings log › I; Results register › H (103 notes mention a tray or T28; many include dates) | Free text, mostly `d/m` or `d/m/yy` |
| D20 | Day and month written in words | `12 Sept`, `25th Sept`, `2 Dec`, `23 and 24 April`, `Autumn` | Allocation books › `Nursery Collection Schedule` and site tabs, rows 2–5 | Collection and planting days, no year |
| D21 | Dates in file names | `18 October 24`, `19 Feb 2025`, `31.3.25`, `27 March24`, `April202628042026`, `20240401 …`, `Nov 2021`, `August 2022` | `4. Stocktakes/…`, `5. Seasonal Planting Lists…/Archive/2024 Autumn Plant Lists/20240401 JMN Plant Allocation Master AUTUMN 2024.xlsx - …`, `4. Stocktakes/2026/Nth Nursery PB3 April202628042026.pdf` | Seven or more styles; none is machine-readable on its own |

### Counts by script for the main date columns

Counts exclude the header row (and the second header at Seed log row 572). "Text" means any non-date text. Source: Python/openpyxl scan of the files named.

| Table and column | Cells with a value | Real dates | Text | Numbers | Notes |
|---|---|---|---|---|---|
| Seed log › Collected (D) | 770 | 727 | 40 | 3 | 3 month-only, 13 `?`-type, 2 date+extra, 4 month-with-number, 18 other |
| Seed log › Date sown (G) | 766 | 763 | 3 | 0 | `16/07/16 in sand` (G12), `23/9/2018` (G208), `?` (G942) |
| Seed log › Date pricked (H) | 686 | 669 | 17 | 0 | 11 are two or three dates in one cell |
| Cuttings log › Date prop (E) | 524 | 524 | 0 | 0 | Cleanest column in the whole set |
| Cuttings log › Pricked out (F) | 429 | 410 | 19 | 0 | `dead` 7, `?` 5, multiple-date cells 6, `Sept 19` 1 |
| Results register › Date sown/Cuttings set (D) | 1,235 | 1,234 | 1 | 0 | One `?   2016` (D1184) |
| Results register › Date pricked out (E) | 1,064 | 1,041 | 22 | 0 | Plus 1 time-of-day value. 9 date cells use a different number format from the other 1,032 |
| Sowing list 2025 › Stratified (E) | 40 | 0 | 40 | 0 | 36 dotted dates; 4 words (`damp2 mo`, `No`, `yes`) |
| Sowing list 2025 › Sown (F) | 36 | 0 | 36 | 0 | All `13.8.25`-style |
| Sowing list 2025 › Collected (H) | 39 | 0 | 39 | 0 | All dotted, 2-digit year |
| Sowing list 2024 › Stratified / Sown / Collected | 48 / 40 / 33 | 0 / 0 / 1 | 48 / 40 / 32 | 0 | Stratified also holds `no`, `seedlings`, `fresh`, `frozen` |
| Sowing list 2026 › Stratified / Sown / Collected | 10 / 3 / 10 | 0 | 10 / 3 / 10 | 0 | Includes `1.6.26 (2months)`, `May?`, `July ` |
| Seed collecting 2026 › Collected (B) | 49 | 24 | 25 | 0 | 22 of the 24 real dates have a day of 12 or less; all 25 text dates have a day of 13 or more (section 4) |
| Potting-on session headers (row 3, month sheets, 5 books) | 50 real dates plus about 100 text headers | 50 | about 100 | 0 | 2022-23: 1 real, 2 d/m text, 19 `Wk n`; 2023-24: 20 real, 13 d/m, 6 d/m/y, 5 `Wk n`; 2024-25: 16 real, 13 d/m, 18 d/m/y, 7 date+extra; 2025-26: 10 real, 3 d/m, 18 d/m/y, 16 date+extra; 2026-27: 3 real, 3 text |

The Cuttings log date-of-propagation column holds no text at all. **A reader (or importer) should treat the Seed log and Results register as "mostly real dates with a long tail of notes".** The sowing lists and potting-on headers are "text dates by design".

---

## 3. Dates embedded in header or title text

These matter because the only "as at" date for a sheet often lives in a text cell.

| Sheet | Header text (shape only) | What it says | Problem |
|---|---|---|---|
| Seed log › B1 | `21/9/2021` | "as at" date of the seed log | Data run to 20 June 2026 (D, G, H). The stamp is stale by almost five years. confidence: high |
| Results register › A1 | `… RESULTS 17/11/2021` | as-at date | Data run to Sept 2026 (E). Stale |
| Cuttings log › A1:B1 | `Cuttings at` / `31.3.26` | as-at date | Consistent with the latest dates (last pricked-out 25 Mar 2026) |
| `4. 22-23 plant projections Final.xlsx › Sheet1 › D1` | `stocktake 31. 3 .23` | date of a stocktake column | Spaces inside the date and year-only-two-digit; cannot be parsed without cleaning |
| `V150 stocktake 31.3.25.xlsx › Sheet1 › A1` | `Stocktake 27/3/25` | stocktake date | File name says 31.3.25, header says 27/3/25. A 4-day mismatch. confidence: high (both visible) |
| `JMN Stocktake 18 October 24.xlsx › Oct 24 › A2` | `UPDATED 18/10/24 [initials]` | update stamp | Matches name |
| `19 Feb 2025 JMN Stocktake.xlsx › Oct 24 › A2` | `UPDATED 19/02/25 [initials]` | update stamp | Sheet still called `Oct 24` |
| `20 May 2025 JMN Stocktake.xlsx › Oct 24 › A2` | `UPDATED 28/05/25 [initials]` | update stamp | File name says 20 May, stamp says 28 May; sheet still `Oct 24` |
| `_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › D4, F4, H4` | `31/03/26 (name)`, `28/04/26 (name) Updated 12/08 [initials]`, `13/05/26 (names) Updated 12/08 …` | one stocktake date per stage column, plus a later "updated" day and month with no year | Three stocktake dates in one sheet (V150, PB3 growing, PB3 ready). `12/08` has no year; from the file date (Aug 2026) it is probably 12 August 2026. confidence: medium |
| `JMN Plant Allocations Autumn 2027.xlsx` and `_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations › row 5` | same three stocktake date strings | the same 2026 stocktake stamps in two season files | See section 6 |
| `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026 › G1` | `Feb 2026 [initials]` | month-only stamp | |
| `_JMN Plants Out Master.xlsx › MASTER › E2` | real date 8 May 2024 under `LAST UPDATED` | last-updated stamp | The sheet carries seasons to Autumn 2026. Stale |
| `_JMN Plants Out Master.xlsx › SUMMARY PLANTS › D2` | `UPDATED 02/12/24 by [name]` | update stamp | Stale against 2025 data |
| `HISTORIC SUMMARY SITES › D2` | `FINISHED 22/11/2016` | date the old site register was frozen | |
| Potting-on month sheets › row 1 | real date `2023-10-01`, `2023-11-01`, `2023-12-01` in the 2022-23, 2024-25 and 2025-26 books | month label for the sheet | See section 6 |

---

## 4. Day/month swapped dates

### The mechanism (confidence: high)

Excel on a US-locale computer, or a workbook opened with a US default, reads typed `12/08/26` as 8 December and stores a real date. A typed `17/2/26` cannot be read that way, so it stays as text. After a few weeks of typing in the NZ style, one column therefore holds:

- real dates, with day 12 or less, **in the wrong month** (the stored day is the intended month); and
- text strings, with first number 13 or more, **correct**.

The diagnostic is that real dates in a column are **all** day 12 or less, while the text dates in the same column are **all** first-number 13 or more. In a genuine mixed column, real dates reach 31.

### Where it was found

| Place | Evidence | Verdict |
|---|---|---|
| Potting-on month sheets (all 5 books), row 3 | Of 50 real-date headers, **44 have the sheet's month in the day position** (swapped), 5 are correct, 1 is the same either way. E.g. `Aug 2026 › D3` holds 8 Dec 2026 on the August sheet (the `12/08` of 12 August); on `Sept` the dates `16/09/26`, `23/09/26` and `30/09/26` sit beside real dates as text (F3:H3). Dec 2025 sheet › D3 holds 12 March 2025 where 3 December was meant. Per book swapped: 2022-23: 1; 2023-24: 20; 2024-25: 12 (4 correct); 2025-26: 9 (1 correct); 2026-27: 2. | confidence: high. The sheet's own month proves the swap. |
| Seed collecting 2026 › B3:B74 | 24 real dates (22 with day 12 or less) and 25 text dates (all day 13 or more). **15 of the 24 real dates are later than the file's own "updated May 15 26" stamp** (months July to November 2026), and several look like Jan–Mar swapped. | confidence: high for the mechanism; medium for any single cell |
| `Seed record 2026.xlsx` (the copy in the `latest from [name]` folder) › B | 9 real dates, 3 with day 12 or less. None is after May 2026. Same sheet layout, fewer cells. | The two copies disagree for the same species (B3: 11 Jan 2026 here vs 1 Nov 2026 in the copy updated on 15 May). The pair are day/month swaps of each other, and the 1 Nov value is in the future, so the 11 Jan value is probably right. confidence: medium (one cell compared) |
| `WRT 2016-17 seed.xlsx › Seed › D, E, G` | Real dates D: 18 (17 with day 12 or less); G: 9 (all day 12 or less). Text dates in G: 15, all day 13 or more. Row 2 `S1` collected shows 6 Aug 2016, the Seed log gives 8 Jun 2016 for S1 (Seed log › D4). Row 4 `S3` shows 9 June as `2016-09-06`, the Seed log gives 9 June 2016 (D6). | confidence: high (cross-file check) |
| Seed log, Cuttings log, Results register | Share of real dates with day 12 or less: 49% (D), 34% (G), 35% (H); 42% (Cuttings E); 38% (Results D). About 40% is what random dates give. | **No bulk swap in the three main logs.** Isolated swaps may exist. 10 rows in the Seed log have sown before collected, or pricked before sown. Rows 59, 251, 658, 674, 713, 731, 781, 788, 881 and 929 are affected. Only 1 of the 10 (row 59) would be fixed by a day/month swap; the rest look like year slips or typos. confidence: medium |

### What a parser must do (descriptive, not a fix)

- Do not trust the stored month of any real date in the potting-on headers, the 2026 collecting record or the 2016-17 seed file. Compare it with the sheet's month name.
- Treat a column's text dates as the more reliable half when the real dates are all day 12 or less.
- Two copies of the same sheet can disagree on a date; keep both until WRT confirms.

---

## 5. Future, impossible and out-of-range dates

All checks use today as 3 October 2026. "Likely cause" is an inference (confidence: medium unless stated) from neighbouring rows or the tag.

| Cell | Value | Why it is wrong | Likely cause |
|---|---|---|---|
| Seed log › G674 (tag in the 2022-restart series) | 18 Feb **2003** | 2003 is before the nursery's first record (2016); row above and below are Feb 2023 | Typed 2003 for 2023. Also gives collected after sown (D674 = 11 Feb 2023). Present in four other copies of the seed log |
| Seed log › H788 (same row range) | 13 Nov **2014** | Pricked out before sown (G788 = 29 Feb 2024) | 2024 typed as 2014 |
| Seed log › H942 | 1 Oct **2015** | Before the nursery's first record | Typo for a later year; date window 2023–2025. confidence: low |
| Cuttings log › E145 | 21 Aug **2027** | In the future; neighbours C128, C130 are 21 Aug 2017 | Typed 2027 for 2017. Copied into all six cuttings-log versions |
| Cuttings log › E364 | 2 Nov **2010** | The nursery's tag C20111 is dated Nov 2020 | 2020 typed as 2010 |
| Cuttings log › F271 | 29 Jan **2010** | Pricked out before it was set (E271 = 31 Jan 2019) | 2020 or 2019 typed as 2010 |
| Results register › D1516 | 26 Dec **2026** | In the future (today is Oct 2026); the cutting rows above it are Dec 2024 and Oct 2025 | Typed 2026 for 2025 |
| Results register › E901 | 20 Dec **2012** | Before the nursery started; neighbours are Jan 2023 | 2022 typed as 2012 |
| `_MASTER …/_Seed & Cutting results MASTER.xlsx › Sheet1 › E333` | 18 Dec **2424** | Format `d/m/yyyy`; impossible | 2024 typed as 2424 (older template copy only) |
| `…/2. Seed records_August 2022.xlsx › D552` | 2 Jan **1900** | A number formatted as a date | The source cell holds the number `2.22` (still in the current seed log as D578), which Excel shows as a date serial near 1900 |
| `…/2. Seed records_August 2022.xlsx › D532` | 13 Jul **1905** | As above | Source cell holds `2021` (still in the current seed log at D558) |
| `Seed & Cutting results_August 2022.xlsx › D701:D704` | four dates in **1900** | As above | Numbers (about 4 to 125) in a date-formatted column |
| Seed log › H442 | `15/21/21` | Month 21 does not exist | Typo for 15/12/21 or similar |
| Seed log › H580 | `1`/11/23` | A backtick inside the date | Typing error; probably 1/11/23 |
| Seed log › D65 | `02/-2/17` | Minus sign inside the date | Probably `02/02/17`. confidence: low |
| Seed collecting 2026 › B3 and 14 others | 3 Jul to 1 Nov 2026 | Later than the file's "updated May 15 26" stamp | Day/month swap (section 4) |
| Potting-on 2024-25 › Dec › D3:H3 and 2025-26 › Dec › D3:F3 | `2023-04-12`, `2023-06-12`, … | Year 2023 inside a 2024-25 or 2025-26 book | Copied forward from the 2023-24 book; swapped (4 Dec 2023 etc.) |
| Potting-on 2025-26 › Feb › D3:L3, Apr › D3:E3, May › D3:E3 | `4.2.25`, `11.2.25`, `2.4.25`, `9.4.25` | Dates a year out for a 2025-26 production year | Copied forward from the 2024-25 book. Sessions run on Wednesdays; 4 February 2026 is a Wednesday and 4 February 2025 is a Tuesday. The Apr and May sheets are identical to the 2024-25 April sheet and hold no counts. confidence: medium |
| Potting-on 2025-26 › Jan › G3, H3 | `28.1.25` | Rest of the sheet is 2026 | Year typo for 28.1.26. confidence: medium |
| Potting-on 2025-26 › Mar › header 6 | `18/01/26AM` | The March sheet; 18 January 2026 is a Sunday | Probably 18/03/26 (a Wednesday). confidence: low |
| Potting-on 2024-25 › Mar › E3 | `05.03.24 E` | Rest is 2025 | Year typo. confidence: medium |

---

## 6. Years, seasons and the production calendar

### 6.1 Three year systems

| System | Where used | Convention | Evidence |
|---|---|---|---|
| **Calendar year** | Seed sowing lists, seed collecting record, propagation reports | One list per calendar year, title says the year (`Seed Sowing 2025`, `Seed Collecting 2026`) | Sowing lists › A1; `Propagation Report for the year ended December 2024.docx`; `Annual Propagation summary April 2021.docx` (April to March year) |
| **Production year, August to July** | Potting-on books, pricking-out lists | `2026-27 JMN Potting On - August 2026 - July 27`; pricking-out files `2024-25 for potting 25-26` | `3. Potting On/` file names; `_Pricking out lists/` file names; `Summary of Records` docx item 7 ("starts each July") |
| **Planting season** | Plant allocation books, Plants Out MASTER, forecast blocks | Spring (Sep to Nov) and Autumn (Mar to May), plus year | `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026`; Plants Out MASTER › row 1 (409 header cells) |

Some places use a fourth set: `Winter 2026` and `Summer 2027` mark stocktake moments. See `_JMN PLANT Forecasting 2026_2027.xlsx › 3 Year Plant Look Ahead (Keysto › D6, L6` (`Stocktake (stage 4) Winter 2026` and `… Summer 2027`).

Other nurseries' and purchasing schemes use their own years (Paper4Trees order files are named by order year: `Paper4Trees Order 2019.docx`, `…2020-1.pdf`, `…2020-2.pdf`; `Whakatipu Reforestation Trust 2025.xlsx` and `…2026.xlsx` are order-year forms). confidence: high for file names, low for any wider scheme meaning (the PDFs were not read).

### 6.2 Label spellings found for the same idea

Scan of text in the first 30 rows of every workbook, sheet names and file paths:

| Idea | Spellings seen | Where |
|---|---|---|
| Production year | `2026/27`, `2026/2027`, `2026-27`, `2026 - 27`, `26-27`, `27-28`, `2025,2026`, `2023 - 2024` | Forecast headers (`2024/2025??`, `2025/2026`, `2026/2027`, `2027/2028`); pricking-out file names and headers; seed sowing 2025 header `Projected potting 2026 - 27`; `_Pricking out 2026-27 for potting 27-28 .xlsx › Sheet1 › B2:C2` (`2025/2026`, `2026/2027`); `Pricking out 2025-2026 for potting 26-27.xlsx › Sheet1 › B1` (`Pricking out 2025,2026`) |
| Short production year | `25/26`, `24/25`, `22-23` | Stocktake sheets and `4. 22-23 plant projections Final.xlsx` |
| Season plus year | `SPRING 2026`, `Spring 2025`, `AUTUMN 2015`, `Autumn 2026`, `Spring 26`, `Autumn 20`, `Autumn 21` (seed log date cells) | Forecast master row 2; Plants Out MASTER row 1 (`SPRING YYYY` 131 cells, `Autumn YYYY` 105, `AUTUMN YYYY` 88, `Spring YYYY` 84); Seed log › D444, D449 |
| Season plus year, long range | `Spring 2015` to `Autumn 2030` | `Keystone Sites Plants Summary` workbooks (history 2015 to 2025); forecast master (Spring 2026 to Autumn 2030) |
| Season word only | `SPRING`, `AUTUMN` | Plants Out MASTER › row 2 (11 cells) |
| Season in a sheet name | `Autumn 2026`, `Spring 2025`, `Oct 24`, `Springburn Order` (a supplier name, not a season) | Allocation books; stocktake books; `Jardine Park plant list 2025.xlsx` |

Season casing differs inside one row (`AUTUMN 2015` vs `Autumn 2024`). A parser needs a case-insensitive match and should not treat `Springburn` as a season.

### 6.3 The "two seasons later" lag, as the files show it

The Summary of Records says: "Pricking out for 2024/2025 = planting in 2026/2027" (`_Summary of Records JM Nursery.docx`, item 5). The forecast workbook spells the chain out in its block headers (`_JMN PLANT Forecasting 2026_2027.xlsx › 3 Year Plant Look Ahead (Keysto › rows 2–7`):

| Planting block (row 2) | Seed sowing list (row 3) | Pricking-out list (row 4) | Potting-on list (row 5) |
|---|---|---|---|
| SPRING 2026 (D) | 2023 | 2024/2025 (with `??`) | 2025/2026 |
| AUTUMN 2027 (L) | not set | not set | 2025/2026 |
| SPRING 2027 (T) | 2024 | 2025/2026 | 2026/2027 |
| SPRING 2028 (AJ) | 2025 | 2026/2027 | not set |
| SPRING 2029 (AZ) | 2026 | 2027/2028 | not set |

So for a spring planting in year Y: sown in about Y-3, pricked out in the production year (Y-2)/(Y-1), potted on in (Y-1)/Y, planted in spring Y. confidence: high that this is the intended chain (the headings say it); medium that every row follows it (most grid cells are blank, only 10 typed values exist).

File names agree: `Pricking out 2024-25 for potting 25-26.xlsx`, `Pricking out 2025-2026 for potting 26-27.xlsx`, `_Pricking out 2026-27 for potting 27-28 .xlsx`. The one oddity is the 2023-24 file called `Pricking out 2023 - 2024 for 2024-2025.xlsx`, where "for" means potting year. Sowing lists agree: the 2024 sowing list has `Projected 2025/2026` in B2 and the 2025 list has `Projected potting 2026 - 27` in B2. The two headings use different words for the same lag (projected vs projected potting).

An importer should store the **chain offset** (sow year, prick year, pot year, plant season) rather than rely on a single "year" field.

### 6.4 File name, sheet name and content do not always agree

| File or sheet | What the name says | What the content shows | Evidence | confidence |
|---|---|---|---|---|
| `Seed Sowing 2026 To be updated.xlsx` | 2026 | A1 says `Seed Sowing 2025`; sown dates are `13.8.25`; 41 rows, same as the 2025 list | `…/Archive seed Sowing Records annual/Seed Sowing 2026 To be updated.xlsx › Sheet1 › A1, F3:F40` | high |
| `Seed Sowing 2026 .xlsx` | 2026 | 2026 sowing data (11 rows with data, collected dates `13.4.26` etc.) | `…/Seed Sowing /Seed Sowing 2026 .xlsx › Sheet1 › D2:H12` | high |
| `JMN Plant Allocations Autumn 2027.xlsx` | Autumn 2027 | `Projected pricked out for 2026`; stocktake stamps `31/03/26`, `28/04/26`; no allocation counts for 2027 | `…/2026 Autumn Plant Lists/4. Autumn Planting/… › Plant Allocations › row 4:5` | high |
| `_JMN Plant Allocations Spring 2026.xlsx` | Spring 2026 | Same 2026 stocktake stamps and `Projected pricked out for 2026` | `…/2026 Spring planting/… › Plant Allocations › row 4:5` | high |
| `2022-23 JMN Potting On …xlsx` | 2022-23 | Month sheets Oct, Nov, Dec hold row-1 dates in **2023** (`2023-10-01`, `2023-11-01`, `2023-12-01`); Jan to Mar hold 2024 | `… › Oct, Nov, Dec, Jan, Feb, Mar › row 1` | high |
| `2024-25 JMN Potting On …xlsx` and `2025-26 …` | 2024-25, 2025-26 | Oct to Dec row-1 labels still read 2023; the Dec sheet's session dates read 2023 | `… › Oct, Nov, Dec › row 1, D3:H3` | high |
| `2025-26 JMN Potting On …xlsx` | 2025-26 | Feb, Apr and May session dates read 2025 | `… › Feb, Apr, May › row 3` | medium |
| `20 May 2025 JMN Stocktake.xlsx` | 20 May 2025 | Stamp `UPDATED 28/05/25`; sheet names `Oct 24` and `Copy of Oct 24` | `… › Oct 24 › A2` | high |
| `19 Feb 2025 JMN Stocktake.xlsx` | 19 Feb 2025 | Sheet name `Oct 24` (stamp does agree: 19/02/25) | `… › Oct 24 › A2` | high |
| `V150 stocktake 31.3.25.xlsx` | 31.3.25 | Header `Stocktake 27/3/25` | `… › Sheet1 › A1` | high |
| `18 October 24 JMN Stocktake.xlsx` in folder `4. Stocktakes/2025/` | October 2024 | Stamp agrees (18/10/24) but folder says 2025 | file path | high |
| `_JMN PLANT Forecasting 2026_2027.xlsx` | 2026_2027 | Blocks run Spring 2026 to Autumn 2030. Total columns BQ to BV are labelled one season earlier than the block they sum (BQ says Spring 2026 and sums Autumn 2027) | see B01 scout; `… › 3 Year Plant Look Ahead (Keysto › BQ8:BV8` | high (reported by scout B01) |
| `…/Trees that Count Audit 2025 Sit` (sheet) | 2025 | Holds the 2019 per-site breakdown | `_JMN Plants Out Master.xlsx › Trees that Count Audit 2025 Sit › D3:AL105` | high (scout B23) |
| `Seed records_May 2022.xls`, `…_August 2022.xlsx`, `…_Nov 2021.xls` | month and year of the copy | The "August 2022" seed log has sown dates up to 10 Oct 2022, later than its name | `…/Archive/Archive Seed Records/2. Seed records_August 2022.xlsx › Sheet1 › G` | medium |

(The file named "…Autumn 2027" and the "To be updated" sowing list are the two clearest cases of a name pointing at a year the file does not hold.)

### 6.5 Plants Out MASTER season blocks

`_JMN Plants Out Master.xlsx › MASTER › G1:PY1` repeats the season label across every site column in the block (409 header cells), with the site name in row 4, a site ID in row 5 and the landowner type in row 6. A block is Autumn then Spring for each year 2015 to 2025, then Autumn 2026 only. The year is 4 digits; the season word is upper, lower or title case. Totals are the first column after each block (e.g. `T`, `AP`, `BG`).

### 6.6 Season boundaries stated by WRT

Planting: Spring Sep to Nov, Autumn Mar to May (shared brief). Production year: August to July (potting-on book titles). The seed log and sowing lists have no season column, so a sow date in Feb (S 2026 label, seed collecting) cannot be assigned to a production year without the August cut-off. confidence: high.

---

## 7. Identifier and code systems

Full detail, with regular expressions, is in `04f_identifier_patterns.csv`. Summary:

### 7.1 Seed tags (the "S" numbers)

The Seed log (`Seed records MASTER › Sheet1 › A4:A956`) shows **three eras** and one clean restart. Rows 4–407 = era 1, 408–568 = era 2, 572 = a second header row, 573–956 = era 3.

| Era | Rows | Tag style | How many | Distinct | Evidence |
|---|---|---|---|---|---|
| 1. Plain serial | A4:A407 | `S1` to `S329` (with the occasional `a` suffix) | 335 | 333 | `S156` twice (A187, A188), `S275` twice (A346, A348); missing S36 and S195; suffix `S19a`, `S23a`, `S31a`, `S35a`, `S129a`, `S184a` (6 cells) |
| 2. Date-coded | A408:A568 | `S` + YY + month + sequence: `S2091`, `S20111` (5-digit, month unpadded), then `S21801` onward, then 6-digit `S210101` … `S220705` | 135 | 135 | First row S2091 = Sept 2020 (row 408). Last S220705 (row 568). 72 five-digit, 62 six-digit, 1 four-digit |
| 3. Serial restart | A573:A956 | `S1` to `S321` | 322 | 320 | Row 573 is `S1` collected 9 Mar 2022, sown 3 Aug 2022. `S155` twice (A763, A764), `S319` twice (A953, A954); S312 missing |

Key facts:

- **Tag numbers 1 to 321 occur in both era 1 and era 3.** About 317 numbers appear in both. So `S45` alone does not identify one lot. The `S322` and `S324` labels written in the 2026 sowing list (`Seed Sowing 2026 .xlsx › Sheet1 › I`, header `Label number`) are numbers that already exist in era 1 (A400, A402, sown Aug 2020). confidence: high.
- **The date-coded tags carry a date.** For the 6-digit tags, the YYMM part matches the *collected* month in 45 of 62 cases and the *sown* month in the other 17. For 5-digit tags the month is a single digit with no padding (`S20111` = 2020, month 11, number 1; `S2091` = 2020, month 9, number 1). confidence: medium (the tag convention is inferred from the match rate; WRT has not described it).
- **The Results register repeats the same tags** (S and C, and 129 species heading rows) in column A. Of 1,262 tag cells, 879 are distinct and 361 tags appear more than once. For S tags with a sown date, **611 of 729 rows (84%) match a Seed log row on tag plus sown date**; in 495 of these the tag has several Seed log rows and the date picks one. For C tags the figure is 455 of 488 (93%) against the Cuttings log. So **tag plus sown date** works as a join key for most rows; tag alone does not.
- **Tags carry noise.** Spaces after the letter (`S 89`, `S 90`, `S 94` in Seed log › A110, A111, A115; `S 12`, `S 97`, `S 35` and three `C n` tags in Results › A719, A720, A892, A548, A650, A921), suffix letters (`a`: 7 in Results), trailing text (`S210 seedlings`, `S220705  seedlings`, `S2091 seedlings …`), a stray backtick (`S121`` at A330, A975), a comma (`S10,` at A468 and 9 others), and an error cell (`#ERROR!` at A36). The `WRT 2016-17 seed.xlsx` file has its own numbering `S1`–`S53` with the same shape as era 1, so S1 to S53 repeat there too. Some tag cells also carry a place name or a first name after the number; these were not copied here (they are a seed-source/person leak into an ID field).
- **The "S" label on physical trays** (Sowing list label number, e.g. the `Notes` column in the 2024 and 2025 lists, `Label number` in 2026): 30 of 36 labels in the 2025 list match an era 3 row on tag and species; 29 of 40 in the 2024 list. Others differ in species, so they are probably typos or tags re-used for a different lot. confidence: medium.

### 7.2 Cutting tags (the "C" numbers)

`1. Cuttings records MASTER.xlsx › Sheet1 › A3:A538` has the same three-era shape:

| Era | Rows | Tag style | Count | Evidence |
|---|---|---|---|---|
| 1. Plain serial | A3:A346 | `C1` to `C322`; seven tags use an `a`/`b` suffix | 336 (330 distinct) | `C1` to `C322` mostly in order; tags `C209 1`, `C209 2` (A345–A346) are the first date-style ones |
| 2. Date-coded | A347:A468 | `C` + YY + month + sequence, 5 or 6 digits: `C20101`, `C201017`, `C210904`, `C220611` | 121 (all distinct) | 94 of 101 six-digit tags have YYMM equal to the year and month of the set date (E); 7 match YYMMDD instead. Row 348–355 five-digit tags are in Oct 2020. So the common style is YY + MM + sequence, **not** a full date. confidence: medium |
| 3. Serial restart | A470:A538 | `C1` to `C66` | 67 | `C1` set 9 Sep 2022 (E470) |

Cuttings tags run on from the seed tags in the Results register, so a tag of the same shape (`C61`, `C61b`) can refer to either log's era.

### 7.3 Results register has no row ID

Column A of the Results register mixes species headings (129 rows) with tags. There is **no tray-row code and no separate tray ID**: each tag row is one tray or batch. I looked for a code such as `T1` or `R3` in column H and in the stray cells beyond column J. Wording about trays occurs in notes (103 notes mention a tray; `T28` appears as a container name), but I found no code system. confidence: medium (searched notes and stray cells by pattern; the register has 256 columns, only A to H used regularly).

Stray cells exist far to the right (`FB`–`FI`, `DF`–`DG`, `IV`) holding a C tag, a source column, a number and two dates (e.g. `FE1028:FH1028`, `FE1037`). These are fragments of earlier rows pasted aside and not part of any ID system. confidence: medium.

### 7.4 Species running numbers (1 to 98 or 99)

| Place | Range | Gaps | Evidence |
|---|---|---|---|
| Plants Out MASTER › MASTER › A8:A105; Master Plant List › C4:C101 | 1 to 98 | none | 98 numbered rows; row 106 species unnumbered |
| Potting-on 2026-27 › Summary › A4:A101; month sheets › A4:A101 | 1 to 98 | none | same species order as MASTER (98 of 98 identical) |
| Forecast master › A13:A110 | 1 to 98 | none | 97 of 98 identical to MASTER; the two differing names differ only in spelling or a non-breaking space (63, 74) |
| `Master plant list 2024.xlsx`, `…(4).xlsx` | 1 to 99 | skips 65, 79, 87, 89, 92 | scout B03 |
| `Suggested plant speies and numbers…` | 1 to 99 | 89 numbers filled | scout B04 |
| Plant allocation books (`[name] template…` sheets) | 1 to 99 | 89 numbers filled | scout B20, B22 |
| Stocktake spreadsheets May 2020, Oct 2023 | 1 to 99 | jumps and blanks | scout B18 |

So the number is **consistent in the current 98-species trio and drifts in older lists**. It is a row counter (`=A13+1` in places), not a stored species ID. Do not use it as a key across years. confidence: high.

### 7.5 Site and area codes

| Code | Where | Pattern | Notes and evidence |
|---|---|---|---|
| Site ID, Plants Out MASTER row 5 | `MASTER › G5:PY5` | Number with optional letter: `15`, `9G`, `13C`, `12A` | 303 populated cells across 411 site headers. Numbers appear as `9.0`-style floats (139) or with a letter (163), plus one `!!A`. **The same ID is repeated in each season block** and attached to 2 to 4 different spellings of the site name (25 IDs have more than one spelling; e.g. `9A` with 4). Blank for all Autumn 2026 columns |
| Sub-site IDs | same | letter A–G after the number | `1A` to `1E`, `4A`/`4B`, `5B`/`5D`/`5E`, `6A`/`6B`, `9A`/`9E`/`9G`, `12A`/`12B`, `13A`/`13B`/`13C`, `20A`/`20B`, `21A`/`21B`, `22A`/`22B`/`22C`, `23A`/`23B`, `28A` |
| Old and new site ID | `HISTORIC SUMMARY SITES › B3:C59` | Old ID as a formula (`=MASTER!$L$n`), new ID as above | 14 of the 25 old-ID cells are `#REF!`; the sheet was frozen on 22/11/2016 (`D2`) |
| Area code in sheet and header names | `01 Keystone Sites Plants Summary.xlsx`, `Aug 2025 Keystone Sites Plants Summary.xlsx` and the forecast master | Name plus bracketed code: `Whitechapel (15)`, `Lake Hayes Pavilion (9G)`, `Slope Hill Rd (11)`, `Bush Creek (13C)`, `Peace Park (21)`, `Feehly Hill (12A)`, `Lake Hayes South (9A)`, `Earnslaw Slipway (22A)`; header cell `Jardine Park(23B)` on two sheets | The codes match the Plants Out MASTER site IDs (e.g. 9G, 13C, 12A, 9A, 22A, 21, 15, 11). `Jardine Park(23B)` appears on both the `JARDINE PK` and `Ref Gardens` sheets, so two sheets share one code. confidence: high for the match (same codes, same site names), medium for meaning of `23B` |
| Planting area code (e.g. `WH-06`) | whole workbook set | `XX-NN` | **Not found.** A search of every sheet for the pattern `[A-Z]{2}-\d{2}` gave no hits in the Excel files. Planting areas appear to be a new concept. confidence: medium (the PDFs, docx and GPX were not text-searched for the pattern) |

### 7.6 Other codes

| Code | Notes |
|---|---|
| Container codes `V150`, `T28`, `PB3`, `35F`, `63F`, `90`, `7`, `5` | Not IDs but a controlled-ish vocabulary stored in free text (e.g. `4 V150`, `14 T28`, `3 35F, 20 T28`). The legacy numerics (7, 5, 90, 35F, 63F) sit beside the current codes in the Seed log › J and Cuttings log › H. The Results register › G (`%survival`) holds container codes in 91 cells |
| Trees That Count flag | `Y` (over 5 m) in a column headed `Trees that Count >5m (Y)` (Master Plant List › A) and `x`/`Y` elsewhere; `T` = threatened (Master Plant List › B). Flags, not IDs |
| Paper4Trees and TTC codes | **No code or ID column was found** in `Paper 4 Trees/Whakatipu Reforestation Trust 2025.xlsx`, `…2026.xlsx` or `JMN Plant Orders for Spring 2024.xlsx` (bin sizes, species and quantities only). The `Paper4Trees Order 2019.docx` lists orders by recipient. The Paper4Trees and Trees That Count PDFs were not read. confidence: medium |
| GPX `ogr:ID` | `Remnant_kowhai_2019.gpx`: 94 waypoints, 92 carry an `<ogr:ID>` value, all 92 distinct. Shape: one or two capital letters then a number (e.g. `K12`), numbered 1 to n within each letter prefix (12 prefixes, largest 35). No waypoint has a `<name>` or `<time>`. The letter prefixes look like the short site codes used in the seed log's site column. Values, prefixes and coordinates are withheld because they locate seed sources. confidence: medium for the link to seed-log site codes (pattern similarity only) |
| Site code in Seed log › C | Abbreviations of up to a few capital letters, plus full names for later rows (the column is a seed-source location; values withheld). No lookup table exists in the workbooks |

---

## 8. Number formats that change how a date is read

Display depends on the format, not the stored value, so two files can show the same date differently.

| Format code | Reads as | Files |
|---|---|---|
| `mm-dd-yy` (built-in short date) | follows the PC's regional setting | Seed log, Cuttings log, Results register › D, 2016-17 file, seed collecting 2026 |
| `m/d/yy`, `mm/dd/yy`, `mm/dd` | US month-first | Potting-on headers; seed collecting 2026 (8 + 7 cells) |
| `[$-409]m/d/yyyy` | explicit US English | all `.xls` archive copies |
| `d/m/yyyy;@` and `d/m/yyyy` | explicit NZ order | Results register › E and older results copies |
| `dd"  "mmm"  "yy` | day, month name, 2-digit year | the three "August 2022" files |
| `mmm-yy`, `d-mmm`, `mmm d` | partial dates | Seed log › D (17), Cuttings log › E145; `_JMN Plant Allocations Spring 2026.xlsx › Industry Planting › H2` (22 Oct 2026) |
| `General` | shows serial numbers | `2. Seed records.xlsx` (the archive file where D, G, H are serials) |
| `@` (text) | forces text | `WRT 2016-17 seed.xlsx › Seed › E16:E28` (`8/16`, `fresh`, `no`) |

---

## 9. What this means for a clean data model (descriptive)

- Store the **raw cell text** next to a **parsed date**, a **precision** (day, month, season, year, unknown) and a **flag** (swapped, year-suspect, serial, note).
- Do not parse potting-on or collecting-record dates by cell type alone. Use the sheet's month as a check.
- Treat tags as **tag + era + sown date** until WRT agrees a new ID.
- Keep production year, calendar year and planting season as separate fields, with the chain offset (section 6.3).
- Plan for stale as-at stamps (section 3) and name-versus-content mismatches (section 6.4); the file name should not set the year.

---

## Questions for WRT

1. **Seed and cutting tags.** Is the date-coded style (`S2091`, `S210101`, `S220705`, `C20101`, `C220611`) meant to be year + month + running number, and is the month the collecting month or the sowing month? Who decided to restart from `S1` and `C1` in 2022, and is a tag now meant to be unique within each year or only within the current sheet?
2. **Swapped dates.** Several date headers in the potting-on books and the 2026 collecting record read as the wrong month (for example an August session shown as December). Can you confirm the true dates for the 2026 collecting record (the copy named "updated May 15 26" and the copy in the folder from the propagation lead disagree), and which copy is the master?
3. **The 2026 seed sowing list.** `Seed Sowing 2026 To be updated.xlsx` holds 2025 data and `Seed Sowing 2026 .xlsx` holds only 11 rows. Is the 2026 list started again each January as your note says, and which file is current?
4. **Production year.** Is the production year always 1 August to 31 July? Which year does a seed sown in February belong to: the year before or after the August start?
5. **Pricking out to planting lag.** The records summary says pricking out in 2024/25 is planted in 2026/27. Is "two seasons later" always two planting seasons (about 12 months from pot-on), or can it be longer for slow species?
6. **Autumn 2027 file.** `JMN Plant Allocations Autumn 2027.xlsx` has the 2026 stocktake stamps and no 2027 counts. Is it a blank template for Autumn 2027 or a copy of the spring 2026 sheet?
7. **Stocktake file dates.** Three stocktake files keep the sheet name `Oct 24`, and `20 May 2025` is stamped 28 May 2025. Which date should count as the stocktake date: the file name, the stamp, or the date the count was done?
8. **Impossible dates.** Can you confirm or correct the few dates that cannot be right (for example sown 2003 for tag S86 in the new series; cuttings set 21 Aug 2027 for C129; sown 26 Dec 2026 for C61b; pricked out 2012 in the results register)? We have not changed them.
9. **Site and area codes.** Are the numbers in brackets (15, 9G, 13C, 12A, 23B and so on) the same site IDs used in the Plants Out MASTER row 5, and are `23A` and `23B` two areas of Jardine Park? Is there a list that maps old IDs (14 are now broken) to new ones? Is there a planting area scheme (such as `WH-06`) in use anywhere outside these spreadsheets?
10. **Paper4Trees and Trees That Count.** Do those schemes give WRT any reference or order number that should be kept against a planting or an order? None appears in the spreadsheets.
