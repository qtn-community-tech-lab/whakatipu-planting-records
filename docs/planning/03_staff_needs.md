# 03 — Staff jobs-to-be-done (S3)

**Question this note answers:** what are WRT staff and volunteers actually trying to get done, where do they already cope well, and which statements are current need versus wish versus history versus future idea?

## Read this first: what is and is not first-hand

- **The two scoping documents ("Project 1 — nursery information / production planning" and "Project 2 — restoration mapping framework") and the first-meeting notes were NOT available to this run.** Everything taken from them comes through `staff_context.md` §3, a second-hand summary. It is marked **(2H)** below, confidence medium at best. Nothing here should be quoted back to Sarah as "what your document says".
- **First-hand sources used:** Sarah's email (verbatim in `staff_context.md` §2); WRT's own `_Summary of Records JM Nursery.docx` (cited as *Summary of Records*, item numbers as in the document); `Questions for [name], SR and Anna to work through.docx` (two bullets only: look at the 2026 seed-sowing document together; a "nursery procedures manual"); the six propagation reports in `Annual propagation reports/` (2021 to 2025, narrative, written by the propagation lead); and the Phase 1 evidence (scout `open_questions_for_wrt`, `04*` "Questions for WRT").
- **Behaviour inferred from spreadsheets** (for example "nobody fills in the weekly tally") is evidence of what the files contain, not proof of what people do. Where it matters it is flagged **(inferred)**.
- Roles are used, not personal names. The role labels "potting coordinator" and "person who assembles TTC / Paper4Trees / orders" are **my labels**: the sources name an activity, not a job title. See confirmation item 5.
- Levels: **A** fix the current Sheets; **B** clean canonical data plus a hybrid; **C** small purpose-built software.

---

## Jobs-to-be-done by role

### Nursery manager (Anna) needs to know / do:
- Know, at any time, how many plants of each species are **ready to plant** (PB3 large and ready T28) versus still growing, and how many more are due.
- Share out ready plants between sites each spring and autumn without promising more than the nursery holds.
- Keep one account of what has gone out, to which site, in which season.
- Run the nursery week to week with volunteers, with enough stability that her working files stay recognisable year to year.

Evidence:
- *Summary of Records* items 8 to 10: stocktake "confirms actual numbers of plants ready to go out in the next planting season"; allocation is "one form each for spring and autumn annually"; the MASTER is "a running tally of total number planted by the trust".
- `04e` §4 and §7: "available" on the allocation sheet includes bought-in, school and council stock, so a site can look fully supplied only because planned purchases are counted as stock (54 species allocated above own ready stock in Spring 2026; high confidence).
- Scout B19/B20: four to six competing totals on one allocation sheet; `04e` Q1: each stocktake overwrites the last, no running tally.
- Stocktake file names and stamps carry initials and "updated" notes, which suggests the nursery manager keeps these by hand (inferred; confidence medium).
- Second-hand (2H): "ready is a flag, not a container"; the nursery coordinator enters each volunteer session's totals afterwards.

Current workaround: retype the stocktake into the allocation workbook (typed arithmetic such as `=48+18-15`); judge by eye which total is right; keep notes in cells ("84 gone"). The 2026 stocktake master (Stage 2/3/4) is a good working layout and the staff already use it.

Potential improvement:
- **Level A:** one "ready to plant" column with a stated rule (PB3 ready + T28 ready, never V150 + T28), and a separate, clearly labelled "planned purchases" column so they do not inflate "available".
- **Level B:** stocktake kept as dated count events (append, do not overwrite) so a running position exists.
- **Level C:** not justified for this job alone.

### Operations manager (Sarah): forecasting, TTC/funder reporting, site planning, the GIS project — needs to know / do:
1. **Forecasting.** Turn site-by-site species needs several years ahead into this season's production target, then see likely shortfalls and surpluses against plants moving through the pathway.
2. **Funder reporting.** Produce Trees That Count (TTC) numbers (trees over 5 m, planted by season) and answer funders' audit questions without rebuilding figures by hand.
3. **Site planning.** Know what each site needs and when, including community and schools.
4. **GIS project.** Keep site polygons and planting areas in one mapping framework that the nursery system only points to.

