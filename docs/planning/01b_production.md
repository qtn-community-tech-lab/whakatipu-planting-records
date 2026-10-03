# 01b. Production planning and pricking out: how yearly targets are made and how pricking out is recorded

Analyst S1B, Phase 2. One question: could a much better planning Sheet solve most of this first? Evidence is cited as `file › sheet › range` or a Phase 1 section (`04b`, `04c`, `DATA_SHAPE`). Inferences carry a confidence mark. The "[name] list" is the Standard Annual Plant List and "[name] Master" the propagation lead's master sheet (personal name withheld). Points from Sarah's scoping documents are second-hand (medium).

Assumptions: the Google Sheets are live and match the export; WRT keeps using Sheets during Tech Lab; volunteers keep paper; no history is edited in place.

---

## 1. The ten questions

**1. What WRT does (current behaviour).** About two years before planting, WRT decides how many of each species to prick out. Site needs are written per 1,000 plants, scaled to site quotas, topped up with a pooled "Spares 2500", and turned by a person into one typed number per species on the pricking-out list. The number is rounded up to whole trays (24 per V150, 28 per T28) and is due with the propagation lead in January. Totals are steady at about 10,700 to 11,100 plants a year. Pricking year *N* becomes potting *N+1* and planting *N+2*, and the Coprosma propinqua trace confirms it (`04c` §1, §8). The target is then retyped into the sowing list, V150 stocktake and tally goals: about 270 figures a year over five hops (`DATA_SHAPE` §4).

**2. Supporting record.**

| Job | Record | State |
|---|---|---|
| Site need per 1,000 | [name] list `Sheet1` (6,860 against a "6,500" label); "A. Suggested…" (6,490); 2024 Master plant list; Flagship 2023 plan | Versions disagree (§2.2) |
| 3-year look-ahead | `_JMN PLANT Forecasting 2026_2027` | Not live: roll-up empty, SUMMARY `#REF!` (`04c` §3.2) |
| Yearly target | Pricking-out list `Sheet1`, `Sheet2` | The real record: typed, tray-rounded |
| Actual pricked out | V150 stocktake col C | One typed figure a year, no source |
| Weekly pricking out | Three tally workbooks | Goals only; every week cell blank (`04b` §4, hop 1) |

**3. What works.** One yearly rhythm that people understand, and a stable result. Tray rounding is respected: 51 of 55 targets in 2026/27 are exact multiples of 24 (T28 species of 28). Judgement is recorded where it happens, as in "reduced because of surplus at PB3 and last years V150 stock" (`V150 stocktake 31.3.25 › H22`), which explains Coprosma propinqua falling from 1,200 to 960. And `Pricking out 2026-27 › Sheet2` (need + spares → target → `/24`, `/28`) is already the skeleton of a good planning table.

**4. Manual effort.** About 270 retyped figures a year. Tray counts are text ("40 V150") and sometimes disagree with the number (Carex secta "21 T28" for 616, which is 22 trays). The potting-on T28 deduction is a typed copy whose species change yearly (`04b` §3). The factors 24, 28, 1.5, 2 and 3 are typed inside about 400 formula cells (`04b` §4.3). The 2026 tally goals match neither pricking list (0 of 38; basis unknown, confidence: low).

**5. Data risk.**
- *Conflicting need lists.* Coprosma propinqua at one keystone site is 300, 600 and 300 per season in three plans (`04c` §7.1).
- *Silent uplift.* Target is a median 1.2 times need (range 0.6 to 4.8, 52 species): judgement, not a rule, so it cannot be reviewed or repeated.
- *"Spares 2500"* is 23.8% of the stated need and its meaning is unknown. It reads as demand, not margin (medium).
- *No loss data.* Surplus/deficit on the stocktake is pricked-out minus target, not deaths (`04c` §6).
- *Pricking-out actuals are lost,* if they exist on paper.
- *Structural faults.* [name] list typed totals disagree with their columns in 7 of 65 rows; row 1 sums double count; `?` placeholders in `Sheet2 › G`; Phormium cookianum is 140 on `Sheet1` and 168 on `Sheet2`.
- 
**6. Duplication.** The same target lives in five places (pricking list, `Sheet2`, sowing "Projected potting", V150 "Projected", tally goals), equal in 52/55, 55/55 and 49/53 cases (`04c` §2). The same 98-row species block is retyped into every file. Site need exists in four lists. Tray sizes live in formulas.

**7. Could the Sheet be improved?** Yes, substantially. Nearly every fault is a spreadsheet-design fault, not a "needs a database" fault. A better Sheet can hold need once (species × site × planting season), compute scale-up, uplift, spares and tray rounding from named settings, show last year's actuals and carry-over, store the reason for each human adjustment, and print the tally sheet. Confidence: high.

