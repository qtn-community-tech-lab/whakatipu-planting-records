# 01c. Potting on: the weekly and monthly potting-on record

Analyst S1C. One question: could one session log, with the same printable sheet, replace the month-per-tab layout, and does that need software? "[name] Master" is the propagation lead's target tab (name withheld).

Assumptions: the Google Sheets are live and match the export; WRT keeps Sheets for entry during Tech Lab; volunteers keep paper and the Nursery Coordinator types each session in (second-hand, confidence: medium); no history is edited in place.

The record is `3. Potting On/2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx` (record 8, one of the three core records), plus four archive years.

I sized the volume by scanning the weekly cells of each book (my count, confidence: medium, because some totals columns may be caught):

| Production year | Dated sessions with a count | Species lines entered | Plants potted | Median species per session |
|---|---|---|---|---|
| 2022/23 | 22 | 80 | 7,664 | 3 |
| 2023/24 | 41 | 130 | 8,012 | 3 |
| 2024/25 | 49 | 150 | 8,800 | 3 |
| 2025/26 | 40 | 149 | 7,710 | 4 |
| 2026/27 (to Sept) | 5 | 20 | 1,148 | 4 |

About 150 lines a year, at most ten species in a session. Every year ends below a goal of roughly 10,000 to 11,000 (`04c` §3.5).

---

## 1. The ten questions

### 1. What does WRT do?

CURRENT BEHAVIOUR. On most Wednesday mornings, volunteers pot seedlings from V150 trays into PB3 bags. Which species, and how many, is steered by a yearly **Goal Set**: the V150 count from the March stocktake (47 of 50 goals equal it in 2026/27; `04c` §3.5). Species held in T28 trays skip PB3, so a **Less T28** figure is deducted (`04b` §3). The potting-on lead uses these numbers to decide how many seedlings to pot (Summary of Records, via `staff_context`; confidence: medium).

### 2. What record supports it?

- **Paper:** `Weekly recording print` tab. 98 species in two blocks, columns `#` and `Location`, `DATE:` blank, sub-total rows empty. Volunteers fill it in (confidence: medium; no filled copy is in the folder).
- **Session entry:** 11 month tabs, species rows × dated session columns `D:O`. The only event-level data.
- **Year view:** `Summary` (Goal Set, Less T28, Total to pot, Running total, To go, month columns) and `Annual` (month × year).
- **Targets:** `[name] Master`, no longer driving the goal in 2026/27 (`04c` §3.5).

### 3. What works?

- The shape suits the job: species down, sessions across, running total and "To go". Volunteers and the coordinator know it.
- Common names on the paper form suit volunteers.
- Where the roll-up is wired it works (`Sept › C = SUM(D:H)`, `Summary › K = Sept!C#`).
- 
### 4. Manual effort

- The species list is **retyped on 13 tabs**, matched by row position (`Aug 2026 › B4:B101`). A species change means 13 edits. Each session also needs a new dated column header typed by hand.
- The 2026/27 roll-up is only partly wired. `Summary › K` (Sept) is linked; Aug is typed `0` except `J77`; Oct to June (`L:T`) are empty. So "Running Total" `G104` (1,148) is Aug + Sept only and "To go" `H104` (8,532) can't yet be trusted. `Aug 2026 › C4:C101` is a typed `0`, so August's 139 never reaches the Summary.
- Goal Set and Less T28 are typed. In 2025/26, 76 of 100 "Total to be potted on" cells are over-typed (`04c` §3.5).

### 5. Data risk

- **Header dates are unreliable.** 44 of 50 real-date session headers hold the sheet's own month in the day position (`Aug 2026 › D3` reads 8 Dec 2026; the sheet means 12 Aug). Others are text (`16/09/26`, `5.2.25`, `12.2.25 E`, `Wk 2`) or lack a year. Some 2025/26 sheets carry 2025 dates; Oct to Dec labels read 2023 (`04f` §4, §6, §10).
- **Totals disagree.** `D104` Goal 10,185 minus `E104` Less T28 1,983 is 8,202, yet `F104` "Total to pot" is 9,680. Three goals (`D6`, `D9`, `D31`) are text, so `SUM` skips them. `F77` (519) equals Goal + T28, and `E77` (139) equals the August count.
- **Stale labels.** `Annual › A8` reads "2024/25" but links to the 2026/27 Summary; 2021/22, 2022/23 and 2025/26 are missing; other rows are pasted values.
- **Two species have no home.** Astelia fragrans and Carmichaelia racemosa (`Summary` rows 102 to 103) have no month rows and are not on the print form.
- **No link to stock.** Potting totals relate to the PB3 stocktake in 0 of 52 species (`04e`). No loss or group field exists.

### 6. Duplication

