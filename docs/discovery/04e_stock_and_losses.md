# S4e: Stock, stocktakes and losses

Specialist report for the WRT data discovery. Read-only analysis of the stocktake files (B16, B17, B18), the stocktake columns inside the allocation masters (B19 to B22), the Potting On Summary sheets (B13 to B15), the pricking-out lists (B05), the seed, cutting and results registers (B08, B10 to B12), the plant orders (B24) and the Plants Out Master (B23).

**How to read this report.** Paths are relative to `_ALL Plant Lists/` and written `file › sheet › range`. "Confidence" is given where something is inferred rather than seen. I re-opened source cells only to check points; no source file was changed. Seed-source locations, personal names, initials and contact details are not reproduced. Where a column header or stamp carries a staff name or initials, I say "header carries a staff name".

## 1. Headline findings

1. **Stock is a snapshot, not a running tally.** Every stocktake is a separate file or column with a full species-by-container count. Nothing adds pricking-out and potting-up flows to a stock balance, and nothing deducts plants allocated or planted. The only "running" figures are for plants going out (the Plants Out Master and a typed "running total" on the allocation Notes sheet). Confidence: high.
2. **About 24 stocktake events are findable between June 2018 and August 2026** (table in section 2.1). Whole-nursery counts run roughly twice a year from 2018 to 2025. The V150 propagation count has been done every March since 2023, with a first one in February 2022. There is no whole-nursery count between 28 May 2025 and Feb 2026, and none for autumn 2021 or spring 2021 in spreadsheet form (one PDF for May 2021).
3. **Three different layouts of "what was counted".** 2018 to 2019: pot sizes (PB3, Pot, 5, 7, 9, 1L, V150, 35F, Root). 2020 to 2023: North/South nursery by container. 2024 to 2025: PB3 south/north by large/small, with V150 and T28 merged. 2026: Stage 2, 3 and 4 (V150, PB3 growing, PB3 ready) with T28 in separate columns. The species list is mostly stable (69 of 141 distinct name strings appear in all 12 whole-nursery lists) but the row count wanders between 91 and 104.
4. **Allocation "Available" is a hand-copied figure.** In all three allocation workbooks checked, the stock columns are typed values copied from a stocktake (identical in 92 to 101 of about 100 species), not links. They mix different stocktake dates and different definitions (ready only, ready plus V150/T28, or an undated February stock figure). The allocation workbooks also add stock that does not yet exist (planned buy-in, council supply, school stock).
5. **Losses have no field.** There is no loss quantity or loss reason column anywhere that works as one. Losses show up as (a) V150 stocktake surplus/deficit columns, which measure pricked-out against target and not deaths; (b) free-text notes ("84 gone", "96 gone!", "Deaths from dryness"); (c) typed arithmetic inside count cells (`=41-10`, `=48+18-15`); (d) "discarded"/"dead" text typed into the count columns of the seed, cutting and results registers; (e) narrative annual reports. A first-pass comparison of V150 movements against Potting On totals leaves a gap of roughly 3,000 to 4,100 plants a year that no record explains (confidence: low, see 5.3).
6. **Bought-in stock is recorded in headers, not as records.** Supplier names appear as column headings in allocation sheets and order forms (Home Creek, Springburn, Pukerau, Queenstown Nursery, Matukituki Natives, QLDC, school nurseries). Supplier, date and quantity are never together in one row. The Master Plant List columns "Grown at JMN" and "Purchased through Nursery" are empty for all 98 species.
7. **Allocated plants are never reconciled against planted plants.** The Plants Out Master "Spring 2025" block equals the Spring 2025 allocation species by species (98 of 98 totals identical, 6,248 plants). The "Autumn 2026" block equals the Autumn 2026 allocation in 96 of 98 species. These "planted" numbers are typed constants (353 constants, no formulas in the Autumn 2026 block). Confidence: high for the match, medium for the reading that no post-planting count exists.

## 2. Stocktake structure and frequency (2018 to 2026)

### 2.1 Every stocktake date found

Counts below are my own column sums over the species rows (not the typed totals in the files) unless marked "typed". "S" and "N" are South and North nursery. A dash means not counted. Species rows are the number of non-blank species cells in the main block.

