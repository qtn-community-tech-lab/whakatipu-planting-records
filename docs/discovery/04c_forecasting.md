# 04c. Forecast and target chain: from planting need to seasonal production target

Specialist S4c (Forecast and Target Analyst). British English. Read-only analysis of the source copy under `_ALL Plant Lists/`.

Conventions: `file › sheet › cell` (file paths are given relative to `_ALL Plant Lists/`; long folder prefixes are shortened after first use). "Typed" means a number keyed in by hand. "Formula" means a spreadsheet formula. Every cell cited below was opened with openpyxl in both `data_only=False` (formula text) and `data_only=True` (cached value). Staff first names that appear in some headers and sheet names are not reproduced except where a sheet name must be quoted exactly (`Helen Master`).

---

## 1. Summary in plain language

1. **There is no single wired-up chain.** The path "site need → forecast → pricking-out list → sowing list → potting-on goal → stocktake → allocation" exists as a *process*, but between workbooks every number is **re-keyed by hand**. A scan of all formulas in the nursery folders found **no links between workbooks** (the only external links are in the Seed & Cutting results files and are broken). Formulas exist only *inside* a workbook (site sheets → roll-up sheets, monthly sheets → Summary).
2. **The production target is, in practice, a typed number per species on the pricking-out list.** It is rounded to whole V150 trays (24 plants per tray). Across the four lists from 2023/24 to 2026/27 the totals are stable at about 10,700 to 11,100 plants a year (10,680; 10,708; 11,064; 11,008). The 2025-26 Summary even hard-codes the annual goal as `=11000/9` per month.
3. **The forecast workbook feeds nothing downstream, and the 2026/27 copy is not live.** The roll-up in `_JMN PLANT Forecasting 2026_2027.xlsx` is empty (one season column (Spring 2028, column AK) with ten typed cells), its site sheets still carry look-aheads labelled Autumn 2024 to Spring 2026, and the final SUMMARY is `#REF!` because a `SCHOOLS` sheet is missing. The most complete working version of the roll-up is the archived `Aug 2025 Keystone Sites Plants Summary.xlsx`.
4. **There is no 10 to 15 percent contingency parameter anywhere.** The multipliers actually in formulas are `×1.5` (allocation sheets), `×3` and `×2` (Neill list), `×2` ("Annual Projection (Best case)"), and a share-and-scale formula on the Jardine Park forecast sheet. The pricking target is typically about 1.2 times the planting need (median over 52 species), but this is a typed judgement rounded up to trays, not a calculated allowance. Confidence: high that no percentage cell exists; medium on how WRT staff would describe the uplift (see Questions).
5. **Projections do not deduct losses.** Losses show up only afterwards, as typed surplus/deficit columns on the V150 stocktake, a "To go" column on potting-on, and free-text notes. There is no mortality rate and no loss column in any production list.
6. **The "two seasons later" rule is followed at the level of labels** (pricking 2024/25 → potting 2025/26 → planting 2026/27) and is visible in the file names. One header row in the forecast workbook is a year out on the sowing line (section 8).

---

## 2. The chain at a glance

| # | Stage | Where | What the number means | How it gets there |
|---|---|---|---|---|
| 0a | Per-site species lists ("what each site needs per 1,000 plants") | `1. Forecasting/Archive to sort through/Master plant list 2024.xlsx`; `A. Suggested plant species and numbers each site per year. 2025 onwards.xlsx`; `_MASTER Nursery records and templates/Standard Annual Plant List for JMN (Neill) MASTER.xlsx` (all `Sheet1`) | Plants of each species per 1,000-plant site planting, per site, plus a pooled "Spare FH, PPk, QR, Apt" column (2,500) | Typed. Row totals typed (L column of Neill list: 65 typed, 0 formulas) |
| 0b | Site plans by planting mix | `2. Propagation (cuttings and seeds)/Helen Resources/_ plantings at Flagship sites 2023.xlsx › Sheet1` | Percentage and count per species for named sites ("Whitechapel 3000 plants", "Bush Creek 1500", "Feehly Hill 200", two Slope Hill areas) for 2025/26, "sowing spring 2023" | Typed; the sheet has no formulas (A1 title, A3 etc.) |
| 1 | Forecast ("3 Year Plant Look Ahead") | `1. Forecasting/_JMN PLANT Forecasting 2026_2027.xlsx` and archive versions in B02 | Plants per species per site per season, seasons from Autumn 2024 up to Autumn 2030 | Site sheets: typed. Roll-up: formulas (links, sums). Group/schools columns empty |
| 2 | Pricking-out list (stage 2) | `2. Propagation…/_Pricking out lists/` (B05 files) | Plants to prick out into V150 for a year, plus tray count | Typed (B column 100 percent typed in all four current lists) |
| 3 | Seed Sowing "Projected potting" | `…/_Seed and Cutting Records/Seed Sowing /` (B07 files) | The same target repeated beside sowing quantities and dates | Typed copy of stage 2 (matches in 52 of 55 species for 2026) |
| 4 | V150 stocktake "Projected / pricked out / stocktake" | `4. Stocktakes/…/V150 stocktake 31 March 2026.xlsx` and earlier years (B17) | Projected target, number actually pricked out, number counted | Typed; column sums are formulas; surplus/deficit typed |
| 5 | Potting On "Goal Set" | `3. Potting On/2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx › Summary` and archive years (B13 to B15) | Number of plants to pot into PB3 in the Aug to Jul year | 2026/27: typed from stocktake. 2024/25 and 2025/26: VLOOKUP from `Helen Master` (best case) then partly overtyped |
| 6 | Stage 4 stocktake and allocation | `4. Stocktakes/_Stocktake Master CURRENT.xlsx`; `5. Seasonal Planting Lists…/2026 Spring planting/_JMN Plant Allocations Spring 2026.xlsx` | Plants ready, then allocated per site | Stocktake figures re-keyed; per-site columns partly `=per-1000 × 1.5` |

