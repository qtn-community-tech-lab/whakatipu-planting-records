# 04c: Making the planting history usable (history browser and reporting layer)

S4C, Phase 2, 3 Oct 2026. Question: what is the smallest way to make ~5,450 rows of planting history genuinely useful to WRT staff? Assumptions as in `00_evidence_summary.md`; no seed-source locations, coordinates or personal names appear here. Evidence: `02_historical_data.md` §2, `01f_reporting.md` §2 to §5, `03_staff_needs.md`, `04d` §7, `04a`. Effort is in person-days of one developer (about 7 working hours), assumes S7's clean CSV exists and excludes WRT decision time. Estimates are mine (confidence: medium, plus or minus 40%).

## 1. What the data and the people actually need

**The data is small and flat.** 5,448 rows by about 10 columns is roughly 0.6 MB as CSV and well under 0.2 MB compressed. Any option below holds it without strain. 

**The audience is internal and the cadence is twice a year** (`03` funder row; `01f` §3). A public explorer is a possible want, not a stated one (`01f` §3: low confidence beyond one headline figure). I treat public use as a gate, not a requirement.

**Three things make the three staff questions harder than they look.**
1. *Names.* No macrons occur in any species column (`04a` §1, point 4), and 24 strings are common or Māori names used alone. The source holds Latin names, so "mānuka" works only if someone fills in a common-name column on the species register (about 95 rows, roughly 0.5 day with the nursery manager reviewing; needed by every option). "Kanuka" alone has no stored group (`04a`, Kunzea section), and *kanuka* is one typo from *manuka*.
2. *Sites.* Whitechapel appears under at least 12 spellings ("White chapel", "WCR", "Whitechapel (15)"; `04d_sites_variants.csv`), all mapping to Whitechapel Reserve (15). The site register needs an alias column too.
3. *Headline numbers.* Autumn 2024 includes the 7,000-plant Coronation column, and Spring 2024 the 22,000-plant Slope Hill HGF column (`02` §2.1, `04d` §7.1); whether they count is open (decision 4). By my arithmetic from `01f` §4 and §5, Autumn 2024 is 13,657 plants, of which 7,000 are Coronation (medium). A browser giving one confident number for Autumn 2024 misleads unless it shows that. Only 70.8% of records (56.9% of plants) are high confidence.

**So every view needs two things beyond the grid:** a visible "of which medium/low confidence" split, and a way to say "this is a recorded total, not WRT's agreed answer" until decisions 3 and 4 are settled.

**One home for the data.** History lives once, as the `Planting` tab beside the frozen `MASTER` matrix (`01f` §2, §7). From Spring 2026, rows come from the allocation's planted quantity, so the table keeps growing by about two seasons' worth of rows a year (roughly 500 to 800; confidence: medium). Any browser reads that table and never holds a second editable copy.

## 2. The views needed, and the cheapest way to produce each

| View | Cheapest form |
|---|---|
| By site, by year, by species, total | A pivot or `QUERY` over `Planting` with looked-up year, class, flag |
| Site history (species by season for one site) | One site dropdown, one `QUERY` |
| Class totals (Keystone, Community, School) | Pivot on class looked up from the Site tab (class is not a Planting column; `01f` §2) |
| TTC over-5 m extract | Pivot filtered on the species-register flag (`01f` §4 reproduces 2020 to 2022 and 2024 exactly) |
| Q1 "What did we plant at Whitechapel in 2019?" | Site dropdown plus year dropdown; rows are species, with Autumn and Spring columns and a total |
| Q2 "How many mānuka have we planted?" | Search box matched against a species search key; shows total, by-year strip, confidence split |
| Q3 "What was planted in Autumn 2024?" | Season dropdown; species by total, with a site breakdown and the Coronation note |

All seven need only filter, group and sum: no joins across large tables, writes or accounts.

## 3. Comparison

Build effort is incremental to the shared prerequisite (clean CSV, species and site registers with aliases; counted once in §4).