Evidence:
- Sarah's email: "how hard our process is to explain!"; scoping documents "not intended to prescribe what the solution should be"; funding for the mapping project known in November.
- (2H) Working hypothesis: the real gap is narrow, "site-by-site species requirements several years ahead into this season's production targets, then comparing those targets with plants moving through the production pathways". Batches, stock and stocktakes may already be covered by other products. Section 15 is a Whitechapel 2029 end-to-end test. Confidence: medium.
- *Summary of Records* item 1 calls the forecast "Forecasting Sheet 3 years ahead (New**)", which shows it is a recent intention.
- `04c` §1: the forecast workbook feeds nothing downstream, its roll-up is nearly empty (ten typed cells), site look-aheads stop at Spring 2026 (high). The production target is "in practice a typed number per species on the pricking-out list" (about 10,700 to 11,100 plants a year).
- `04g` §2.2: TTC sheets are typed extracts; the over-5 m flag has three different counts (49, 50, 39); the 2025 over-5 m total has no formula; three grand totals disagree (140,049 / 139,948 / 135,413). `04g` Q1: what TTC actually requires is unknown.

Current workaround: the forecast is re-thought and the pricking-out target is typed in by judgement each year; TTC figures are copied from the Plants Out Master into extract sheets by hand; the over-5 m total is rebuilt by hand each time (2017 and 2018 are long hand-built sums).

Potential improvement:
- **Forecast to target (the (2H) gap):** **Level A** first. Make the forecast sheet the single typed home of "need by species by site by season", with a tested roll-up, and have the pricking-out list read from it. A **Level B** step (a species ID underneath and a season key) is needed before shortfall/surplus can be computed reliably. **Level C** only if the existing-tool test (Terraware, Spriggo, SeedSource) fails on exactly this narrow job.
- **TTC reporting:** **Level A** (one over-5 m flag on the species list; formulas not pastes) and **Level B** (a season-by-species-by-site summary generated from the planting record). Do not design the export until TTC's real fields are known (confirmation item 4).
- **Site planning and GIS:** **Level A/B only** now. The GIS owns polygons (2H); the nursery side should hold a site name and ID and nothing more. Anything beyond that is Future (see table).

### Propagation lead: seed collecting, sowing, the pricking-out list by January — needs to know / do:
- Receive the **pricking-out list in January each year** because it "guides what seed she needs, how much gets sown etc." (*Summary of Records* item 5).
- Know which species and how much seed to collect, in the right season, and what is already in store (including frozen seed).
- Record seed lots and cuttings with a tag, treatment, sowing date and pricking-out date (items 2 to 4), so results can be learned from (item 5, "historical record based on species").
- Prick out thousands of seedlings between late August and the Christmas break, confirm numbers pricked out (item 6, "accounts for any deaths"), and keep trays free of weeds and damping-off.

Evidence:
- Reports: "over 8000 seedlings" pricked out between late August and Christmas 2024; 915 in one day in December 2024, with the lead "flat out writing labels"; seed supply, insect damage and poor beech seed are discussed as judgement calls; spare seed frozen and sown later "with very good germination"; an order to a commercial nursery proposed to cover an expected shortfall (January 2022); T28 trays trialled because they save volunteer effort.
- *Questions for [name], SR and Anna* bullet 1: the seed-sowing list is "an annual list which you start again every year" (so a fresh list each year is deliberate, not neglect).
- Scout B06 / `04b` §4.1 hop 1: all three weekly pricking-out tally sheets hold goals only (**inferred**: the real weekly numbers are on paper or elsewhere; confidence medium).
- Scout B08/B10/`04f`: tags restart at S1 in 2022; formats vary (`S2101xx`, `S220705`); red font used with unwritten meaning.
- `04c` Q7: the forecast header and sowing-list year disagree, so the sowing-year to planting-year link is not stated on the sheets.

Current workaround: hand-written labels and tags at the bench; typed seed and cutting logs; seed-collecting dates kept as a seasonal guide ("Collection Date", 90 species, month ranges); knowledge of which species fail (for example Olearia lineata "elusive").

Potential improvement:
- **Level A:** a printable pricking-out sheet (2H wishes this) that carries the tray counts and the species goal from the list; a stated tag rule (year + running number) kept from now on, with no editing of old tags.
- **Level B:** none needed for the propagation lead's day-to-day work; a clean species ID is what lets the seed and cutting results join to the pricking-out list.
- **Level C:** no. Seed-source locations need restricted access (2H, both documents) and the Phase 1 sensitivity register agrees, so that column should stay out of any shared page.