Cross-workbook equality tests (species matched by name, nonzero in either list; this shows re-keying, not links):

| Pair of lists | Equal / compared |
|---|---|
| Neill list column N ("Subtotal keystone x3") → pricking-out 2026-27 `Sheet2` column C ("Neill 8000") | 98 of 98 |
| Pricking-out 2026-27 `Sheet2` F (25/26) → same file `Sheet1` B | 55 of 55 |
| Pricking-out 2024-25 `Sheet1` B → V150 stocktake 27/3/25 B | 55 of 55 |
| Pricking-out 2023-24 `Sheet1` B → stocktake 27/3/24 B | 51 of 51 |
| Pricking-out 2025-26 B → stocktake 31/3/26 B | 49 of 53 (the list was edited after the stocktake form was filled, or vice versa) |
| Seed Sowing 2026 B → pricking-out 2026-27 `Sheet2` G | 52 of 55 |
| Seed Sowing 2025 B → pricking-out 2025-26 B | 50 of 54 |
| Seed Sowing 2024 B → pricking-out 2024-25 B | 54 of 55 |
| Potting On 2026-27 Goal Set D → stocktake 31/3/26 "Stocktake" D | 47 of 50 |
| Potting On 2025-26 "Total to be potted on" F → stocktake 27/3/25 D | 60 of 62 |
| Potting On 2026-27 Goal Set D → pricking-out 2025-26 B (the list, not the count) | **4 of 52** |

Reading: the **Goal Set for potting is the V150 *count* from the March stocktake, not the pricking-out target**. This matches the Summary of Records ("the pricking out list from the year before and latest propagation stocktake create this form"). Confidence: high (47 of 50 equal, plus the Coprosma propinqua trace below).

---

## 3. How a planting need becomes a production target

### 3.1 Step one: per-site needs (typed)

In the Neill list (`_MASTER…/Standard Annual Plant List for JMN (Neill) MASTER.xlsx › Sheet1`):
- Row 3 gives the site quota: D3, F3, H3, J3 = 1,000 each; K3 = 2,500 for the pooled spare column. Header L2 reads "Total required if 6500". The actual column total L102 is 6,860 (cached), not 6,500. In the earlier A. list the total is J93 = 6,490.
- Multipliers in formulas: `E = D×3` (header E2 "WC 3000"), `G = F×3` (G2 "LH 3000"), `I = H×2` (I2 "SH 2000"), `N = E+G+I` (N2 "Subtotal keystone x3"), `R = L×2`. N103 = 8,000 and R102 = 13,720.
- Note the `×3`, `×3` and `×2` convert a 1,000-plant list to the site's stated annual quota of 3,000, 3,000 and 2,000. They are scale-ups, not loss allowances. Confidence: medium (inferred from headers "WC 3000", "LH 3000", "SH 2000").
- Row 1 totals double count: D1 `=SUM(D4:D107)` shows 2,000 while the real column total D102 is 1,000, because the range includes the totals row. Same for F1, H1, J1 and L1 (13,720 vs 6,860). Confidence: high (formula range and cached values read directly).

The 2024 version (`Master plant list 2024.xlsx › Sheet1`) has different numbers for the same species (Coprosma propinqua: D21 = 60, E21 = 10, G21 = 20, H21 = 20; F21 holds the text `100        50`), so the lists were revised in place over time rather than versioned.

### 3.2 Step two: the forecast workbook (site sheets typed, roll-up formulas)

Site sheets in `1. Forecasting/_JMN PLANT Forecasting 2026_2027.xlsx` (for example `Whitechapel (15)`) have three zones:
- history by season, Autumn 2015 onwards (typed, for example `Whitechapel (15) › E5:Y101`, with `C = AA` and `AA = SUM(E:Z)` as formulas);
- a "3 Year Lookahead" block of typed per-species numbers (Whitechapel `AC5:AI101`; Slope Hill `AC:AI`; Lake Hayes Pavilion `K:P`);
- a typed site-total row 3 that sums to a flat figure per season: Whitechapel AC3 to AI3 = 2,000 each; Jardine Park S3 to V3 = 1,000 each; Jardine Park `Y3` = 1000 typed as the target.

On `JARDINE PK` only, species numbers are **scaled to the site target by formula**: `X26 = R26/$R$3` (share of the season total) and `Y26 = X26*$Y$3` (share times the target of 1,000). Example: R26 = 5, R3 = 535, X26 = 0.0093, Y26 = 9.35. The same pattern is on `Ref Gardens` (`N = H/$H$3`, `O = N*$O$3`). This is the only place in the forecast where a target is back-calculated by formula (94 formulas per sheet).

The roll-up (in `Aug 2025 Keystone Sites Plants Summary.xlsx`, the working version):
- `3 Year Plant Look Ahead (Keysto › D28` = `='Whitechapel (15)'!$AC26`, and similarly one link per site per season (row 28 is Coprosma propinqua there).
- `AY28 = SUM(D28:I28)` gives the season total across keystone sites (450 for the first block). `BF28 = SUM(AY28:AZ28)`.
- `KEYSTONE SITES › C28 = '3 Year Plant Look Ahead (Keysto'!AY28` and `SUMMARY › C28` adds `COMMUNITY GROUPS` and `SCHOOLS`. The Community, Schools and Buffer columns are empty or missing, and SUMMARY shows `#REF!` in every total (for example `SUMMARY › C5`).
- In the 2026/27 copy the same sheet's master block (`3 Year Plant Look Ahead (Keysto › L:BJ`) contains only one season column (Spring 2028, column AK) holds typed species values: ten cells for the whole forecast horizon, Slope Hill Spring 2028 (`AK34` = 20 for Coprosma propinqua, `AK18` = 150 for Carex secta; the sheet has 10 typed cells in column AK and nothing else). Its seasonal sums `BQ34:BU34` are `=SUM(...)` of empty ranges, and `BV34 = SUM(#REF!)`. So that workbook's headline horizon (Spring 2026 to Autumn 2030) is a template, not a forecast. Confidence: high.

