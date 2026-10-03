# 05. The spreadsheet-only system (S5)

Question: if we were forbidden from writing an application, how far could we take WRT? Answer: **all the way to the end-to-end test** (site needs, target, pipeline, allocate, plant, report), with four exceptions (section 10). Everything below is formulas, dropdowns, protections and print ranges. WRT staff can maintain it after Tech Lab leaves.

Assumptions as in `00_evidence_summary.md`. I opened no live Sheet; behaviour known only from general knowledge is `[UNTESTED]`. Example values are **illustrative** unless a Phase 1 figure is cited.

## 1. What I changed from S4B

| S4B | S5 | Why |
|---|---|---|
| Four workbooks, Masters separate, with mirror tabs | **Three**: `WRT Core` (masters + all current work), `WRT History`, `WRT Seed and Cutting` | Same-file dropdowns and lookups are the most reliable path; mirrors were S4B's biggest `[UNTESTED]` cluster. Species/Sites rights become tab protection. Mirrors remain only in History and Seed. |
| `Plan` tab and `Targets` tab, archived as values each year | **One long `Targets` table**, one row per species per production year | No yearly "new form"; last year's rows stay. |
| Separate `Progress` tab | Progress is **calculated columns on `Targets`** | One fact, one home: goal, target and potted-to-date sit on one row. |
| Frozen + live planting tabs, stacked | One append-only **`Planting`** table plus a `Planting_live` view of the open season | One fewer union. |
| Stock snapshots to an archive | Imported snapshots go **into `Stock Log`** with `source` and `flag` | One table for trends; legacy states never reach live views. |

Seed and Cutting stays separate because sharing is per workbook (`04g` seed-source locations).

## 2. The logical tables

Notation: **T** typed by staff, **C** calculated (protected, right of the typed block, one `ARRAYFORMULA` in the header cell), **P** protected master data. Species and site cells are dropdowns that **reject** unlisted text (a `One-off request` species is a 30-second owner edit); the exception is Seed and Cutting, which only warns. Every `*_id` is C and hidden. All dates are true dates, validated between 2015-01-01 and today+1, workbook locale New Zealand.

### 2.1 Masters (in `WRT Core`, editors: nursery manager + deputy; Sites: operations manager + deputy)

**SPECIES**: `sp_id` (P, hidden, `SP-050`), `name` (T, the handle WRT writes), `suggested_spelling` (T, blank until approved), `common`, `maori` (T), `over_5m` (T, Y/N/blank), `threatened` (T, Y/N), `threatened_basis` (T), `status` (T, list: core / appended / contested / seedlog_only / one-off / retired / merged), `contested_with` (T, species list), `print_order` (T, number), `note`. Seeded from `prototype/species_master_proposed.csv`.
Rows: `SP-050 | Coprosma propinqua | | Mingimingi | Mingimingi | Y | N | | core | | 61`; `SP-016 | Carex secta | | Purei | | N | N | | contested | SP-015 | 24`. Both *cupressoides* rows stay (`SP-086`, `SP-155`) until ruled.

**SPECIES ALIASES** and **SITE ALIASES** (two tabs): `alias_text` (T), `match_key` (C, `=LOWER(TRIM(REGEXREPLACE(SUBSTITUTE(A2,CHAR(160)," "),"[^A-Za-z0-9 ]","")))`), `target` (T, dropdown of names), `target_id` (C), `alias_type`, `confidence`, `reviewed` (Y/N). Seeded from the 820 species and 400 site variants; `uncertain` rows go in with `reviewed = N` and are never matched automatically. Example: `Leonohebe cuppressoides → Leonohebe cupressoides (SP-086) | spelling | high | N`.

**SITES**: `site_id` (P, hidden), `name` (T), `wrt_number` (T, `15`, `9G`, blank for the 14 never given one), `class` (T, K/C/S), `landowner_org` (T, organisation only), `status` (T, active / historic / scheme / merged), `parent_site` (T), `note`. Rows: `Whitechapel | | K | | active`; `Paper4Trees | | | | scheme`. No coordinates (GIS project owns those).