| # | Date | File › sheet › range | What was counted | N/S split | Large/small split | Species rows |
|---|---|---|---|---|---|---|
| 1 | 5 Jun 2018 | `4. Stocktakes/Old Stocktakes/JMN Stocktake 5 June 2018.xlsx › STOCKTAKE › A7:H97` (also PROJECTED A2:C90) | PB3 6,863 (59 species); "Root" 504 (2 species, the precursor of V150); Pot, 5, 7, 9 columns empty | none | by pot size, but pot columns empty | 91 |
| 2 | 21 Oct 2018 | `…/JMN Stocktake 21 October 2018.xlsx › STOCKTAKE › A7:J104` (PROJECTED, Sheet2 helper) | PB3 6,054; Pot 454; "5" 789; "7" 1,702; 1L 233; V150 3,293; 35F 373 | none | by pot size | 98 |
| 3 | 12 May 2019 | `…/JMN Stocktake 12 May 2019.xlsx › STOCKTAKE › A7:I105` (PROJECTED, Sheet1 print copy) | PB3 6,348; Pot 826; "5" 9; "7" 60; 1L 531; V150 7,877; 35F 855 | none | by pot size | 99 |
| 4 | 26 Oct 2019 | `…/JMN Stocktake 26 Oct 2019.xlsx › STOCKTAKE › A7:F105` | V150/35F 7,424; 1L pot 15; PB3 6,758 | none | none | 99 |
| 5 | 29 Jan 2020 | `…/JMN PB3 Stocktake 29 Jan 2020.xlsx › STOCKTAKE › A7:E104` | PB3 only, 9,946 (V150/35F column blank) | none | none | 98 |
| 6 | 27 May 2020 | `…/oldJMN PB3 Stocktake 27 May 2020.xlsx › STOCKTAKE` | Blank template stamped 27/05/2020: no counts | none | none | 98 (names only) |
| 7 | May 2020 (day not stated) | `…/Stocktake Spreadsheet  May 2020.xlsx › Sheet1 › A3:H110` | PB3 North 2,643 (32 species); PB3 South 7,870 (67); V150/35F 3 (one cell); free-text comments in C | **First N/S split** ("North Nursery (Old)", "South Nursery (New)") | none | 104 incl. "Other Species" block |
| 8 | 7 to 10 Oct 2020 | `…/07 Stocktake October 2020.pdf` (3 pp; PDF printed from Excel on 16 Oct 2020; read from the printed text only) | Production goal; North: 2020 cuttings 220 and 2019 V150/35F 7,393; South: potted on from Aug 2020 1,146 and from Jan to May 674, 2020 PB3 3,605, older PB3 1,190; "Pukerau" V150 814; "Jardine Park surplus" 181; total 15,223 | N and S, plus off-site columns | by age of PB3 | about 81 (rough count) |
| 9 | 5 to 22 May 2021 | `…/May 2021 North & South Nursery Stocktake.pdf` (3 pp; printed 23 May 2021) | Goal; "Autumn Planting Total" 5,132; South Boundary 28; Reference Garden 73; North V150 and 35F 11,917; potted on Jan to May 2,097; **"Purchased Stock 2021" 697**; remaining PB3 4,316; total PB3 7,110 | N and S | none | about 85 |
| 10 | 23 Feb 2022 | `Old propagation stocktakes/2022 Prop Stocktake 23 Feb 2022.xlsx › Sheet1 › A3:I93` | V150 propagation stocktake: bench location (21 codes), goal, larger, smaller, total, surplus, deficit; "Not listed to propagate" block (rows 82 to 93). Many values are text such as "360+", "~96" | none (bench codes only) | larger/smaller | 83 |
| 11 | May 2022 | `…/2022 MAY Stock Take.pdf` (2 pp; printed 27 May 2022) | North PB3 1,866; South PB3 5,959 (each with a Location column); T28s 1,157; total PB3s/T28s 8,982; subtotal PB3s and pots 7,825 | N and S | none | about 81 |
| 12 | Oct 2022 | `…/Stocktake Spreadsheet October 2022.xlsx › Sheet1 › A3:H99` | V150/35F (North) 6,532; T28 1,064; PB3 (South) 5,161; typed total 12,757. Comments columns empty | N and S | none | 97 |
| 13 | 31 Mar 2023 | `2. Propagation (cuttings and seeds)/_Pricking out lists/Archive/4. 22-23 plant projections Final.xlsx › Sheet1 › A1:G81` | V150 stock on 31.3.23, 11,655, against a projection of 11,585; surplus 1,925; deficit 1,811 (all typed in row 81) | none | none | 79 (plus 3 extras) |
| 14 | Oct 2023 (1 Oct 2023 per the date header in item 15) | `…/Stocktake Spreadsheet October 2023.xlsx` and `…October 2023(1).xlsx › Sheet1 › A3:I105` (two copies, 5 species names differ) | T28 1,016 (7 species); "Small PB3" 2,775 (30); PB3 3,356 (45); **V150 not counted** | N headings (V150, T28) and S headings (PB3) | first "Small PB3" category | 99 and 98 |
| 15 | 28 Feb 2024 | `4. Stocktakes/2025/Rolling Stocktakes Feb 2024.xlsx › Sheet1 › A1:E101` | Column B: the Oct 2023 PB3 count (3,311); column C "Ready (incl T28)" 9,608; column D "Small" 439 (8 species only); column E total 10,047 | none | Ready/Small | 98 |
| 16 | 27 Mar 2024 | `Old propagation stocktakes/2024 prop stocktake 27 March24.xlsx › Sheet1 › A1:G89` | V150 stock 12,428; pricked out in 2023/24 11,837; projected 10,680; surplus and deficit columns blank | none | none | 82 plus 3 extras |
| 17 | Jun 2024 (form only) | `Stocktake templates/AA Stocktake Form Master June 2024.xlsx › Stocktake`; a "last updated" date of 4 Jun 2024 sits in `…/JMN Plant Allocation Master SPRING 2025.xlsx › Stocktake › B42` | Blank count form (name, number, location). No counts found | none | none | 99 pre-printed |
| 18 | 18 Oct 2024 (edited after 17 Nov 2024) | `4. Stocktakes/2025/18 October 24 JMN Stocktake.xlsx › Oct 24 › A7:H105`; later edit `Stocktake templates/JMN Stocktake  18 October 24.xlsx`; earlier draft `Old Stocktakes/PB Stocktake  18 October 24.xlsx` | V150/T28 557 (4 species); PB3 S large 2,841; S small 2,341; N large 105; N small 137; typed total 5,009 | **S/N** | **large/small** | 97 |
| 19 | 19 Feb 2025 | `4. Stocktakes/2025/19 Feb 2025 JMN Stocktake.xlsx › Oct 24 › A7:H108` | V150/T28 1,763 (typed 1,469); S large 6,581; S small 2,769; N large 304 (typed 108); N small 337 (typed 225); typed total 11,695 | S/N | large/small | 100 |
| 20 | 27 or 31 Mar 2025 (header says 27, footer and file name say 31) | `4. Stocktakes/2025/V150 stocktake 31.3.25.xlsx › Sheet1 › A1:H92` | V150 stock 12,544 (T28 2,277 of it; typed 2,212); pricked out 11,994; projected 10,708; surplus 2,296; deficit 884 | none | none | 83 plus extras (87 rows) |
| 21 | 28 May 2025 (file name says 20 May) | `4. Stocktakes/2025/20 May 2025 JMN Stocktake.xlsx › Oct 24 › A7:H109` (plus a column-shifted `Copy of Oct 24`) | V150/T28 1,362 (7 species); S large 4,175; S small 374; N large 459; N small 3,722; typed total 10,092 | S/N | large/small | 97 |
| 22 | Feb 2026 ("NS") | `4. Stocktakes/_Stocktake Master CURRENT.xlsx › Stage 4 Stocktake Sheet › A5:I41`; also `5. Seasonal…/2026 Autumn Plant Lists/Nursery Stock and planting list Feb 2026 for autumn(Sheet1).xlsx › D5:D88` (and an identical CSV in `4. Stocktakes/2026/`) | Ready plants only, 59 species with a count, total 5,390 (hard-coded, no container). Separate "Stock" figure 9,551 across 78 species, not split by container or readiness | none | ready only | 98 (form), 80 (list) |
| 23 | 31 Mar 2026 | `Old propagation stocktakes/V150 stocktake 31 March 2026.xlsx › Sheet1 › A1:H92`; same date in `_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › D4` | V150 stock 11,397 (T28 2,208 of it); pricked out 10,745; projected 11,096; surplus 1,133; deficit 1,460. Master: Stage 2 V150 9,245 plus Stage 2 T28 2,068 | none | none | 83 plus extras (87 rows) |
| 24 | 28 Apr 2026 | `_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › F4`; scanned printout `4. Stocktakes/2026/Nth Nursery PB3 April202628042026.pdf` (3 pp, no text layer, not readable) | Stage 3 PB3 growing 5,109 (48 species); Stage 3 T28 594 (3 species) | North Nursery (the PDF name; confidence: medium that it is the source of this column, same date) | Stage 3 = growing | 104 |
| 25 | 13 May 2026 | `_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › H4` | Stage 4 PB3 ready 4,702 (64 species); Stage 4 T28 1,004 (4 species); "Available" 5,706 | none | Stage 4 = ready | 104 |
| 26 | 12 Aug 2026 ("Updated 12/08") | Same Master F4 and H4; `…/_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations › G5, I5` | An update stamp on the Stage 3 and 4 columns, not a new count date. Earlier values were overwritten | none | none | n/a |