Row 11 of the master ("PLANT NUMBERS", for example `D11` 1,200, `E11` 1,000, `F11` 1,500) is a typed site-quota per season. Whether it includes any allowance is not stated (see Questions).

### 3.3 Step three: the pricking-out list (typed, rounded to trays)

In `2. Propagation (cuttings and seeds)/_Pricking out lists/_Pricking out 2026-27 for potting 27-28 .xlsx`:
- `Sheet2` shows the working: `C` "Neill 8000" (typed copy of the Neill list column N), `D` "Spares 2500", `E = C+D` ("Neill total 10500", total `E101` = 10,500), then `F` 25/26 and `G` 26/27 **typed** (totals `F101` 10,968; `G101` 11,008), `H = G/24` (V150 trays), `I = G/28` (T28 trays). Lookup block `L:N` has `M = L×24` and `N = L×28`.
- So the file itself defines the tray sizes: **24 plants per V150 tray and 28 per T28 tray**. Of 55 nonzero G values, 51 are exact multiples of 24 (T28-path species are multiples of 28).
- Relationship of target to need (species with both): median G/E = 1.20, range 0.6 to 4.8 (52 species); sum 10,816 against 10,035 (+7.8 percent). Whole-file totals 11,008 against 10,500 are +4.8 percent because 13 species with a need have no pricking number (for example `Coprosma rhamnoides`, `Discaria toumatou`, `Pseudowintera colorata`; probably cuttings, wild-sourced or bought in, confidence: low) and 3 species have a number but no need.
- The relationship is therefore **judgemental, not formulaic**. No cell multiplies the need by a factor.

Earlier lists use the same pattern in a simpler layout: column B target, column C tray count as text (for example `50 V150`), column D notes (`Pricking out 2024-25 for potting 25-26.xlsx › Sheet1 › A1:D1`). The 2025-26 list adds `E` "Planted in 2024/2025" (an actual-planted comparison). The archived `Pricking Out List for 2025_2026.xlsx` has column D "Neill master list" beside the projection and a TTC flag in G with `H = SUMIF(G,"Y",C)`; B1 reads "For Planting approx 2028".

Judgement notes on that archived list (`F5`, `F24`, `F43`, `F67`) say "could increase", "increase for outcrop areas coming up at WC": uplifts are decided by people and recorded as words. Column A and column B names are offset on rows 22 and 24 of that file (for example A22 holds one species and B22 another), a quality flag.

### 3.4 Steps four to six: sowing, stocktake, potting, allocation

- **Seed Sowing** `B` "Projected potting" and `C` "Pricking Tray size" repeat the pricking target and tray count (typed). Sowing quantity is volume (for example "1.5 Tbsp"), sown tray size is `.5 V150`, `1 Hygiene`, and so on. There is no conversion from target plants to seed volume by formula. (Seed source text in column D is not reproduced here.)
- **V150 stocktake** (B17): `B` projected, `C` pricked out, `D` counted, `E` T28 count, `F` P/o surplus, `G` P/o deficit, `H` notes. Sums at row 85 are formulas (`B85 = SUM(B2:B84)`).
- **Potting On** (B13 to B15): see section 7 and 3.5.
- **Allocation** (B19, B20, template in `_MASTER…/JMN Plant Allocation MASTER TEMPLATE.xlsx › Plant Allocations `): columns for stage 2, stage 3, stage 4 stock, then per-site "NS # per 1000" columns with a paired allocation column.

### 3.5 What "Goal Set" has meant, by year

| Potting year | Goal Set source | Evidence |
|---|---|---|
| 2022/23 | Blank | `Potting On 2022-23 › Summary › B25` empty; "To go" `D25 = B25-C25` = -1,569 (negative for all species, per B14 scout) |
| 2023/24 | Typed `H` "Goal Set"; neighbouring typed columns show a stocktake (Oct 2023), a second stocktake (28/2/24), and a "2024 Forecast" column | `Summary › D25` 1,004; `E25` 1,350; `G25` 1,011; `H25` 1,560; `I25 = G25-H25` = -549; `K25 = J25-H25` = -271 |
| 2024/25 | `D = VLOOKUP($B,'Helen Master'!$B$4:$J$93,9,false)` = column J "Annual Projection (Best case)" = 2 × the per-6,500 total | `Summary › D25` 660; `Helen Master › J21 = I21*2`; 84 formula cells, 14 typed |
| 2025/26 | Column D as above (still 660), but `F` "Total to be potted on" is **typed over** with the March 2025 stocktake count in 76 of 100 rows | `Summary › F25` = 1,104 (typed) equals `V150 stocktake 31.3.25 › D22` |
| 2026/27 | Typed `D` = V150 count at 31/3/26 | `Summary › D25` = 987 (typed) equals `V150 stocktake 31 March 2026 › D22`; `F = D-E` is a formula |

Also: `Summary` row 106 in 2025-26 holds `GOAL (Monthly avg)` as `=11000/9` per month (`J106:L106`). In 2026/27 the Summary total goal `D104 = SUM(D4:D103)` is 10,185 and "Total to be potted on" `F104` is 9,680.

---

## 4. Planning horizon