The 98-name block sits on 13 tabs of this one workbook. The goal is held in `Summary › D`, `[name] Master`, the V150 stocktake and the allocation workbooks (`04c` §2). The T28 deduction is typed here and again in three stocktake columns. Session totals are held in the month tab, the Summary and the Annual.

### 7. Could the Google Sheet be improved?

Yes, mostly by **changing its shape**, not by adding formulas to it. One column per session, one tab per month and 13 copies of the species list cause the header dates, the row-position links, the dead months and the orphan species. An **append-only log** removes all four, because a session becomes rows, not a column. Confidence: high.

### 8. Could other sheets derive from it?

Yes. Summary, monthly view, Annual and the "still to pot" print sheet become views of one table (§4). The Goal Set stays an input from the March count.

### 9. Is software justified?

No. About 150 lines a year, one person typing, no concurrent editing or access rules, one species list as the only key. A well-built Sheet is enough (§6).

### 10. Smallest useful change

See §8.

---

## 2. What staff need from this record

CURRENT BEHAVIOUR (Summary of Records; second-hand notes): (1) **progress against the year's goal**, by species and in total; (2) **what still needs potting**, i.e. species with "To go" above zero, which is what the potting-on lead acts on; (3) **how many were potted this month** and year to date. None needs a session grid on screen: they are three views of one table. DESIRED, not current: stock movement (V150 down, PB3 up) and loss recording. The log leaves room for the first and does nothing for the second.

---

## 3. Proposed `Potting Log` (one tab, one row per species per session)

| Col | Header | Entered or formula | Rule |
|---|---|---|---|
| A | Date | Entered | A real date; validation rejects text; shown as `d mmm yyyy` |
| B | Species | Entered | Drop-down from the `Species` tab, reject anything else |
| C | From | Entered, optional | `V150` / `Cutting tray` / `Other`. Blank means V150 |
| D | To | Entered, optional | `PB3` / `T28` / `Other`. Blank means PB3 |
| E | Quantity | Entered | Whole number above zero |
| F | Group | Entered, optional | Volunteer group, school or "staff" (a group, not a person) |
| G | Notes | Entered, optional | Free text ("damp off on tray 3") |
| H | Production year | Formula | `=IF(A2="","",IF(MONTH(A2)>=8,YEAR(A2)&"/"&RIGHT(YEAR(A2)+1,2),(YEAR(A2)-1)&"/"&RIGHT(YEAR(A2),2)))` |
| I | Month | Formula | `=TEXT(A2,"yyyy-mm")` (sorts correctly) |
| J | Counts to goal | Formula | `=IF(OR(D2="",D2="PB3"),E2,0)` |

H to J are one `ARRAYFORMULA` in the header row, so a new row fills itself. A, B and E are the only columns a coordinator must fill. The Sheet's locale is set to **New Zealand**, so `12/08/26` means 12 August; the swap in 44 of 50 headers is the opposite behaviour (confidence: medium on cause, high on effect).

Production year is computed from the August cut-off (`04f` §6), so no one types "2026/27" again. "From" is the only way to tell a cutting from a seedling.

Supporting tabs, shared with S1B's pricking-out plan (`01b` §4): `Species` (one list, one place; add the two missing species), `Settings`, `Targets`.

