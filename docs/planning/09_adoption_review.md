# 09: Sceptic and adoption review (S9, Phase 2)

Role: I speak for a small volunteer-led WRT. I opened no live Sheet. Hour figures are **my estimates, confidence low**; entry times for new logs come from `01c` line 154 (medium).

## 1. Verdict

1. A sound design for a team with a maintainer. WRT has none named; the plan's own gate says so (`04e` §3 Stage 4).
2. All of `05` is `[UNTESTED]`: `IMPORTRANGE`, header `ARRAYFORMULA`s, protected ranges and `QUERY` printing (`05` §5, §9).
3. WRT asked for five questions answered and existing products tested first. The plan answers a larger question.
4. On my numbers the build saves about as much time as it costs to keep up. The case is **accuracy**, not **hours**.

## 2. The questions, answered with evidence

### 2.1 Another system to maintain? Yes.

Today: ten live records. After `05`: three workbooks, and `WRT Core` alone holds more than twenty tabs (`05` §2 to §4). The ten old records stay "frozen, relabelled, kept" (`04e` §3), so it is ten plus three, not ten replaced. 

### 2.2 Could it be one spreadsheet? Nearly.

Only the seed-source restriction justifies a split (`05` §1), so **two** workbooks (core, seed). `WRT History` could be a read-only tab. `05` already merged four workbooks to three because mirrors were its biggest untested cluster; the same logic gives two.

### 2.3 Are staff asked to type more than today?

| Action | Today | After (`05`) | Evidence | Verdict |
|---|---|---|---|---|
| Potting session | One date header, then a number in a species row. About 40 session columns and 149 species cells in 2025-26; Summary already formula-driven (1,078 formulas, 0 months differing of 11, 7,710 = 7,710) | One row per species: date, species, number, optional group and note. About 20 s per line (`01c` 154) | `potting_count_output.txt` | **More, slightly.** Roughly 149 lines, about 50 min a year against about 25 min today. Gains only cleaner dates |
| Pricking out | Tally sheets hold goals only (inferred) | One row per species per session | `04b` §4.1 | **New entry.** Guess 150 to 200 rows, 2 to 3 h a year |
| Stocktake | Number typed in a dated Master column (about 100 species) | One Stock Log row per species per state (COUNT, date, species, state, number, source, flag): 3 to 5 states times about 100 species, so **300 to 500 rows** per count | `05` §2.2, `stocktake_count_output.txt` | **More, clearly.** Today about 100 cells; after up to 5 times that, 2 to 4 counts a year. They paste, but paste still needs a prepared form (`Enter count`) |
| Allocation | Species by about 30 site columns; 222 to 312 non-zero cells a season | One row per species per site per season: season, site, species, source, status, required, allocated, planted_qty. Same non-zero count as rows but 3 extra dropdowns each | `allocation_count_output.txt` | **More per cell.** Offset by "planted_qty" replacing a retyped allocation (98/98 today) |
| Site needs | Forecast workbook is nearly empty, ten typed cells (`04c` §1) | A full table, species by site by season, three years ahead | `03`, `05` §2.2 | **Entirely new.** The largest new workload. Nobody has typed it today |
| Targets | Typed number on the pricking list (about 100 rows) | Same, plus reason, spares, uplift override, source note | `05` §2.2 | Same plus a column or two |
| Rollover | New workbook each July (13 tabs, retyped species) | 90-minute runbook with 11 steps (`05` §8) | `05` §8 | Fewer minutes on paper; I would plan 3 h the first two times |

The plan says staff enter "the same numbers" in a different shape. That is true only for potting. Everywhere else it is more cells, or entirely new cells (Site Needs, Pricking Log, losses).

### 2.4 IDs people must understand? Hidden, but they surface.

`05` §6 hides IDs behind names, yet `UNMATCHED` in `sp_id`, the `Unmapped` tab, `NEW-` provisional site IDs (`07` §2) and `Checks` messages all reach staff. Renaming a species is "a two-step edit" (`05` §6.3); miss step two and old rows silently stop resolving.

### 2.5 Repairing history nobody needs?

`04c` §1 and `06` §2 record "no staff request" for a browser. The three example questions (Whitechapel 2019; mānuka; Autumn 2024) were posed by the analysis, not staff. What is on record is funder audits "by site, by species" (`01f`: twice a year plus audit requests), which `01f` line 66 says a Sheets pivot handles. The repair costs 5,449 rows, about 23 rulings, 29,000 plants (21%) in doubt and 12.2% of rows needing review (`07` §1). Edge cases (V150-includes-T28, the tag-era rule for 792 seed lots, 7 contested-species rulings) are real but not weekly.

### 2.6 Dependence on Tech Lab after handover