### Potting coordinator: potting on — needs to know / do:
- Know how many seedlings of each species to pot up from V150 into PB3 during the August to July year, and how many are already done.
- Run weekly volunteer potting sessions and tell the nursery manager the totals.

Evidence:
- *Summary of Records* item 7: "New form created to start each July. The pricking out list from the year before and latest propagation stocktake create this form. [name] uses these numbers to dictate how many seedlings are potted up ready for the following season." (The role label is mine; the document names the activity.)
- `04b` §4.1 hops 6 to 9: Goal Set is typed from the March V150 count in 2026/27 (45 of 47 equal), earlier years used a VLOOKUP from "[name] Master"; monthly sheet totals roll up by formula; August 2026 is typed over the formula (97 of 98 cells).
- Scouts B13 to B15: month and day swapped in several session headers; free-text session labels (groups, schools, corporate days) carry no key; `Less T28` is typed.

Current workaround: a new workbook each July with a month sheet per month; the Summary adds up the sessions; headers and goals are corrected by hand.

Potential improvement: **Level A.** Keep the July workbook, but have the Goal Set cell point at one named stocktake figure, fix header dates, and write down what "Less T28" means. **Level B** only to give each session a real date and a group-type value; **Level C** no.

### Wednesday volunteers (paper forms) need to know / do:
- Know what to do this morning (which species, how many trays or pots) and write down what they did, quickly, with glasses on and dirty hands.
- Not have to learn or log into software.

Evidence:
- (2H) Volunteers may not use software; they may keep paper sheets; the nursery coordinator enters each session's totals afterwards; a printable pricking-out sheet would help; weekly logs are pricking out (germ to V150/T28) and potting up (V150 to PB3). Confidence: medium.
- Reports: "The greatest asset the Propagation side … has is the volunteers who come each week"; "The propagation job doesn't suit many people; it is fiddly work"; the report writer is writing labels herself during busy days.
- `04b` §4.1: the Stage 4 stocktake count form for volunteers has names linked but counts and location typed.
- Tally sheets exist with printable layout but are blank in the folder (**inferred**: completed paper is kept somewhere not shared; see confirmation item 2).

Current workaround: paper sheets, then a coordinator keys in totals; session labels in free text.

Potential improvement: **Level A only.** Keep paper; make the sheet the thing the software prints (species in the same order as the pricking-out list, tray size shown, one line per species, a total box). Nothing volunteer-facing at Level B or C unless WRT chooses it later.

### The person who assembles TTC, Paper4Trees and order paperwork needs to know / do:
- Produce TTC counts (trees over 5 m by season) and any audit extract on request.
- Fill and send Paper4Trees order forms for schools and early-learning centres, keep the school split, and later count those plants.
- Place and reconcile bought-in plant orders when WRT's own stock will not cover a planting.

Evidence:
- `04g` §2.1 to §2.6 (high): TTC sheets hand-copied inside the Plants Out Master; Paper4Trees 2025 and 2026 forms are blank templates, orders are PDFs; totals do not agree (PDFs 161 and 131 against 133 and 120 in the allocation masters); the school split sits only in cell comments; contact details of school staff are held in the order files.
- `04e` Q8 and `04g` Q6: it is not recorded whether Paper4Trees, council-supplied and bought-in plants count as WRT plants out.
- Scout B24: whether the Spring 2024 order reconciles with its invoice is unclear; the nursery procedures manual is mentioned but not located.
- Reports (Jan 2022): an order to a commercial nursery was arranged "to cover expected shortfall" for Olearia and Corokia, which shows buy-in is a normal judgement call.
- The sources do not name one person for this work (it may be the operations manager, the nursery manager, or both).

Current workaround: copy totals between workbooks; keep quantities and school splits in comments and PDFs; add typed arithmetic (`=5+7`).

Potential improvement:
- **Level A:** one place per season for each order (scheme, supplier, species, quantity, source: nursery-grown / bought-in / council / Paper4Trees) and a rule on whether it counts as WRT plants out.
- **Level B:** a funder-ready summary generated from the planting record, so TTC extracts stop being retyped.
- **Level C:** no, and nothing at all for school contact details (see sensitivity).

---

## Where staff appear comfortable with paper, spreadsheets or manual judgement — do not replace merely because software can