**`Targets` tab** (this year only, about 50 rows; last year's copy is archived as values):

| Species | Goal Set | Less T28 | To pot | Source note |
|---|---|---|---|---|
| (drop-down) | typed once | typed once | `=B-C` | "V150 count, 31 Mar 2026" |

---

## 4. Views instead of copied values

**Progress by species, with "To go"** (`Progress` tab, species in column A from `Targets`, year typed once in `B1`):

```
D2:  =ARRAYFORMULA(SUMIFS('Potting Log'!J:J,'Potting Log'!B:B,A2:A99,'Potting Log'!H:H,$B$1))
E2:  =ARRAYFORMULA(IFERROR(VLOOKUP(A2:A99,Targets!A:D,4,FALSE),0))   (To pot)
F2:  =ARRAYFORMULA(E2:E99-D2:D99)                                    (To go)
```

`SUMIFS` runs over every species, so one with a goal and no sessions still shows "To go" in full; a pivot would hide it. Test on a copy first; I have not run these against a live Sheet.

**Month by species** (the old month tabs, as a view):

```
=QUERY('Potting Log'!A:J,"select B, sum(J) where H = '2026/27' group by B pivot I",1)
```

**Annual** (replaces the typed `Annual` tab; labels come from the data, so they can't go stale):

```
=QUERY('Potting Log'!A:J,"select H, sum(J) where H is not null group by H pivot I",1)
```

The pasted 2020/21 and 2023/24 rows move to a `Historic totals` tab, labelled as pasted values.

**Print sheet** (a view): two columns of species with the "To go" figure, an empty `#` column and a `Notes` column, a `Date` line, and a group line. Offer a filtered version: species with To go above zero, plus ten blank "other species" lines. The current sheet lists 98 species, only about 50 have a goal, and 3 to 4 lines get filled on a typical Wednesday. Trial the layout with volunteers (confidence: medium).

**Could Goal Set be pulled by species ID?** Partly, and not worth it yet:

- There are no species IDs (the running number is a row counter; `04a`). Name is the key, and names carry shared faults ("Weinmania", "Carex Maorica", trailing and non-breaking spaces) that already break `VLOOKUP`. One `Species` tab fixes this.
- The V150 count is a dated snapshot in another Google Sheet. `IMPORTRANGE` can read it, but the Goal is set once a year (about 50 numbers), so pasting once with a source note is simpler and safer. Link only if the stocktake becomes one live Sheet.
- Check Less T28 against the T28 stocktake column rather than only typing it. In 2026/27 five species are deducted but the March stocktake shows six (Poa cita 224 not deducted; Plagianthus 139 against 140; `04b` §3 item 4). A flag on `Targets` would catch it.
- The definition is unsettled: March V150 count or target-list figure (`04c` §3.5)? Do not hard-wire either.

---

## 5. What the coordinator's week looks like

Today (inferred, low confidence): find the month tab, scroll 98 rows per species, add or fix a dated column, type counts, check the Summary.

With the log, from the paper sheet: go to the next empty row (under 30 seconds); type the date once and copy it down (15 seconds); for each species line, type the first letters of the name and the number (15 to 25 seconds); add group and notes if written (15 seconds). **A typical session of 3 to 4 lines takes 2 to 3 minutes; a 10-line session about 5.** Over a year (40 to 50 sessions, 150 lines) that is 2 to 3 hours, plus 15 minutes at the start of the year for `Targets`. These are estimates from line counts, not observed times. Late paper breaks nothing: rows are entered with the real potting date and every view recalculates. The month tabs needed the right column to exist first.

---

## 6. Does this need software?

No. Everything above is Sheets: one log, a species list, `SUMIFS`, `QUERY`, data validation and a print range, with no scripts. WRT can maintain a log and three formulas after Tech Lab leaves. Software would only matter if the log had to post to a stock balance (V150 down, PB3 up), which belongs to the stock workflow and needs species IDs and a count history first.

---

## 7. Cautions and open questions

- **Log hygiene.** Keep rows; fix typos in place; Sheets version history is the audit trail. Protect H to J and the header. A species rename under the species ruling (decision 2) is a find-and-replace on column B.
- **Same shape as pricking out.** `01b` proposes a `Pricking Log`. Use the same columns plus `Activity` so the two can merge later.
- **Losses.** `Notes` can carry them; where losses belong is a separate question.
- **History.** Load only 2026/27 (5 sessions, 20 lines, 1,148 plants), correcting dates from the sheet's own month and noting it. Keep the archive books as they are, yearly totals only (`DATA_SHAPE` §9). If 2024/25 and 2025/26 (299 lines) are wanted later, load them with a `Date confidence` note.
- **Questions for WRT** (none blocks the first change): who types the paper in, and how soon? What does `Location` mean (blank in every copy; may be dropped)? Is the 2027/28 Goal again the March V150 count? Which species are T28 this year, and what does red font mean? Were the 2026 sessions 12 Aug and 2, 9, 16, 23, 30 Sept (inferred from the sheet month; confidence: high on the swap, low on exact days)? Do visiting groups need recording by name, or is "group" enough (keep personal names out)?

---

## 8. Smallest useful change

Add four tabs to the existing 2026/27 potting-on Google Sheet. Don't delete or replace anything yet.

1. **`Species`, `Targets`**: one species list (include the two missing species), and this year's Goal Set and Less T28 pasted once, with a source note. Set the Sheet locale to New Zealand.
2. **`Potting Log`** with the columns in §3. Load the 20 lines already entered in Aug and Sept 2026, with corrected dates. From now on, the coordinator enters new sessions here only.
3. **`Progress`** (To go by species) and **`Month view`** (the `QUERY` pivot) from §4. Retire the old `Summary`, month tabs and `Annual` as "superseded, kept for reference", and fix the `Annual` label rather than relying on it.
4. **`Print sheet`**: the same paper form, driven from `Species` and `Progress`, with the date line and "still to pot" figure. Trial it for two Wednesdays with the potting-on lead.

Leave stocktakes and history alone. No loss field or PB3 stock link yet.

### Verdict

| Level | Verdict |
|---|---|
| **A** | **Do this.** Fix the structure in Sheets (log + views). It removes the swapped and stale dates, the 13 copies of the species list, the dead months and the over-typed summaries in one step. |
| **B** | **Later, only if** WRT wants a stock balance fed from this log. |
| **C** | **Not justified.** |

Confidence: high on A (the faults are design faults of the layout); medium on entry times and print layout.