Other dated stamps that are not stocktakes: `1. Cuttings records MASTER.xlsx › Sheet1 › B1` says "Cuttings at 31.3.26" (cutting trays recorded as at that date); `2. Seed records MASTER.xlsx › Sheet1 › B1` carries a date of 21/9/2021; `…/Annual propagation reports/Propagation report for April 2022.docx` says another stocktake would be done "in late June" 2022. No June 2022 count was found (confidence: medium, it may not have been done or may not be in this folder).

### 2.2 Frequency and gaps

- **2018 to 2020:** June 2018, Oct 2018, May 2019, Oct 2019, Jan 2020, May 2020, Oct 2020. Gaps of 3 to 7 months, the usual pattern being spring and autumn plus a one-off PB3-only count in January 2020.
- **2021 to 2022:** May 2021 (PDF only), then Feb 2022 (V150), May 2022 (PDF), Oct 2022. No count for spring 2021 was found.
- **2023 to 2025:** V150 in March 2023, 2024 and 2025; whole-nursery in Oct 2023, Feb 2024 (compare of two dates), Oct 2024, Feb 2025 and May 2025.
- **2025 to 2026:** no whole-nursery count between 28 May 2025 and Feb 2026 (about 9 months), so spring 2025 allocation used May 2025 figures. In 2026 there are four count dates in six weeks (31 Mar, 28 Apr, 13 May, then an update on 12 Aug) which together make one composite "Autumn 2026" master.
- The V150 count is the most regular series: 23 Feb 2022, 31 Mar 2023, 27 Mar 2024, 27/31 Mar 2025, 31 Mar 2026.
- Date reliability is poor in the 2024 to 2025 files. Tab names stay "Oct 24" in the Feb and May 2025 files (`19 Feb 2025 JMN Stocktake.xlsx › Oct 24`; `20 May 2025 JMN Stocktake.xlsx › Oct 24`). The May 2025 file name says 20 May, its header says 28/05/25 and a comment is dated 26 May 2025. The Oct 2024 header says 18/10/24 but a cell comment in D17 is dated 17 Nov 2024. Anyone importing these should treat the in-sheet header stamp as the nominal date and the file save date as unreliable. Confidence: high.

### 2.3 Which containers and stages were counted, by period

| Period | Containers / stages | Notes |
|---|---|---|
| Jun 2018 | PB3, pots (Pot, 5, 7, 9), Root | Only PB3 and Root have numbers |
| Oct 2018 to May 2019 | PB3, Pot, 5, 7, 1L, V150, 35F | "35F" is a 35-cell tray; probably the older propagation tray before V150 (confidence: medium) |
| Oct 2019 to Jan 2020 | V150/35F merged, 1L pot, PB3 | Jan 2020 PB3 only |
| May 2020 to Oct 2023 | V150/35F (North), T28, PB3 (South), from Oct 2023 also "Small PB3" | V150 not counted in Oct 2023 (`October 2022 › D101` 6,532 against `October 2023 › D99` blank), so the two years are not like for like |
| Feb 2022 to Mar 2026 (March series) | V150 (with T28 inside it from 2025), pricked out in the year, projection | Separate from the PB3 counts |
| Oct 2024 to May 2025 | V150/T28 merged in one column; PB3 south large, south small, north large, north small | Note in `19 Feb 2025 › Oct 24 › H` says "all south = T28. Large ready for autumn, small for spring" |
| Feb to May 2026 | Stage 2 (V150), Stage 3 (PB3 growing), Stage 4 (PB3 ready), each with a T28 column | Master has no North/South split |

**T28 is counted inside the V150 stocktake and separately in the Master.** In the V150 stocktakes the "Stocktake" column includes the T28 plants and the "T28's" column is a part of it (e.g. 2025: Carex secta 467 = 420 T28 plus 47 V150, note in H8). The 2026 Master separates them. In 2026, for four of the five T28 species, Master column D is blank while the V150 file shows the same number as T28 (e.g. 416, 392, 392, 224), so adding the two columns would double count. Evidence: `V150 stocktake 31 March 2026.xlsx › D, E` against `_Stocktake Master CURRENT.xlsx › D5:E108`. Confidence: high.

### 2.4 North/South nursery and large/small

- North/South first appears in May 2020 (merged headers "North Nursery (Old)" and "South Nursery (New)" in `Stocktake Spreadsheet  May 2020.xlsx › C1, F1`). The scout questions whether the nursery moved; the May 2020 split is 2,643 N and 7,870 S PB3.
- 2024 to 2025: south/north by large/small. Counts are very uneven: in Feb 2025 north holds 4 species with large stock and 4 with small; in May 2025 north holds 6 large and **30 small** (3,722) while south small falls from 2,769 (32 species) to 374 (5 species). Either small plants were moved north between February and May 2025 or the columns were used differently. Confidence: low on which. Comments in `20 May 2025 … › F9, E12, F12` say "T28" or "All T28" for north cells, so some north counts are T28 trays.
- "Large = ready, small = growing" is stated only in one note (`19 Feb 2025 › Oct 24 › H`, "Large ready for autumn, small for spring") and in the Rolling Stocktakes sub-header (Ready/Small). It is inferred elsewhere. Confidence: medium.
- The 2026 Master drops the N/S split and uses stage instead; the only north reference is the scanned PDF name and a note that PB3 space is counted for the South Nursery (`Master › J3` "Total space needed in South Nursery for Winter 2026").

### 2.5 Species list stability

Method: names lowercased with spaces and non-breaking spaces trimmed, nothing else corrected. Typos therefore count as different names.