| Area | Evidence | Why leave it (or only support it) |
|---|---|---|
| **Paper at the bench** (tags, labels, tally sheets, count forms) | Reports (labels written by hand on busy pricking-out days); (2H) volunteers keep paper and a coordinator enters totals; blank tally sheets in the folder | Fiddly work, dirty hands, mixed volunteer comfort. Software should print the paper, not replace it. |
| **A fresh list every year** (seed sowing, pricking-out, potting-on) | *Questions for [name]…* ("an annual list which you start again every year"); *Summary of Records* items 5 to 9 ("seasonal"; "new form created to start each July") | The yearly restart is a feature: each year's list reflects that year's judgement. Do not turn it into a rolling table that hides the yearly decision. |
| **Round, typed production targets** | `04c` §1: target is a typed number per species rounded to whole trays (24 per V150, 28 per T28); stable at about 11,000 a year across four years | Predictable and understood. Phase 2 may check it against the forecast but should not replace it with a computed figure without agreement. |
| **Species-level judgement** (what to chase, what to drop, buy-in decisions, frozen seed) | Reports (seed supply, insect damage, "Ole lin remains elusive", order to cover shortfall) | These are expert calls. Software can show information; it should not decide. |
| **Month-by-month potting-on workbook** | Scouts B13 to B15: working layout used for years (2022 to 2026) with formulas that roll up month to Summary to Annual | Mostly works inside one workbook. Fix the Goal Set link and header dates; do not rebuild. |
| **The 2026 stocktake master (Stage 2/3/4)** | `04b` §2, `04e` §2: one clear three-stage layout adopted in 2026 | Good model of the real process; a base for Level A/B, not something to replace. |
| **Hand-assembled funder figures when the funder is small** | `04g` §2.2: typed TTC extracts used since 2017 | Fine until the audit pattern changes. Replace the over-5 m total with a formula; do not build a reporting tool for it yet. |
| **Familiar words** (V150, T28, PB3, Stage 2/3/4, Spring 2026, 2026/27, "pricking out", "potting on") | Whole corpus; (2H) pricking out goes from germination trays to **V150 or T28** | Keep the vocabulary in every interface; put IDs underneath. |
| **Narrative reporting** | The six propagation reports | Valuable context (why a species failed). Keep as prose; do not force into fields. |

Confidence: medium to high. No one has told us directly that these are comfortable. It is inferred from long, stable use and from the (2H) volunteer point.

---

## CURRENT vs DESIRED vs HISTORICAL vs FUTURE IDEAS

(2H) = from the second-hand summary of the scoping documents or meeting. Items without a mark come from first-hand files. A statement appears in one column only.

