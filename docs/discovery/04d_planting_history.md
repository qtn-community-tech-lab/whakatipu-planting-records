# S4d: Sites, areas and planting events

Specialist report for the WRT data discovery. Companion file: `04d_sites_variants.csv` (400 distinct site, area and group strings, each mapped to a proposed site).

Plain-language summary first, evidence after. Evidence is cited as `file › sheet › range`. Anything I inferred is marked `confidence: low|medium|high` with the reason. Personal names (people's first names that appear inside site headers, sheet tabs and titles) are withheld and shown as `[name]`. Plant counts, site names and organisation names are shown. I did not open the 62 PDFs; where I mention them I am using file names only.

## 1. What I found, in brief

1. **Planting is recorded per site per season, never per planting event.** The master record (`_JMN Plants Out Master.xlsx › MASTER`) has one column per site per Autumn or Spring season, from Autumn 2015 to Autumn 2026, and each cell is a plant count for one species. There is no planting date, no event type and no volunteer count in that sheet or in any other spreadsheet I checked. (confidence: high; I searched every `.xlsx` for the words infill, enrichment, replacement, establishment, volunteer and for area-code patterns such as `WH-06`, and found none in a planting context.)
2. **"Area" precision exists only for Autumn 2026.** Before that, the finest level is a registered site or sub-site (an ID with a letter, such as 22A) or a named part of a site that was given its own column (Slope Hill Coronation, Slope Hill HGF, Jardine Park Welcome Forest versus Reference Gardens). In the Autumn 2026 allocation master, Whitechapel is split into three areas and Lake Hayes Pavilion has an "infill" block (section 5).
3. **Site names are very messy, but they collapse neatly.** The 116 distinct spellings in MASTER row 4 map to 77 proposed groupings (76 places, counting sub-sites such as Slope Hill Coronation separately, plus the Paper4Trees scheme). Across all sources the CSV holds 400 strings that map to 94 proposed groupings (about 86 places, plus 8 catch-all, scheme or pooled buckets such as Paper4Trees, "Spare FH, PPk, QR, Apt" and plain "Lake Hayes").
4. **Site IDs are the most reliable key, but they have faults.** Autumn 2015 uses an older numbering; two sites carry each other's ID from Spring 2024 to Spring 2025; Autumn 2026 has no IDs at all (section 3).
5. **Sheet tab names and titles in the allocation masters cannot be trusted.** Tabs are reused templates: a tab named for one site can carry the title, season label and "Planting Site:" class of another (section 8).
6. **The only dated events are collection and planting dates for Autumn 2025 to Spring 2026**, in allocation site tabs and collection schedules (section 6). They are at site level and are a mix of real dates and free text.
7. **Keystone sites hold about 79% of everything planted** (110,343 of 139,948 plants in `SUMMARY SITES`), and two Slope Hill entries (HGF 22,000 and Coronation 7,000, both 2024) make up about 21% of the all-time total on their own.

## 2. Source codes used in the CSV `where_seen` column

| Code | Meaning (file › sheet › range) |
|---|---|
| `PO:MASTER!r4` | `_JMN Plants Out Master.xlsx › MASTER › G4:PW4` (site header row; the CSV gives column count and first to last season) |
| `GROUP:PO:MASTER!r3` | `_JMN Plants Out Master.xlsx › MASTER › row 3` (location or class group headers) |
| `PO:SUMMARY SITES!C`, `!BB` | `… › SUMMARY SITES › C4:C82` (site name) and `BB4:BB82` (cleaned "Sites" name) |
| `PO:HISTORIC SUMMARY SITES!D` | `… › HISTORIC SUMMARY SITES › D3:D59` (site names only; the WHO column was not read) |
| `PO:TTC Audit 2025 Sit!r3` | `… › Trees that Count Audit 2025 Sit › D3:AL3` (the 2019 site columns) |
| `A26`, `S26`, `S25`, `A27` | Allocation workbooks: Autumn 2026 master, Spring 2026, Spring 2025 master, Autumn 2027. Suffix gives sheet and cell, `tab` is the sheet tab name, `tab!A1 title` is the title in cell A1 |
| `A22`, `PP23` | `Archive/2022 Autumn Plant Allocations.xlsx` and `Archive/2023 Autumn Plant Allocation Sheets/Peace Park Autumn 2023.xlsx` |
| `FC`, `FC01`, `FCA25` | `_JMN PLANT Forecasting 2026_2027.xlsx` and the two archived "Keystone Sites Plants Summary" workbooks (row 8 headers on the main look-ahead sheet, site tab names, tab titles) |
| `SUG-A/B/2024`, `JP25`, `NS-TPL`, `NS-Feb26`, `ON-24/25/26`, `JPL25` | Per-site plant lists: "Suggested plant species and numbers each site per year" (3 copies), "Plants for JP etc 2025", the Nursery Stock template, the Feb 2026 Nursery Stock list, the `[name] Master` sheet in the three Potting On workbooks (a tab named for a staff member), and the Jardine Park 2025 plant list |
| `FLAG23` | `Helen Resources/_ plantings at Flagship sites 2023.xlsx › Sheet1 › column A` headings |
| `PDF:… file name` | Names of PDF allocation sheets only (2022 Spring, 2023 Autumn, 2024 Autumn and Spring, 2025 Autumn) |

## 3. Site names, groupings and ID codes

### 3.1 How the variants group

The CSV has one row per distinct raw string. The columns `normalised_key` (lower case, punctuation and line breaks removed), `proposed_site` and `proposed_area_or_subsite` are my proposed mapping, not a correction of the source. Main families:

| Proposed site | Examples of variants (raw spellings) | Notes |
|---|---|---|
| Whitechapel Reserve (15) | `Whitechapel` (also with two trailing spaces), `White chapel`, `Whitehcapel` (2022 file name), `WHITECHAPE`, `WCR`, `WC south bank and mound`, `Whitechapel Infill Northern Block` | 22 strings. `WCR` is the Autumn 2015 header and matches old ID 4 in the historic register (confidence: high) |
| Lake Hayes Pavilion (9G) | `Lake Hayes Pavilion`, `Lake Hayes Pav`, `LH PAVILION`, `LakeHayesPav`, `LAKE HAYES PAVILLION`, `Lake Hayes Pavilion Infill` | `Lake Hayes Showground Reserve` (forecast column) assumed the same place (confidence: low) |
| Lake Hayes South / Roadside (9A) | `LH ROAD`, `LH ROAD STH`, `LAKE HAYES ROADSIDE SOUTH`, `Lake Hayes South`, `LH South Infill Planting` | Several other Lake Hayes parcels have their own IDs (9, 9D, 9E, 9F, 9H, 10, 10A) |
| Slope Hill Road (11) | `SLOPE`, `Slope Hill`, `SLOPEHILL RD`, `SLOPE HILL RESERVE`, `Slope Hill Road (11) - DOC` | Sub-parts: `Slope Hill Coronation` (11A), `Slope Hill HGF` (no ID); areas named in other files: `wetland`, `Triangle paddock`, `down the creek`, `Hill Swamp` |
| Jardine Park (23, 23A, 23B) | `JARDINE PK - JMN`, `JP Reference Gardens`, `Ref Gardens`, `JP Welcome Forest`, `JARDINE PARK - WELCOME FOREST`, `Jardine Park`, `JP Corp`, `Jardine Park Industry` | Bare "Jardine Park" is ambiguous (16 strings, flagged uncertain) |
| Kelvin Peninsula (22, 22A, 22B, 22C) | `KP - KPCA`, `KP - Project Crimson`, `Earnslaw Slipway (22A)`, `KP - GOLF COURSE`, `Kelvin Heights Golf Course` | "KP" is Kelvin Peninsula (confidence: high, from `SUMMARY SITES › C50:C53`) |
| Shotover Primary (20A wetlands, 20B internal) | `Shotover Wetland`, `Shotover Wetlands`, `Shotover Primary (Wetlands)`, `Shotover Prinary (Internal planting)` | Wetlands and internal planting are separate IDs |
| Shotover River (28A, 28B) | the header has a person's first name appended in 2016 to 2023 | `SUMMARY SITES` has two rows both named "SHOTOVER RIVER" (28A 238 plants, 28B 139) differing only by a trailing space |
| Boyes Cres (21B) | `Boyes Cres`, `Boyes Crescent`, `B0yes Cres` (zero for letter O), `Boyes` | |
| Peace Park (21) | `PEACE`, `PEACE PARK`, `Peace Park (21) - QLDC` | |
| Paper4Trees | `P4T`, `PAPER 4 TREES`, `Paper for Trees`, `Paper4Trees` | A funder or order scheme, not a place, but it sits in the site columns (confidence: high) |

Other variant types worth knowing about: typos (`ENTERANCE`, `CEMETARY`, `PAVILLION`, `Refrence`, `Matakaurir`, `Prinary`, `LAKES HAYES`, `GEORGE RD` for Gorge Rd); stray spaces and line breaks inside header cells (for example `ARROW\nAV`); question marks (`Lake Hayes South??`); and helper columns that look like sites but are not (`WC Nth (NS # per 1000)`, `SH (NS # per 1000)`, `JP (NS # per 1000)`: density multipliers that sit beside each Keystone site in the Spring 2026 and Autumn 2027 allocation sheets, `_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations › V3:AB5`; confidence: medium, the label is not explained in the file).

One raw string was lost to the withholding of names: the two Shotover River headers that differ only in the appended first name merge into one CSV row, so the CSV has 115 MASTER row-4 strings against 116 in the source.

### 3.2 Site-ID codes in MASTER row 5

`_JMN Plants Out Master.xlsx › MASTER › G5:PW5` holds a site ID for most columns until Autumn 2025. The register is `SUMMARY SITES › B4:C82` (new ID plus site name). IDs are numbers (1 to 30) with letter suffixes for parcels (for example 1A to 1E, 5A to 5F, 9A to 9H, 12A, 12B, 13A to 13D, 20A, 20B, 21A, 21B, 22A to 22C, 23A, 23B, 28A, 28B). Eleven historic sites sit under a heading "HISTORIC SITES (ARCHIVED FROM 2016 ONWARDS)" at `SUMMARY SITES › A71:C82`.

Problems with the IDs (all medium to high confidence, because the register supplies the correct pairing):

| Issue | Evidence | Confidence |
|---|---|---|
| Autumn 2015 uses the **old** numbering. Old ID 35 is Atley Downs (new 6), 47 is Lower Shotover Conservation Area (new 8), 6 is Lake Hayes West (new 9), 14 is Lake Hayes Rutherford Rd (new 9D), 3 is Feehly Hill Cemetery (new 12A), 4 is Whitechapel Reserve (new 15), 10 is Rapley Close (new 16), 49 is Arrow Morven (new 17), 12 is Wye Creek (new 24) | `MASTER › G5:S5` against `HISTORIC SUMMARY SITES › B3:C59` | high |
| In Spring 2024, Autumn 2025 and Spring 2025, **Slope Hill carries ID 13C** (Bush Creek's) and **JP Welcome Forest carries ID 11** (Slope Hill's) | `MASTER › MT5, MV5, NN5, NO5, OJ5, OK5` against `SUMMARY SITES › B33:B41, B56` | high |
| Slope Hill Coronation's ID in Autumn 2024 is the error text `!!A` (register says 11A) | `MASTER › MG5` | high |
| Akarua Corner is ID 9E in 2022 and 2023, but the register gives 9E to Green Cabs and 9F to Akarua Corner | `MASTER › JX5, KN5` against `SUMMARY SITES › B27:B28` | high |
| Derby St Reserve is ID 13A in Spring 2023, but the register says 13D (13A is Bush Creek, Arrowtown Preschool) | `MASTER › LM5` against `SUMMARY SITES › B39, B42` | high |
| No IDs at all in the Autumn 2026 block; 9 of 22 non-zero columns lack an ID in 2025 | `MASTER › PC5:PW5` | high |
| Several sites have no ID anywhere: Slope Hill HGF, Walter Peak, Skippers, Shotover Rotary Track, Pigeon Island (until 1E appears in 2022), Kiwi Park, Kingsview, and all the 2025 to 2026 newcomers (Bridesdale, LHE Trail, Paererewa, QLDC Tohu, Little Difference, Matakauri Wetlands) | `MASTER › row 5` | high |

Yellow fills on the ID row are unexplained (an open question from the scout; I did not resolve it).

### 3.3 Area codes

I found **no** planting-area codes of the `WH-06` kind anywhere. The only code-like labels are:

- The ID-in-brackets on the forecasting tabs: `Whitechapel (15)`, `Lake Hayes Pavilion (9G)`, `Slope Hill Rd (11)`, `Bush Creek (13C)`, `Peace Park (21)`, `Feehly Hill (12A)`, `Lake Hayes South (9A)`, `Earnslaw Slipway (22A)` (`_JMN PLANT Forecasting 2026_2027.xlsx` tab names). These are site IDs, not areas.
- Two tabs both titled `Jardine Park(23B)` (`… › JARDINE PK › B2` and `… › Ref Gardens › B2`). Reference Gardens is ID 23, so the second title looks wrong (confidence: high).
- A 2025 Spring document `Untitled document.docx` that contains only two images, one a site plan with zones A to E (not read; the scout reported this).

## 4. How planting events are recorded

| Source | Grain | What it holds |
|---|---|---|
| `_JMN Plants Out Master.xlsx › MASTER` | species by site by season (Autumn or Spring) | Plant counts only. Row 3 gives a location group (a town or valley until 2023, then Keystone / Community / School groups). Row 6 gives the landowner organisation, filled from 2015 to Autumn 2024 and blank from Spring 2024 onwards |
| `… › SUMMARY SITES`, `SUMMARY PLANTS` | site by year (Autumn, Spring, Total) 2015 to 2026; species by year | Roll-ups of MASTER, partly hard-typed |
| `… › Trees that Count`, `Trees that Count Audit 2025`, `… Sit` | species by season for 2024 to 2025; species for 2020; species by site for 2019 | Reporting extracts. The 2024 to 2025 sheet separates "Jardine Park Project" and "Coronation" columns |
| Forecasting workbooks, site tabs | species by season, one tab per site (10 tabs) | History 2015 to Autumn 2025 re-keyed from MASTER (for example Whitechapel Autumn 2015 is 235 in the tab and in `MASTER › O8:O105`; confidence: high), plus forward plans to Spring 2026 |
| Allocation workbooks (Spring 2025, Autumn 2026, Spring 2026, Autumn 2027), main sheet | species by site/area column for one season | Plans and allocations of stage 4 plants, with Keystone / Nursery and extras / Community / School group headers |
| Allocation site tabs | species by site tab, with "Collection Date" and "Planting Date" cells | The only place event dates appear. The "Location" column on the site tabs (`C`, `F`, `I`) is empty on 59 of the 60 tabs I checked (54 in the Spring 2025, Autumn 2026 and Spring 2026 masters, 5 in the 2022 file, and the 2023 Peace Park file); the exception is Quail Rise in Spring 2025, with two entries reading LATE. So area is not recorded there either |
| `Nursery Collection Schedule` sheets | site by season | Site, planting date, plant count, plant-protection counts |
| `2022 Autumn Plant Allocations.xlsx` | 5 site tabs (Whitechapel, Bush Creek, Lake Hayes South, Feehly Hill, Slope Hill) | The tabs are **blank** (no site named, no counts), only the tab names survive |
| PDFs | one PDF per site per season, 2022 Spring (13), 2023 Autumn (14), 2024 Autumn (2), 2024 Spring (14), 2025 Autumn (3) | Not read. These are printed allocation sheets; the species lists for 2022 to 2024 may exist only here |

### 4.1 Event types

- **No structured event-type field exists.** The words *establishment*, *enrichment* and *replacement* do not appear in any planting context. ("Replaced" appears only in seed and cutting tray notes, for example `2. Seed records MASTER.xlsx › Sheet1 › K502`.)
- **"Infill" is the only event-type word, and it is part of site labels, not a field:**
  - `MASTER › MS4` `LH South Infill Planting`, Spring 2024, and again `NM4` (Autumn 2025) and `OI4` (Spring 2025). It is **zero** in all three seasons.
  - `MASTER › PD4` `Lake Hayes Pavilion Infill`, Autumn 2026, 200 plants.
  - `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026 › R4` `Lake Hayes Pavilion Sth block infill (…)`, with a corporate planting group's name in brackets, and the tab `LakeHayesPav › A1` carrying the same title.
  - Tab `Whitechapel Infill Northern Block` (Autumn 2026 allocation master).
- **Other labels that describe a kind of planting:** `Project Crimson` (KP 22A; a named planting project), `Industry Planting` and `Jardine Park Industry` (corporate group plantings, Spring 2026), `Wetland planting Slope Hill`, `Internal planting` versus `Wetlands` at Shotover Primary, `Welcome Forest`, `shelter belt`. These describe the place or the group, not the event type. (confidence: medium)

### 4.2 Volunteer counts and group labels

- **No volunteer or participant counts** are recorded against any planting. The words "Volunteer Potting On" are titles of weekly potting sheets, not planting records.
- **Group labels do appear**, usually embedded in a site header:
  - School groups: `WHS Kawarau River Trail`, `WHS in school planting`, `QPS Internal`, `QPS Matakauri Wetlands`, and the Paper4Trees school columns `Arrowtown School`, `ACG (Remarkables)`, `RPS`, `GY`, `SPS`, `QPS`, `AT Montessori`, `ACG Henry St`, `WHS`, `BestStart QT` (`… › Paper4Trees2 › B2:K2`, three allocation workbooks). WHS is read as Wakatipu High School (confidence: medium; not expanded in the files).
  - Community and business groups: `WYE QTCC` and `QT Climbing Club`, `SWIFTBURN - QTT` (a trails trust), `KP - KPCA` (read as Kelvin Peninsula community association), `QT Hill (QCC)`, `1 MILE - QTMBC`, `Little Difference`, `Ben Lomond Zip Trek`, `KAWARAU BRIDGE AJ HACKET`, `SHOTOVER - ROTARY TRACK`, `Rowing Club (LINZ)`.
  - These expansions are my reading of the abbreviations (confidence: medium); none is spelled out in the files.
  - I found no "Liger" or "Scouts" labels in the spreadsheets.
- `Notes` sheets in the allocation masters hold a status list of community groups (contact, date, "Spring List Received", "3 Year Forecast Received"). The contact column was not read.

## 5. Area-level evidence (the only cases I found)

| Site | Area or sub-site label | Where | Plants |
|---|---|---|---|
| Whitechapel Reserve | `WC south bank and mound` | `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026 › O4` | 720 |
| Whitechapel Reserve | `WC Back block` | same sheet `P4` | 350 |
| Whitechapel Reserve | `WC Steep Bank` (bracketed name withheld) | same sheet `Q4` | 210 |
| Whitechapel Reserve | tab `Whitechapel South Block` (title "…South Block/Bank") | tab subtotals `A39, D39, G39` add to 720, matching column O (confidence: medium) | 720 |
| Whitechapel Reserve | tab `Whitechapel Infill Northern Block` | its subtotals add to 350, matching column P `WC Back block`, not a separate figure (confidence: medium) | 350 |
| Lake Hayes Pavilion | south block infill | `Autumn 2026 › R4`, tab `LakeHayesPav` | 200 |
| Slope Hill | `Slope Hill Coronation` (11A) | `MASTER › MG4` (Autumn 2024) | 7,000 |
| Slope Hill | `Slope Hill HGF` | `MASTER › MU4` (Spring 2024) | 22,000 |
| Slope Hill | `Triangle paddock`, `down the creek` | `Helen Resources/_ plantings at Flagship sites 2023.xlsx › Sheet1 › A59, A45` (planned 2,000 plants each across 2023 to 2026) | planned |
| Slope Hill | `wetland` | forecast/potting-on/stocktake column headers `Wetland planting Slope Hill`, `Slope Hill wetland` | plan columns |
| Jardine Park | Reference Gardens (23) versus Welcome Forest (23B) versus roadside, public, industry, shelter belt | `MASTER`, Autumn 2026 `U4`, Spring 2026 `AC5:AD5` | various |

The 3 Whitechapel area columns add to 1,280, which equals the sum of `MASTER › PC8:PC105` (Autumn 2026 Whitechapel). Both Whitechapel tabs together carry only two of the three areas, so the Steep Bank area has no tab (confidence: medium).

Assessment: areas exist only as an ad hoc naming habit from Autumn 2026. Earlier large sites such as Whitechapel and Slope Hill are single columns. (confidence: high)

## 6. Planting dates

Dates sit in allocation site tabs and collection schedules. They are at site and season level, and they are a mixture of real dates and free text (`Sept 12`, `Sept25`, `23 and 24 April`, `October 16th`, `1st week term 4`).

| Season | Source | Site: dates (collection then planting) |
|---|---|---|
| Autumn 2025 | `Nursery Collection Schedule › B5:C17` (updated 26 March 2025) in the Spring 2025 and Autumn 2026 masters | Whitechapel Reserve planting 5 Apr; Slope Hill 12 Apr; Lake Hayes Pavilion 3 May; Quail Rise 9 Apr then 13 Apr; Lake Hayes Estate trail 7 May then 10 May; Gibbston 30 Apr then 4 May |
| Autumn 2025 | Site tab `Shotover Wetlands` in the Spring 2025 master (label AUTUMN 2025) | Shotover Wetlands collection 14 May, planting 15 May |
| Spring 2025 | Site tabs in the Spring 2025 master | Whitechapel 5 then 6 Sept; Lake Hayes Pavilion 19 then 20 Sept; Slope Hill 12 then 13 Sept; Jardine Park "October 16th" (the tab carries an Autumn 2025 label) |
| Autumn 2026 | Site tabs in the Autumn 2026 master | Slope Hill 27 then 28 Mar; Little Difference 8 then 11 Apr; Lake Hayes Pavilion infill 29 then 30 Apr; Whitechapel South Block and Infill Northern Block 1 then 2 May; Lake Hayes Rowing Club 8 then 9 May; Shotover Wetlands collection 20 Apr, planting "23 and 24 April"; Matakauri Wetlands collection 28 Apr, planting "29 and 30 April" (these two tabs carry an AUTUMN 2025 label but typed 2026 collection dates) |
| Spring 2026 | `Nursery Collection Schedule › C5:C7` and site tabs, Spring 2026 master | Whitechapel 12 Sept; Slope Hill 19 Sept; Jardine Park 26 Sept; Industry Planting 22 Oct (collection year typed as 2021); QLDC plant swap collection 9 Sept; WHS in-school planting "first week of term 4" |

Quality problems: many tabs carry stale dates copied from earlier seasons (for example nine Spring 2026 tabs, including the blank `SITE TEMPLATE`, show 1 and 2 May 2026; the `Lake Hayes South` tab shows 25 and 26 Sept from 2024 while its MASTER columns are zero). The 2022 to 2024 site-level dates, if any exist, are only in the PDFs. (confidence: medium that the 1 and 2 May entries are defaults, because they repeat identically on tabs for sites with no allocation)

## 7. Coverage by year, 2015 to 2026

"MASTER site columns" counts columns in `MASTER` (Autumn plus Spring) that hold non-zero plants. "Sub-site IDs" counts those with a letter-suffixed ID. "No ID" counts those with a blank ID cell.

| Year | MASTER site columns | Plants (MASTER) | Sub-site IDs | No ID | Other sources holding records for the year |
|---|---|---|---|---|---|
| 2015 | 33 | 5,551 | 10 | 3 | `SUMMARY SITES`, forecast site tabs (Whitechapel, Slope Hill, Peace Park, Lake Hayes South, Earnslaw Slipway) |
| 2016 | 41 | 7,507 | 21 | 6 | as above, plus Feehly Hill; historic register frozen 22/11/2016 |
| 2017 | 31 | 9,183 | 13 | 10 | forecast tabs, `SUMMARY SITES` |
| 2018 | 29 | 8,047 | 13 | 7 | forecast tabs, `SUMMARY SITES` |
| 2019 | 33 | 10,478 | 14 | 7 | `Trees that Count Audit 2025 Sit` (2019 by site), forecast tabs |
| 2020 | 25 | 8,568 | 12 | 2 | `Trees that Count Audit 2025` (2020, species level; Whitechapel separately). Autumn 2020 has only 6 columns and 996 plants |
| 2021 | 34 | 10,489 | 16 | 2 | forecast tabs, `SUMMARY SITES` |
| 2022 | 32 | 10,883 | 20 | 1 | `2022 Autumn Plant Allocations.xlsx` (5 blank tabs); 13 PDFs for Spring 2022 |
| 2023 | 35 | 10,606 | 19 | 2 | `Peace Park Autumn 2023.xlsx`; 14 PDFs for Autumn 2023; `Helen Resources/_ plantings at Flagship sites 2023.xlsx` (plans) |
| 2024 | 33 | 43,483 | 14 | 6 | 2 PDFs (Autumn), 14 PDFs (Spring); `Trees that Count` sheet; `Notes` sheets |
| 2025 | 22 | 10,698 | 6 | 9 | Spring 2025 allocation master (site tabs with dates); Autumn collection schedule; 3 PDFs (Autumn); Jardine Park plant lists |
| 2026 | 12 (Autumn only) | 4,556 | 0 | 12 | Autumn 2026 allocation master (areas, dates); Spring 2026 allocation plan; Feb 2026 stock list. MASTER has **no Spring 2026 block** |

Cross-check: the year totals in `SUMMARY SITES` equal MASTER for 2015 to 2024, but 2025 differs. MASTER gives 4,469 (Autumn) plus 6,229 (Spring) equals 10,698; `SUMMARY SITES › AV3` gives 10,717, and the sum of its site rows is 10,597. Quail Rise Spring 2025 is 215 in MASTER and 234 in `SUMMARY SITES`; Shotover Primary Autumn 2025 is 110 in MASTER and 190 in `SUMMARY SITES`. (confidence: high on the arithmetic; I did not chase the reason.)

### 7.1 Location precision by year

Categories: **site** = one column for a registered site or named place; **sub-site** = a registered parcel (letter-suffixed ID) or a named part of a site with its own column; **area** = a named zone inside a site recorded as its own column or tab; **unknown** = no place (a scheme column such as Paper4Trees, or a pooled bucket).

| Year | Dominant precision | Sub-site | Area | Unknown | Evidence |
|---|---|---|---|---|---|
| 2015 | site, with some sub-sites | yes (for example 22A to 22C, 1A, 1B, 12B, 13A, 13B) | none | P4T column (Spring 2015, 135 plants) | `MASTER › V4:AO5`; Autumn 2015 IDs are the old numbering |
| 2016 | site and sub-site | yes (for example 5B, 5E, 9A, 12A, 20A, 22A to 22C) | none | P4T column (Spring) | `MASTER › AR4:CH5` |
| 2017 | site | few (5D, 9A, 9E, 12A, 12B, 13A, 21A, 22C, 23) | none | P4T; several sites with no ID (Pigeon Island, Walter Peak, Queenstown Hill, Gorge Harvest Garden, Skippers) | `MASTER › CK4:DQ5` |
| 2018 | site | few (5D, 9A, 12A, 12B, 13A, 20A, 22B, 28A) | none | P4T; Pigeon Island, Ben Lomond, Rotary Track without ID | `MASTER › DT4:EX5` |
| 2019 | site (TTC audit 2019 sheet is also site level) | few | none | P4T (Spring, labelled "PAPER 4 TREES") | `MASTER › FA4:GI5`; `Trees that Count Audit 2025 Sit › D3:AK4` |
| 2020 | site | yes (5D, 9A, 13A to 13C, 20B, 23B, 1C, 6B) | none | P4T | `MASTER › GL4:HM5` |
| 2021 | site | yes | none | P4T (Spring); Shotover River with unknown owner "?" | `MASTER › HP4:IY5` |
| 2022 | site | yes (1C, 1D, 1E, 5D, 6B, 9A, 9E, 12A, 13C, 20A, 20B, 21B, 22C, 23B, 28A) | none | P4T | `MASTER › JB4:KI5` |
| 2023 | site | yes (4A, 4B, 5D, 5E, 6B, 9A, 9E, 9G, 13C, 21B, 23B, 28A) | none | P4T; "The Rees" with no ID | `MASTER › KL4:LV5` |
| 2024 | site, with named parts of Slope Hill and Jardine Park | yes: Coronation (Autumn), HGF (Spring), JP Welcome Forest versus JP Reference Gardens | none (LH South "infill" column is zero) | Slope Hill HGF and Pigeon Island, Gibbston, Kiwi Park, Kingsview have no ID; P4T | `MASTER › LY4:NH5` |
| 2025 | site; IDs mis-assigned for two sites and missing for many | few; `LH South Infill Planting` is zero | none | Bridesdale, LHE Trail, The Rees, Gibbston, Kiwi Park, Kingsview, Feehly Hill (no ID); Paper for Trees | `MASTER › NK4:PA5` |
| 2026 | site, with the first areas | no IDs at all | **yes**: 3 Whitechapel areas, Lake Hayes Pavilion infill, Rowing Club | `Paererewa`, `QLDC Tohu`, `Little Difference AP`, `Matakauri Wetlands`, `Paper for Trees` | `MASTER › PC4:PV4`; `Autumn 2026 › O4:AO4` |

So: site-level for the whole span; sub-site-level where WRT happened to register parcels (2015 to 2023 mostly); area-level only in 2026; and no event-level precision anywhere.

## 8. Reliability of sheet tabs, titles and season labels

In the allocation masters, the tab name, the A1 title, the season label in `I1` and the "Planting Site:" class in `A2` are each copied from an earlier use of the template, so they disagree. Examples from `JMN Plant Allocation Master AUTUMN 2026.xlsx`:

| Tab name | A1 title | I1 season label | Class label in A2 |
|---|---|---|---|
| `Feehly Hill` | Paererewa Jardine Park | AUTUMN 2026 | Community Group |
| `Boyes` | Paererewa | SPRING 2025 | Keystone |
| `Gibbston` | Rowing Club (LINZ) | AUTUMN 2026 | Community Group |
| `KiwiPark` | Matakauri Wetlands | SPRING 2024 | Keystone |
| `Paper for Trees` | a person's name followed by "LHE Trail" | AUTUMN 2025 | Community |
| `QEII` | `#REF!` | SPRING 2024 | Keystone |
| `Shotover Wetlands` | Shotover Wetlands | AUTUMN 2025 | School (the Spring 2025 master says Keystone) |

Consequence: a tab name is not a safe site key in these workbooks; the main-sheet column header is the better key. (For example the Autumn 2026 `Gibbston` tab is titled for Rowing Club (LINZ) and holds no counts.) (confidence: medium; I matched content by title and counts, not by every cell)

## 9. Classification: Keystone, Community, School

`SUMMARY SITES › BD4:BD82` is the "K / C / S" classification, and `BD84:BD86` totals each class with `SUMIF`.

| Class | Sites (rows) | Plants (all years, `BC`) | Share of 139,948 |
|---|---|---|---|
| Keystone (K) | 18 | 110,343 | 78.8% |
| Community (C) | 48 | 21,213 | 15.2% |
| School (S) | 8 | 7,058 | 5.0% |
| Blank | 3 (Malaghans Rd / QT Trail, Lake Hayes East Rowing Club, Coronet Faces) | 1,334 | 1.0% |

Keystone sites (18): Lake Hayes West PG (9), Lake Hayes South (9A), Lake Hayes Pavilion (9G), Slope Hill Road (11), Slope Hill Coronation (11A), Slope Hill HGF, Feehly Hill Cemetery (12A), Bush Creek Keystone (13C), Whitechapel Reserve (15), Peace Park (21), Frankton Beach (21A), Kelvin Peninsula KPCA, Slipway / Project Crimson, Golf Course and Corner (22, 22A, 22B, 22C), Jardine Park JMN (23), Track Entrance (23A), Welcome Forest (23B).

School sites (8): Queenstown Primary (4), Arrowtown Primary (13B), Bush Creek (Arrowtown Preschool, 13A), Shotover Primary wetlands (20A) and internal (20B), Glenorchy School (1A), Kingsview, and "Paper for Trees - Ziptrek" (a scheme row).

Where sources disagree about class (so the class column in the CSV carries a note):

| Site | `SUMMARY SITES` | Other source and what it says |
|---|---|---|
| Peace Park, Feehly Hill | Keystone | Autumn 2025 to Spring 2025 MASTER group label "WRT other sites"; Notes sheet "(Keystone)"; allocation site tabs "Community Group" |
| Lake Hayes South, Feehly Hill, Peace Park | Keystone | Autumn 2026 main sheet places them under KEYSTONE SITES (`O3`) |
| JP Reference Gardens, Pigeon Island | Keystone, Community | Allocation main sheets: "Nursery and Extras" |
| Morning Star | Community | Allocation tab says Keystone (probably template default) |
| Kiwi Park | Community | MASTER Spring 2024 and allocation sheets: Schools |
| Shotover Wetlands | School | Tab labels differ by workbook (School or Keystone) |
| Lake Hayes East Rowing Club | blank | Autumn 2026 main sheet: Keystone |
| Bush Creek Keystone | Keystone | Not present in the 2025 to 2026 allocation sheets |
| Matakauri Wetlands, Remarkables Primary, WHS plantings | not in register | Allocation sheets: School sites |

Also `SUMMARY SITES › BB` is a cleaned "Sites" name column that rolls several rows together (for example Bible Terrace into "GY LAKEFRONT"), and `BE25:BE26`, `BE33:BE34` and `BE36` hold two ad hoc roll-ups: Lake Hayes total 16,739 and Slope Hill total 42,478, and their sum, 59,217.

## 10. Landowner organisations (organisation level only)

Values in the landowner rows, as typed:

| Source | Values and counts |
|---|---|
| `MASTER › G6:PW6` (387 site columns, 2015 to 2026) | QLDC 151; DOC 103; blank 93 (all Spring 2024 onwards); DOC/QLDC 16; `?` 8; School / SCHL / SCHOOL 9; MISC 3; QEII 2; MfE 1; PRIVATE 1 |
| `SUMMARY SITES › D4:D82` | QLDC 31; DOC 19; blank 16; CROWN or Crown 4; `OLDC` 2 (typo for QLDC); DOC/QLDC 2; N/A 1; `QLDC, QTT` 1; `QE11` 1 (typo for QEII) |
| `HISTORIC SUMMARY SITES › E3:E59` | DOC 21; QLDC 21; blank 4; `OLDC` 3; DOC/QLDC 2; PRIVATE 2; N/A 2; SCHOOL 1; TBC 1 |

The label `Rowing Club (LINZ)` (Autumn 2026) names LINZ, a land-owning agency. The `WHO` and contact columns in `SUMMARY SITES` and `HISTORIC SUMMARY SITES` hold personal names; I did not copy them.

## 11. Other data-quality notes for site handling

- `SUMMARY SITES` links are by row offset, not by site, and several point to empty MASTER rows (scout finding, `F5`, `J5`); 77 site rows are a mix of links and typed numbers.
- `HISTORIC SUMMARY SITES` is frozen at 22/11/2016 (`D2`), has 14 `#REF!` old IDs, and includes three entries whose names contain a person's name (withheld).
- MASTER row 3 labels drift: Whitechapel sits under the group "WHITECHAPEL - GIBBSTON VALLEY" until 2022, then "Arrow Junction" (2023), then "Keystone Sites" (2024). Gibbston Valley is a separate historic site (19). Treat the group label as unreliable. (confidence: medium)
- Whitechapel is typed with two trailing spaces in 17 MASTER columns and without them from Spring 2024; exact-match joins will miss.
- In Autumn 2025 the `Paper for Trees` column (`MASTER › OD4`) sits after the last site but outside the block's total (`OE8 = SUM(NK8:OC8)`). It is empty, so no counts are lost, but the pattern would drop any future entry.

## Questions for WRT

1. **Areas:** Do you want sub-areas inside a site (for example Whitechapel south bank and mound, back block, steep bank; Slope Hill wetland, HGF, Coronation, Triangle paddock) to become a formal level, and is there one list of them per site that Anna, Sarah or Helen keep?
2. **Autumn 2026 and Spring 2026:** Is the Autumn 2026 block in MASTER (4,556 plants) what was actually planted or still the allocation plan? Has Spring 2026 been planted, and when will it be entered?
3. **Slope Hill HGF and Coronation:** What do HGF and Coronation stand for, and were the 22,000 (Spring 2024) and 7,000 (Autumn 2024) plants really planted in those seasons? What kind of planting was it?
4. **Wrong IDs:** From Spring 2024 to Spring 2025 Slope Hill carries 13C and JP Welcome Forest carries 11; Akarua Corner is 9E in the master but 9F in the register; Derby St is 13A versus 13D. Which are correct?
5. **Unclear names:** What are Paererewa, Little Difference, QLDC Tohu, Bridesdale, the column named for a person (probably Kelvin Peninsula), the "Spare FH, PPk, QR, Apt" bucket (what is Apt?), and `Rowing Club (LINZ)` versus `Lake Hayes Rowing Club`?
6. **Classes:** Which class does each of Peace Park, Feehly Hill, Lake Hayes South, Pigeon Island, JP Reference Gardens, Kiwi Park and Morning Star officially have, and is "Nursery and extras" a fourth class?
7. **Event details:** Do you hold planting event dates, event types (establishment, infill, replacement, enrichment) or volunteer and group counts anywhere outside these spreadsheets (TTC photo logs, emails, paper sheets)?
8. **Older allocations:** Are the 2022 to 2024 PDF allocation sheets the only place the species lists for those site visits survive, and can WRT supply them in spreadsheet form?
9. **Lake Hayes Showground Reserve:** Is this the Lake Hayes Pavilion (9G) site, as the forecast columns seem to treat it?
10. **Dates:** Are the collection and planting date pairs on the allocation tabs the real event dates, and which of the repeated 1 and 2 May 2026 dates are real?
