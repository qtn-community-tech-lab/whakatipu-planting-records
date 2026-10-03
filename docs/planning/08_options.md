# 08. Comparing the options (S8, Phase 2)

This note compares four routes; it does not score them. Assumptions as `00_evidence_summary.md`: the Google Sheets are live, weekly entry stays in Sheets, volunteers keep paper, nothing historical is edited in place, seed-source locations stay out of any shared dataset. Day figures are one developer, taken from `04c`, `04d`, `05`, `06`, `07` and adjusted by me (confidence: low to medium). 

## 1. The budget everything is measured against

Six weeks is about 30 developer-days, and it is not all build time. The 12 October stack decision, WRT rulings (about 40, `02` §2.2) and staff tests take calendar time, and `04e` §4 shows only two live events fall inside the window (Wednesday potting and the Spring 2026 allocation). Handover and runbooks need roughly 3 days. `06` §6 puts the realistic spare capacity after masters and imports at 5 to 10 days. So I treat **about 20 to 24 days as usable build**, and ask of each option whether it fits that and whether WRT can carry it afterwards.

## 2. The four options in one paragraph each

**Option 1: repair and simplify the existing Sheets (Level A on the current files).** Keep the ten records where they are. Add one species list with a check column, real dates, validation, fixed `SUM` ranges, "V150 only" labels, duplicate-the-tab-before-each-count, a "ready" column separate from "planned purchases" (`01a` §7, `01d` §1, `03`). No new workbook, no IDs, no import.

**Option 2: new canonical Sheets plus a normalised history table.** `05`'s three workbooks (`WRT Core`, `WRT History`, `WRT Seed and Cutting`), long append-only tables, hidden IDs under familiar names, and the 5,448-row `Planting` table loaded once by the `07` script with its confidence flags and reconciliation.

**Option 3: hybrid, Sheets for entry plus a read layer.** Option 2, plus `06`'s repeatable build job (validated CSV, checks digest, dated snapshots), plus the static history browser with typo and macron tolerant search, and optionally the minimum shortfall explorer.

**Option 4: purpose-built operational web app.** Entry, stock, allocation, forecasting and reporting in software with its own database, roles and hosting. `04d` §3 puts the shared foundation (auth, hosting, schema, backups) at 8 to 10 days before any single workflow, and the forecasting engine alone at 12 to 18.

## 3. Side-by-side evidence

Each cell is a sentence of evidence, not a score.