- The 12 whole-nursery lists (rows 1 to 5, 7, 12, 14, 18, 19, 21 and the 2026 Master) use between **91 and 104** species rows. Largest: 104 in May 2020 (includes "Other Species") and 104 in the 2026 Master. The smallest are the early ones (91 in Jun 2018, 97 in Oct 2022, Oct 2024 and May 2025).
- 141 distinct name strings occur across the 12 lists. 69 occur in all 12; 28 occur in only one (mostly typos and variants such as "Coproma brunnea", genus-only "Gaultheria", a "misc" row, a row labelled for an individual's plants, and later additions such as "Carex flagillera", "Coprosma wallii" and a client-tagged "Rata" line).
- Movement list to list: between 0 and 22 added and 0 to 15 dropped (largest change Jun 2018 to Oct 2018: 22 added, 15 dropped). The 2026 Master adds 10 names that are not in the May 2025 list (including Carex comans red, Coprosma wallii, Parsonia heterophylla, Leonohebe cupressoides) and lacks 3 that were there.
- V150 stocktakes use a narrower list (83 to 87 species) because only seed- and cutting-propagated species appear. Two lists disagree even in the same year: the 2026 V150 file has 4 species that the Master lacks (Carmichaelia compacta, Carmichaelia racemosa, Olearia nummularifolia, Pennantia corymbosa) and the Master has 24 that the V150 file lacks.
- Other lists for comparison: Plants Out Master Master Plant List 98; Potting On Summary 98 (plus 2 appended); Autumn 2026 allocation 113 rows; Spring 2026 allocation 102 rows; Feb 2026 stock list 80 species. The official species list is therefore not defined by the stocktakes (see Questions).
- Quality issues repeated in almost every stocktake: trailing and non-breaking spaces; variant spellings (e.g. "Weinmania", "Cyathoides juniperina" for what other lists call "Leptecophylla juniperina", confidence: medium that they are the same plant); species rows below the Total row that fall outside SUM ranges (e.g. Carmichaelia kirkii in `20 May 2025 › Oct 24 › A109:B109`; Astelia fragrans in row 106).

### 2.6 Stocktake columns embedded in other workbooks

| Where | What is embedded | How it relates to the stocktake files |
|---|---|---|
| `3. Potting On/Archive/2023-24 JMN Potting On - August 2023 - July 2024.xlsx › Summary › D3:E101` | "Stocktake Oct 2023" (total 3,311) and "Stocktake 28/2/24" (total 9,620); headers carry staff names; container not stated | Equal to the Oct 2023 PB3 count (94 of 94 species) and the Rolling Stocktakes Feb 2024 "Ready" column (86 of 96 species equal; 10 differ by small amounts or are missing). Typed copies. |
| `3. Potting On/2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx › Summary › D4:E101` | "Goal Set" column D (header carries a staff name) and "Less T28" column E | Goal equals the 31 Mar 2026 V150 count in 78 of 81 species. For the four T28 species the goal and the "Less T28" figure are the T28 stocktake figure (416, 392, 392, 644) so "Total to be potted on" becomes 0. This shows how the stocktake feeds the potting-on list: by hand. No formula or link. Confidence: high. |
| `…/2024-25 … Summary › D4:E101` and `2025-26 … › D4:E101` | Goal pulled by `VLOOKUP` from a master sheet in the same workbook; "Less T28" typed (2,070 in both years: 4 species) | The 2025-26 T28 deduction is a copy of 2024-25; it does not follow the 2,277 (Mar 2025) or 2,208 (Mar 2026) T28 counts. |
| `2. Propagation…/_Pricking out lists/Archive/4. 22-23 plant projections Final.xlsx › D1:F81` | Stocktake 31.3.23, surplus, deficit | See item 13 in 2.1. |
| `Allocation masters` (sections 4 and 7) | Stock columns E:G, H or E:J | Typed copies of stocktakes. |

## 3. Snapshot or running tally?

**Snapshot.** The B16 scout was right. Evidence:

1. Each file holds one date's counts per species and container. A new date is a new file (or, for the 2026 Master, a column overwritten: `Master › F4` reads "28/04/26 … Updated 12/08", i.e. earlier values are gone and no history is kept). Confidence: high.
2. The only multi-date table is `Rolling Stocktakes Feb 2024.xlsx`. It lays two dates side by side but is not cumulative: column E sums C and D (the Feb 2024 parts) and leaves out the Oct 2023 column B (`Sheet1 › E3:E100` is `=D+C`). "Rolling" means "compare two counts". Confidence: high.
3. Between counts nothing is posted to stock. Weekly pricking-out tallies are goals only (B06: the three tally workbooks hold goals with blank week and total cells). Potting-on logs add up plants potted into PB3 but do not subtract from V150. Allocations do not subtract from stock. Planting does not subtract either: the Spring 2026 allocation takes its "available" figure from a May 2026 recount that already reflects the autumn planting.
4. The count cells hide small running adjustments typed as arithmetic (e.g. `=48+18-15`, `=41+47-15-5` in `20 May 2025 › Oct 24 › C7:C8`; 20 subtraction formulas and 9 multiplication formulas in that one sheet; `=41-10` in `18 October 24 › D17` with a comment dated 17 Nov 2024 saying 10 plant deaths). These are mini ledgers inside one cell: the raw figure and the reason are lost except where a comment survives.
5. "Running" figures exist only for plants going out: `Plants Out Master › MASTER › PY8:PY105` (grand total across seasons, 140,049 in PY107), and a typed running total of 94,000 to 100,170 in `Autumn 2026 allocation › Notes › A21:B32` (stamped as Autumn 2024). Neither feeds stock.
6. After-the-fact edits mean a snapshot is not clean. Examples: notes in the 2024 V150 count such as "24 more after stocktake" and "71 more since stocktake" (`2024 prop stocktake 27 March24.xlsx › G30, G34, G70`); the Oct 2024 file edited after 17 Nov 2024.

## 4. How allocation "Available" is derived from the latest counts

The allocation step has three observed designs. None links to a stocktake file.

| Workbook › sheet | "Available" formula | Stock inputs | Source of the stock numbers |
|---|---|---|---|
| `Archive/2025 Spring Planting Lists/JMN Plant Allocation Master SPRING 2025.xlsx › Spring 2025` | `M = SUM(H:L)`; `L = SUM(E:G)` (rows 6 to 105) | E South large 4,201; F North large 505; G V150/T28 1,362; H Springburn 620; I Home Creek 1,080; J QT Nursery 80; K "To find" 705 | Typed. E and G equal the 28 May 2025 stocktake columns (94 of 94 species each); F equals in 92 of 94. The stocktake's two "small" (growing) PB3 columns (374 + 3,722) are **left out**, while V150/T28 (including V150 seedlings not yet potted on) is **included**. Sum of Available M: 8,553. |
| `2026 Autumn Plant Lists/JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026` | `L = SUM(H:K)` | H "StockTake" 9,489 (63 typed values); I "From QLDC" 413; J "From QT Nursery" 80; K "Buy IN" 25 (rows 6 to 119); L total 9,968 | H matches the Feb 2026 "Nursery Stock and planting list" Stock column in 77 of 78 species (total 9,551 there). It does **not** match the May 2026 Master (35 of 102) or the Stage 4 Feb 2026 sheet (14 of 78: 5,390 against 9,551). So "StockTake" here is a February stock figure whose container/readiness is not stated (confidence: low that it includes growing plants). The workbook's own `Stocktake` sheet is blank. |
| `2026 Spring planting/_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations ` | `R = I+J+K+L+M+N+O` (rows 6 to 107) | I Stage 4 PB3 4,644; J Stage 4 T28 1,228; K SPS stock 0; L QPS stock 242; M QLDC supplying E4N 1,285; N QLDC general supply 740; O "WRT to buy in" 2,450. R total 10,589 | E:J are typed copies of `Master CURRENT D:I`. Identical in 100/101 (V150), 97/101 (Stage 2 T28), 101/101 (PB3 growing), 101/101 (Stage 3 T28), 99/101 (PB3 ready) and 100/101 (Stage 4 T28). Own ready stock I+J is 5,872 against the Master's own "Available" (H+I) of 5,706. The remaining 4,717 of R is stock WRT does not yet hold (or does not own): schools, council, and planned purchases. |

Derivations in each case: Over/Under = Total Available minus Total Allocated (`Autumn 2026 › N6:N119 =L-M`; `Spring 2026 › U6:U107 =R-T`; `Spring 2025 › O6:O105 =M-N`). Negative means over-allocated.

Results at the species level:

| Season | Total Available | Total Allocated | Species short (negative) | Species with surplus |
|---|---|---|---|---|
| Spring 2025 | 8,553 | 6,248 | 9 species, −181 in total | 50 |
| Autumn 2026 | 9,968 (L122) | 4,562 (M122) | 2 species, −55 | 60 (+5,461 in total) |
| Spring 2026 | 10,589 | 9,779 (T111) | 2 species, −20 | 52 (+830) |

- In Spring 2026, 54 species are allocated more than WRT's own ready stock (I+J). The shortfall is 4,283 plants, which the buy-in, council and school columns (4,642) cover on paper. So an allocation can look fully supplied only because planned purchases are counted as stock. Confidence: high.
- The 2025 workbook has an explicit "To find" column (17 species, 705 plants, typed) for stock the team intended to track down. Ten of those 17 species are allocated more than own plus outside stock. No later file keeps this column.
- The Autumn 2026 total of available stock (9,968) is nearly double the May 2026 Master's ready stock (5,706). Because the Autumn 2026 sheet was built on February figures, 60 species show a surplus and very few a shortfall; most of that surplus is probably growing or already-committed stock (inference; confidence: low).

## 5. How losses and their reasons are recorded

### 5.1 Where losses can be seen

| Place | What is there | Loss reason? | Evidence |
|---|---|---|---|
| V150 stocktake: Surplus and Deficit columns (2025, 2026) | Surplus = pricked out minus projected where positive; deficit = projected minus pricked out where negative. Typed, not formulas. Entered for 42 of 53 differing species in 2025 and 41 of 42 in 2026; 40 of 42 and 41 of 41 entries match pricked-out minus projected. In 2024 the columns exist and are empty. | No. It measures production against target, not deaths | `V150 stocktake 31.3.25.xlsx › F:G`; `V150 stocktake 31 March 2026.xlsx › F:G`; `2024 prop stocktake 27 March24.xlsx › E:F` |
| 31 Mar 2023 list: surplus and deficit | Stocktake minus projection (stock-based, a different definition: Coprosma propinqua 1,600 against 1,560 gives surplus 40) | No | `4. 22-23 plant projections Final.xlsx › E:F` |
| Feb 2022 stocktake: Surplus/Deficit | Typed; four deficit cells in red font | No | `2022 Prop Stocktake 23 Feb 2022.xlsx › G:H` |
| V150 stocktake notes | Free text. 2024: 9 notes (1 loss: "84 gone", Carex virgata pricked out 84, stock 0, `G9`). 2025: 24 notes (loss or failure: "Deaths from dryness" Aristotelia fruticosa 72 pricked out, 37 counted, `H2`; "zero germination", `H18`; "poor germ. grub infested seed", `H48`; "no seed 2024", `H41`; "viable seed scarce", `H54`). 2026: 11 notes (one "Earlier cuttings failed", `H82`) | Sometimes, in prose | the three V150 files |
| 31 Mar 2023 list: notes | "96 gone!" (Griselinia littoralis, projected 48, stocktake 0, `G33`); "# alive?", "approx 30-150 alive" | Prose | `4. 22-23 plant projections Final.xlsx › G28:G33` |
| PB3 stocktake: typed arithmetic and comments | `=41-10` with a comment "10 plant deaths Nov 24" and a note in H17 "Reduced by 10x large as per … email on plant deaths in Nov 24" | Yes, but only for one cell | `18 October 24 JMN Stocktake.xlsx › Oct 24 › D17, H17` |
| PB3 stocktake: other subtractions | 20 subtraction formulas (e.g. `=23-5`, `=26-10`) in the 28 May 2025 file | No reason given | `20 May 2025 JMN Stocktake.xlsx › Oct 24 › C7:E105` |
| Allocation masters | Typed subtractions such as `=275-63`, `=100-8` in Slope Hill column T (Autumn 2026 allocation, 5 cells) | No | `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026 › T11, T27, T33, T75` |
| Seed records MASTER | The "#" (number pricked out) column holds 520 numbers, 240 blanks and 45 text values, 16 of them "discarded". Of 564 notes, 126 mention discard, 8 damping off, 5 dead/death, 7 failed or no germination, 57 surplus, given or spare. 211 of 767 sown rows have neither a pricked date nor a count (outcome unknown) | In prose in the Notes column | `_Seed and Cutting Records/2. Seed records MASTER.xlsx › Sheet1 › I4:K956` |
| Cuttings records MASTER | "#" set (D) and "#" pricked out or surviving (G; 396 numbers, 39 text such as "dead", "-"). "Pricked out" date column holds "dead" 6 times. An unlabelled ratio column J (217 values, mean 0.56) looks like a strike rate. Where both D and G are numbers (363 rows) 10,604 survived of 19,607 set (54%). Comments: 22 mention dead/died, 22 discard | Partly: strike rate is the only built-in loss measure. Reason is in the comment | `1. Cuttings records MASTER.xlsx › Sheet1 › D3:J525` |
| Seed & Cutting results MASTER | "# survived" (910 numbers, 327 blanks, 18 text such as "lots"); "%survival" column holds 386 fractions (383 up to 1, 3 above 1), 49 container codes (V150, T28, 35F) and 21 other text values; 799 blank. Notes column H: 114 "discard", 13 failure, 9 dead, 2 damping off, 64 pot-on or destination | Prose only | `3. Seed & Cutting results MASTER.xlsx › Sheet1 › F2:H1557` |
| Annual propagation reports (Word) | Narrative losses: "more losses than usual" (April 2022); stem rot from potting cuttings too deep and Olearia losses (April 2021); "damp off" sprayed 19 Jan 2022; two trays with damping off in 2024 (report for year ended December 2024) | Yes, in prose, no numbers | `2. Propagation…/Annual propagation reports/*.docx` |
| Potting On | Counts of plants potted into PB3 only. The year-end report asks (B15 question) whether losses and replacements are recorded: they are not | No | `3. Potting On/*/Summary` |

The intended mechanism is stated in WRT's own summary: *"V150 Propagation stocktake – confirm numbers of plants pricked out into seedling trays. This will account for any deaths in the pricking out list."* (`_Summary of Records JM Nursery.docx`, item 8). The V150 files do that comparison only at the species level and only as surplus/deficit against target.

"96 gone!" and "84 gone" are notes in cells that sit in the notes column, not the count. In both cases the count is zero or near it, so the note is the only reason a plant count fell to zero.

### 5.2 Pricked-out target against V150 count (the V150 stocktakes)

| Count date | Projected (target) | Pricked out in year | V150 stock on the day | T28 inside it | Surplus (typed) | Deficit (typed) | Species with stock above pricked out / below |
|---|---|---|---|---|---|---|---|
| 31 Mar 2023 | 11,585 | not recorded | 11,655 | not recorded | 1,925 | 1,811 | n/a |
| 27 Mar 2024 | 10,680 | 11,837 (typed total 12,377 "incl those pricked out later") | 12,428 | not recorded | blank | blank | 28 / 21 |
| 27/31 Mar 2025 | 10,708 | 11,994 (12,042 with extras) | 12,544 | 2,277 (typed 2,212) | 2,296 | 884 | 28 / 25 |
| 31 Mar 2026 | 11,096 | 10,745 (10,768 with extras) | 11,397 | 2,208 | 1,133 | 1,460 | 22 / 26 |

- The "Projected" column in each March file equals a pricking-out list: 2024 file equals `Pricking out 2023 - 2024 for 2024-2025.xlsx` (83 of 83 species), 2025 file equals `Pricking out 2024-25 for potting 25-26.xlsx` (84 of 84), 2026 file equals the 2025-26 list in 54 of 58 species. So the loop target, pricked out, counted is visible in one sheet. Labels such as "Projected PU25/26" are not updated between years.
- Stock on the day is usually higher than what was pricked out that year for about half the species (carry-over from the previous year), so "stock below pricked out" cannot be read as loss. The two columns are a flow and a stock.
- Net surplus/deficit differs from total pricked out minus projected: 2025: 11,994 − 10,708 = 1,286 against typed 2,296 − 884 = 1,412 (126 difference from 2 mismatched entries and 13 differing rows with no entry); 2026: −351 against −327.

### 5.3 What the V150 records say about unexplained loss (low confidence)

A crude balance on matched species: V150 stock at last March + pricked out in the year − V150 stock this March = plants that left V150 (potted up into PB3 or lost).

| Window | Matched species | Implied outflow | Potting On total for the same window | Gap |
|---|---|---|---|---|
| 31 Mar 2024 to 31 Mar 2025 | 81 | 12,428 + 11,933 − 12,483 = 11,878 | Apr 2024 118 plus Aug 2024 to Mar 2025 8,800 = 8,918 (May to Jul 2024 and Apr 2025 are 0) | about 2,960 |
| 31 Mar 2025 to 31 Mar 2026 | 83 | 12,496 + 10,745 − 11,397 = 11,844 | Aug 2025 to Mar 2026 7,710 (Apr to Jul 2025 are 0) | about 4,134 |

Sources: `V150 stocktake` files above; `2023-24`, `2024-25` and `2025-26 … Potting On … › Summary › row 102 or 104`. This gap is the sum of losses, plants given away or sold, V150 stock that stayed in V150 in a different container, transfers into T28 and PB3 not in the log, and the fact that cuttings potted up appear in Potting On but not in V150 pricked-out counts (which would make true loss larger). Two species per year come out negative (more stock than inputs). The windows do not align perfectly with the Aug to Jul potting year. I give the number only to show the order of magnitude; I do not claim it is a loss rate. Confidence: low.

### 5.4 What cannot be measured from the records

- **Germination and survival from seed:** the "Amount" sown is a text volume ("1/2 tsp", "1 cup fluff", trays) in both `2. Seed records MASTER.xlsx › F` and `3. Seed & Cutting results MASTER.xlsx › C`, so there is no sown count to divide by.
- **Survival from cuttings:** possible from D and G where both are numbers (54% overall) but the unlabelled J column disagrees with G/D in 34 of 173 checkable rows in the 2022 file (`1. Cuttings records_August 2022.xlsx › J`).
- **Survival from pricking out to PB3 and from PB3 to planting:** no record links the pricked-out batch (tag number) to the PB3 stock. The stocktakes are by species, not by tray tag.
- **Losses between ready PB3 and planting:** not recorded anywhere.

## 6. Bought-in and donated stock

### 6.1 Where it is recorded

| Supplier or source (organisations only) | Where | Date | Quantity | How it is recorded |
|---|---|---|---|---|
| Pukerau Nursery | `07 Stocktake October 2020.pdf` column "Pukerau" V150s Oct-20 | 7 to 10 Oct 2020 | 814 | Stock count column, not marked as purchased (confidence: medium that this is stock held or bought there) |
| | `JMN Plant Orders for Spring 2024.xlsx › Sheet1 › D5:D23` | emailed 14 Mar 2024 | blank in all species rows | Order column, empty |
| | `1. Cuttings records MASTER.xlsx › Sheet1 › I119, I120, I144` ("stock plants ex Pukerau") and `3. Seed & Cutting results MASTER.xlsx › B230, B231, H690` | undated | per tray | Free-text source or destination: stock plants taken from there; spare seedlings given to them |
| Home Creek Nursery | PDF invoice `Plant Orders/Inv_2013279_from_Home_Creek_Nursery_Ltd.pdf` | 12 Oct 2023 | about two dozen species lines, PB2 and 1 L pots | Only dated, itemised record of a purchase found. Not in any spreadsheet |
| | `JMN Plant Orders for Spring 2024.xlsx › C` | 14 Mar 2024 | blank | Order column, empty |
| | Spring 2025 allocation `› I` (1,080 across the sheet); `Jardine Park plant list 2025.xlsx › H` (1,120); `Jardine Park Plant List - Home Creek.xlsx › D` (order total 1,235, date in D1 8 Oct 2025) | 2025 | 1,080 / 1,120 / 1,235 | Three different totals for the same order stream |
| Springburn Nursery | `JMN Plant Orders for Spring 2024.xlsx › E` ("Springburn (PB3)") | 14 Mar 2024 | 600 (4 species) | Only supplier column with any quantity |
| | PDF quote `Archive/2025 Spring Planting Lists/Quote QU0467.pdf` | quote 7 Aug 2025, for supply October | 381 plants on 10 lines at least | Quote with availability remarks (e.g. only 30 of 40 available) |
| | Spring 2025 allocation `› H` (620); `Jardine Park plant list 2025.xlsx › G` (635) | 2025 | 620 / 635 | Header column |
| | `2. Seed records MASTER.xlsx › K596, K751` | 2025 | some | Seedlings given to Springburn in exchange for another species |
| Queenstown Nursery ("QT Nursery", "QT Nursery (Paererewa)") | Spring 2025 allocation `› J` (80); Autumn 2026 allocation `› J` (80); `Jardine Park plant list 2025.xlsx › I` (405); Spring 2026 `Sheet18` (header "QT Nursery", column "Size", 37 species, 2,400) | 2025 to 2026 | 80 / 80 / 405 / 2,400 | Spring 2026 `Sheet18` equals the Master's "WRT to buy in" column O in 37 of 37 species; the master adds one more (Chionochloa rigida, 50) so 2,450 against 2,400. This is a plan, not a delivery |
| Matukituki Natives | `Jardine Park plant list 2025.xlsx › J` | 2025 | 57 (2 species) | Header column; also an "ex Matukituki" source tag in the cuttings and results registers (probably the same nursery, confidence: low) |
| Te Kakano (nursery trust) | `3. Seed & Cutting results MASTER.xlsx › A453` ("ex Te Kakano" heading); tray list `At 27 February 2025 Seed and Cutting trays active.docx` (two lines) | undated; Feb 2025 | per tray | Free text as the source of seedlings. The word also appears in a 2018 species-list review (a staff resources folder) |
| QLDC (council) | Autumn 2026 allocation `› I` "From QLDC" 413; Spring 2026 `› M` "QLDC supplying E4N" 1,285 and `› N` "QLDC general supply" 740; Autumn 2027 file `› L, M` | 2026 | 413 / 1,285 / 740 | Per-species columns in the allocation sheet. No dates or delivery records. Negative values (−50, three cells) appear in the "QLDC general supply" column of the Autumn 2027 file |
| School nurseries (QPS, SPS) | Spring 2026 `› K, L` (242 for QPS, SPS empty); Spring 2025 "Incl schools" `› H:I`; note beside the form: "Shotover Primary 352; schools produce 700 (1000) per year" | 2025 to 2026 | 242 / 352 | Counted as available stock in the allocation sheet (Spring 2026 R includes L) |
| "Purchased Stock 2021" (supplier not named) | `May 2021 North & South Nursery Stocktake.pdf` | May 2021 | 697 | A stocktake column, the only one explicitly called purchased |
| Planned purchases for a site | Stocktake side panel "Plan to buy in 2000 for Jardine Park" (`18 October 24 …`, `19 Feb 2025 …`, `20 May 2025 … › J11`) | Oct 2024 to May 2025 | 2,000 | Planning note on the stocktake sheet; no later record of whether it happened |
| Bulk customer's order | `_Pricking out 2026-27 for potting 27-28 .xlsx › Sheet2 › C:E` (8,000 plus 2,500 "spares" = 10,500; the customer name is a person's, withheld); `Pricking out 2023 - 2024 for 2024-2025.xlsx › D` | 2023 to 2026 | 8,000 / 10,500 | An outflow target, not stock bought in. Listed here so it is not read as supply |
| Donated | No donated plants are recorded. The only donation is T28 trays given by Zealandia (`Annual Propagation summary April 2021.docx`). Outgoing gifts: 57 seed-record notes and 63 results-register notes mention surplus, given or spare | n/a | n/a | Free text |

