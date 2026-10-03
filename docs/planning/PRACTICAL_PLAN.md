# WRT — from discovery to a practical plan

*Phase 2 synthesis, 3 Oct 2026. Evidence is in the numbered reports in this folder (`00`–`09`) and the prototypes in `prototype/`. Phase 1 evidence is in `../discovery/`. Nothing in the source files has been changed. No seed-source locations or personal details appear here.*

**The answer in three sentences.** WRT's process is sound; what is broken is the *shape* of the records — the same species list typed into 48 sheets, 35 numbers retyped between workbooks every year, four to six competing totals per season, and fifteen years of planting locked in a 411-column grid. The smallest improvement that fixes most of this is **better Sheets, not software**: one species list and one site list, one potting log that totals itself, and the planting history turned into a searchable table with every doubtful number flagged. Custom software is not justified in the next six weeks; the only candidate that might earn it later is the shortfall/forecast view, once WRT has loss data and a named maintainer.

---

## 1. What should WRT do immediately (no custom application)

Ordered by payback against effort. All Level A. Each is a change to a *copy* first, adopted at the next natural moment.

1. **Name the live copy of each of the ten records, in writing** (Sarah, 45 minutes). The "archive" seed records are newer than the "master"; three stocktake files share a tab called `Oct 24`; records 9 and 10 share a tab id. Nothing else is safe until this is settled. (`00` decision 1; `04e` §6; `09` risk 4.)
2. **Cheap fixes to the current Sheets, today**: relabel the V150 stocktake column "V150 incl. T28" or split it (the double-count trap, `01d`); extend the SUM ranges that stop before appended species (pricking-out A101; Autumn 2026 rows 104–119; Plants Out row 106); replace typed totals with `=SUM`; store session dates as real dates. (`08` §Option 1.)
3. **One species list** (`WRT Core › Species`), with the 164-ID crosswalk behind it and an `Aliases` tab, used first in the January 2027 pricking-out list via a dropdown. Staff never see IDs. Contested pairs stay as two rows with a status; Anna rules on the seven that matter. (`01a`, `04a`, `prototype/species_crosswalk.csv`.)
4. **One potting log** replacing month-per-tab: date, species (dropdown), from, to, quantity, group, notes; Summary/month/annual views as formulas; the same printable Wednesday sheet. ~150 lines a year, 2–3 minutes a session. Pilot on a copy of the 2026/27 book at one Wednesday session. (`01c`, `05` §2.2.)
5. **Freeze Plants Out Master** as read-only after the Autumn 2026 block; record Spring 2026 in the new `Planting` table instead. (`04e` Stage 2.)

Deferred from "immediately" on the sceptic's advice (`09` §6): the stock log, the long allocation table, the pricking log, the supply tab and hidden-ID plumbing. They are designed (`05`) and ready, but they add typing; adopt each only when the season that needs it arrives and Anna asks for it.

## 2. What data should we clean first

In order, because each depends on the last:
1. **Species**: `prototype/species_master_proposed.csv` (164 IDs: 88 core, 24 contested, 31 appended, 21 seed-log only) and the 728-row crosswalk (98.5% of cell occurrences resolve). 13 rulings needed, 7 of them urgent. Carry the `>5m` flag from the 49-species `Master Plant List` (not MASTER column B — a Phase 1 correction, `01f`).
2. **Sites**: `prototype/site_crosswalk.csv` (134 header strings → 76 proposed sites with class K/C/S). 10 site/scheme rulings (the 13C/11 swap, 9E/9F, 13A/13D, `!!A`, the two 2024 Slope Hill columns, Paper4Trees as a scheme not a site, the 14 ID-less sites).
3. **Planting history**: `prototype/planting_history.csv` — 5,449 rows, 140,068 plants; 87.8% automatic, 8.8% need a ruling (26.5% of plants, mostly the 29,000 Slope Hill 2024 and contested species), 3.5% confirm-once. Reconciles to every MASTER season total exactly; the three published grand totals are each explained (`07` §3).
4. **Current baseline**: the 31 Mar / 28 Apr / 13 May 2026 stock columns (with dates), the 2026/27 targets, the 20 potting sessions entered so far.
5. **Seed records**: reconcile the two copies on the non-sensitive lot key before anything is frozen; import nothing from the Site/Source columns.

## 3. What historical information can become useful immediately

The prototype already answers, from one table and without opening a workbook (`prototype/history_queries_output.md`):
- *What did we plant at Whitechapel in 2019?* — 2,105 plants, 32 species (1,005 autumn, 1,100 spring); 6 of 54 rows flagged.
- *How many plants have gone into Whitechapel over time?* — year-by-year with a running total (8,096 by end-2019).
- *How many mānuka?* — a species line across all 23 seasons.
- *What was planted in Autumn 2024?* — 13,657, of which 7,000 is the Coronation column awaiting decision 4.
- *Which sites were planted in Autumn 2024?* — the list, with class.
Every answer carries a "recorded / needs review" split so a flagged figure cannot be quoted as fact (`09` risk 5).