| | 1. Repair current Sheets | 2. New canonical Sheets + history | 3. Hybrid read layer | 4. Operational web app |
|---|---|---|---|---|
| **Solves re-keying?** | Partly: lookups replace some typed copies, but the 35 retyped hops across separate workbooks remain because there is still no shared key (`00`, `04b` §4). | Yes for the main loop: one `Targets`, `Allocation` and `Planting` table feed every summary, replacing about 1,900 typed cells (`05` §6; `04b` §1). | Same as 2; the build job adds a weekly check that catches drift nobody looks for (`06` §4A). | Yes in principle, but only after the same masters and rulings exist; software inherits the missing foundations (`04d` §1). |
| **Improves historical access?** | No: the 98 by 411 matrix stays and the three staff questions still need a pivot expert (`02` §2). | Yes: the three questions answered by a dropdown tab, with confidence split and `Reconciliation` (`04c` §3, option 1; `07` §3). | Better: adds typo-tolerant search, shareable links without a Google login and a printable site history (`04c` option 3). | Yes, but a history browser needs no app: 5,448 flat rows (`04c` §4). |
| **Staff behaviour change** | Small: tidier habits, a check column. | Moderate: type into a log row, not a new tab or column; paper unchanged (`04e` §3). | Same as 2 for the coordinator; one person must read a weekly digest. Viewers just open a link. | Largest: new interface for coordinator and managers; volunteers stay on paper (`04d` row 7). |
| **Migration difficulty** | Lowest: edit in place, rollback by copy. | Medium: three new native workbooks, one scripted history import (87.8% of rows automatic, `07` §3), 7 species and 10 site items to rule. | Medium plus a build step; adds no new data work beyond 2. | High: all the work of 2, then loading into a database, parallel running for a season and cut-over (`04e` Stage 4). |
| **Six-week feasibility** | Easily: roughly 6 to 9 days (my estimate), leaving time for handover. | Fits: about 12 to 15 days of Sheets build plus 8 to 10 for scripts and history (`06` §6), 18 to 22 in all with overlap. Tight; needs rulings in weeks 1 to 2. | Does not fit whole: 2 plus 3 to 4 (repeatable job) plus 5 to 6 (browser) is 26 to 32 days. The job and a single-file browser may fit if spare capacity is 8 or more days. | Does not fit: foundation 8 to 10 plus 12 to 18 for one workflow, before rulings, stack decision and handover (`04d` §3). |
| **Maintenance after Tech Lab** | Lowest: WRT already lives in Sheets; risk is overwritten formulas. | Low: `SUMIFS`, `QUERY`, `MAXIFS` that WRT can maintain (`04b` §10); owner and deputy plus a runbook per Sheet (`04e`). | Low to medium: someone must run one command and read a digest; a stale page is the failure mode, not a stopped nursery (`06` §1). | Highest: dependencies, hosting, backups, break-fix, 3 to 6 days a year plus someone who understands the model; no maintainer is agreed (`04d` §3, decision 9). |
| **Extensibility** | Poor: adding planting areas or events means more columns in a matrix. | Good: long tables take new columns (`area`, `event_type` already blank in `Allocation`); CSV schema is database-ready (`04c` §4). | Better: the CSVs are the interface for a GIS join on `site_id` text or any adopted product (`06` H; `04c` §6). | Best in theory: joins, scenarios, saved plans; but the model is judgement today, so extension hardens a guess (`06` §7 point 5). |
| **Reporting (TTC, funders)** | Typed extracts stay; three `>5m` lists (49/50/39) stay in conflict. | TTC pivot reproduces WRT's own 2020 to 2022 and 2024 figures exactly (`01f` §4); `Reconciliation` shows four totals without choosing one. | Adds a TTC-style CSV and a public page by design, so decisions 3 and 4 must close first (`04c` §5). | TTC's fields are unknown (decision 8), so nothing to build to yet. |
| **Future mobile use** | Sheets app only; 98-species entry is clumsy (`05` §9). | Same, with an optional Google Form into the Pricking Log `[UNTESTED]`. | Read-only pages work well on a phone; entry unchanged. | Best fit for phones, yet volunteers are expected to stay on paper (2H). |
| **Risk** | Low risk, low gain: the next fault is the same as this one; IDs absent so imports stay fragile. | Sort or paste accidents (append-only cannot be enforced, `05` §9); `IMPORTRANGE` breakage; many `[UNTESTED]` formulas. | A second place to look that nobody opens; publishing unruled totals; an unmaintained repo looking official (`06` §7). | Scope creep (named at the first meeting), an untrusted model, no named maintainer, and a stack that may be overridden on 12 October. |

## 4. Where each option fits

**Option 1 fits** if WRT wanted only relief this season and no change of structure. Several steps (relabel V150, fix `SUM` ranges, real dates) are cheap enough to do today whatever else is chosen. Gained: little disruption. Lost: the 35 hops, row-position breakage, and any usable history. It cannot grow into Sarah's problem, because without keys nothing downstream can be trusted. Right as a floor, wrong as the plan.

**Option 2 fits** the evidence best for the six weeks. The Phase 1 findings are shape faults, not tool faults (`04d` §1): typed copies, positional links, snapshots overwritten in place. `05` shows the full loop can run in Sheets, and `07` has already built the history table (all 23 season totals reconcile). Gained: one fact, one home; usable history; data portable to any later tool. Lost: some Sheets fragility (no enforced append-only, no row-level access, sort risk). Right for a volunteer-run trust that must carry the system itself.

**Option 3 fits** a specific, provable need: someone outside the nursery who will not use a Google login (a funder, a school, the website), or staff who cannot get through the `Ask` tab on a misspelt, macron-free test (`04c` §5). Gained: better search, shareable links, a weekly check, dated snapshots (`04d` §2). Lost: simplicity; needs an owner. Right once WRT has named that person; otherwise a single-file browser plus documented scripts is safer (`06` §6).

**Option 4 fits** only when Sheets demonstrably fail at something software does cleanly: many simultaneous editors, a tray-level stock ledger, row-level seed-source access, a TTC API, or survival-adjusted scenarios backed by a season of loss records (`04d` §5; `05` §10). None is proven at WRT's volume (about 11,000 pricked-out plants a year, 150 potting lines, a handful of editors). Gained: enforcement, scenarios. Lost: most of the budget. Right for a later WRT with a named maintainer and a season of clean data.

## 5. Sarah and the existing products

Sarah's list (Terraware, SeedSource, Spriggo) is not a fifth option; it is another route to option 4. `04d` §4 sets out the one-hour test (the Whitechapel 2029 story, invented data, never real seed locations). Product knowledge is general and unverified (I could not browse), so all of this is conditional.