**8. Could other sheets derive from it?** Yes. The live records are Google Sheets, and `IMPORTRANGE` lets one Sheet read another; the "no cross-workbook links" finding describes the exported Excel files. Sowing "Projected potting", V150 "Projected" and tally "Goals set" can become lookups against the Plan, keyed on species name, not row position. Confidence: medium (needs one Drive, shared permissions, one species key). The reverse hop cannot be derived: the potting-on Goal Set is the March *count*, not the target (47 of 50 equal; `04c` §3.5), so it must keep coming from the stocktake.

**9. Is software justified?** Not for this area. Nothing here needs concurrent multi-user entry, role-based access or relational integrity beyond one species key. Batches, stock movements and seed-source access belong to other workflows and to the product tests Sarah asked for.

**10. Smallest useful change.** See §6.

---

## 2. Investigation notes

### 2.1 Target creation, step by step

1. **Need per 1,000.** `Standard Annual Plant List (…) MASTER › Sheet1 › D4:J107`: Whitechapel, Lake Hayes, Slope Hill and Jardine Park at 1,000 each, a "Spare FH, PPk, QR, Apt" column of 2,500, and typed total `L`. All typed.
2. **Scale to quota.** `E = D×3`, `G = F×3`, `I = H×2`, summed in `N` ("Subtotal keystone x3", 8,000). These are site scale-ups, not loss allowances (medium).
3. **Add spares.** `Pricking out 2026-27 › Sheet2`: `C` 8,000 + `D` 2,500 = `E` 10,500.
4. **Judge.** A person types `G` (11,008). No percentage cell, `ROUNDUP`, `CEILING` or `MROUND` exists anywhere (`04c` §5).
5. **Round to trays.** `H = G/24`, `I = G/28`.
6. **Copy** into sowing, stocktake and tally goals.

### 2.2 The disagreeing need lists

| Version | Evidence | Disagreement |
|---|---|---|
| [name] list MASTER | `Sheet1`, 6,860 vs label 6,500 | Typed totals wrong in 7 of 65 rows |
| "A. Suggested plant species…" and three copies | Total 6,490; identical values in the copies, but only the Propagation copy has the Annual Projection column (B04) | Different totals from the [name] list |
| Flagship 2023 plan | Percentages per named site, 2025/26 | 600 vs 300 for the same species and site |
| Forecast site sheets | Whitechapel 2,000, Lake Hayes Pavilion 1,500, Slope Hill 1,000 per season | A flat standing quota, not planting events (`04c` §10) |

The 2024 Master plant list is a fifth revision (Coprosma propinqua 60 vs 100 at Whitechapel): lists were revised in place, never versioned. Choosing the authority is a human decision. The Sheet can force it by holding one Site Needs tab and flagging "differs from the old list".

### 2.3 Contingency

No 10 to 15% parameter exists. The multipliers that do: `×1.5` (allocation, a size scaling; 57 of 99 cells, 42 overtyped), `×2` ("Best case", `[name] Master › J`, which fed potting-on Goals in 2024/25 and 2025/26 and was then retired), `×3`/`×2` (site quotas), and Spares. The observed 1.2 is consistent with "10 to 15% plus tray rounding plus species judgement" (confidence: low). 

Do not invent a formula staff do not use. Put three visible inputs on a Settings tab: a default uplift (blank until WRT confirms), a per-species override with a reason, and spares as its own named line. Then the 1.2 stops being invisible.

### 2.4 V150 / T28

Tray size should be a property of the species, not text in a cell. T28 is consistent for four species (toetoe, Carex secta, cabbage tree, harakeke) and Poa cita in practice; the rest are disputed. Red font is not a reliable flag (`04b` §3). The 2025 stocktake T28 total is out by 65 because a non-multiple was mixed in. Plan: a Species tab with `Container this year` and plants per tray looked up from Settings; the potting-on "Less T28" becomes a formula over that tab. There is no "move to T28": pricking out goes to V150 or T28 directly, so one `Container` column models it.

### 2.5 Weekly pricking-out tallies

The three tally workbooks hold goals and blank weeks, with no formulas, so the weeks → month → total roll-up exists on paper only. 2024 goals equal the pricking list (65 of 65); 2026 goals do not (0 of 38). The only actual is the typed annual total on the V150 stocktake. Sarah says volunteers may keep paper and a coordinator enters the totals (medium). Where that paper goes is unknown.

Design for humans: keep paper. Make the sheet a *print view generated from the Plan* (species, container, target trays, pricked to date, blank "this session" box). The coordinator adds one row per species per session to a `Pricking Log` tab (date, species, trays, container); `SUMIFS` gives to-date totals. If the paper is never entered, the Plan still works and "pricked to date" stays blank. Confidence: high that this is simpler than today's tally layout; medium on adoption.

### 2.6 Losses

No field exists and stage counts mix batches (`04c` §7.2), so do not back-calculate one. Add an optional "losses noted, with reason" count column from now on.

---

## 3. What to calculate, what to judge