Historic stocktakes: only seven of the 23 count events are comparable (March V150 2023–26; Oct 2024–May 2025 whole-nursery); import those later into the stock log with a `source` column, index the rest (`02`). Potting history: 152 sessions over four years; normalise later by rule, leave the over-typed Summaries. Allocations: duplicates of Plants Out (100% Spring 2025); do not migrate quantities.

## 4. What should remain in spreadsheets (and why)

- **Weekly entry** (potting, pricking-out tallies, stocktake counts): ~150–300 lines a year, one coordinator typing from paper on a desktop. A form or app adds nothing (`01c`, `03`).
- **Allocation**: one editor, twice a year, ~100 rows; a long table with a QUERY-driven pick list does it (`01e`).
- **Production targets**: a judgement, rounded to trays, by one person; a Sheet calculates trays, uplift and site sums (`01b`).
- **Reporting**: site/species/year pivots and the TTC over-5m extract are pivots over the planting table; Looker Studio only if the website needs live charts (`01f`, `04c`).
- **Seed and cutting records**: restricted, separate, untouched — the sensitive columns never leave that workbook (`04e` §7).

## 5. What spreadsheet structures should be replaced (and why)

- The **98-row species block copied into every sheet** → one list and dropdowns (48 copies in current workbooks; one typo or inserted row propagates; `01a`).
- **Month-per-tab potting books** with dated session columns → one log (swapped dates, dead roll-ups, over-typed totals; `01c`).
- **Species × dozens-of-site-columns allocation matrices** → one long table (4–6 competing totals, `#REF!` site sheets, empty Location column; `01e`).
- **Stocktake columns overwritten in place** ("Updated 12/08") → append-only rows with a date (`01d`).
- **Hand-typed SUMMARY and Trees That Count sheets** (~1,900 cells) → generated views (`01f`).
- **Row-position links** everywhere → joins by name/ID (`04b`, `05`).
- The **forecast workbook** → do not repair; rebuild as a Site Needs tab + what-if later (`01b`, `04d`).

## 6. What Tech Lab should actually build

After weighing the spreadsheet alternative for every candidate (`04d`, `06`, `08`): **no product software in six weeks.** Tech Lab builds:
- the two cleaned masters and the planting-history table, with reconciliation and review flags (scripts exist: `scripts/species_crosswalk.py`, `build_history_prototype.py`, `history_queries.py`);
- the `WRT Core` Google Sheet (species, sites, settings, potting log and views) and `WRT History` (frozen matrix + clean table + Ask/Reconciliation tabs), on copies, tested for the untested assumptions first (IMPORTRANGE on uploaded `.xlsx`, protected ranges, ARRAYFORMULA);
- runbooks for the January, March, July and allocation events that fall after handover;
- a decision memo with named triggers for the three thin layers (`06`: build job, single-file history browser, shortfall explorer) and the gates for anything bigger (`04e` §8).
Scripts are code but not a product: they run by hand, write CSV snapshots, and need no host — which keeps the council stack decision (12 Oct) and the MOU out of the critical path.

## 7. Six-week scope (≈30 developer-days; stakeholder time taken from it)

| Week | Tech Lab | WRT time asked |
|---|---|---|
| **1** (6–10 Oct) | Send the five questions; 2-hour Sheets feasibility test on a converted copy (risk 1); confirm live URLs; stack confirmed 12 Oct | 45 min: live URLs, species owner + deputy |
| **2** (13–17 Oct) | Follow-up session: answers, the three history answers, the product test; species rulings; cheap fixes applied to copies | 1.5 h: meeting; 45 min: seven species rulings; 30 min: Whitechapel 2029 story in Terraware/Spriggo |
| **3** (20–24 Oct) | `WRT Core` masters + potting log + print sheet on a copy; **checkpoint**: go/no-go per layer | 30 min: Anna tries the log at one Wednesday |
| **4** (27–31 Oct) | `WRT History`: import, reconciliation tab, Ask tab; site rulings applied; Spring 2026 planting rows | 30 min: read the three answers, say if useful |
| **5** (3–7 Nov) | Rehearse January/July rollovers on copies; runbooks; checks tab; (if triggered) single-file history browser | — |
| **6** (10–14 Nov) | Handover: cut over potting log and species list; decision memo; archive snapshot; RUN_LOG | 1 h: handover walk-through |

What the window cannot touch: the January pricking-out list, the March V150 count, the July potting form, autumn allocation and TTC reporting all happen after handover — WRT meets each with a runbook, not with Tech Lab in the room (`04e` §4).

## 8. What WRT should see at the end