Also: `Master Plant List` columns "Grown at JMN" and "Purchased through Nursery" are headed but empty for all 98 rows (`Plants Out Master › Master Plant List › G3:H101`). The 2025-26 draft pricking-out list has a note "maybe buy in?" (`Pricking Out List for 2025_2026.xlsx › F9`).

### 6.2 How consistently

- Supplier names are always column headings or free text. They are never a field on a row. A plant's origin therefore cannot be traced from a count.
- Quantities are sometimes plans (order forms, "To buy in", "WRT to buy in") and sometimes counts ("Purchased Stock 2021", "From QLDC"); the sheets do not say which.
- Dates are rare: file names, one invoice, one quote, one "date in D1". The allocation sheets give season labels only.
- Totals for the same supplier in the same season disagree (Home Creek 1,080, 1,120, 1,235 for Spring 2025).
- Bought-in stock is added to "Total Available" in the allocation sheets but not to the stocktake. So bought-in plants exist in the allocation workbook but not in any stock count (confidence: high).
- The seed Source columns in the registers mix collection places and nursery names ("ex …"). I have not reproduced collection places.

## 7. Allocation sheets: consumption, disagreeing totals and reconciliation

### 7.1 How allocation consumes stock

Species rows, site columns. Total Available (stock plus bought-in) minus Total Allocated (sum of site columns) gives Over/Under. Site sheets (one tab per site in 2025 and the Autumn 2026 master, or one master tab and site views in Spring 2026) are print-outs of one master column: `Whitechapel › B5:H38` equals `Plant Allocations ›  W6:W107` by link. The site sheets carry a "Location" column for the planting area that is empty in every sheet (e.g. `Slope Hill › C5:I38`, `Whitechapel › C5:I38`). The allocation therefore stops at site level; planting area is never recorded here.