Nine pieces need a developer or a confident Sheets power-user: header `ARRAYFORMULA` columns (`05` §9: "a broken header formula needs the owner"); `QUERY`/`MAXIFS` views keyed on column letters, which shift if a column is inserted (`05` §4); `IMPORTRANGE` mirrors (`04b` §3); alias `REGEXREPLACE` keys (`05` §2.1); the build job's scheduler, service account and Monday email (`06` §4A); the static host and rebuild ("a named WRT person will own the host" is a gate, `06` §7); the import scripts (`06` line 106); the shortfall model (maintenance "High", `06` §2); and the council-decided stack, unconfirmed until 12 October. Only the masters and the Potting Log need none.

### 2.7 Could a volunteer understand it in two years?

Volunteers touch paper only, so yes. A new coordinator needs the runbook: a hidden `plants = trays x tray size`, a `production_year` formula keyed on Settings, and a `Control` cell. Forget `Control` at rollover (`05` §8 step 6) and every "this year" view shows last year, with no flag.

## 3. Hours: does it save Anna and Sarah time?

Assumptions: retyping about 20 s a cell including checking; all guesses.

**Saved, hours a year:** retyped figures (270 x 20 s, `04d`) 1.5; reconciling disagreeing totals (6 to 10 events x 0.5 to 1 h) 3 to 10; history copy into MASTER 2; TTC and audit extracts (4 x 1 to 2 h, saving about 60%, `01f`) 2.5 to 5; "seven places" species adds 1; January list 1.5. **Total about 12 to 21 h.**

**Added, hours a year:** monthly `Checks` 4; rollover 3; Pricking Log 2 to 3; bigger stock counts 3 to 5; Site Needs upkeep (new, 3 revisions x 2 to 4 h) 6 to 12; master and alias edits 4; Monday digest 7; broken formulas or IMPORTRANGE re-grant with no developer 2 to 4. **Total about 31 to 42 h.**

**Net: roughly zero to negative 20 hours a year**, before the one-off learning cost. The value is **fewer silently wrong numbers**, such as the 4,283-plant gap the old allocation hid (`05` §4), three competing totals (140,049 / 139,948 / 135,413) and `#REF!` sheets. That is a real case, but not a time-saving one.

## 4. What the plan may have missed

- **Everything is `[UNTESTED]`.** `05` says "test first on a copy"; `04e` and `07` do not schedule that before the build.
- **Seven of ten live records are probably `.xlsx`** (`04b` §3). Converting to native Sheets can alter formulas and date parsing, which is how swapped day/month headers (`04f`) get worse.
- **Seed workbook:** the plan says "nothing flows out" yet asks for mirrors flowing in via IMPORTRANGE. Who may share that file has not been decided.
- **Sarah asked for an existing-product test first** (Terraware, Spriggo, SeedSource). `04d` line 54 offers a one-hour timed test, but the plan schedules it for Stage 4. If a product covers batch, stock and targets, much of Targets, Stock Log and Scenario is wasted.
- **Council stack:** a service account and host may not be allowed (`06` §7).
- **The follow-up meeting is a week away.** WRT may want only the five answers; a 25-tab workbook cannot be shown or tested by then.
- **Archive newer than master** (`00`): importing a snapshot of the wrong copy gives a clean, wrong history. A person must answer decision 1.
- **`needs_review` quoted as fact.** The generated 140,068 (`05` §4) becomes a fourth total beside the three that disagree. `06` §3 says never show one confident total, yet `Season grid` and `TTC over 5 m` (`05` §4) show bare numbers.
- **Rehearsal only:** five of eleven real events fall outside the window (`04e` §4). WRT meets January, March and July alone.

## 5. Top 10 risks, ranked