| | 1. Google Sheet + pivots | 2. Looker Studio over the Sheet | 3. Static generated page | 4. Next.js read-only browser | 5. Database + query interface |
|---|---|---|---|---|---|
| **Build effort** | 2 to 3 days | +3 to 4 days on top of option 1's table (about 4 to 5 in total) | 4 to 5 days | 6 to 9 days (about 2 to 4 more than option 3 for the same output) | Datasette over SQLite: 2 to 3 days to load and configure, plus 1 to 2 for hosting; custom Postgres plus UI: 8 days or more |
| **Maintenance burden on WRT** | Lowest. Staff already live in Sheets. Risk: someone overwrites a formula; use protected ranges | Low to medium. Report owned by one Google account (transfer if they leave). Renaming a Sheet column breaks the data source. Editing needs some Looker skill | Low if the build is one script with no dependencies; medium if it needs a GitHub account and a person who can run a rebuild. No server to patch | Medium to high. Dependencies, Node versions and framework security releases need a developer a few times a year | High. Server or managed Postgres, backups, upgrades, access control |
| **Who updates data, and how** | Anyone with edit rights pastes new season rows into `Planting`, or the allocation process appends them. Views update instantly | Same as option 1; the report refreshes by itself (cached up to about 15 minutes; confidence: medium) | Edit the Sheet, then regenerate. Either someone runs the build, or a scheduled job (GitHub Action) rebuilds nightly from a published CSV. Twice-yearly updates make "run it by hand" tolerable | Same as option 3, with a CI build instead of a script | A scripted CSV-to-database load, or SQL. Not a staff task |
| **Search: macronless names and typos** | Good for names, weak for typos. A `search_key` column holds lower-case, macron-free text plus aliases ("manuka kahikatoa leptospermum scoparium"); a query cell does a contains-match. Sheets has no fuzzy matching. Dropdowns with type-ahead avoid typos altogether. A failed search is fixed by adding an alias, not code | Dropdown with search box and "contains" filter on the same key field; no fuzzy matching. Same alias fix | Best. Fold macrons on both sides and use a client-side search library (for example MiniSearch or Fuse.js) that tolerates typos; 5,450 rows is instant | As option 3 | Good. SQLite full-text search can strip diacritics; typo tolerance needs an extension |
| **Sharing and public use** | Internal: share the Sheet. Public: "publish to web" a single chart or a read-only tab. Publishing a tab exposes every column on it. Not a browser | Strongest no-developer public option: share by link or embed in the website with filters; viewers need no Sheet access. Check what it exposes first | A public page by design: everything in the file is public. Embeddable. Private use needs host-level password protection | As option 3, plus clean per-site and per-species URLs. Hosting caveat: Vercel's free plan is for non-commercial use, so a charity should read the terms or use Cloudflare Pages, Netlify or GitHub Pages | Public means exposing a query endpoint (canned queries only). Easiest option to over-publish from |
| **Cannot do** | A pleasant public browser; per-site pages; fuzzy search; stopping formula edits without protection | Fuzzy search; printable per-site reports; fine layout control; easy per-site URLs; anything past what the connector exposes | Edits; roles; live data without a rebuild; joins to other datasets at scale | Same as option 3 unless a server is added, which changes the maintenance row | Nothing a browser view needs; the cost is who runs it |
| **When it is the wrong choice** | The audience is funders, schools or the public without Google accounts | A filter already answers staff; it becomes a second thing to maintain; pages must be printed | Data must be edited in the tool; many tables must be joined; rulings are unresolved and the page would publish unverified numbers | No named person will own a repo after Tech Lab; chosen because the stack is familiar | History is one flat table (it is); no one can run a server |

## 4. Honest reading of the table

**Shared prerequisite, which no option avoids (about 1.5 to 2.5 days).** Load S7's CSV into `Planting`; build a species register with `common_names` and a macron-free `search_key` (0.5 day, nursery manager checks); build a site register with aliases, class and landowner (0.5 day); add a `Reconciliation` tab showing the four stated totals against `SUM(quantity)` (`01f` §5; 0.25 day); and add the confidence split. Staff-question quality depends on this, not on the tool. 

**Option 1 is the working layer.** It produces all seven views and the three questions with no new tool, and staff can pivot freely for questions nobody has asked yet. Options 3 and 4 lose that, because their views are only the ones someone built. Its weaknesses are presentation and public use, neither a current requirement.

**Option 2 is the cheapest public presentation in WRT's hands.** I rank it above option 3 for a no-developer handover: WRT edits a report by clicking, whereas a static page needs someone who can run a build. Costs: ownership risk, less control over layout and search, and one more thing that breaks when the Sheet changes. Choose it only for a real public or funder-facing view.