Three mechanics matter for stock:

1. **Helper columns.** Spring 2026 uses "NS # per 1000" inputs (V, X, Z, AB) multiplied by 1.5 or 3 to give allocations (`W = V*1.5`, `AC = AB*1.5`, `AD = AB*3`) and a Total Allocated formula that skips them deliberately (`T6:T107 =SUM(W+Y+AA+AC+SUM(AD:AV))`). Allocation is thus driven by a per-1000 planting mix, not by stock. Confidence: medium on the intent (the scout asked WRT).
2. **Allocation is capped by nothing.** Over/Under goes negative (9 species in Spring 2025) and nothing stops it.
3. **Stock is not decremented.** After the event the next stocktake replaces the figures.

### 7.2 Totals that disagree

| Workbook | Competing totals |
|---|---|
| `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026` | Total Allocated: M122 4,562 (sums rows 6 to 103 for most columns); AQ122 4,593; my sum of rows 6 to 119 4,601; typed 3,234 in M2/AQ2; typed 3,295 in M1; AQ124 5,629 (sits in the "TREES > 5M" row; looks like a leftover typed figure). Plants Out Master "Autumn 2026" 4,556. Five or six figures for one season. Total Available also depends on end rows (H to 105, K to 107) |
| `_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations ` | Allocated T111 9,779; AW111 12,664 (sums sites outside T); site targets (row 1 and the Collection Schedule) differ from allocated (Whitechapel 1,200 against 1,326; Slope Hill 1,000 against 981; Little Difference 200 against 210); Paper4Trees master 120 against the order sheet 94; Collection Schedule `D20` 4,320 against the three keystone sites plus groups 3,700 + 90 + 330 + 200; Lake Hayes is `=0` in all rows although Plant Protection lists 1,500 plants |
| `JMN Plant Allocation Master SPRING 2025.xlsx › Spring 2025` | N Total Allocated 6,248 (P:AL); AN 6,248 (P:AM); header N1 6,229 (stops at row 103); AN108 typed 5,629; "Incl schools" scenario sheet 2,533 (AK104) and typed 5,629 |
| Master across seasons | `Plants Out Master`: MASTER 140,049; SUMMARY SITES 139,948; SUMMARY PLANTS 135,413 (B23 scout). Spring 2025 per-site totals sum to 6,229 in the block header but the per-species totals sum to 6,248 (rows 104 and 105 sit below the SUM range) |
| Stock | Feb 2026: Stage 4 sheet 5,390 against the same month's list "Stock" 9,551 against the header's typed 9,107; Master H+I 5,706 (May) against allocation Spring 2026 "own ready" 5,872 |