| Theme | CURRENT (what staff do now) | DESIRED (staff have said they want it) | HISTORICAL (old data, not a requirement) | FUTURE IDEAS (not for this phase unless re-confirmed) |
|---|---|---|---|---|
| **Forecast and targets** | A forecast workbook exists but feeds nothing; the target is a typed number per species rounded to trays (`04c`). Pricking-out list is given to the propagation lead each January. A species needs about two seasons to reach planting (*Summary of Records* item 5). | (2H) Turn multi-year site needs into this season's production targets and show shortfall or surplus against the pathway. (2H) Test existing tools (Terraware, SeedSource, Spriggo, TTC/Tāne tools) first. | Forecast site sheets labelled Autumn 2024 to Spring 2026; Aug 2025 Keystone Summary; the 2023 Flagship plan; the Neill list. | Computed contingency (none exists today); mortality-adjusted targets; schools sheet that no longer exists. |
| **Seed and cuttings** | Typed seed collecting record, seed log, cutting log, sowing list; tags like `S2101xx`; collecting calendar by month. | Keep seed-source locations restricted (2H). Look at the 2026 sowing document with the nursery manager and operations manager (*Questions for [name]…*). | Seed and cutting archives (older results files; tags restarting 2022). | A proper source/provenance register; photo records of seed lots. |
| **Pricking out** | Typed pricking-out list, V150 or T28; weekly tallies exist as blank templates; labels written by hand. | (2H) A printable pricking-out sheet; the coordinator enters totals after each session. | Past weekly tally sheets (2024, 2025). | Live weekly dashboards; per-volunteer or per-group figures. |
| **Potting on** | July workbook, month sheets, Goal Set typed from the March V150 count (2026/27). | Written rule for Goal Set and "Less T28" (implied by `04b` Q7, `04c` Q8). | 2021/22 to 2025/26 potting-on workbooks. | Automatic carry-over of unpotted stock to the next year. |
| **Stock** | Stocktake as dated snapshots, overwritten; Stage 2/3/4 layout (2026); V150 count includes T28 plants. (2H) four stages, counting starts at stage 2; ready is a flag, not a container. | One clear "ready to plant" figure per species (follows from allocation problems). | 24 stocktake events 2018 to 2026; four layouts; north/south nursery split; the 35F tray. | Loss recording by reason; batch-level tracking; barcodes. |
| **Allocation and planting record** | Species × site allocation each spring and autumn; Plants Out Master as running tally; allocation retyped into "planted". | Know what has actually gone out (and whether Paper4Trees, council and bought-in plants count). | 23 season blocks, Autumn 2015 to Autumn 2026; ~411 site columns; three conflicting totals. | **Planting areas such as WH-06**; **planting event types** (establishment, infill, replacement, enrichment); **volunteer counts per event**; event dates. Sarah's examples (WH-06: 1,300 plants Spring 2026, 120 infill Autumn 2028, 45 enrichment Spring 2031) are illustrations (2H); no area, event type or volunteer count exists in the data (`04d`, B23). |
| **Funder reporting** | TTC extract sheets assembled by hand; over-5 m flag in several places; Paper4Trees order PDFs. | (2H) Get TTC's real export fields before designing anything; Sarah offered a portal login. | 2017 to 2020 over-5 m totals; the 2025 audit extracts; threatened-species counts 2015 to 2023. | **Photo points**; coordinates or polygons per planting for TTC; threatened-species reporting extended to 2024 onwards. |
| **Sites and GIS** | Site names and IDs in the Plants Out Master and forecast; field-area measure app used for outlines (2H). | (2H) Import KML/GPX rather than redraw; nursery system refers to GIS sites rather than owning them. | Old site numbering (2015); 14 sites with no ID; swapped IDs in 2024 to 2025. | **Polygons held in this system**; shared vocabulary (species, site, planting area, planting event, seed source, season, sensitivity) across the nursery and the mapping project (2H); mapping-project funding decision in November. |
| **Software and access** | Google Sheets are the live records; a Drive folder is an export; no logins beyond Google/TTC. | (2H) Volunteers may not use software; a bespoke database is **not** assumed; must be runnable by WRT after Tech Lab leaves. | — | A purpose-built app; role-based access beyond the seed-location restriction; automated imports. |
| **Delivery constraints** | About six weeks of engagement; stack confirmation by 12 October; MOU needs the software licence written down (`staff_context.md`). | Scope creep named as the main risk (2H). | — | The mapping project as a funded follow-on. |

---

## Five things to confirm with staff (most important first)

1. **Which Google Sheet is live for each of the ten records, who owns the species list, and does the forecast workbook count as a live record?** (`00` §6 items 1, 2 and 16.) Nothing safe can be changed until this is settled.
2. **Where are the real weekly pricking-out numbers, losses and session totals written now (paper, a scan folder, another sheet), and who enters them?** The sheets in the folder hold only goals, so the actual flow of volunteer paper into totals is unseen. This decides whether the "printable pricking-out sheet" is a new job or already done.
3. **What exactly is the production target, and is "shortfall and surplus" really the missing step?** Does the typed pricking-out number already include the 10 to 15 percent contingency and the tray rounding, is "two seasons later" always true, and would the operations manager and nursery manager use a shortfall view if it existed (that is the (2H) hypothesis, never tested first-hand).
4. **What does TTC actually require, and who assembles TTC, Paper4Trees and order papers?** Real export fields, whether photos or coordinates are needed now, the over-5 m rule and list, and whether Paper4Trees, council-supplied and bought-in plants count as WRT plants out. Include who owns each task.
5. **Which "wants" are for this phase and which are later?** In particular: do staff want planting areas (WH-06), event types, photo points or polygons recorded now, or only after the November mapping decision, and does "Plants Out Master" record plants actually planted or the allocation? This stops a future idea becoming a current requirement.

*Also still open from `00` §6:* who may see seed-source locations (item 6) and the seed-source GPX; keep these out of any shared page until answered.

## What this note does not claim

- No first-hand reading of Project 1, Project 2 or the meeting notes. Anything attributed to them is second-hand and should be checked against the documents themselves.
- The role labels "potting coordinator" and "assembler of TTC/Paper4Trees/orders" are provisional.
- Staff comfort with paper and spreadsheets is inferred from the files, the six propagation reports and the (2H) volunteer point, not from interviews.