- **If a product passes** (runs forecast-to-shortfall natively with per-species lead time and loss rate, accepts V150, T28 and "Spring 2026", imports our clean CSVs, field-level permissions, licence suits the MOU, an active maintainer): Option 4 becomes **adoption**, not building. WRT carries no code. It sits *after* option 2, because the species master, aliases, site register and history CSV are the import files it needs (`04d` §4). Option 2's work becomes the migration kit.
- **If a product covers about 70% but forces new vocabulary or drops paper habits**: weigh it against "humans keep familiar language" and the volunteer base. It might own the stock and batches, with Sheets keeping targets and allocation, a hybrid that option 3's CSV interface supports.
- **If both product tests fail on forecast-to-shortfall**: that is `04d` tripwire 6, and the narrow shortfall explorer in option 3 (layer C) becomes the candidate, still gated on a named maintainer.
- **Either way, do the test early.** It costs about an hour, and its result changes what option 3 and 4 mean. Run it in week 2, before any read layer.

Option 2 is the no-regret choice across all these outcomes.

## 6. A staged path

Each stage is useful alone; later ones open on evidence (`04e`).

**Now (weeks 1 to 6): Option 2, with Option 1's cheap fixes done first.** Snapshots and live URLs (Stage 0); masters and aliases (Stage 1); history import with `Reconciliation` (Stage 2); the potting log and long `Allocation` tab on the two live events (Stage 3a); runbooks. The product test in week 2. Week-3 checkpoint from `06` §7.

**Next, when a trigger fires: Option 3, one layer at a time.**

| Layer | Trigger (from) |
|---|---|
| Sheet pivots to Looker Studio | A funder, school or the website needs filtered charts, someone will own the report, rulings closed (`04c` §5) |
| History browser (static page) | WRT wants a public explorer, or two or more requests a year from people with no Google login, **and** decisions 3 and 4 closed, **and** a named owner for the build. Or staff fail the `Ask` misspelling test |
| Repeatable build job | Masters exist with IDs; the 40 rulings drafted; a named person will read a weekly digest. |
| Shortfall explorer (minimum) | The Whitechapel 2029 test is run in the Sheet and is clumsy; `Site Needs` populated; a maintainer named in the MOU (`06` §6) |
| GIS read endpoint | GIS funding lands in November and adopts the register's site IDs (`06` H; `04c` §6) |

**Later, only if the forecasting engine proves itself: Option 4.** The gate has two halves. From `04e` §3: one full cycle (January list, March count, July form, an allocation, a TTC extract) run from the new Sheets, and evidence that Sheets are failing for a reason software fixes. From `04d` §5: any of the seven tripwires shown by use (Whitechapel test fails after an honest attempt; a season of `LOSS` rows exists and survival-adjusted targets are wanted; more than about three people editing one tab with conflicts; row-level viewing needed; TTC requires an API; both product tests fail on forecast-to-shortfall; a maintainer is named in writing). Also stack and hosting agreed, licence in the MOU, funding, and the product test run. `04d` is explicit that building without a named maintainer is risky however strong the other tripwires. Stage 3 may be the right end state, not a failure to finish (`04e` §8).

## 7. No-regret work under every option

Import scripts a second developer can run; species and site masters with a named owner and deputy; the visible `Reconciliation` (no published total before decisions 3 and 4); seed-source locations left in their restricted Sheets (decision 6); seed records reconciled before anything is frozen (`04e` §6).

## 8. Open points that could change this comparison

1. Who, by role, runs a build or reads a digest after Tech Lab (MOU)? This decides option 3 more than any technical factor.
2. The stack and hosting agreed on 12 October.
3. Whether Sarah wants the shortfall view (untested first-hand, `03`).
4. TTC's export fields (decision 8), GIS funding in November, and the product test result, the one input that could make option 4 cheaper than option 3.

## 9. Recommendation for the WRT meeting

We suggest WRT does not pick between "Sheets" and "software" now, because the evidence says the problems are in the shape of the data rather than in the tool: the same species typed in 48 places, 35 numbers retyped between workbooks, and fifteen years of planting locked in a 411-column matrix. Over the next six weeks Tech Lab would build one clean set of Google Sheets that WRT can run itself: one species list and one site list, one log that totals potting and stock automatically, one allocation table, and the full planting history made searchable and reconciled, with every doubtful number flagged rather than guessed. Volunteers keep paper and everyone keeps familiar words. In week 2 Sarah and Anna would spend an hour testing Terraware and Spriggo on the Whitechapel 2029 story; if one passes, the clean data becomes the way into it, and if not, nothing has been lost. A history page, a weekly checking job or a shortfall tool is added later only when a named trigger fires and someone at WRT has said they will look after it. Full custom software is a decision for after one season on the new Sheets, once WRT has data on losses, a named maintainer and a reason the Sheets cannot meet.