| Document | Horizon it covers | Evidence |
|---|---|---|
| Summary of Records | Forecast "3 years ahead (new)"; pricking-out list "becomes planting list two seasons later" | `_Summary of Records JM Nursery.docx`, items 1 and 5 |
| Forecast workbook master | 8 seasons (Spring 2026 to Autumn 2030) as column blocks; empty | `…Forecasting 2026_2027.xlsx › 3 Year Plant Look Ahead (Keysto › D2:BH2` |
| Aug 2025 roll-up | 7 seasons (Spring 2025 to Autumn 2028) | `Aug 2025 Keystone Sites Plants Summary.xlsx › 3 Year Plant Look Ahead (Keysto › D2:AY2` |
| Site sheets | 7 seasons of typed look-ahead, but headed Autumn 2024 to Spring 2026 (Whitechapel `AC2:AH2`; `AI` has numbers and no heading) | `Whitechapel (15) › AC2:AI26` |
| Neill list | A single steady-state year ("annual"), not time-phased | `Standard Annual Plant List … › Sheet1` |
| Flagship plan | One planting year (2025/26), sown spring 2023 | `_ plantings at Flagship sites 2023.xlsx › A1` |
| Pricking-out list | One production year (two columns in 2026-27: 25/26 and 26/27) | `_Pricking out 2026-27… › Sheet2 › F2:G2` |
| Seed sowing, potting-on, stocktake | One year each | headers `B2` of each file |

So in practice the **binding planning unit is one year**, set about two years before planting. The three-year forecast is meant to inform it but is not connected to it. Confidence: high.

Lead time per the files: sowing in winter (for example stratified 24.7.25, sown 13.8.25 in `1. Seed Sowing 2025.xlsx › E14:F14`) → pricked out the same production year → potted on the next Aug to Jul year → ready for planting the year after. Seed to planting is therefore about two and a half to three years.

---

## 5. Where contingency or multipliers are applied

| Rule | Where | Formula or typed | What it really does | Confidence |
|---|---|---|---|---|
| "To get 1500 plants add 50% e.g. 50 becomes 75" | Note in `A. Suggested plant species… › Sheet1 › K93`; Neill list `M102`; `Helen Master` and other copies | Typed note | Scales a 1,000-plant recipe up to a 1,500-plant planting. It is a size conversion, not a loss allowance | medium |
| `×1.5` | `_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations › W7 = V7*1.5` (also `AC = AB*1.5`); template `Plant Allocations  › Q6 = P6*1.5` | Formula in 57 of 99 cells of column W; 42 typed (and overtyped, for example `Y27` = 65 beside per-1,000 `X27` = 20). Literal `1.5` in the formula; factor row `V3:AC3` (1.0 and 1.5) is typed but not referenced | The per-1,000 numbers are multiplied by 1.5 where a site takes 1,500 | high (formula text) |
| `×3`, `×2` | Neill list `E`, `G`, `I`, `R` | Formula | Scale to site quotas of 3,000, 3,000, 2,000 and doubling the total | medium |
| "x2 best case" | `Helen Master › J2` "Annual Projection (Best case)", `J21 = I21*2` | Formula, 90 rows | Two plantings a year; fed potting-on Goal Set in 2024/25 and 2025/26 | high |
| "Spares 2500" | `_Pricking out 2026-27… › Sheet2 › D2`, `D24` = 100; Neill list `K2`/`K25` | Typed | A pooled reserve for small sites (abbreviations FH, PPk, QR, Apt unexplained), 23.8 percent of the 10,500 "need". Added to need in `E = C+D`. This is extra demand, not a loss allowance | medium |
| Uplift from need to pricking target | `Sheet2 › G` against `E` | Typed, rounded to trays | Median 1.2 times; for Coprosma propinqua 960 against 650 (1.48) | medium |
| Share-and-scale | `JARDINE PK › X = R/$R$3`, `Y = X*$Y$3` (94 formulas) | Formula | Scales species mix to a 1,000-plant site target | high |
| Notes "reduced because of surplus at PB3 and last years V150 stock" | `V150 stocktake 31.3.25 › H22` | Free text | Judgemental downward adjustment for next year's target | high |
| "Reduced by 10x large … plant deaths in Nov 24" | `4. Stocktakes/2025/18 October 24 JMN Stocktake.xlsx › Oct 24 › H17` | Free text | A loss recorded as a note beside the stocktake figure | high |

**No 10 to 15 percent cell or formula exists.** The scan covered formulas in rows 1 to 300 and columns A to BR of every xlsx in folders 1 to 4 and `_MASTER…`, searching for multipliers (1.1, 1.15, 0.1, percentages), `ROUNDUP`, `CEILING` and `MROUND`. It found only: `×1.5`, `×2`, `×3`, `/24`, `×24`, `×28` and share-and-scale. The 10 to 15 percent in the WRT description may be a working habit applied when choosing the typed pricking number (the median 1.2 uplift is consistent with this once tray rounding and "Spares" are included). Confidence: low on that last point; it needs WRT confirmation.

---

## 6. Do projections account for losses?

**No: projections are gross targets.** The cells that touch losses all come afterwards:

- **Surplus and deficit** (V150 stocktakes, B17): typed. In `V150 stocktake 31 March 2026.xlsx` columns F and G hold 66 and 16 typed values. They equal "pricked out minus projected" where recorded (surplus matches on 25 of 25 rows where C > B; deficit on 16 of 17 rows where C < B). Example: `F22` = 29 equals `C22 - B22` (989 - 960). In 2025, `G22` = 457 equals 1,200 - 743. Surplus/deficit therefore measures **how far pricking-out missed the target**, not plants lost afterwards.
- **Counted stock versus pricked out** (`C` against `D`) mixes in carry-over from earlier years, so it cannot be read as loss. In March 2026 the column sums are B85 = 11,096 (projected), C85 = 10,745 (pricked out), D85 = 11,397 (counted).
- **"To go"** (Potting On `H = F-G`): target minus plants potted so far; negative means over-potting (Coprosma propinqua 2024/25: -423).
- **"Less T28"** (Potting On `E`): plants that skip PB3 because they are held in T28 (for example Carex secta, section 7.2). It is a route, not a loss.
- **Damping-off, discards, deaths**: only free text in propagation records (`2. Seed records MASTER.xlsx › Sheet1 › K18`, `K20` "damp off"; `3. Seed & Cutting results MASTER.xlsx › Sheet1 › H7`, `H80` "discarded"; the `%survival` column `G1` has 30 typed values and no formulas). None of these reaches a projection.
- **Plant deaths in the nursery** appear once as a note on the October 2024 stocktake (`H17`), not in a loss column.

So the model "target pricked out ≈ target planted × uplift" has no explicit survival rate. Effective survival is implied by a person's reading of the previous stocktake (as in `V150 stocktake 31.3.25 › H22`).

---

## 7. Worked example traced cell by cell: *Coprosma propinqua* (mingimingi)

Chosen because it has a value at every hop and is a keystone species. All cells verified in both modes.

### 7.1 Hop table (forward in time: need → target → stock → planting)

