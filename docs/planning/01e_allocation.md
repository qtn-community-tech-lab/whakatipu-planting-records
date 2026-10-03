# 01e — Seasonal allocation and the hand-off to planting

*S1E, Phase 2. Read-only analysis of Phase 1 evidence (scouts B19–B22, `04e` §4/§6/§7, `04d` §4–§6, `04g` §2.6, `DATA_SHAPE.md`). I opened no source workbooks. Assumptions as in `00_evidence_summary.md`: the Google Sheets match the export; WRT keeps Sheets for weekly entry; volunteers keep paper; nothing historical is edited in place; planting areas are a future concept. The brief did not list the "ten standard questions", so I used the ten set out in section 1; swap them if you have a house list.*

## 1. The ten questions

**1. What is the job?** After the March/May counts, Anna's team decides which plants go to which site this season, prints a pick list per site, collects plants on the nursery-out day, and afterwards records what went out. Current behaviour, high confidence (`04e` §7.1; B20).

**2. Where does it live today?** One master per season (`_JMN Plant Allocations Spring 2026 › Plant Allocations`, 49 columns, species rows 6–107) plus 18 form sheets, a Nursery Collection Schedule and a Plant Protection sheet. Autumn 2026 and Spring 2025 have the same design with 40 and 25 columns (B19, B21).

**3. What goes in?** Stock columns typed from the stocktake (Spring 2026 E:J equal `Master CURRENT D:I` in 97–101 of 101 species: copies, not links; `04e` §4); supply columns for school stock, council supply and "WRT to buy in" (2,450 against 2,400 on `Sheet18`); per-1,000 helper columns for four sites times 1.5 or 3 (`W = V*1.5`; confidence medium that this is a site-scale rule, unanswered by WRT); about 24 typed site columns.

**4. What comes out?** Site pick lists, over/under per species, site totals, a collection schedule, plant-protection counts, and (typed afterwards) the Plants Out Master season block.

**5. What goes wrong?**
- *Competing totals.* Autumn 2026 has five or six "total allocated" figures (4,562 / 4,593 / 4,601 / 3,234 / 5,629). Spring 2026 has 9,779 and 12,664. Cause: SUM ranges stop at different rows and some columns sit outside the formula (`04e` §7.2).
- *Broken print sheets.* Site sheets link by row position (`'Plant Allocations '!W6..W107`). Six Autumn 2026 sheets are `#REF!`, and Spring 2025 broke at slot A20 (B19, B21). Tabs are titled for other sites or seasons.
- *"Available" is not stock.* Spring 2026 own ready stock is 5,872 against 9,779 allocated. The 4,283 gap is "covered" by 4,642 of school, council and planned-purchase columns, so planned buying reads as stock on hand (`04e` §4).
- *Site totals ≠ targets.* Whitechapel 1,200 target vs 1,326 allocated; Slope Hill 1,000 vs 981; Little Difference 200 vs 210. Lake Hayes is `=0` in the master but 1,500 plants on the Plant Protection sheet (B20).
- *Empty Location column* (59 of 60 print sheets) and free-text dates, with the 1–2 May template default on nine Spring 2026 tabs (`04d` §4, §6).

**6. What is worth keeping?** The shape of the decision: species across sites, over/under per species, a printed sheet volunteers carry, the per-1,000 mix as a first draft, and the collection schedule (the only dated planting information that exists).

**7. How does it hand off to planting?** It does not. Plants Out Master "planted" equals the allocation: 98 of 98 species for Spring 2025, 96 of 98 for Autumn 2026, which holds 353 constants and no formulas (`04e` §7.3). Allocation is never reconciled to what was delivered or planted; stock is not decremented.

**8. What can be simplified before software?** Almost all of it (sections 2–5).

**9. Which level?** Level A, with one Level B dependency (stable species and site IDs). See the verdict.

**10. Out of scope:** forecast-to-target planning, the stocktake redesign, losses and GIS areas, except where allocation reads from or feeds them.

## 2. The allocation table as one long table

A matrix of species × ~30 site columns is the wrong shape for the record. Columns become the unit of change (insert a site and every SUM and site sheet moves), supply status hides in headings, and cells are mostly blank (Whitechapel uses 37 of 102 species; many sites 3–10).

### 2.1 `Allocation` (one row per season × site × species × source)

| Column | Content | Notes |
|---|---|---|
| `season` | `Spring 2026` | Planting-season label, as WRT writes it |
| `site_id` | `15`, `9G`… | From the Site tab; shown to humans as the name via lookup |
| `area_id` | blank | **Future.** Optional, e.g. `WH-06`. Blank is valid |
| `species_id` | from Species tab | Shown as the scientific name; dropdown validated against the list |
| `required` | number | `per_1000 × scale` where a recipe exists, otherwise typed |
| `allocated` | number | What Anna commits. |
| `source` | `nursery` / `QLDC` / `school` / `bought-in` / `scheme` | The *intended* source of these plants |
| `supply_status` | see 4 | Does WRT hold these plants yet? |
| `pick_note` | free text | "late", "from T28" |
| `planted_qty`, `planted_date` | blank until entered | The hand-off. See 5 |
| `event_type` | blank | **Future.** establishment / infill / replacement / enrichment |

