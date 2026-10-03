# 04d. Where purpose-built software beats a Sheet (S4D, Phase 2)

Question: testing the S1 finding (Level A for species, production, potting, allocation, reporting; Level B for stock) from the other side, where does custom software win convincingly?

Read: brief, `00`, `staff_context`, `01a`–`01f`, `02`, `03`, and `discovery/04c_forecasting.md` §1–§8. Note: the brief names `discovery/04c`; it lives at `/home/claude/discovery/04c_forecasting.md` (not under `planning/`).

Assumptions: Google Sheets are live; volunteers keep paper; the Nursery Coordinator keys totals; nothing historical is edited in place; stack and hosting are not yet confirmed (deadline 12 October); no one has said who maintains code after Tech Lab. Sarah's hypothesis and the Whitechapel 2029 story are second-hand (medium). Effort figures are my estimates for one developer on the Next.js stack (confidence: low to medium), excluding WRT rulings and meetings.

## 1. Short answer

**None as a product in the six weeks.** The evidence does not show a job a Sheet does badly at WRT's volumes. About 11,000 plants a year are pricked out (`04c` §1), about 150 potting lines a year (`01c`), 5,448 history rows (`02` §2), a handful of editors, one weekly keyer. The faults are shape faults: typed copies, positional links, no validation (`01a` §5, `01b` §2, `01c` §1.7). Software would inherit the same missing foundations: species and site masters, rulings, and loss data that does not exist.

One thing is justified now, and it is not an app: **one-off import scripts** that turn the history, stocktakes and potting sessions into clean tables. The forecast-to-shortfall engine is the only candidate where software could plausibly win, and the test belongs after a Level A season (section 5).

## 2. What a Sheet really cannot do

To be fair to software, these are the real Sheet limits, mostly general knowledge about Sheets and untested here (confidence: medium):

- **No enforcement.** Validation does not stop a paste. Append-only cannot be enforced (`01d` §2.4). Protected ranges stop edits, not views.
- **Fragile joins.** `IMPORTRANGE` needs permission and breaks if access is withdrawn (`01a` §8). Formulas break on row insertion; WRT has already shown this (`#REF!`, `01e` §1.5).
- **Per-row or per-column viewing.** A Sheet shares at file level. Seed-source locations need a separate restricted file (`02` §6, decision 6).
- **Dense multi-dimensional models.** Species × site × season × stage with survival rates is possible with `SUMIFS` and a stage table, but the formulas get hard for non-developers to audit.
- **Scenarios.** One live scenario cell works; saving and comparing three side by side is awkward.
- **Generated documents.** Sheets print layout is limited. A PDF per site or per session is easier in code.

None of these is yet a WRT problem proven by evidence. Each is a trigger to watch (section 5).

## 3. Per-candidate table

Costs are person-days on top of a shared **platform foundation of about 8 to 10 days** (auth with roles, hosting, schema, species and site admin, backups, deploy). Any single app carries the whole foundation. "Maintenance" is a rough yearly figure for a small app (dependency updates, hosting, break-fix) of 3 to 6 days, plus whoever answers WRT's questions (confidence: low).