| Hop | Cell | Value | Formula or re-keyed | Note |
|---|---|---|---|---|
| 0a Site need, Whitechapel | `_MASTER…/Standard Annual Plant List for JMN (Neill) MASTER.xlsx › Sheet1 › D25` | 100 | typed | Per 1,000-plant planting |
| 0a Site need, Lake Hayes | same › `F25` | 70 | typed | |
| 0a Site need, Slope Hill wetland | same › `H25` | 20 | typed | |
| 0a Site need, Jardine Park | same › `J25` | 40 | typed | |
| 0a Spare/small sites | same › `K25` | 100 | typed | |
| 0a Total "if 6500" | same › `L25` | 330 | typed (equals D+F+H+J+K = 330) | The same 330 is typed at `A. Suggested… › Sheet1 › J21` and in `Helen Master › I21` |
| 0a Scaled | same › `E25` `=D25*3` | 300 | formula | WC 3000 |
| | `G25` `=F25*3` | 210 | formula | LH 3000 |
| | `I25` `=H25*2` | 40 | formula | SH 2000 |
| | `N25` `=SUM(E25+G25+I25)` | 550 | formula | "Subtotal keystone x3" |
| | `R25` `=L25*2` | 660 | formula | |
| 0b Flagship plan (earlier plan) | `_ plantings at Flagship sites 2023.xlsx › Sheet1 › C5` | 600 (20 percent of the 3,000-plant site; `B5` = 20) | typed | Other rows: `C21` 300, `C38` 40, `C51` 140, `C64` 80 (different sites). Note 600 here against 300 in the Neill list for the same site: the plans disagree |
| 1 Forecast, Whitechapel look-ahead | `1. Forecasting/_JMN PLANT Forecasting 2026_2027.xlsx › Whitechapel (15) › AC26:AI26` | 300 each season | typed | Equals Neill `E25` by value; no link (inference, confidence: medium) |
| 1 Forecast, Lake Hayes Pavilion | `› Lake Hayes Pavilion (9G) › K26:P26` | 140 each | typed | Neill LH is 210, so not the same rule |
| 1 Forecast, Slope Hill | `› Slope Hill Rd (11) › AG26:AI26` | 150 each | typed | Neill SH is 40 |
| 1 Forecast, Jardine Park | `› JARDINE PK › R26`, `S26:V26` | 5, then 15 each | typed; `X26 = R26/$R$3` (0.0093), `Y26 = X26*$Y$3` (9.35) | Share-and-scale to 1,000 |
| 1 Forecast, roll-up (Aug 2025 version) | `1. Forecasting/Archive to sort through/Aug 2025 Keystone Sites Plants Summary.xlsx › 3 Year Plant Look Ahead (Keysto › D28` `='Whitechapel (15)'!$AC26` | 300 | formula (link) | Sites: `F28` 140, `G28` 5, `H28` 5 (Slope Hill, Feehly Hill empty) |
| | `› AY28` `=SUM(D28:I28)` | 450 | formula | First season block; `AZ28` 455, `BA28` 460, `BB28` 605, `BC28` 610, `BD28` 590 |
| | `› KEYSTONE SITES › C28` `='3 Year Plant Look Ahead (Keysto'!AY28` | 450 | formula (link) | Labelled "Autumn 2024" though it pulls the Spring 2025 block (stale heading) |
| | `› SUMMARY › C28` | `#REF!` | formula | Broken (`SCHOOLS` sheet missing) |
| 1 Forecast, 2026/27 copy | `_JMN PLANT Forecasting 2026_2027.xlsx › 3 Year Plant Look Ahead (Keysto › AK34` | 20 (Slope Hill, Spring 2028) | typed | Only populated cell in the master for this species; `BQ34:BU34` sum empty ranges; `KEYSTONE SITES › F28` shows it as 20 |
| 2 Pricking target 2023/24 | `2. Propagation…/_Pricking out lists/Pricking out 2023 - 2024 for 2024-2025.xlsx › Sheet1 › B21` | 1,560 (`C21` "65 V150") | typed | 65 × 24 = 1,560 |
| 2 Pricking target 2024/25 | `…/Pricking out 2024-25 for potting 25-26.xlsx › Sheet1 › B21` | 1,200 (`C21` "50 V150") | typed | 50 × 24 |
| 2 Pricking target 2025/26 | `…/Pricking out 2025-2026 for potting 26-27.xlsx › Sheet1 › B13` | 960 (`C13` "40 V150"); `E13` "Planted in 2024/2025" = 1,095 | typed | 40 × 24 |
| 2 Pricking target 2026/27 | `…/_Pricking out 2026-27 for potting 27-28 .xlsx › Sheet1 › B24`, `C24` | 960, 960 (`D24` = 40 trays) | typed | |
| 2 Need versus target | same › `Sheet2 › C24` | 550 | typed copy of Neill `N25` | |
| | `D24` | 100 | typed copy of Neill `K25` | |
| | `E24` `=C24+D24` | 650 | formula | |
| | `F24`, `G24` | 960, 960 | typed | 960 / 650 = 1.48 |
| | `H24` `=G24/24` | 40 | formula | V150 trays |
| 3 Sowing, 2024 | `…/_Seed and Cutting Records/Seed Sowing /Archive seed Sowing Records annual/Seed sowing 2024.xlsx › Sheet1 › B23` | 1,200 ("Projected 2025/2026") | typed | stratified 21.7.24, sown 14.8.24 (`E23`, `F23`) |
| 3 Sowing, 2025 | `…/Seed Sowing /1. Seed Sowing 2025.xlsx › Sheet1 › B14` | 960 ("Projected potting 2026 - 27"); `C14` "40 V150" | typed | stratified 24.7.25, sown 13.8.25 |
| 3 Sowing, 2026 | `…/Seed Sowing 2026 .xlsx › Sheet1 › B14`, `C14` | 960, 40 | typed | Sowing columns still blank at the time |
| 4 V150 stocktake 27/3/25 | `4. Stocktakes/2025/V150 stocktake 31.3.25.xlsx › Sheet1 › B22` | 1,200 (projected) | typed | header `B1` "Projected PU25/26" |
| | `C22` | 743 (pricked out 24/25) | typed | |
| | `D22` | 1,104 (actual) | typed | carry-over included |
| | `G22` | 457 (deficit) | typed | equals 1,200 − 743 |
| | `H22` | note "reduced because of surplus at PB3 and last years V150 stock" | typed text | explains why the next target fell to 960 |
| 4 V150 stocktake 31/3/26 | `4. Stocktakes/Old propagation stocktakes/V150 stocktake 31 March 2026.xlsx › Sheet1 › B22` | 960 | typed | header `B1` still reads "Projected PU25/26" although 960 is the 2025/26 pricking target for potting 26/27 (stale heading, confidence: medium) |
| | `C22` | 989 (pricked out) | typed | |
| | `D22` | 987 (counted) | typed | |
| | `F22` | 29 (surplus) | typed | equals 989 − 960 |
| 5 Potting On 2025/26 | `3. Potting On/Archive/2025-26 JMN Potting On - August 2025 - July 26.xlsx › Summary › D25` `=VLOOKUP($B25,'Helen Master'!$B$4:$J$93,9,false)` | 660 | formula | `Helen Master › I21` 330 typed; `J21 =I21*2` |
| | `F25` | 1,104 | **typed** (equals stocktake 27/3/25 `D22`) | overtypes the `=D25-E25` pattern used in 24 other rows |
| | `G25` `=sum(J25:U25)` | 1,039 | formula | monthly cells `J25 =Aug!C25` 94, `K25` 160, `L25` 87, `M25` 143, `N25` 0, `O25` 1, `P25` 416, `Q25` 138 |
| | `H25` `=F25-G25` | 65 | formula | "To go" |
| 5 Potting On 2026/27 | `3. Potting On/2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx › Summary › D25` | 987 | **typed** (equals stocktake 31/3/26 `D22`) | |
| | `F25` `=D25-E25` | 987 | formula | |
| | `G25` `=sum(J25:U25)` | 77 | formula | to date |
| | `H25` `=F25-G25` | 910 | formula | |
| | `K25` `=Sept!C25` | 77 | formula (link) | `Sept › C25 =SUM(D25:H25)`; weekly cells `D25` 22 and `F25` 55 typed |
| 6 Stage 4 stocktake | `4. Stocktakes/_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › D26` | 987 (31/03/26) | re-keyed | `C26` "Projected pricked out for 2026" is **empty** |
| | `F26` | 478 (PB3 potted, 28/04/26) | typed | |
| | `H26` | 417 (PB3 ready, 13/05/26) | typed | |
| | `J26` | 902 | typed | "space needed" |
| 6 Allocation, Spring 2026 | `5. Seasonal Planting Lists…/2026 Spring planting/_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations › E27`, `G27`, `I27` | 987, 478, 417 | re-keyed | |
| | `R27` `=I27+J27+K27+L27+M27+N27+O27` | 582 | formula | includes 85 and 80 from QLDC supply columns `M27`, `N27` |
| | `T27` `=sum(W27+Y27+AA27+AC27+sum(AD27:AV27))` | 580 | formula | allocated |
| | `U27` `=R27-T27` | 2 | formula | over/under |
| | `V27` 100, `X27` 20, `Z27` 70, `AB27` 40 | per-1,000 | typed | same as Neill `D25`, `H25`, `F25`, `J25` |
| | `W27` 150, `AC27` 60 | per-site | typed (formula `=V*1.5` is used on other rows) | 100 × 1.5 and 40 × 1.5 |
| | `Y27` 65 | | typed | not 20 × 1.5 = 30; manual override |

### 7.2 What the trace shows

