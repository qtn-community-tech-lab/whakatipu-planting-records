# 01d. Stocktakes and loss recording (S1D)

**Question:** how should WRT record physical counts and losses so history survives, "current stock" is the latest count, and losses stop hiding in cells and notes, with the least disruption?

**Sources:** brief, `00_evidence_summary.md`, `staff_context.md`, `04e` (§2 to §7), `04b` §2, `DATA_SHAPE.md`, scouts B16 to B18. No source cells opened. Figures are Phase 1's unless marked "mine".

**Assumptions:** the Google Sheets are live; volunteers keep paper; the Nursery Coordinator keys totals; nothing historical is edited in place. The brief's "ten standard questions" are not itemised in my files, so I used the ten below; swap them if you have the official list.

---

## 1. The ten questions

| # | Question | Answer and evidence |
|---|---|---|
| 1 | What happens today? | V150 (Stage 2) is counted each March (23 Feb 2022; 31 Mar 2023; 27 Mar 2024; 27/31 Mar 2025; 31 Mar 2026). PB3 and T28 are counted about twice a year. The 2026 count is one composite sheet, `_Stocktake Master CURRENT › Autumn 2026 Master Stocktake`: a row per species (104 names); columns Stage 2 V150 (D), Stage 2 T28 (E), Stage 3 PB3 growing (F), Stage 3 T28 (G), Stage 4 PB3 ready (H), Stage 4 T28 (I); `L = H + I` is "Available". Each stage column has its own date typed into its header cell. A printable "Stage 4 Stocktake Sheet" (name, number, location) is the count form. |
| 2 | How often, and how reliably? | Four dates fell inside six weeks in 2026 (31 Mar, 28 Apr, 13 May, "Updated 12/08"); there was no whole-nursery count from 28 May 2025 to Feb 2026. By my count 23 of the 26 rows in `04e` §2.1 carry counts (20 spreadsheets, three PDFs); three do not (blank template, blank form, update stamp). Four layouts in eight years. |
| 3 | What goes wrong? | **(a) Overwrite:** Master F4 and H4 read "… Updated 12/08"; earlier values are gone, and the Spring 2026 allocation copies (`G5`, `I5`) carry the same stamp. **(b) Double-count trap:** the March V150 "Stocktake" column includes T28 (2026: 11,397, of which T28 2,208); the Master splits them. For four of five T28 species Master D is blank while the V150 file shows the same figure as T28 (416, 392, 392, 224), so adding the two doubles them. **(c) Drift:** Feb 2026 form 5,390; May Master 5,706; Autumn 2026 allocation 9,489 (February, scope unstated). **(d) Three definitions of "available"** across three allocation workbooks. **(e) Broken totals:** Master `D109`, `E109` stop at row 106, `I109` includes the header, `G109` has none. **(f) Dates in text;** 2025 tabs keep the name "Oct 24". |
| 4 | Where do losses show? | Not as a field: V150 surplus/deficit (production against target, not deaths); notes ("84 gone", "96 gone!", "Deaths from dryness"); arithmetic in cells (`=41-10` with comment "10 plant deaths"; 20 subtractions in one May 2025 sheet, no reasons); "discarded" in the registers (126 seed-register notes); narrative reports (`04e` §5.1). |
| 5 | How big is it? | A crude V150 balance leaves about 2,960 (Mar 2024 to Mar 2025) and 4,134 (to Mar 2026) plants unexplained (`04e` §5.3; confidence: low). It mixes deaths, discards, gifts and transfers; it is not a loss rate. |
| 6 | What do staff want? (second-hand, medium) | Paper for volunteers, coordinator keys; "ready is a flag, not a container"; counting starts at Stage 2; show shortfalls against targets. Nobody asked for a stock ledger; that is a future idea, not a requirement. |
| 7 | What must be preserved? | Every dated count by species and container, and every loss with a stated quantity. |
| 8 | Level A | Tidy the Master: real dates; duplicate the tab before each update; relabel D "V150 only"; fix SUM ranges; add Reason and Lost columns. Cheap; history stays one tab per count. |
| 9 | Level B | One append-only `Log` plus a `Latest` view (§2). Still a Google Sheet. |
| 10 | Level C? | No. Stock is an ordinary nursery feature other tools may cover (Sarah's hypothesis), and a ledger needs data WRT lacks: weekly pricking-out actuals are blank in all three tally workbooks. |

---

## 2. Proposed structure: one append-only Log

**Yes, one Sheet tab can hold every snapshot:** one row per species × state × count date; a new count adds rows, nothing is overwritten. Three row types share it: counts, losses, bought-in.

### 2.1 `Log` columns

| Col | Field | Notes |
|---|---|---|
| A | `date` | Real date: the day counted (last day if several). |
| B | `type` | `COUNT`, `LOSS`, `BOUGHT_IN`. |
| C | `species` | Dropdown from one `Species` tab. |
| D | `state` | Dropdown from `States`. |
| E | `number` | Plants, always positive. T28 as plants (trays × 28); confirm. |
| F | `location` | North, South or bench code; optional. |
| G | `reason` | `LOSS` only; dropdown. |
| H | `supplier` | `BOUGHT_IN` only (organisation). |
| I | `status` | `BOUGHT_IN` only: `ordered` / `delivered`. |
| J | `note` | Free text. |
| K | `source` | e.g. "paper form 13 May"; "import: Master col H". |
| L | `flag` | `date_nominal`, `derived`, `approx`, `unmapped_name`. |

### 2.2 `States` (one lookup tab: "one fact, one home")

| state | container | stage | counts as available |
|---|---|---|---|
| V150 | V150 | 2 | no |
| T28-growing | T28 | 2 | no |
| PB3-growing | PB3 | 3 | no |
| PB3-ready | PB3 | 4 | **yes** |
| T28-ready | T28 | 4 | **yes** |

"Ready" is defined here only; if WRT redefines it, one cell changes. Available = PB3-ready + T28-ready, as the Master's `L = H + I`. Growing stock is a separate "pipeline" figure. Import-only legacy states: `PB3-unsplit`, `V150+T28 combined`, `T28-stage3 (legacy)`, `pots-other`, `READY-unsplit`.

### 2.3 `Latest` view: current stock = latest count

Species down column A from row 4; five live states across B to F; row 1 state names, row 2 "as at" date, row 3 available flag.

- **As-at date (B2):** `=MAXIFS(Log!$A:$A, Log!$B:$B,"COUNT", Log!$D:$D, B$1)`
- **Flag (B3):** `=VLOOKUP(B$1, States!$A:$D, 4, FALSE)` (1 or 0)
- **Count (B4):** `=SUMIFS(Log!$E:$E, Log!$B:$B,"COUNT", Log!$C:$C,$A4, Log!$D:$D,B$1, Log!$A:$A,B$2)`
- **Available (G4):** `=SUMPRODUCT($B4:$F4, $B$3:$F$3)`; **Pipeline (H4):** `=SUM($B4:$F4)-$G4`
- **Losses logged since the ready count (I4):** `=SUMIFS(Log!$E:$E, Log!$B:$B,"LOSS", Log!$C:$C,$A4, Log!$D:$D,"PB3-ready", Log!$A:$A,">"&$E$2)`, plus the same for `T28-ready`. Show beside Available; do not net automatically. Pricking out, potting up and planting are not in this log, so a netted number would pose as a running balance.

Why it works:

1. **Latest date per state, not per species.** A species missing from the latest PB3-ready count reads zero (blank on paper means none). Per-species dates would carry a 2024 figure forward as current.
2. **Per-state dates fix the composite snapshot.** The 2026 Master mixes 31 Mar, 28 Apr and 13 May; here each state shows its own date, so staleness is visible.
3. **Same-date rows sum**, so North and South rows both count. If they are counted on different days, enter one date for both.
4. **Trap:** two source columns mapped to one state with different dates make the view drop the older. This is why Stage 3 T28 imports to a legacy state until WRT answers question 1 in §5.

The allocation workbooks should read `Latest`. Today every stock figure there is a typed copy (162 of 170 equal the Master in Spring 2026). `IMPORTRANGE` would be the first live cross-workbook link; it needs the live Sheet IDs (decision 1, evidence summary).

### 2.4 Keeping the paper form

**Yes.** The June 2024 form and Stage 4 sheet are species, number, location, i.e. Log columns C, E, F. Add to the heading only: date, and a tick for the state (one state per sheet). Keying, without scripts:

1. An `Enter count` tab lists species in printed-form order, with Date and State cells at the top; print the form from it.
2. A block beside it builds Log-shaped rows with `FILTER` for every row that has a number.
3. The coordinator copies the block and pastes values under the last Log row (about two minutes).
4. A banner warns of repeats: `=IF(COUNTIFS(Log!A:A,B1,Log!B:B,"COUNT",Log!D:D,B2)>0,"Already in the log","")`.

An Apps Script button could replace steps 2 and 3; I would start without it, since WRT must run this after Tech Lab leaves. Append-only cannot be enforced in Sheets (protection that blocks edits also blocks appends); rely on version history and a dated backup copy each quarter (confidence: medium).

---

## 3. Losses and bought-in stock

**Where recording pays (ranked):**

1. **The V150 to PB3 gap (row 5).** WRT's own summary says the March count "will account for any deaths in the pricking out list", but it only gives surplus/deficit. Logged losses let a later reconciliation split the gap into "logged" and "unexplained". It will not close it, as pricking-out actuals are also missing, but it shows whether deaths, discards or bookkeeping dominate.
2. **Discards at pricking out and potting on:** bench decisions, easiest to capture on the day.
3. **Deaths in PB3:** the Nov 2024 event (about 10 large plants, `18 October 24 … › D17`) changed allocation and left only a comment.
4. **Not worth it:** ready PB3 to planting. No data exists, and planting belongs to the planting-event record.

**Lightest capture:** a `LOSS` row (date, species, state, number, reason, note) in the same Log. Record events (a tray lost, a bench dried out, a batch culled), not single deaths. Reasons: *dryness or heat; frost; damping off or rot; pests or browsing; poor quality (culled); discarded at pricking out or potting on; given away or sold; other (note); count lower than expected*. "Given away or sold" is an outflow, but 57 seed-register notes mention gifts or surplus, so it needs a home to keep the gap honest. Optional: a "dead or culled" column on the paper form, so `=41-10` becomes a count of 31 plus a LOSS of 10.

**Bought-in** is a `BOUGHT_IN` row: date, species, state as received, number, supplier, status, order or invoice reference in `note`. Evidence: supplier appears only as a column heading; the only dated records are one 2023 invoice and one 2025 quote (PDFs); Home Creek has three totals for one season (1,080; 1,120; 1,235); and 4,717 of the 10,589 "available" in Spring 2026 were plants WRT did not hold (`04e` §4, §6). `status` separates plan from delivery, the confusion that inflated "available". Only `delivered` rows count, and as evidence for the next count, not stock added on top of it. A summary: `=QUERY(Log!A:L,"select H, C, sum(E) where B='BOUGHT_IN' and I='delivered' and A >= date '2026-07-01' group by H, C",1)`.

---

## 4. Importing the historic snapshots

**Rule: preserve, do not manufacture.** Import what a source states; flag what it implies; never infer a loss. Phase 1 said "archive, optionally load season totals" (`DATA_SHAPE.md` §9); a scripted import makes more worthwhile (my estimate: 1,500 to 2,500 rows). Use openpyxl and `04a_species_variants.csv`, and compare each imported column sum with the file's typed total (known mismatches, e.g. Feb 2025 V150/T28 1,763 against typed 1,469).

| Tier | Events | Handling |
|---|---|---|
| 1 import | Five March V150 counts; Oct 2022; Oct 2023; Feb 2024; Oct 2024, Feb 2025, May 2025; 2026 Master columns | Trend lines; tests the design on the hardest cases |
| 2 import, flagged | 2018 to Jan 2020; May 2020 | Legacy states; "35F" and "Root" kept in `note` |
| 3 archive | Oct 2020, May 2021, May 2022 PDFs; April 2026 scan | Keep files; key only if WRT asks |
| skip | Blank May 2020 template; June 2024 form; 12 Aug stamp | Not events |

**Mapping rules:**

- **March V150 with a T28 column (2025, 2026):** `V150` = column minus T28; `T28-growing` = T28 column; `flag = derived`. For 31 Mar 2026, Master D + E is 11,313 against 11,397 in the V150 file (about 84 apart, mine): import the Master and note it. **2024 and earlier:** `V150+T28 combined`; do not invent a split.
- **Oct 2024 to May 2025:** large → `PB3-ready`, small → `PB3-growing` (medium; one note says so), with location. The combined V150/T28 column goes to the combined legacy state. The May 2025 north "small" jump (337 to 3,722) is unexplained: import as written, with a note.
- **Master Stage 3 and 4:** stamps say 28 Apr and 13 May but "Updated 12/08". Import as `date = 12 Aug 2026`, `flag = date_nominal`, original stamp in `note`; the earlier values cannot be recovered. Ask the nursery manager.
- **Feb 2026 Stage 4 form (5,390):** `READY-unsplit`, outside live views.
- **Dates:** in-sheet header stamp, not file name or save date; flag disagreements (27 or 31 Mar 2025).
- **Losses:** a `LOSS` row only for an unambiguous quantity ("10 plant deaths", "84 gone"). "96 gone!" and "# alive?" stay as notes. No comment authors or initials imported.
- **Names not on the species list** ("Rata (KPCA)", "Other Species", "misc", a row for an individual's plants): an `Unmapped` tab, not the log.

---

## 5. Questions and risks for WRT

1. Does Stage 3 T28 hold the same trays as Stage 2 T28, or a different group? (blocks the T28 mapping)
2. What did "Updated 12/08" change: a recount, or edits after planting? Which date should the import use?
3. In 2024 to 2025, is large = ready and small = growing? Did small plants move south to north between Feb and May 2025?
4. Are T28 counts plants or trays? Is T28 "ready" the same test as PB3 "ready"?
5. Who owns the Log and lists, and who does the quarterly backup?
6. Will allocation read `Latest` and split "ready now" from "planned supply"? (allocation question)

Main risk: a log nobody reads. Keep the Master as the familiar face, with D, F, H as formulas over `Latest`.

---

## Smallest useful change

1. **This week (Level A):** in the current Master, duplicate the tab before each update, use real dates, relabel D "V150 only (excl. T28)", fix the SUM ranges, add Reason and Lost columns.
2. **Next (Level B, an afternoon):** build `Log`, `Species`, `States`, `Reasons`, `Latest`, `Enter count` in a new Sheet. Trial-import the 2026 Master and five March V150 counts. Keep paper; add the "dead or culled" column.
3. **Then:** import tiers 1 and 2; point allocation stock columns at `Latest`.

**Verdict: Level B, delivered in Google Sheets, starting with the Level A tidy. Not Level C.** The problem is lost history and unclear definitions, not missing software. One append-only table keeps WRT's paper habits, stays portable to any later tool, and needs no developer after Tech Lab leaves. Level C is justified only if WRT later wants a movement ledger by tray, which first needs the weekly pricking-out actuals that are blank today.