**SETTINGS** tab-set (P, nursery manager): `Settings` (`V150 = 24`, `T28 = 28`, `production year starts in month = 8`, `default uplift` blank until WRT confirms), `States` (V150, T28-growing, PB3-growing, PB3-ready, T28-ready; container, stage, `counts as available` 1/0; plus import-only legacy states), `Reasons` (loss reasons from `01d` §3), `Calendar` (one row per season: `Spring 2026`, season_key `20262`, sowing/pricking/potting production years), `Control` (**the only cells changed at rollover**: current production year `2026/27`, current planting season `Spring 2026`).

### 2.2 Planning and production

**SITE NEEDS** (editor: operations manager): `planting_season` (T, list from Calendar), `site` (T), `species` (T), `qty_needed` (T, whole number), `source_list` (T, e.g. "Standard list v2", "Forecast"), `scale_note` (T) | `site_id`, `sp_id` (C). Row: `Autumn 2028 | Whitechapel | Phormium tenax | 120 | Forecast | infill`. Disagreeing need lists (6,860 vs 6,490) become tagged versions.

**TARGETS** (production target and Goal Set; one row per species per production year; about 100 rows a year):
- T: `production_year` (pasted at rollover, `2026/27`), `species`, `container` (V150/T28, override), `spares` (number, named), `uplift_override` (%), `planned_target` (number; defaults to `calc_target` by habit, but typed), `reason` (text), `goal_set` (number, July), `less_T28` (number, July), `source_note` ("V150 count, 31 Mar 2026").
- C: `sp_id`; `plants_per_tray` (lookup in Settings); `need` (`SUMIFS` over Site Needs, season mapped from Calendar); `calc_target` = `CEILING((need)*(1+uplift)+spares, plants_per_tray)`; `trays`; `to_pot` = goal_set − less_T28; `pricked_to_date`; `potted_to_date`; `to_go`; `pct`; `check` (need but no target; not a tray multiple; less_T28 vs T28 stock).
- Row: `2026/27 | Carex secta | T28 | 0 | | 1,400 | "last year's rate" | 1,190 | 420 | V150 count 31 Mar 2026` (calculated: 28 per tray; 50 trays; to pot 770).

**PRICKING LOG** (editors: nursery coordinator, propagation lead): T `date`, `species`, `container` (V150/T28, reject), `trays` (whole number > 0), `group` (a group, never a person), `note`; C `sp_id`, `plants` (= trays × tray size), `production_year`, `month`. Row: `2026-09-16 | Coprosma propinqua | V150 | 12 | Wednesday volunteers | ` (plants 288).

**POTTING LOG** (nursery coordinator): T `date`, `species`, `from` (blank = V150), `to` (blank = PB3; T28 or other), `qty` (> 0), `group`, `note`; C `sp_id`, `production_year` (`=IF(MONTH(A2)>=Settings!B3,YEAR(A2)&"/"&RIGHT(YEAR(A2)+1,2),(YEAR(A2)-1)&"/"&RIGHT(YEAR(A2),2))`), `month`, `counts_to_goal` (`=IF(OR(D2="",D2="PB3"),E2,0)`). Row: `2026-09-23 | Cordyline australis | | | 140 | Wednesday volunteers`.

**STOCK LOG** (nursery coordinator; imports by script or paste): T `date`, `type` (COUNT / LOSS / BOUGHT_IN), `species`, `state` (from States), `number` (≥ 0, whole), `location`, `reason` (LOSS only), `supplier` (organisation), `status` (BOUGHT_IN: ordered/delivered), `note`, `source` ("paper form 13 May"; "import: Master col H"), `flag` (`date_nominal`, `derived`, `approx`, `unmapped_name`); C `sp_id`, `available` (lookup in States). Row: `2026-03-31 | COUNT | Carex secta | V150 | 47 | | | | | | V150 file, 31 Mar | derived`; `2026-03-31 | COUNT | Carex secta | T28-growing | 420 | …| derived`. T28 as plants, not trays (open question, `01d`).

### 2.3 Allocation and supply

