# 06: What thin software layer would beat the best spreadsheet? (S6, Phase 2)

Question: if we may build, what *small* amount of software gives disproportionately more value than the best Sheets design in `04b`? Assumptions as `00_evidence_summary.md`: Sheets stay the record and weekly entry layer; volunteers keep paper; history is never edited in place; stack confirmation (12 October) is pending, so "Next.js" means "a generated site in whatever the council agrees". Effort is person-days for one developer, my estimates (confidence low to medium, plus or minus 40%), excluding WRT decision time. Sarah's hypothesis and the Whitechapel 2029 test are second-hand (medium).

## 1. Short answer

Three thin layers, all **read-only over the Sheets, no database, no seed-source data, removable without losing anything**:

1. **A repeatable build job**: Sheets in; validated CSV, checks report and dated snapshots out. The Phase 1 scripts made re-runnable.
2. **A history and search browser** (static, private): typo- and macron-tolerant search, site, species and season pages, shareable links.
3. **A shortfall explorer** (read-only): needs, targets, pipeline, shortfall or surplus, with working shown. Conditional; weakest on data.

"Scripts plus Sheets, no app" is a strong contender (section 7); decide at a week-3 checkpoint.

**The rule that separates this from `04d`'s "no product":** every layer must be *removable*. If it is abandoned, the Sheets still run the nursery and the loss is a stale page.

## 2. Ratings

Scales: High / Medium / Low. For BUILD and MAINTENANCE, Low is good; for DATA READINESS, Low is bad; BEHAVIOUR CHANGE is what staff must do differently.