### 7.3 Are allocations ever reconciled against what was planted?

No. Evidence:

- **Plants Out Master values equal the allocation, species by species.** Spring 2025: for the 98 species present in both, per-species totals in `Plants Out Master › MASTER › PA8:PA105` equal the allocation totals in `Spring 2025 › P:AM` in 98 of 98 cases (6,248 in both). Per-site totals also match: Whitechapel 1,300; Lake Hayes Pavilion 959; Slope Hill 1,000; Jardine Park 2,427; Peace Park 40; Quail Rise 215; Boyes Cres 75; Arrowtown Preschool 80; Paper for Trees 133.
- Autumn 2026: `MASTER › PC8:PW105` equals the allocation M column in 96 of 98 species (2 differ by 1: Carpodetus serratus 28/29, Podocarpus totara 0/1). Site totals match for Whitechapel (1,280, the sum of the three Whitechapel columns), Lake Hayes Pavilion 200, Lake Hayes Rowing Club 1,130, Slope Hill 907, Jardine Park roadside 255, Quail Rise 50, Lake Hayes Estate trail 25, QLDC Tohu 4, Little Difference 200, Matakauri Wetlands 80 and Shotover Wetlands 307. Two differ: the "Paererewa" site is 118 in the Plants Out Master and 138 in the allocation; "JP Reference Gardens" is 0 against 25. Total 4,556 against 4,601 (sum) or 4,562 (M122).
- The Autumn 2026 block holds 353 constants and no formulas, so the Plants Out numbers were typed or pasted after the allocation (`Plants Out Master › MASTER › PC8:PW105`).
- In earlier seasons round numbers (Autumn 2025: Whitechapel 1,500, Slope Hill 1,000) suggest planned quantities were recorded as planted. Confidence: medium.
- No sheet records plants actually delivered, planted or rejected by planting event. The B23 scout found no planting area code, event date, event type or volunteer count in the Plants Out Master. The allocation Notes sheet's status tracker (contact, list received, forecast received) is empty (`Notes › B7:F19`).
- The only point where stock and planting meet is the May 2021 PDF, which has an "Autumn Planting Total" column (5,132) next to stock. That layout was not kept.
- Stock is therefore "reconciled" only by recounting. Master ready stock was 5,390 (Feb 2026 sheet) and 5,706 (13 May 2026) even though 4,556 plants were allocated for the autumn 2026 plantings, so at least about 4,900 plants became ready or arrived between those dates, or the plantings were drawn from stock not counted as ready. I cannot test which (confidence: low).