One row per source only when the source is genuinely mixed. A site asking for 60 *Carex secta* that comes 40 nursery + 20 bought-in is two rows.

### 2.2 Supporting tabs (small, one fact each)

- `Species` — ID, scientific name, common name, `>5m` flag. The existing 98-row block with a stable ID added once WRT rules on the contested pairs. Until then the dropdown stops new misspellings entering. This is the Level B dependency.
- `Site` — ID, name, class (K/C/S), landowner organisation. From `SUMMARY SITES`.
- `Season_site` — `season`, `site_id`, `target_plants` (typed), `scale` (the ×1.5 / ×3), `collection_date`, `planting_date` (real dates, plus a `date_note` for "first week of term 4"), `guards`, `mats`, `stakes`… `allocated_total` and `difference` are formulas over `Allocation`. It replaces the Collection Schedule and Plant Protection sheets, so Lake Hayes cannot be 1,500 in one and zero in another.
- `Supply` — see 4.

### 2.3 Views, all formulas (no copies)

- **Species × site grid** (read-only): a pivot or SUMIFS block over `Allocation`, with over/under alongside, so Anna keeps the familiar picture.
- **Site totals vs targets**: `Season_site`.

**Entry.** I recommend Anna enters rows through a filter view per site (20–40 lines, species by dropdown). If she prefers a grid, it can stay for one more season if headers carry `site_id` and `species_id` and the long table is unpivoted from it by formula; every downstream view reads the long form either way. Confidence medium.

## 3. How a site sheet derives from it

One tab, `Site pick list`, with two input cells: `season` and `site` (dropdown from `Site`). Everything else is formula:

```
header:  site name, collection_date, planting_date, area (if any), site total
lines:   =QUERY(Allocation!A:K,
           "select species_id, allocated, source, pick_note
            where season = '"&B1&"' and site_id = '"&B2&"' and allocated > 0
            order by species_id")
         species name by lookup on species_id
blank print columns:  Picked ☐   Planted (qty)   Date planted
```

Why this fixes the current faults:
- **No row position.** It is a filter on keys, so inserting a species or site cannot produce `#REF!`.
- **No tab per site.** Print one site at a time via the dropdown. For all sites in one run, duplicate the tab per site with the site cell fixed; every copy is the same formula, so none can point at the wrong column.
- **Fits one page** (37 lines for Whitechapel, not three 34-row blocks), and `area_id` shows in the header if ever used.
- **The sheet carries its own return path.** The "Planted" column is what the coordinator reads back (section 5).

## 4. "Available" as a view, and keeping planned buy-in out of stock