| Idea | VALUE | BUILD | MAINTENANCE | DATA READINESS | BEHAVIOUR CHANGE | Person-days |
|---|---|---|---|---|---|---|
| **A. Build job** (validate, resolve aliases to IDs, emit CSV, checks, snapshots, weekly digest) | **High**: feeds every layer; catches drift nobody looks for | **Medium**: history scripts exist (`02` §7); repeat means config, tests, scheduler | **Low to medium**: breaks when a tab or column is renamed; fails loudly in the digest | **Medium**: aliases ready (98.5% of cells map, `04a`); about 114 flagged rulings pending but non-blocking | **None**: staff type as now; one person reads the digest | 8 to 10 for the imports (`04d` §3), **plus 3 to 4** to make repeatable |
| **B. History and search browser** | **Medium to high**: the one view a Sheet visibly cannot match (typo-tolerant search, links, print pages); no staff request on record (`04c` §1) | **Low to medium**: static site over one flat 5,448-row table | **Low**: data changes about twice a year; no server | **High**: 70.8% of records high confidence (`04c` §1); caveats can be shown | **Low**: open a link; no entry | 5 to 6 on top of A |
| **C. Shortfall explorer** (Sarah's gap) | **High if the hypothesis holds**: scenarios and a visible trace are hard in Sheets; but unproven first-hand | **Medium to high**: model, tests, UI | **High**: the model changes yearly; needs someone who understands it (`04d` §3) | **Low** for the pipeline half (no loss, no batch age, blank weekly actuals); **medium** for need-to-target | **Medium**: Site Needs must be kept current; losses must start being noted | 6 to 8 read-only; 12 to 18 with saved scenarios (`04d`) |
| **D. Nursery overview page** (ready versus growing now) | **Low**: the `Latest` tab already answers it (`04d` row 2) | **Low** | **Low to medium** | **Medium**: needs the stocktake `Log` first | **Low** | 2 to 3 |
| **E. Allocation assistant** | Read-only over/under check and per-site pick PDF: **Low to medium**. Live reservation (writes): not v1 | **Low to medium** read-only; 8 to 12 for write-back | **Medium**: used twice a year at the busiest moment | **Low to medium**: stock is a snapshot, "ready" rule not yet agreed (`01e` §4) | **Low** read-only; **high** for reservation | 3 to 4 read-only |
| **F. Automatic TTC export** | **Medium**: figures are hand-rebuilt and audited; but spec unknown (decision 8) | **Low** as a download from B; 2 to 3 more if TTC wants an API | **Low**, until TTC changes format | **Low to medium**: three over-5 m lists (49/50/39); four totals (decisions 3, 4) | **None** | 1 as a by-product of B |
| **G. Printable-form generator** (pricking, potting, count, pick list) | **Medium**: paper is the volunteers' real interface | **Low**: print-CSS pages | **Low to medium** | **Medium**: needs species master and Plan | **None**: they already use paper | 2 to 3 |
| **H. Site and planting read endpoint for a future GIS** | **Low now**, **high if GIS is funded** (November) | **Low**: generated JSON per `site_id` | **Low** | **Medium**: site ID rulings pending, 14 sites without IDs (`00`) | **None** | 1 to 2 on top of A |

**Reads and writes.** All read the Sheets (read-only service account) or A's CSV. A writes CSVs, `checks.json` and dated snapshots; B to H write static files. **None writes to a Sheet.** None needs hosted Postgres: that choice comes with writes, row-level permissions or event-level joins, and would roughly double maintenance (backups, migrations) for no read-only benefit.

## 3. What each layer must NOT do

- **A.** Never write back to a Sheet or auto-merge contested species; unmatched text goes to a report (`04a` §2b). Publish an **allowlist** of columns, not a blocklist: personal names occur in comments, headers and file names (`04g` register).
- **B.** Never hold seed-source locations, coordinates, landowner contacts or personal names. Never show one confident total while decisions 3 and 4 are open: show the recorded total, the medium/low split and the Coronation and Slope Hill caveat (`04c` §1). Never be public by accident: a static site is public unless the host gates it.
- **C.** Never replace the human "planned target" and reason column (`01b` §4). Never invent a loss rate: parameters live in the Sheet's `Settings` tab, blank until WRT confirms. Never hide the arithmetic.
- **E, F, H.** No reserving stock in v1; no claim to match TTC's format before its fields are known; no geometry (the GIS owns it).

## 4. The layers in more detail

### A. The build job (the keystone)

A scheduled job reads the live Sheets read-only, applies the Aliases and Calendar tabs, runs the `Checks` of `04b` §6 in code (unmatched species, future dates, blank IDs, repeated COUNT dates, `Less T28` versus T28 stock, site totals versus targets) and writes clean CSVs, a `checks.md` and a dated snapshot. A Monday email lists new problems.

Why it beats the best Sheets design: a check column only works if someone looks (35 retyped hops, `#REF!` in six Autumn 2026 sheets). A digest needs no new staff behaviour. Snapshots give what Sheets cannot enforce, **real append-only history and rollback** (`04d` §2), plus a "what changed this week" diff for free. It also keeps B to H cheap.

### B. The history and search browser

The flat `Planting` table, a species register with common names and a macron-free search key, a site register with aliases. Pages `/site/<id>`, `/species/<id>`, `/season/<label>` and a search box that folds macrons and tolerates typos (5,450 rows, client-side). It answers `04c`'s three questions (Whitechapel 2019; mānuka; Autumn 2024) in a sentence with the confidence split, prints a site history and downloads a CSV. A failed search is fixed by adding an alias in the Sheet.

Over `04c`'s Sheet option it adds only typo tolerance and shareable links that need no Google login. If the nursery and operations managers are content with the `Ask` tab, do not build it.

### C. The shortfall explorer (Sarah's hypothesis)

Split the hypothesis, because the halves have different data:

- **Need to target** (needs for season N+2, uplift, spares, tray rounding): arithmetic a Sheet does (`01b` §4). Ready once one authoritative `Site Needs` tab exists.
- **Pipeline to shortfall** (what is ready by when, after losses): needs batch age, per-stage survival and lead time (about two and a half to three years). Stock is a snapshot by state; no loss field; weekly pricking actuals blank (`01d`, `04c` §6).

Software's edge (scenarios in the URL, a "why this number" trace, unit tests that reproduce known targets such as 51 of 55 exact tray multiples in 2026/27) lies in the second half, where data is worst. So build the honest minimum: **(1) planned production versus site need two years out** and **(2) this season's ask versus ready stock now**, both from real data. Add the survival-adjusted pipeline once a season of loss notes exists. Scenarios are shareable links, not saved records, avoiding the database and the 12 to 18-day version.

`04d` was right that an untrusted engine with no maintainer is the riskiest build, and its Whitechapel-in-the-Sheet test is the right gate. It was cautious to call the calculator a "throwaway": with parameters in the Sheet and code only reading them, it can be the Sheet's explanation layer.

### D to H, briefly

- **D, E:** `04d` was right; `Latest` and `Over-under` cover them.
- **F (TTC):** wait. Once B exists, a TTC-style CSV (season, species, site, `over_5m` as at report date) is one more download.
- **G (print forms):** PDF printing of a `QUERY` range is `[UNTESTED]` (`04b`). Trial Sheets print ranges first. If page fit fails, one HTML page per form with a print stylesheet (2 to 3 days) beats a PDF library.
- **H (GIS endpoint):** a folder of generated JSON per `site_id` is a "tiny API" with no server. Join on `site_id` as text (`9G`, `13C`); 2015 to 2023 sites have no coordinates (`04c` §6). Build only if GIS funding lands.

## 5. Where `04d` was too cautious, and where it was right

**Too cautious:**

1. **"No product" conflated products with thin read-only layers.** Tripwire 7 (a named maintainer) is sound for software that carries weekly work. For a removable layer the failure mode is a stale page, so one person who can run one command, plus a runbook, is enough.
2. **Import as a one-off.** Fifteen years of history is one-off; next season's data is not, and will be as untidy as the last. Repeatability is the value (A).
3. **The browser as "no case".** Macron, typo and twelve-spellings problems are real (`04c` §1) and only partly fixable in a Sheet. A modest case.

**Right:** no volunteer app; no write-back allocation; no seed-source permission software before decision 6; no standing validation service; no polygons; and above all **the forecast engine is premature** until loss data, a clean `Site Needs` and a maintainer exist. My layers pass only because I changed the test from "a Sheet fails" to "a Sheet cannot do this cheaply, the layer is read-only, and losing it costs nothing".

## 6. What I would build first, in order, with conditions

| Order | Layer | Worth it only if (all) | Stop if |
|---|---|---|---|
| **1** | **A. Build job** (imports first, then repeatable, 8 to 10 + 3 to 4 days) | Species and site masters exist with IDs (`04e` Stage 1); the 40 rulings are drafted; a named person will read a weekly digest | Nobody will read it. Drop to one-off scripts and a README, as `04d` advised |
| **2** | **B. History and search browser** (5 to 6 days, includes the TTC-style CSV) | A is green; a named WRT person will own the host and the rebuild; the nursery manager or operations manager cannot answer the three `04c` questions in the Sheet `Ask` tab *including a misspelt and macron-free test*, **or** a funder, school or the website needs to share a link without a Google login | The `Ask` tab passes the test and nobody outside needs a link |
| **3** | **C. Shortfall explorer, minimum version** (6 to 8 days) | The Whitechapel 2029 test is run in the Sheet and is clumsy or cannot show scenarios; Sarah would use a shortfall view; `Site Needs` is populated for at least the keystone sites; a maintainer is named in the MOU | The Sheet `Plan` column Q does the job. Spend the days on handover |

Not on the list: D, E, G, H, and F beyond the by-product; promote G or H if the print test fails or GIS is funded. With little capacity, build A and a **single-file B**: one self-contained HTML page with the data and search embedded, openable from a drive or hostable anywhere (1 to 2 days less, no toolchain).

**Capacity check (low confidence).** Six weeks is about 30 developer-days. Scripts (8 to 10) plus the Sheets and master-data work in `04b` and `04c` (roughly 12 to 15) leave 5 to 10 spare: A's repeatability and probably B, rarely C.

## 7. The honest case that the right answer is "scripts plus Sheets, no app"

It may be. In order of weight:

1. **The big wins are not software.** One species master, one site master, append-only logs and keys instead of row positions (`04a`, `04b`) fix what Phase 1 found. No layer helps until they exist, and UI days come out of rulings, staff tests and handover.
2. **A second place to look is a cost.** If nobody opens it for a season, the problem was not the tool (`04c` retreat check).
3. **Nobody has said who runs a build after Tech Lab** (decision 9). Removability limits harm, not the burden of looking official and unmaintained.
4. **Sheets plus a `search_key` and Looker Studio probably do most of B**.
5. **The model in C is judgement.** Coding it risks hardening a guess (the 1.2 uplift is a habit, `01b` §2.3).
6. **Scope creep was the named risk** (second-hand); three small layers plus an "obvious next one" is how it happens.

**What "no app" still includes:** import scripts documented so another developer can run them; a CSV snapshot (cron or documented manual export); the Sheets `Checks` tab and print ranges; and a one-page spec (schema, wireframes, Whitechapel test cases) so any later build or adopted product starts from the data. Useful under every outcome.

**The checkpoint, end of week 3.** Are masters built and history imported with flags? Is a named WRT person ready to own a host and a digest? Did staff ask for something the Sheet cannot do? Three yes: build A (repeatable) and B. Two or fewer: scripts, Sheets and the spec, and stop. Either is a good outcome; the failure is building the page first and finding in week 5 that the data under it still has two Veronicas.

## 8. Questions for WRT

1. Who, by role, can run a command and read a digest after Tech Lab (MOU)?
2. May a static page sit behind a login on the council's host?
3. Would Sarah and the nursery manager open a history or shortfall page, or is the Sheet enough? A five-minute test answers it.
4. Will GIS funding (November) adopt the site register's IDs? Do TTC's fields (decision 8) need more than a CSV?