**Automatic:** scale-up of need to quota; sum by site and species per planting season; uplift and spares as separate columns; tray count and rounded target (`CEILING`); container and plants per tray from the species row; comparison with last year's target, pricked-out and March count; checks (need but no target, target but no need, not a tray multiple, list total vs label; 13 and 3 species respectively in 2026/27); pricked to date and percentage; lookups for the sowing and tally lists.

**Human judgement:** which species to grow or drop; species mix per site; which sites and what planting size; any override of the formula (with a reason); cuttings, wild-sourced and bought-in species outside pricking out; container for borderline species; and the rule that the Goal Set is the count, not the target.

---

## 4. Sketch of the improved planning table

One row per species per production year, tab `Plan 2026-27`. Species name is the key.

| Col | Column | Typed / formula | Note |
|---|---|---|---|
| A | Species | drop-down from Species tab | one master list |
| B | Container | lookup, override allowed | V150 or T28 |
| C | Plants per tray | lookup from Settings | 24 / 28 |
| D | Need: keystone sites | `SUMIFS` over Site Needs, season = this year + 2 | scaled to quota |
| E | Need: other sites, schools, groups | `SUMIFS` | |
| F | Spares (named) | typed, with note | replaces "Spares 2500" |
| G | Uplift % | Settings default, species override | visible |
| H | Calculated target | `CEILING((D+E)×(1+G)+F, C)` | |
| I | Planned target | typed, defaults to H | the agreed number |
| J | Reason for change | typed | replaces free-text notes |
| K | Trays | `I/C` | |
| L | Last year's target | pasted value | |
| M | Last year pricked out | from stocktake | |
| N | March count (incl. carry-over) | from stocktake | |
| O | Pricked to date | `SUMIFS` over Pricking Log | blank if paper not entered |
| P | % of target | `O/I` | |
| Q | Shortfall / surplus vs pipeline | `I − (expected ready + O)` | the Sarah comparison |
| R | Check flags | formula | see §3 |

Supporting tabs: `Site Needs` (species × site × season × quantity, source-list tag), `Settings`, `Species`, `Pricking Log`, `Print Sheet`.

---

## 5. Sarah's hypothesis at Levels A, B and C

Hypothesis (second-hand): *site requirements several years ahead → this season's targets → compare with pipeline → shortfalls and surpluses.* The current process wires none of these links. Planting areas (WH-06) and event types (infill, enrichment) are an IDEA FOR THE FUTURE: no such field exists in the data (`DATA_SHAPE` §1).

| Level | What it does for the hypothesis | Limits |
|---|---|---|
| **A** | `Site Needs` holds need by species × site × season; `Plan` computes this season's target from the season two years out; column Q compares with the count and log. Works for keystone sites and the 98-row block. Seasons are labels ("Spring 2029"); area and event type can be text columns, unenforced. | Fragile if people insert rows or rename species; no batch-level pipeline; no true planting events. |
| **B** | The same tables cleaned once with stable IDs under the labels, Sheets as the entry layer. Planting areas, events and a batch/stage pipeline comparison become possible. The natural home for the Whitechapel 2029 test. | Needs the species ruling, site ID corrections and a named maintainer. Worth it only if a season at Level A shows name and row-position breakage still dominates. |
| **C** | Pays off only for multi-year planting events with areas, seed-lot-to-plant traceability and role-based access to seed locations. | Not needed by this workflow; maintenance after Tech Lab; Terraware, Spriggo and SeedSource are to be tested first. |

Questions for WRT: which need list is the authority and who changes it; whether uplift is a habit (10 to 15%) or species by species; what "Spares 2500" and the 3,000/3,000/2,000 quotas mean; where the paper pricking record goes; which species are T28 this year; what `?` on a target means.

---

## 6. Smallest useful change

Add four tab sets inside the existing pricking-out Google Sheet, without replacing the list. Each is useful alone.

1. **Settings and Species tabs.** Put 24 and 28 in named cells and give each species a `Container`. Retire the typed tray text.
2. **Turn `Sheet2` into the Plan** (§4): calculated target with visible uplift and a named spares line, a human planned column with a reason, last year's figures, and check flags. Resolve the `?` rows with Anna.
3. **One Site Needs tab** from the single list WRT nominates; mark the others "superseded, kept for reference".
4. **Print Sheet and Pricking Log.** A printable weekly sheet and one entry row per species per session. Sowing "Projected potting" and tally goals become lookups.

Leave the Goal Set (March count), stocktake structure and all history alone. Add no loss rate or forecast engine yet.

### Verdict

| Level | Verdict |
|---|---|
| **A** | **Yes, do this first.** It fixes target creation, V150/T28 handling, duplication and the blank tallies, and gives a working first version of "needs → targets → pipeline" for the keystone sites. Confidence: high. |
| **B** | **Later, conditional** on a season of Level A showing that species-name and row-position breakage, or the need for planting areas and events, still defeats the Sheets. Confidence: medium. |
| **C** | **Not justified for this area.** Test existing products on batches and stock before building anything. Confidence: medium. |