**Ready stock should be looked up, not typed.** Today ~300 figures are copied from the stocktake twice a year (`DATA_SHAPE` §4 hotspot 3) and three workbooks use three definitions: Spring 2025 left out growing PB3 but included V150 seedlings; Autumn 2026 used an unlabelled February figure of 9,489 (5,390 on the Stage 4 sheet that month); Spring 2026 used Stage 4 PB3 + T28. Define it once: **ready = Stage 4 PB3 + Stage 4 T28 on the latest stocktake date** (Sarah's "ready is a flag, not a container"). Read it with one lookup column on `species_id`, and show the stocktake date beside it. If records 9 and 10 turn out to be one Google workbook (evidence summary, decision 1), this is a plain same-book lookup. If not, either `IMPORTRANGE` into a `Stock_latest` tab or put the Stage 4 columns in the allocation workbook. Either is a new cross-workbook dependency, which Phase 1 found nowhere else, so choose deliberately.

**Limit to state on the page:** stock is a snapshot and is not decremented by allocation or planting. The view is "ready at date D"; a later stocktake replaces it. Do not pretend to be a ledger.

**Supply is a status, not a column.** Replace K/L/M/N/O (school, QLDC ×2, buy-in) with a `Supply` tab: `season`, `species_id`, `source`, `supplier` (organisation only), `qty`, `status`, `status_date`.

| Status | Meaning | Counts as available? |
|---|---|---|
| planned | on a wish list or "WRT to buy in" | **No** |
| ordered | order or quote accepted | No (shown separately as "incoming") |
| confirmed | supplier or council has committed a quantity and a date | Incoming, yes after review |
| received | physically at the nursery | Yes, once; from the next stocktake it is already in the count, so it drops out of `Supply` |

Over/under per species then shows three figures side by side, never summed into one "available": **ready now**, **incoming (ordered/confirmed)**, **planned**. A species is "short" if allocated exceeds ready + incoming, and "short on hand" if it exceeds ready alone. In Spring 2026 the second test flags 54 species and a 4,283-plant gap that the current sheet reports as nearly covered. 
The 2025 "To find" column (705 plants, 17 species) was the right instinct; it maps to `status = planned` and was dropped later.

## 5. The minimum "actual planting" record

The smallest change that makes history more than the plan: after each planting day the nursery coordinator fills `planted_qty` and `planted_date` on the `Allocation` rows, copying them from the returned pick list. That is two columns and no new tab. Rules:

1. **Blank means unknown, never "same as allocated".** Plants Out Master's season block is then generated with a per-site basis flag: `recorded` where `planted_qty` is filled, `allocation` where it is not. History is not manufactured: the all-time total stays what it is, but WRT can see which new figures are real.
2. **Variances are information, not errors.** 1,326 allocated and 1,290 planted is a row; leave `allocated` untouched.
3. **A second visit** (infill next autumn) is a new `Allocation` line in a new season. A second *day* for the same line is a new row in a small `Planting` table: `date`, `site_id`, `area_id` (blank), `species_id`, `qty`, `allocation_line`, `source`. Add it the first time two columns are too tight, not before.
4. **Reconciliation becomes a formula**: allocated − planted per site and species. Today it is impossible by design.

This also stops the Plants Out Master season block being typed. Its 98 × ~25 new cells per season become a lookup on `Allocation`, but only for new seasons. The 23 existing season blocks stay untouched (nothing historical is edited in place).

**Paper4Trees** fits the same shape: one row per school group, `source = scheme`. Today 120, 94 and 131 cannot be traced to each other because the school split lives in cell comments (`04g` §2.6). Whether those plants count as WRT plants out is a question for Anna.

## 6. Sarah's event types and areas as *future* fields

Current behaviour: none of these exist. "Establishment", "replacement" and "enrichment" appear nowhere; "infill" is only part of five site labels; areas appear first in Autumn 2026 (three Whitechapel columns, `WC south bank and mound` 720, `WC Back block` 350, `WC Steep Bank` 210) and are not coded (`04d` §4.1, §5). Her `WH-06` example is a desired behaviour.

How they fit without forcing the past:
- `area_id` and `event_type` are optional columns on `Allocation` and `Planting`. Blank is a valid value and the default.
- **Do not backfill.** History stays site × season × species. Imported rows get `event_type = blank`, not "establishment". Where a site label says infill, keep it as a label.
- **Areas wait for codes.** Until WRT assigns them (GIS owns polygons), the three Whitechapel columns can sit in `pick_note`.
- Her Whitechapel story is three lines: Spring 2026 / WH-06 / establishment / 1,300; Autumn 2028 / WH-06 / infill / 120; Spring 2031 / WH-06 / enrichment / 45. Her end-to-end test needs the two columns to exist, not to be populated for the past.

## 7. What this does and does not need decided

**Needs a decision first:** the live copy of records 9 and 10 (decision 1); who rules on species and site IDs (decisions 2, 5). Until IDs exist, a dropdown on the validated name list is an acceptable key inside this one workbook; keep an empty `species_id` column.

**Questions for Anna:** what are ×1.5 and ×3 (site scale, demand multiplier or margin)? Is anything beyond the Stage 4 count ever intentionally allocated? Does she prefer entering by site or by species grid?

## 8. Smallest useful change

Do this for the Spring 2026 workbook, because it is current and plantings are mostly done:

1. **Add a long `Allocation` tab** by unpivoting the existing matrix once (a one-off script or formula, not retyping), with `season`, `site`, `species`, `required`, `allocated`, `source`, `supply_status`, and blank `planted_qty` / `planted_date`. Keep the old matrix as a frozen sheet.
2. **Replace the site print sheets with the single `Site pick list` tab** driven by two dropdowns, with blank "Picked / Planted / Date" columns.
3. **Add `Season_site`** so the collection schedule, plant counts and targets come from one place and equal the sum of `Allocation`.
4. **Split "available"** into ready (looked up from the latest Stage 4 count, date shown), incoming and planned, never summed.
5. **Fill `planted_qty` for the plantings already done** from whatever paper or memory exists; mark the rest blank. This is the first honest actual-versus-plan figure WRT has.

Nothing is installed, the old matrix stays readable, and every step is reversible.

### Verdict

- **Level A — fix the Sheets: yes, this is the answer for allocation.** The faults are table shape and typed copies, fixable with SUMIFS, QUERY and lookups; WRT can run it without Tech Lab.
- **Level B — a clean canonical dataset: a small piece.** The Species and Site ID tabs are the only truly canonical data this needs, and they are shared with other workflows, so they are decided once elsewhere.
- **Level C — software: not justified for allocation.** Revisit only if Sheets limits show in practice (many simultaneous editors) or WRT wants a true stock ledger, which is a different workflow.