| Candidate | Workflow and current pain | Best Sheet alternative | What software adds that a Sheet cannot | Build | Maintenance and who | Data readiness | Six weeks? |
|---|---|---|---|---|---|---|---|
| **1. Production forecasting and pipeline** | Site needs years ahead, then season target, then compare with pipeline, then shortfall or surplus. Today nothing is wired: forecast empty, target typed, 270 retyped figures a year, no loss field (`04c` §1, §6; `01b` §1) | `01b` §4 `Plan` with `Site Needs`, `Settings`, `Species`, `Pricking Log`; column Q is the shortfall; Level B adds IDs | Multi-year cohort projection with per-species lead time and survival by stage; saved what-if scenarios; a pipeline by batch and age; one audited calculation instead of formulas people can overtype | 12 to 18 (5 to 7 for a read-only calculator over a Sheet) | Highest. Model changes yearly. Needs a named owner who understands the model. Tech Lab, council IT or a retained developer: **none agreed** | **Poor.** No planting areas or events in data, no loss rates, no batch data, weekly pricking actuals blank (`04b` §4, `04c` §6). Needs species and site masters first | **Partial:** a calculator prototype yes; a trusted engine no |
| **2. Current nursery overview** | Anna wants ready versus growing per species now (`03`). Today: overwritten snapshots, V150 includes T28 trap (`01d` §1.3) | `01d` §2.3 `Latest` view; Looker Studio over it if wanted | A prettier dashboard, mobile view. Nothing the `Latest` tab cannot show | 3 to 4 | Low to medium | Needs the `Log` first, which Level B delivers in Sheets | Yes, but **no case** |
| **3. Allocation assistant** | Species × ~30 sites, five or six totals, `#REF!` print sheets, planned buy-in counted as stock (`01e` §1.5) | `01e` long `Allocation` tab, `Site pick list`, `Supply` status, ready looked up | Live reservation of stock as Anna allocates; refusing over-allocation; suggested allocation from needs; one-click PDF per site | 8 to 12 | Medium. Anna depends on it twice a year; breaks at the worst moment | Needs the `Log` or `Latest`, species and site IDs, a rule for "ready". Stock is a snapshot, not a ledger (`01e` §4) | **No.** Level A fixes the faults first |
| **4. History lookup** | "What went where, when?" Today a 23-block, 411-column matrix (`02` §2) | Clean `Planting` tab plus pivots and filter views (`01f` §3); Looker Studio if public | A friendly site and species browser, search, charts, cross-links, no Sheets skill. Read-only, so risk is low | 3 to 5 (2 to 3 as a static viewer over the CSV, no login) | Low if static; data changes twice a year | **Good once the import runs**: 70.8% high-confidence records; about 40 rulings (`02` §2.2) | **Partial, optional.** No staff request on record |
| **5. TTC and reporting export** | Hand-typed TTC extracts; three `>5m` lists; four disagreeing totals (`01f` §4, §5) | Generated `SUMIFS` view and CSV from `Planting` (`01f` §4 reproduced WRT's own 2020 to 2024 figures exactly) | Only if TTC demands an API or rigid upload. Coordinates and photos are capture problems, not software problems (`01f` §7) | 2 to 3 once the spec is known; unknowable now | Low, but breaks when TTC changes format | **Blocked:** TTC's real fields unknown (decision 8) | **No** |
| **6. Data validation and import service** | Zero validation rules in ten workbooks (`01a` §5.8); 48 live copies of the species block (`01a` §6) | Species Master, `Aliases`, warning dropdowns, check column (`01a` §9). Import by script (`02` §7) | Import: scripts win clearly (mapping, flags, audit trail, re-runnable). Ongoing service: nothing that Sheets validation plus a check column cannot do | **One-off scripts 8 to 10** (history 4 to 5, stocktake tier 1 about 3, potting 2). Scripts partly exist (`02` §7). Ongoing service 10 to 15 | Scripts: none after delivery, if documented and outputs are kept. Service: high | Scripts need the rulings (about 40, a few hours with Anna; `02` §2.2). Service needs masters | **Scripts yes. Service no** |
| **7. Weekly session entry** | Volunteers on paper; coordinator keys pricking and potting totals later. Swapped dates, 13 species copies (`01c` §1.4–5) | `01c` `Potting Log` and `01b` `Pricking Log`, one row per species per session; print sheet from the Plan. A Google Form into the log gives mobile entry, no code (general knowledge) | Mobile or offline entry, per-line validation, generated PDF sheets. But volunteers will not use it (2H), and one keyer takes 2 to 3 minutes a session (`01c` §5, estimate) | 6 to 10 (plus 3 for PDFs) | Medium. Used weekly, so every bug is felt | Needs species master only | **No.** Level A removes the pain at nearly zero cost |
| **8. Restricted seed-source data** | 36 seed-source columns in 32 files; access must be restricted (`02` §6; 2H) | A separate restricted Sheet keyed by lot, shared with two people | True row or field-level permission and an access log | 5 to 8 on the foundation | High: security work | Blocked by decision 6 | **No** |

Reading across: no row combines a proven Sheet failure, good data readiness, and a maintainer. That is the honest finding.

## 4. Existing products (general knowledge; not verified in this run)

I could not browse in this run. Treat everything here as prior knowledge to check.

- **Terraware** (open source, from a restoration-technology non-profit; Sarah's email calls it open source). As far as I know it covers seed banking, nursery batches with stages, withdrawals, planting sites with zones, and monitoring. Built for large, often tropical, restoration programmes. Unknown to me: how well it handles multi-year planting forecasts, T28 and V150 containers, a NZ hosting option, and whether a small trust can self-host it.
- **Spriggo** (Sarah describes a recently developed NZ product). I know little. It may fit WRT's vocabulary and market best, but that is a guess.
- **SeedSource.** I cannot confidently describe it. Likely a seed-collection and seed-bank tool; verify what it is before the hour.
- **Trees That Count and Tāne's Tree Trust tools.** Reporting and monitoring tools, not nursery planners, as far as I know. They matter as the destination of the export (decision 8), not as a replacement.

**Test in one hour** (use invented or non-sensitive data; never real seed locations): run Sarah's Whitechapel 2029 story, one product at a time, with a timer.

1. Create species with a container choice of V150 or T28 and WRT's stage words (10 min).
2. Enter WH-06: 1,300 plants, Spring 2026 establishment; 120 infill, Autumn 2028; 45 enrichment, Spring 2031. Does it hold area and event type (10 min)?
3. Enter site needs for 2029 and ask for this season's production target. Can lead time (about two and a half to three years, `04c` §4) and a loss rate be set per species (10 min)?
4. Create a batch pricked out directly into T28, count from stage 2, mark ready as a flag (10 min).
5. Ask for shortfall and surplus by species for 2029 (5 min).
6. Allocate ready stock, with bought-in stock shown separately; record planted; produce a TTC-style over-5 m count (10 min).
7. Import a CSV of 20 species with aliases; restrict one field to one user; print a pricking sheet; export everything (5 min).

Also ask: licence and MOU terms, hosting location, cost at WRT's size, who maintains it, and whether it forces staff to drop V150, PB3 and "Spring 2026".

**What would make a product better than anything we build:** it runs steps 3 and 5 natively with configurable lead times and loss rates; it accepts WRT's vocabulary; it imports our clean CSVs; it has field-level permissions; its licence suits the MOU; and it has an active maintainer, so WRT carries no code. Even then, the species master, aliases and import scripts are needed. They are no-regret work under every outcome. If a product covers about 70% but forces new vocabulary, weigh that against "humans keep familiar language" and a volunteer base on paper.

## 5. Tripwires: when software becomes justified

Revisit a build only if one of these is shown by use, not by prediction:

1. **The Whitechapel 2029 story cannot be run in the Level A Sheet** in under an hour of keying by a non-developer, after one honest attempt in weeks 2 to 3.
2. **A season of loss records** (`LOSS` rows, `01d` §3) exists and WRT wants survival-adjusted targets and saved scenarios.
3. **More than about three people edit the same tab** and conflicts are happening.
4. **Row-level viewing** is required beyond one restricted file.
5. **TTC requires an API or rigid upload** that a CSV cannot meet.
6. **Both product tests fail on forecast-to-shortfall** specifically (Sarah's narrow gap).
7. **A named maintainer exists**, in writing in the MOU.

Without tripwire 7, building is risky however strong the others are.

## 6. Ranked conclusion

**In the six weeks (software that earns its place):**

1. **Import and validation scripts** (candidate 6, scripts only). History first (4 to 5 days), then 2026 stocktake and March V150 counts, then potting sessions. Hand over scripts, outputs and a one-page README that a developer other than the author can run. This is code, not a product, so it avoids the maintenance problem.
2. **Optional, only if time remains and Sarah wants a visible result:** a **throwaway forecast calculator** (5 to 7 days) reading the Level A `Site Needs` and `Plan` tabs, used to test tripwire 1 rather than to be adopted. Label it a prototype. Skip it if the Sheet passes the Whitechapel test.

**Later (after a Level A season and the product tests):**

1. **Forecasting and pipeline engine** (candidate 1): the one place software could win. Needs loss data, planting areas and a maintainer first.
2. **History browser** (candidate 4): cheap and low risk, if a funder or the public needs it.
3. **TTC export** (candidate 5): after TTC states its fields, and only if a CSV does not suffice.
4. **Allocation assistant** (candidate 3): only if WRT wants stock reserved as it is allocated, which implies a ledger and per-batch data.

**Never (on current evidence):**

- A nursery overview app (candidate 2): `Latest` plus Looker Studio is enough.
- A volunteer-facing entry app (candidate 7): paper stays; Sheets and a Form serve the keyer.
- A standing validation service (candidate 6, service): Sheets validation plus a check column covers it.
- Seed-source permission software (candidate 8): a separate restricted Sheet until a real access need appears.
- Polygons or mapping inside the nursery system: that is Project 2, with the Field Area Measure app.

**Level summary.** A is right for species, potting, allocation, reporting, entry. B (Sheets with clean canonical tables) is right for stock and history. C is not justified by any workflow today; forecasting is the single candidate to keep open, tested honestly in the first Level A season.

## 7. Questions for WRT

1. Who, by role, would maintain any code after Tech Lab, and is that written in the MOU?
2. What stack and hosting did the council agree, and do they allow a database service WRT must pay for?
3. Would Sarah and Anna use a shortfall view if it existed? The hypothesis has not been tested first-hand (`03`, confirmation item 3).
4. Is a public or funder-facing history view wanted (candidate 4), or is it a nice idea?
5. What are TTC's real export fields (decision 8)?