**Option 3 is the best browser, and the right step up when the need is real.** Best search (typos and macron variants handled properly), plain-sentence answers to the three questions ("Whitechapel, 2019: N species, N plants, of which N medium confidence"), a printable site history and a TTC CSV download. Free, serverless, dependency-light. Its price is a rebuild step and the temptation to publish before the rulings are done.

**Option 4 buys little over option 3 today.** With a static export it is option 3 with a larger toolchain. It earns its place only when something needs a server or shared components: login, write-back, server-side GIS joins, or reuse from a Level C nursery system. Stack and hosting are also being agreed with the council by 12 October (`staff_context.md`), so the preference may be overridden anyway. Not chosen on that basis.

**Option 5 answers a question this dataset does not ask.** One flat table has no joins to run. A database becomes right when history stops being one table: stocktakes, potting sessions, seed lots and allocations (`02` §3 to §6) need joining to planting; or Level C software needs a database anyway, and history becomes another table in it. The CSV schema is already database-ready, so options 1 to 3 lose nothing.

## 5. Recommendation for the first six weeks

**Build option 1, and stop there unless a trigger fires.** Plan, in order:

| Weeks | Work | Days |
|---|---|---|
| 1 | Species and site registers with aliases and search keys; `Planting` loaded; the 40 rulings from `02` §2.2 drafted for WRT (flagged rows stay marked, not guessed) | 2 |
| 2 | Pivots (site, year, species, total, class); site-history view; TTC over-5 m pivot; `Reconciliation` tab; confidence split; protected ranges | 1 to 1.5 |
| 3 | The three staff questions as dropdown or search-driven views on one `Ask` tab, tested with the nursery manager and operations manager on real questions (Whitechapel 2019, mānuka, Autumn 2024), plus a deliberately misspelt and macron-free test | 1 |
| 4 | Handover note: how to add a season, add an alias when a search fails, what each tab is, who owns the file | 0.5 |
| 5 to 6 | Buffer for rulings, fixes from real use, and the S7 re-import if species or site mappings change | 1 to 2 |

Total about 5.5 to 7 person-days including the prerequisite. It uses a tool WRT already runs and replaces about 1,900 typed summary cells (`01f` §1) with views that cannot drift from the table.

**Do not publish a total or a public view until decisions 3 and 4 are made** (whether "planted" means allocated; which of the four totals WRT trusts). Keep the `Reconciliation` tab visible rather than choosing a number for WRT.

**Triggers for moving up:**

| Move | Trigger (any one) |
|---|---|
| Sheet to Looker Studio (option 2) | A funder, school or the website needs charts with filters, WRT has someone who will own the report, and the rulings are closed |
| Sheet to static page (option 3) | WRT wants a public explorer on its website, or two or more requests per year come from people who cannot or will not use a Google login, **and** decisions 3 and 4 are closed **and** someone at WRT (or its website provider) will own a build. If only the first two hold, use option 2 |
| Static page to Next.js (option 4) | The page needs login, write-back or server-side data (for example the GIS join below) and a named person will maintain a repo |
| Anything to a database (option 5) | A second dataset must be joined to planting at event level (planting dates, areas or volunteer counts, once those are captured); or the table passes about 50,000 rows; or Level C software is chosen for current operations; or GIS needs spatial queries |
| Retreat check | If staff have not opened the view in a season, stop adding to it; the problem was not the tool |

## 6. How the GIS project would attach later

The mapping project owns polygons and planting areas; this history holds only a site name and ID, never geometry (`03`, Sites and GIS row). The join key is `site_id`, with the Site register as the single bridge. The GIS project should carry the same `site_id` (as text, since IDs such as `9G` and `13C` are not numbers) on each polygon; the history then yields plants per site and season by lookup on that key, and a map layer or Looker Studio geo field needs no change to the history table. Three cautions. The 2015 to 2023 sites have no coordinates anywhere and cannot be backfilled from data (`01f` §4), so a missing polygon must be treated as normal, not an error. Sub-site IDs (for example 22A to 22C) may map to one polygon or the reverse, so the Site register needs a `parent_site_id` column before the join. And 2026's area codes (such as WH-06) join only once GIS issues them. If the mapping project is funded in November, ask it to adopt the register's IDs rather than mint its own; that one decision keeps the join cheap.

## 7. Open points for WRT

1. Does WRT want a public explorer, or only the website headline number?
2. Who maintains the WRT website, and could they host or embed a page or report?
3. Who owns the species register and its common-name column?
4. Decisions 3 and 4 in `00_evidence_summary.md` gate any published number.