| # | Risk | Likelihood | Impact | Early warning sign | Cheapest mitigation |
|---|---|---|---|---|---|
| 1 | **Design is untested; formulas fail on real files** (xlsx, IMPORTRANGE, protection, `ARRAYFORMULA` with sort) | High | High: weeks lost; 25 tabs of dead formulas | First import of a real file returns `#REF!` or stale cells | Before building anything, 2 hours: copy one live file, convert, run 5 formulas, one IMPORTRANGE, one protected-range sort. Publish pass or fail |
| 2 | **No named maintainer; hands-off after week 6** | High | High: system decays in one season | Nobody is named at handover; runbook unread | Name an owner and deputy **now** (decision 2). No owner, no build beyond masters |
| 3 | **Extra entry load breaks adoption** (Site Needs, Pricking Log, Stock Log rows, losses) | High | Medium to high | Logs empty by November; Wednesday tally still on paper | Ship only the Potting Log (already forced into one shape) and the species list; defer the rest to demand |
| 4 | **Wrong live copy used** (archive newer than master; xlsx versus converted) | Medium | High: clean-looking wrong history | Imported season totals do not match the file the manager opens | Manager signs off one live URL per record in writing before any import |
| 5 | **Funder quotes a `needs_review` figure as fact** | Medium | High: reputational, audit | Anyone pastes a history total into a report | Every view shows a "recorded / needs review" split next to the total; no stand-alone grand total |
| 6 | **Tech Lab's time is spent on the wrong thing** (history repair, build job) while the five questions and product test wait | Medium to high | Medium | At week 3 no product test and no answers delivered | Fix order: answers, product test, then build. Checkpoint at end of week 2 rather than week 3 |
| 7 | **Silent drift after launch** (Control not updated; alias step missed; formula overwritten) | High | Medium: wrong "this year" views | `Checks` red cells ignored for a month | One cell, "last checked", on the front tab; accept that the monthly check is the whole control |
| 8 | **Seed workbook permission design unsettled**; mirror breaks the restriction or the restriction breaks the mirror | Medium | High: sensitive data (`04g`) | Anyone asks to share Seed with the Core owner | Seed stays untouched, no mirrors at all (shrink; see §6) |
| 9 | **Council stack or MOU blocks the build job or host** | Medium | Medium | 12 Oct stack confirmation excludes service accounts or a static host | Prefer "scripts plus CSV snapshot, run by hand" (`06` §7). Nothing that needs a host |
| 10 | **Time-saving oversold**; staff discover net hours are not saved, goodwill lost | Medium | Medium | Anna or Sarah asks "what does this save me?" and nobody has a number | Use §3 openly; sell correctness, not hours; ask for a 2-season trial |

## 6. What I would cut, shrink or defer

| Proposal | Decision | Why |
|---|---|---|
| Three-workbook system | **Shrink to two** (Core, Seed untouched); History becomes a tab | Two workbooks is the minimum the restriction needs (§2.2). Fewer mirrors |
| Six append-only logs | **Cut to two now**: Potting Log, Species/alias list. Defer Pricking, Stock, Supply, Allocation long table | Potting is the one that already works (Summary formula-linked, 0 differences); Stock and Allocation are where counting changes and typing grows (§2.3) |
| Species and site masters with hidden IDs | **Keep a species list; shrink to names plus a status and the `>5m` flag.** Defer hidden IDs unless a join demands one | One list, one owner solves "seven places" and 49/50/39. IDs only matter once logs exist to join |
| Alias tabs, `match_key` regex | **Defer**; run the alias map as a one-off script | A volunteer cannot maintain it |
| Normalised planting history | **Shrink**: deliver the 5,449-row CSV, the reconciliation page and the three-question answers as a report; do not build views | No staff request on record; cost is 21 decision-days of WRT time |
| Build job (A) | **Defer**; keep the scripts documented and runnable by hand | A scheduler needs a host and a service account; council stack unknown |
| History browser (B) | **Cut** unless the `Ask` tab fails a real test (`04c`) | Mild gain over a pivot |
| Shortfall explorer (C) | **Defer** to after the existing-product test and a season of loss notes | Data weakest here (no loss field, blank weekly actuals); `06` itself rates maintenance "High" |
| Scenario and Rates tabs | **Cut** from v1 | `05` itself says "leave blank until calibrated" |
| Pick list, print forms | **Keep; test first** (PDF printing of a `QUERY` range is `[UNTESTED]`) | Paper is the real interface |
| TTC export | **Defer** until TTC gives its fields | `04g` Q1 unknown |

## 7. If WRT can give only four hours in six weeks

| Hour | Who | Purpose |
|---|---|---|
| 0.75 | Sarah, Anna | Name each live URL, say which are `.xlsx`, name a species owner and deputy |
| 0.75 | Anna (propagation lead if possible) | Seven contested species rulings; pick the trusted total or accept "as reported" |
| 0.5 | Sarah | Watch the timed Whitechapel 2029 story in one existing product |
| 0.5 | Anna | Try the Potting Log on a copy at one Wednesday session |
| 0.5 | Sarah, Anna | Read the three history answers; say whether they would use them |
| 1.0 | All three | Follow-up meeting: five answers and a go or no-go per proposal |

Tech Lab delivers the answers; the product test; a two-hour Sheets feasibility test (risk 1); a converted potting workbook with a Potting Log and print sheet; the species list as CSV and one tab; the history CSV, reconciliation and three answers as a read-only report; a short runbook; and a decision memo with the conditions for building the job, browser or explorer. No new volunteer routines; January, March and July untouched.

*Confidence: high on structure and citations; medium on entry load; low on hours.*