- The quantity changes at only two points by rule: the Neill list `×3 / ×2` and the allocation `×1.5`. Everywhere else a person retypes a number, often identical (960 → 960 → 960) and sometimes revised in the notes (1,200 → 960 after the March 2025 stocktake).
- The multi-year series of the production target for this species is: 1,560 (2022/23, `4. 22-23 plant projections Final.xlsx › Sheet1 › B20`, with counted 1,600 in `D20` and surplus 40 in `E20`, all typed) → 1,560 (2023/24) → 1,200 (2024/25) → 960 (2025/26) → 960 (2026/27). Meanwhile the Neill need column totals 330 (550 after ×3/×2 scaling, 650 with spares).
- Plants pricked out in 2024/25 reached the ready bench in May 2026 (417 counted ready on 13/05/26, 478 potted on 28/04/26 from 987 in V150 on 31/03/26). The counts fall at each stage (987 → 478 → 417) but these are different stages counted on different dates; they cannot be used to calculate loss because stage 3 and 4 numbers also include other batches (confidence: medium).
- Planting: 580 allocated in Spring 2026; 702 in Autumn 2026 (`JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026 › M27`, from `H27` = 1,200 stock).

### 7.3 A contrasting species: *Carex secta* (fast, T28 path)

| Hop | Cell | Value | Note |
|---|---|---|---|
| Neill list | `Standard Annual Plant List … › Sheet1 › F9`, `H9` | 50 (LH), 300 (SH wetland) | typed; `I9 =H9*2` = 600, `G9 =F9*3` = 150, `N9` = 750, `L9` = 750 typed (but D+F+H+J+K = 350, one of 7 rows where the typed total disagrees with its columns) |
| Pricking 2026-27 | `Sheet2 › C8` 750, `F8`, `G8` 616, `I8 =G8/28` | 22 T28 trays | 616 < 750: need is higher than target. Header note in `K4` of the A. list: "Carex secta will reduce as wet areas are planted up" |
| Pricking 2025-26 | `Pricking out 2025-2026… › Sheet1 › B5` 616, `C5` "21 T28" | | tray text says 21 but 616/28 = 22 |
| Stocktake 31/3/26 | `B8` 616, `C8` 616, `D8` 392, `E8` 392 (T28 count), `F8` 0, `H8` "T28 moved to south nursery" | | counted 392 against 616 pricked out (the whole count is in T28) |
| Potting On 2026-27 | `Summary › D9` `'392'` (typed as **text**), `E9` 392, `F9 =D9-E9` | 0 | Nothing to pot: the whole goal is in T28 |

---

## 8. The "two seasons later" rule: does the data follow it?

Rule (`_Summary of Records JM Nursery.docx`, item 5): "Becomes planting list TWO seasons later. E.g. Pricking out for 2024/2025 = planting in 2026/2027."

Evidence that it holds:
- File names: "Pricking out 2024-25 **for potting 25-26**", "Pricking out 2026-27 for potting 27-28". So potting is one year after pricking, planting one more.
- Forecast header (`1. Forecasting/_JMN PLANT Forecasting 2026_2027.xlsx › 3 Year Plant Look Ahead (Keysto › D4`, `T4`, `AJ4`, `AZ4`): Spring 2026 ← "Pricking out list 2024/2025??"; Spring 2027 ← 2025/2026; Spring 2028 ← 2026/2027; Spring 2029 ← 2027/2028. Row 5 (`D5`, `L5`, `T5`) puts potting on 2025/2026 beside Spring 2026 and Autumn 2027, and 2026/2027 beside Spring 2027. This is the same rule.
- Coprosma propinqua: pricked out 2024/25 (743 pricked, 1,104 counted at 27/3/25) → potted 2025/26 (1,039 potted, `Summary › G25`) → ready 13/05/26 (417) → allocated Spring 2026 (580) = planting 2026/27. Consistent (high confidence for this species).
- `_ plantings at Flagship sites 2023.xlsx › A1`: "Suggested plant requirements for 2025/2026 (Sowing seed spring 2023)", so sowing 2023 → pricking 2023/24 → planting 2025/26. Also consistent.
- The archived `Pricking Out List for 2025_2026.xlsx › B1` says "For Planting approx 2028": 2025/26 + 2.