**ALLOCATION** (one table, all seasons; editor: nursery manager, coordinator for the last two typed columns): T `season`, `site`, `species`, `source` (nursery / QLDC / school / bought-in / scheme), `supply_status` (ready / incoming / planned), `required`, `allocated`, `pick_note`, `planted_qty`, `planted_date`, `area` (blank), `event_type` (blank); C `site_id`, `sp_id`, `print_order`. Rows: `Spring 2026 | Whitechapel | Phormium tenax | nursery | ready | 80 | 80 | | | | | `; future shape (Sarah's test): `… | Whitechapel | … | 1,300 | | WH-06 | establishment`. Blank `planted_qty` means unknown, never "same as allocated".

**SEASON_SITE**: T `season`, `site`, `target_plants`, `scale`, `collection_date`, `planting_date` (true dates), `date_note`, `guards`, `mats`, `stakes`; C `site_id`, `allocated_total`, `difference`, `planted_total` (all `SUMIFS` over Allocation). Replaces Collection Schedule and Plant Protection.

**SUPPLY**: T `season`, `species`, `source`, `supplier_org`, `qty`, `status` (planned / ordered / confirmed / received), `status_date`, `note`; C `sp_id`. Row: `Spring 2026 | Coprosma propinqua | bought-in | [supplier organisation] | 300 | ordered | 2026-06-12`. 

### 2.4 History (`WRT History`, editor: nursery manager only)

**PLANTING** (append-only): T `season`, `site` (canonical), `species` (canonical), `qty`, `source` (nursery / Paper4Trees / QLDC / bought-in / unknown), `confidence` (recorded / allocation / unverified), `quantity_basis`, `imported_from` (`MASTER › OG8`), `over_5m_then`, `threatened_then`, `ttc_basis` (Y / N / to confirm), `site_as_typed`, `species_as_typed`, `import_batch`; C `site_id`, `sp_id`, `year`, `season_key` (20242). The "then" columns are pasted values, so a later flag change cannot rewrite a past TTC figure. Row: `Autumn 2024 | Slope Hill (HGF) | Cordyline australis | 1,000 | unknown | unverified | as recorded; planted or allocated, unconfirmed | MASTER › … | Y | N | to confirm | … `.

Other tabs: `Legacy matrix` (`MASTER` as values, frozen), `Imports` (batch, date, source, rows, checksum), `Reconciliation`, `Archive index` (23 stock events), views (section 4).

**SEED AND CUTTING** (restricted): records 2–6 as today, warning dropdown, `Species (mirror)`, `Plan (mirror)`. Nothing flows out.

## 3. Which tabs staff touch

| When | Who | Tabs touched | What they do |
|---|---|---|---|
| **Weekly (Wednesday)** | Coordinator | `Potting Log`; `Pricking Log` | Print the Potting sheet and Pricking sheet; after the session add one row per species (date, species, number). |
| **Monthly** | Nursery manager | `Checks` | Clear red cells. |
| **January** | Propagation lead + nursery manager | `Targets` | `planned_target`, `reason`; print Pricking list. |
| **March** | Coordinator | `Enter count` then `Stock Log` | Print count form; key numbers; paste rows. |
| **July** | Nursery manager | `Targets` | `goal_set`, `less_T28`, `source_note`. |
| **Each planting season** | Operations + nursery managers; coordinator | `Site Needs`, `Allocation`, `Supply`, `Season_site`; `Pick list`; `Allocation` | Draft allocation from needs; print each site's pick list; fill `planted_qty` after planting day. |
| **Twice a year** | Nursery manager | History: `Planting` paste, `Reconciliation` | Close the season. |
| **Rarely** | Owners | Masters | New species or site, status change, alias. |

Volunteers touch only paper. Everything else is a **generated view** (section 4, plus `Month view`, `Annual`, `Scenario`, `Planting (all)` and the print ranges).

## 4. Generated views: formula patterns

Views read whole columns (`'Stock Log'!E:E`), so new rows join without editing a range, and key on `sp_id`/`site_id`, never on row position. Row spines: `=QUERY(Species!A:K,"select A, B where I <> 'retired' and I <> 'merged' order by K",0)`. All `[UNTESTED]` until trialled on a copy.

**Latest stock per species × state** (`Latest stock`; states in B2:F2, as-at dates row 3, available flag row 4, species `sp_id` in A6 down):
- As-at: `B3: =MAXIFS('Stock Log'!$A:$A,'Stock Log'!$B:$B,"COUNT",'Stock Log'!$D:$D,B$2)`
- Count: `B6: =SUMIFS('Stock Log'!$E:$E,'Stock Log'!$B:$B,"COUNT",'Stock Log'!$M:$M,$A6,'Stock Log'!$D:$D,B$2,'Stock Log'!$A:$A,B$3)`
- Flag: `B4: =VLOOKUP(B$2,States!$A:$D,4,FALSE)`; available `G6: =SUMPRODUCT($B6:$F6,$B$4:$F$4)`; pipeline `H6: =SUM($B6:$F6)-$G6`.
- Latest date is per **state**, so a species missing from the latest count reads zero and staleness shows. Losses since the count sit beside it, never netted.

**Progress against goal**: calculated columns on `Targets`. `potted_to_date`: `=ARRAYFORMULA(IF(B2:B="","",SUMIFS('Potting Log'!K:K,'Potting Log'!H:H,K2:K,'Potting Log'!I:I,A2:A)))` (`K` = `sp_id`); `to_go = to_pot − potted_to_date`; `pricked_to_date` is the same over `Pricking Log!H:H`. A species with a goal and no sessions still shows its full `to_go`, because the row exists in `Targets` (a pivot would drop it). `Month view`: `=QUERY('Potting Log'!A:K,"select B, sum(K) where I = '"&Control!B1&"' group by B pivot J",1)`; `Annual`: the same grouped by `I`.

**Available vs allocated** (`Over-under`, rows by `sp_id`; season is `Control!B2`):
- `allocated`: `=SUMIFS(Allocation!G:G,Allocation!N:N,$A6,Allocation!A:A,Control!$B$2)`
- `ready now`: `=IFERROR(INDEX('Latest stock'!$G:$G,MATCH($A6,'Latest stock'!$A:$A,0)),0)`
- `incoming`: `=SUM(SUMIFS(Supply!E:E,Supply!I:I,$A6,Supply!A:A,Control!$B$2,Supply!F:F,{"ordered","confirmed"}))`; `planned`: same with `"planned"`.
- `flag`: `=IF(allocated>ready+incoming,"Short",IF(allocated>ready,"Short on hand","OK"))`. The three figures are never summed. In Spring 2026 this test would show the 4,283-plant gap that the old sheet reported as covered (`01e` §4).

**Site pick list** (`Pick list`: season in B1, site dropdown in B2, `site_id` in B3 = `=VLOOKUP(B2,{Sites!B:B,Sites!A:A},2,FALSE)`):
`=QUERY(Allocation!A:O,"select C, G, D, H where A='"&B1&"' and M='"&B3&"' and G>0 order by O",0)` with blank print columns Picked / Planted / Date to its right and header lines from `Season_site`. `O` is the calculated `print_order`, so sorting the Species tab cannot reorder paper. To print all sites, duplicate the tab with `B2` fixed; delete copies at season close.

**Site history** (`Site history`, site dropdown in B2, id in B3): `=QUERY(Planting!A:S,"select A, C, D, E, F where O='"&B3&"' order by S, C",0)`, with a `SUMIFS` total beneath. Species × season grid (`Season grid`): seasons across row 4 from Calendar (chronological), `=SUMIFS(Planting!$D:$D,Planting!$P:$P,$A5,Planting!$A:$A,B$4)`. I use `SUMIFS` rather than `QUERY … pivot` because pivot columns sort as text ("Autumn 2016" before "Spring 2015").

**TTC over 5 m by season**: row of seasons from Calendar; `=SUMIFS(Planting!$D:$D,Planting!$A:$A,B$4,Planting!$I:$I,"Y",Planting!$K:$K,"<>N")`; threatened the same on `J`. This matches the typed figures for 2020–2022 and 2024 (`01f` §4). The HGF carve-out is `ttc_basis`, one value per imported row, not a typed subtraction.

**Reconciliation vs old totals**: rows `stated figure | where reported | value (pasted, as reported) | =SUM(Planting!D:D) | difference | cause`: `MASTER PY107 | 140,049`, `SUMMARY SITES BC3 | 139,948`, `SUMMARY PLANTS AW4 | 135,413`, with the generated total 140,068 and causes from `01f` §5. A typed total that disagrees later shows as a non-zero cell, not a second truth.

**`Checks`** (`Control`-keyed counts, each red when non-zero): unmatched `sp_id`/`site_id` in any log; dates in the future; repeated COUNT dates; `Less T28` against T28 stock; site totals vs `target_plants`; calculated `ARRAYFORMULA` cells overwritten (`COUNTA` vs `ROWS`); IMPORTRANGE health cells in History and Seed.

## 5. Protection

| Layer | How | Weakness |
|---|---|---|
| Headers, calculated columns, views, print tabs | Whole-sheet protection; only entry cells unprotected | Owners override; protection is a guard against accidents, not a determined editor |
| Masters | Two named editors per list | Keep file ownership with the nursery manager |
| Logs and Allocation | Named editors per tab (section 3 roles) | Cannot enforce append-only: protection that blocks edits blocks appends too. Recovery is version history plus a dated copy |
| History | One editor; staff view | |
| Seed and Cutting | Separate file, named viewers | The only real access control Sheets gives |
| Downloads | Turn off viewer download/print/copy on Seed | Editors still can |

`[UNTESTED]`: whether protected cells block a non-owner's sort, and exactly how "except certain cells" interacts with pasted ranges.

**The sort risk.** Whole-sheet sorts are safe; sorting one column scrambles species against numbers. Defences: few editors; **filter views** as the taught habit; monthly `Checks` control totals typed from paper; quarterly dated copies.

## 6. How summaries update, and how IDs stay invisible

**Automatic updates.** No refresh step: each view is a formula over whole columns of a log; `Control` holds the two values that say "this year, this season". Entering date, species and number moves `Targets` progress, `Month view`, `Annual` and `Latest stock` at once.

**Invisible IDs.**
1. Staff pick a name (dropdown from `Species!B:B`, reject).
2. A hidden calculated column resolves it, name first, alias second:
`=ARRAYFORMULA(IF(C2:C="","",IFERROR(VLOOKUP(TRIM(C2:C),{Species!$B:$B,Species!$A:$A},2,FALSE),IFERROR(VLOOKUP(LOWER(TRIM(C2:C)),{'Species aliases'!$B:$B,'Species aliases'!$D:$D},2,FALSE),"UNMATCHED"))))`. `XLOOKUP` may be faster `[UNTESTED]`.
3. Renaming a species is a two-step edit in one sitting: change `name`, paste the old text into Aliases with the same target. Old rows still resolve. Views and print sheets show the current name by lookup on `sp_id`.
4. Imports (history, snapshots) arrive with `species_as_typed`; unmatched strings go to an `Unmapped` tab, never into a log.
5. The ID sits in the same row, so sorting cannot separate it from its name.

## 7. Old history beside new records

- **Planting**: the 5,448 rows come once from `MASTER` (script or paste), with `source = unknown` (Paper4Trees 1,457 plants where known), `confidence = unverified` until WRT answers decision 3 (only Spring 2025 and Autumn 2026 are confirmed `allocation`), `imported_from` cell references, `import_batch` ID, and `ttc_basis = to confirm` for the two 2024 Slope Hill columns (29,000 plants, 21%). No planting date, event type or area is invented.
- **Live rows**: `Planting_live` is a `QUERY` over `Allocation` where `planted_qty` is filled (`confidence = recorded`); at season close it is pasted as values to the foot of `Planting`.
- **Stock snapshots**: five March V150 counts and the 2024–26 whole-nursery counts (about 550 cells, `02` §3) enter `Stock Log` with `source = import: file › range`, `flag` set per `01d` §4, legacy states (`V150+T28 combined`, `T28-stage3 (legacy)`, `READY-unsplit`) excluded from `Latest stock` because those states are not in its columns. The other 16 live in `Archive index` only.
- After each import, season sums must equal the old file's total, or the gap is logged in `Imports`.

## 8. Yearly rollover: runbook (about 90 minutes, nursery manager, early August)

1. File › Make a copy of each workbook as `WRT Core 2026-07-31` (and History, Seed); move to `Archive`; set view-only for staff.
2. In Core, open `Checks`; clear every red cell before continuing.
3. In History, paste `Planting_live` **as values** under the last `Planting` row for each closed season, adding the "then" flags (`over_5m_then`, `threatened_then`, `ttc_basis`). Confirm the `Reconciliation` difference equals the new rows.
4. Confirm the last COUNT dates in `Latest stock`; if the March count is missing, log it now.
5. Add a row to `Calendar` for each new season (the production-year offsets are stored per row).
6. Change `Control`: production year `2027/28`, planting season, and nothing else.
7. In `Targets`, paste the seed block (the `Targets seed` helper lists current species, status core/appended/contested, with last year's container) as values under the last row with the new `production_year`. Clear nothing: last year's rows stay.
8. In `Site Needs`, add rows for the new look-ahead season (copy the tagged version, edit).
9. Review `Species`: statuses, new `appended` species, `Species aliases` unreviewed count; same for `Sites`.
10. In Seed, extend `Sowing`.
11. Review editor lists on protected tabs against current staff.


## 9. Limits of Sheets, and the no-code workaround

| Limit | Workaround | Residual |
|---|---|---|
| **Concurrency.** Cell-level edits merge; two people editing the same cell, or both pasting at "the first empty row", clobber each other.  | One named person per log; allocation entered through per-site filter views; counts pasted by the coordinator only | Two editors on one log is a rule, not a guard |
| **Row counts.** Ten-million-cell cap; whole-column formulas slow at tens of thousands of rows. | Volume is small (about 150 potting lines, 300 allocation rows a year; pricking unknown, guess under 1,500). Cap array ranges at `2:5000` if it lags `[UNTESTED]` | Re-check after year three |
| **Mobile entry.** Phone entry across 98 species is clumsy. | Keep **paper, then the coordinator at a desk**. If phones are needed, a Google Form for the Pricking Log only, whose responses tab the Log reads `[UNTESTED]`; AppSheet would be a different tool | Form species list drifts from Species |
| **Permissions on sensitive data.** No column- or row-level hiding; viewers see everything in a file. | Separate Seed workbook; named viewers; downloads off; never IMPORTRANGE out of it; keep personal names out of `group` and `note` | Editors can copy |
| **No enforced append-only or audit trail.** | Version history, quarterly dated copies, `Checks` control totals | An editor can quietly change a past row |
| **IMPORTRANGE.** One-time grant, breaks if access is withdrawn, may not read an unconverted `.xlsx` `[UNTESTED]`. | Build native Google workbooks (seven of ten live records are probably uploaded `.xlsx`, `04b` §3); health cells on `Checks`; four imports only | Stale mirror until noticed |
| **ARRAYFORMULA fragility.** Typing in a spill range returns an error; a pasted row can break one. | Calculated columns sit right of entry, protected; `Checks` compares counts `[UNTESTED]` | A broken header formula needs the owner |
| **Stock is a snapshot, not a ledger.** | Say so on the view: "ready at date D"; losses beside it; planting never decrements | No tray-level traceability |

### What-if forecasting with survival rates (no code)

`Rates` tab (P, nursery manager): rows `pricked → potted`, `potted → ready`, columns `Low`, `Base`, `High`, plus optional species overrides. **Leave blank until calibrated; I do not invent rates.** Scale of the problem: 3,000–4,100 plants a year are unexplained between pricking and the March count (`04e` §5.3, low confidence). Calibrate with a `Calibration` view: `March count ÷ pricked-to-date` per species per year once the Pricking Log has a year; until then use `goal_set ÷ prior-January target` as a crude ratio, shown as such.

`Scenario` tab (season from `Control`, scenario dropdown, rows by `sp_id`), computed in three parallel column sets so no data table is needed:
- `need` = `SUMIFS('Site Needs'!D:D, …season…)`; `ready now` and `growing` from `Latest stock` (V150, T28-growing, PB3-growing).
- `expected ready` (per scenario) = `ready + growing × s_potted_ready + planned_target × s_pricked_potted × s_potted_ready`.
- `shortfall` = `MAX(0, need − expected ready)`; `needed pricking` = `CEILING(MAX(0, need − ready − growing × s_potted_ready) / (s_pricked_potted × s_potted_ready), tray)`.
- A column compares `needed pricking` with `planned_target`: this is the shortfall/surplus view Sarah named as the real gap.

Limits: all growing stock is treated as ready by the season (a `ready_by` per state would refine it `[UNTESTED]`); survival is per species, not per batch.

## 10. What no spreadsheet should be asked to do

Four things would justify Level C: a stock **ledger** by tray with batch traceability; **role-based access** to seed-source locations; **many simultaneous editors** or phone entry; a **TTC rule that needs an API** (its export fields are unknown). Until one of those is real, this is **Level A with a small Level B core** (IDs, aliases, one scripted import), and I recommend it.

**Needs WRT first:** the live copy of each Sheet and whether records 9 and 10 are one workbook (decision 1); who owns Masters (2); the trusted total and 2024 Slope Hill (4); what "ready" means for T28.

**Test first on a copy:** every `[UNTESTED]` item above, plus header `ARRAYFORMULA` with sorting, `SUMIFS` with an array constant and PDF printing of a `QUERY` range.