## 8. What a data model would have to hold (observations only)

- A stock count event: date, nursery (North/South/off-site), container (V150, T28, PB3), stage (growing/ready) and size class, species, count and counter. Counts and stage definitions have changed four times.
- A species key that survives typos and the 91 to 113 row variations. The current names break exact matching.
- Movement records that today are only implied: pricked out (by tray tag), potted up, lost (with reason), given away, bought in (supplier, date, quantity, order or delivery), allocated, planted.
- A distinction between planned and actual quantities for allocations, orders and "to buy in".
- A link from allocation (site, season) to planting event (site area, date, event type, count).

## Questions for WRT

1. Is each stocktake a point-in-time count that replaces the last one, with no running tally kept elsewhere? If a running tally exists, where is it?
2. Which species list is the official one: the 98 on the Plants Out Master and Potting On, the 104 on the 2026 Master stocktake, or the 113 on the Autumn 2026 allocation? Are Hoheria angustifolia, Olearia nummularifolia and "Rata (client)" real nursery lines?
3. In 2024 to 2025 stocktakes, does "large" mean ready and "small" mean growing, and does "south" and "north" mean the two nursery sites? Between 19 Feb and 28 May 2025 the small plants appear to move from south (2,769 to 374) to north (337 to 3,722). Did they move, or were the columns used differently?
4. Are the Autumn 2026 allocation's "StockTake" figures (9,489) the February 2026 count of all plants, or only ready plants? The Feb 2026 Stage 4 sheet shows 5,390 ready for a similar date.
5. Where is "ready for planting" counted for T28 plants, and does the V150 stocktake's "Stocktake" column always include the T28 plants (as it appears to) so that V150 and T28 must not be added?
6. When plants die or are discarded, where should that be written down? Is there a place that records the reason (dryness, damping off, poor seed, theft or other)? What do notes such as "84 gone" and "96 gone!" refer to, and was a count adjusted?
7. Is the Plants Out Master updated from what was actually planted after each event, or from the allocation sheet? Did the Autumn 2026 plantings happen as allocated (4,556 plants)? If not, where is the difference recorded?
8. For bought-in plants, which of Home Creek, Springburn, Pukerau, Queenstown Nursery, Matukituki Natives and Te Kakano actually supplied plants in 2023 to 2026, and where are the delivery records? Are the three Home Creek totals for Spring 2025 (1,080; 1,120; 1,235) one order or three?
9. What are "QLDC supplying E4N" and "QLDC general supply": plants grown by the council and handed to WRT, or plants WRT grows for the council? Are they counted as WRT stock?
10. Was there a whole-nursery count between May 2025 and February 2026, or in spring 2021, and were the late June 2022 and June 2024 counts done? Where are those records?