- A species register (one list, aliases underneath, seven decisions recorded) and a site register with classes — both the spine of every other sheet.
- A searchable planting history: 5,449 rows, every season reconciled to the old totals, three ready answers, and a visible "needs review" share.
- A potting log that totals itself and prints the same Wednesday sheet; no more month tabs.
- Plants Out Master frozen, with its three disagreeing totals explained rather than replaced by a fourth.
- Cheap corrections in the current stocktake and allocation files (labels, SUM ranges, dates).
- Runbooks for the four yearly events, and a one-page memo naming the triggers for a history page, a weekly build job and a shortfall tool.
- Honest expectations: net staff hours saved is roughly zero in year one (`09` §3); the gain is fewer wrong numbers and fewer copies.

## 9. What can wait (V2 / later)

Stock log and loss recording (when Anna wants it — needs a "dead/culled" column on the paper form first); long allocation table and generated pick lists (next allocation after handover); pricking log (only if the weekly actuals move off paper); supply tab for bought-in plants; historic stocktake import (seven comparable counts); potting history normalisation (152 sessions); seed-record provenance import (tag + era rule, no locations); the build job; the history browser; the shortfall explorer (needs loss rates, a Site Needs tab and a maintainer); TTC export (needs TTC's fields); anything with polygons or photos (Project 2, the GIS); any database or web app (gates in `04e` §8).

## 10. Decisions needed from WRT (ten at most)

**Before we start**
1. Which Google Sheet is the live copy of each of the ten records, and are records 9 and 10 one workbook?
2. Who owns the species list (and a deputy), and who will look after the Sheets after Tech Lab leaves?
3. Will Sarah and Anna give the ~4 hours in §7, including the one-hour existing-product test?

**Can be decided during build**
4. The seven species rulings (cupressoides pair; Cyathoides/Leptecophylla; Carex maorica vs secta; Kunzea; Ozothamnus; Rata (KPCA); the appended Autumn 2026 species).
5. Which all-time total to publish, and whether the 2024 Slope Hill HGF/Coronation columns (29,000 plants) are real plantings.
6. Is Plants Out Master "planted" actual or allocation — i.e. the confidence label on history.
7. The site-ID corrections (13C/11, 9E/9F, 13A/13D, `!!A`) and IDs for the 14 unlisted sites.

**Later**
8. Who may see seed-source locations and the kōwhai GPX; whether staff first names stay in records.
9. What Trees That Count actually requires (fields, photos, coordinates).
10. Whether to proceed to a shortfall/forecast tool after one season on the new Sheets.

---

## Critical exercise: improve one real workflow — stock → allocation → planted → TTC

**CURRENT.** March/May count typed into `_Stocktake Master CURRENT` (Stage 2/3/4; earlier columns overwritten) → stock columns retyped into the allocation master (162/170 species equal), with buy-in, council and school plants added as "available" (4,717 of 10,589 in Spring 2026 not held) → per-site print sheets linked by row position (`#REF!` on four sheets) → "Total Allocated" (four to six versions) typed into Plants Out Master as "planted" (98/98 identical) → typed again into SUMMARY SITES/PLANTS and the three Trees That Count sheets (~1,900 cells; 177/230 match). Nothing records what was actually planted.

**MINIMUM CHANGE (better Sheets, Level A/B — recommended now).** Counts go in as dated rows (`Stock Log`); `Latest` view = latest count per species × state, so "available" = PB3-ready + T28-ready as of a shown date. Allocation is one long table (season, site, species, allocated, source); the pick list is one sheet with two dropdowns and a QUERY; "ready / incoming / planned" shown side by side, never summed. Each allocation row gets `planted_qty` and `planted_date` (blank = unknown, never "same as allocated"). Planting rows append to the `Planting` table; SUMMARY and TTC become pivots. Re-keying in this chain drops from four hops to zero; the number of totals per season drops to one plus a reconciliation line. Cost: ~6–8 days; adds typing to stocktake and allocation (`09` §2.3), which is why it is phased after the potting log.

**HYBRID (thin layer, Level C-lite — later, on trigger).** A build job reads the Sheets weekly, resolves aliases, flags problems, writes CSV snapshots; a single-file history page answers site/species/season questions with macron-free search and shareable links; an "available vs allocated" check becomes part of the digest. Nothing writes back to the Sheets. +3–4 days (job) and +5–6 days (page); worth it only when someone outside needs a link without a Google login or the Ask tab fails the misspelt-name test (`06` §6).

**FULL SYSTEM (bespoke app, Level C — a decision for after one season).** Stock as a ledger of movements (pricked, potted, lost with reason, bought in, allocated, planted), reservations as allocation happens, site/area/event records with dates and types, role-based access including restricted seed sources, a TTC export in TTC's format, and the forecast engine (site needs years ahead × survival × lead time → targets → shortfall). Gains: concurrency, validation, mobile entry, true reconciliation. Costs: 8–10 days of foundation plus 12–18 for forecasting, a host, a council-agreed stack and a named maintainer — none of which exist today (`04d`, `08`).

**Comparison.** The minimum change removes the re-keying and the competing totals, which is where the errors come from; the hybrid adds reach, not correctness; the full system adds capability WRT cannot yet feed with data (no loss field, no batch age, blank weekly actuals). Start at minimum; let the triggers decide the rest.