Where it does **not** line up:
1. **Sowing line in the forecast header.** `D3` "Seed sowing list 2023" sits in the same block as `D4` "Pricking out list 2024/2025??" (author's own question marks). Per the sowing files, seed sown in 2024 is projected for 2025/2026 potting (`Seed sowing 2024.xlsx › B2` "Projected 2025/2026") and the 2025 sowing for 2026-27 potting (`1. Seed Sowing 2025.xlsx › B2`), so the row 3 sowing years look **one year early** against rows 4 and 5. Confidence: medium (the sowing files and the pricking file names agree with each other).
2. The 2026 stocktake and some forms keep headings from the year before ("Projected PU25/26" at `V150 stocktake 31 March 2026.xlsx › B1`, when the numbers equal the 26/27 potting target). Confidence: medium.
3. "Season" is used for both a production year (Aug to Jul) and a planting season (Spring/Autumn). Spring 2026 and Autumn 2027 are both "2026/27" in the rule but are different calendar years, which is why the forecast header lists both against the same pricking year.
4. `Annual` sheet in the 2026/27 potting-on file: row 8 is labelled "2024/25" but links to `Summary!J104:U104` of the **2026/27** workbook (139 and 1,009 for Aug and Sept 2026). A stale label (high confidence).
5. Month-sheet dates in 2026/27: `Aug 2026 › D3` holds 2026-12-08 and `Sept › D3` holds 2026-02-09, which look like day and month swapped (12 Aug and 2 Sept); later headings are text such as `F3` "16/09/26". Confidence: medium.

---

## 9. Typed versus formula-derived: inventory

| Figure | Typed | Formula |
|---|---|---|
| Per-site species needs (Neill list, A. list, 2024 list) | All species numbers; totals in column L; "Total required" | `×3`, `×2` scalings; row totals `SUM` |
| Site look-ahead (forecast site sheets) | Species numbers; site totals row 3 are sums of typed | History totals; Jardine Park and Ref Gardens share-and-scale |
| Forecast roll-up | Row 4 "GOAL" in Aug 2025 version (`3 Year Plant Look Ahead (Keysto › D4:AW4`: 1,500, 1,000, 2,000, etc.) | Site links, seasonal sums, KEYSTONE SITES links, SUMMARY sums (broken) |
| Pricking-out target | 100 percent (B or F/G columns) | Tray count in `Sheet2` (`H = G/24`, `I = G/28`); `Neill total = C+D`; list totals |
| Seed sowing "Projected potting" | 100 percent | none |
| V150 stocktake | Projected, pricked out, counted, T28, surplus, deficit | Column sums (row 85), some totals typed (row 90 total typed in 2025: `C90` 12,042 against `SUM` 11,994) |
| Potting On Goal Set | 2022/23 none; 2023/24 typed; 2024/25, 2025/26 mostly VLOOKUP; 2026/27 typed | VLOOKUP to `Helen Master`; `F = D-E`; running totals, "To go", month links |
| Potting On weekly counts | typed | month `Total` sums, `Summary` links |
| Stage 4 stocktake and allocation | stock counts, per-1,000 and many per-site numbers | totals, over/under, `×1.5` in 57 of 99 cells, bays `=J/135` |

---

## 10. Other quality flags relevant to forecasting

- Forecast workbook `SUMMARY` and `DR-3 Year Plant Look Ahead (ALL` return `#REF!` (`SUMMARY › C5`; `DR-3… › D4`, `D6`); `SCHOOLS` is referenced but absent. `COMMUNITY GROUPS`, Schools and Buffer columns are empty.
- `KEYSTONE SITES` headings read Autumn 2024 to Spring 2026 while linked cells pull later seasons (stale labels).
- Site sheet headings run to Spring 2026 only; AI column numbers have no heading (`Whitechapel (15) › AI2` empty).
- Site look-ahead is flat: Whitechapel shows 300 Coprosma propinqua in each of seven consecutive seasons (`AC26:AI26`), so the forecast is a standing quota, not a response to planned planting events.
- Neill list totals: 6,860 against the "6500" label; D1/F1/H1/J1/L1 double count the totals row. Typed L totals differ from the sum of the site columns in 7 of 65 rows.
- The "Neill" label is used as a list name, a column ("Neill total 10500"), a sheet (`Neill`), and a pricking-list column ("For Neill"); it is unclear whether it is a site, an organisation or a person (see Questions).
- `Pricking Out List for 2025_2026.xlsx › Sheet1`: species names in column A and B are misaligned on at least rows 22 and 24.
- Pricking-out `Sheet2` G has several `?` placeholders (for example `G25`, `G98`, `G100`) and C-column values for species with no target.
- Tray text in the lists does not always agree with the number (`Carex secta` "21 T28" for 616, which is 22 trays of 28).
- Potting On 2026/27 `Summary › D9` holds the goal as text (`'392'`), so it does not sum in `D104`.

---

## Questions for WRT

1. **Contingency.** Is the 10 to 15 percent contingency applied anywhere in a calculation, or is it a rule of thumb used when the pricking-out number is chosen (which is then rounded up to whole trays)? If it is a rule of thumb, is the rounding to 24 per V150 tray and 28 per T28 tray the main reason the typed target is above the planting need?
2. **"Add 50%".** The note "To get 1500 plants add 50%, e.g. 50 becomes 75" and the `×1.5` in the allocation sheets: is this scaling a 1,000-plant list up to a 1,500-plant planting, or is it an allowance for plants that die or are not ready?
3. **Site quotas.** What do the quotas 1,000 / 1,200 / 1,500 (forecast row 11 "PLANT NUMBERS") and 3,000 / 3,000 / 2,000 (Neill list `×3`, `×3`, `×2`) mean: planting-event sizes, annual plants per site, or production goals? Do they already include any allowance?
4. **Which list is current?** Is the Neill list (total about 6,860, "if 6500"), the Flagship 2023 plan, or the forecast site sheets the authority for what a site needs? They disagree for Coprosma propinqua at Whitechapel (300, 600, and 300 per season).
5. **"Neill".** Is Neill a site, an organisation, or a person? What are the abbreviations in "Spare FH, PPk, QR, Apt" (which sites does the 2,500 reserve serve), and is "Spares 2500" planned demand or a safety margin?
6. **Forecast workbook.** Is `_JMN PLANT Forecasting 2026_2027.xlsx` meant to be live? The roll-up is empty and its site look-aheads stop at Spring 2026. Is `Aug 2025 Keystone Sites Plants Summary.xlsx` the version to treat as the working model, and should Community Groups and Schools feed the same total?
7. **Sowing year.** In the forecast header, Spring 2026 shows "Seed sowing list 2023" beside "Pricking out list 2024/2025??". Which sowing year leads to planting in 2026/27: 2023 or 2024? The sowing files suggest 2024.
8. **Goal Set.** Is the potting-on Goal Set now intended to be the V150 count from the March stocktake (as in 2026/27), and has the `Helen Master` "Annual Projection (Best case)" been retired? It still sits in the file but no longer drives the goal.
9. **Losses.** Where, if anywhere, are deaths between pricking out, potting and ready recorded in numbers? If the March stocktake count includes plants carried over from earlier pricking years, how should a loss rate be worked out?
10. **Annual target.** Is about 11,000 plants a year (hard-coded as `=11000/9` per month in the 2025-26 potting-on Summary and matched by pricking-out totals of 10,700 to 11,100) a capacity limit set by the nursery, or just the sum of the species targets?
