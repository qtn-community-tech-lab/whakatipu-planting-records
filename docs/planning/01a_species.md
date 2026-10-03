# 01a — Species list and master lists (Phase 2, agent S1A)

Question: what does WRT do with its species lists, where does that hurt, and what is the least disruptive improvement?

Assumptions (from `00_evidence_summary.md`): the Google Sheets are the live records and match the export; WRT keeps weekly entry in Sheets during Tech Lab; volunteers keep paper; nothing historical is edited in place. Confidence is marked where a point is an inference. I checked one point with openpyxl over the export (counts in section 6). I could not open the live Sheets, so anything about how Google Sheets behaves (dropdowns, IMPORTRANGE) is from general knowledge and untested here (confidence: medium).

## 1. What WRT actually does with species lists

CURRENT BEHAVIOUR. The species list is the row spine of the whole yearly loop, not a reference document. Each seasonal form is "species down the side, something typed beside it":

- forecast: species × site requirement (`_JMN PLANT Forecasting 2026_2027.xlsx › KEYSTONE SITES`, one sheet per site);
- pricking-out target for the propagation lead each January (`_Pricking out 2026-27… › Sheet1 › A3:A101`);
- potting-on goal and monthly tallies (`2. 2026-27 JMN Potting On… › Summary B4:B103`, then each month sheet);
- stocktake (`_Stocktake Master CURRENT › Autumn 2026 Master Stocktake › B5:B108`);
- allocation to sites (`…Allocation Master AUTUMN 2026 › Autumn 2026 › C6:C119`; Spring 2026 likewise);
- history (`_JMN Plants Out Master › MASTER`, 98 species × 23 season blocks).

A species row therefore carries the plan, the stock and the planting in different workbooks. WRT's own method for keeping them aligned is a written instruction: `_JMN Plants Out Master › Notes` says to insert a new species in `Master Plant List`, copy it to `MASTER` and `SUMMARY PLANTS`, then to the allocation workbooks and the 01/02/03 site sheets, and "check all correct" (B23). That is current practice for adding one species: at least seven places, by hand.

It also carries the reporting attributes: the `>5m` (Trees that Count) flag, the threatened flag, common and Māori names, "Grown at JMN", "Purchased through Nursery" (`Master Plant List` A–H). In seed and cutting logs species is typed free-hand; 27 groups occur only there (`04a` §5).

DESIRED BEHAVIOUR (second-hand): species should mean the same thing everywhere. No staff statement asks for software for the list itself.

## 2. Which records support it

| Record | What it is | Evidence |
|---|---|---|
| The 98-row block | Alphabetical, numbered 1–98. Starts life in the Standard list and is copied into every current workbook | `Standard Annual Plant List… MASTER › Sheet1 › B4:B101`; same block in Plants Out `Master Plant List D4:D101`, pricking-out, forecast, potting-on |
| `Master Plant List` sheet | The richest version: both flags, three name columns, grown/purchased. The only place the threatened flag exists (13 species) | Plants Out Master › `Master Plant List` A3:H101 |
| `Nursery plant names list.docx` | 97 rows of botanical, common and Māori names, in the 2026 autumn planting folder. Probably the public or ordering list (confidence: low) | `04a` §4; B03 |
| Appended rows | Added below the block in allocation, stocktake and potting masters, by whoever needs them | Autumn 2026 `C104:C119`; Spring 2026 `C104:C107`; Stocktake `B103:B108`; Potting Summary `B102:B103` |

There is no single list, only a lineage of copies; Plants Out `Master Plant List` is nearest to a master because it holds the attributes.

## 3. What works well

- **The spine is stable.** The 98-row block has the same order across the current pricking-out, forecast, Plants Out and Standard files (`04a` §4). Staff find a species by habit; keep that.
- **Species are pre-printed.** In most sheets nobody types a species name in weekly work, only a number beside it. Free-text risk sits in appended rows, seed logs and orders.
- **The attributes already exist** in one place (`Master Plant List`), including grown-vs-purchased.
- **Some linking already works inside workbooks**: the Autumn 2026 site and stocktake sheets pull names by formula (`='Autumn 2026'!C6`, B19).

## 4. What creates manual effort

- Adding a species is a seven-place copy (section 1). Evidence that it is not always done: forecast `Template` lacks four core species and holds `Kunzea ericoides` that no master has (`04a` §4); the 2024 list lacks nine species now in the core.
- Each yearly form is a copy of last year's, so the list is re-copied, then re-extended by hand.
- Appended rows escape the totals: pricking-out `Weinmania racemosa` sits at A101, under `TOTAL` at A100 whose sum stops at row 99 (`04a` §2 point 6).
- "Which count is right" (93 or 97) is an argument about copies, not about the nursery.
- `>5m` is re-keyed per file, so each workbook's TTC subtotal is only as good as its copy of the flag.

## 5. What creates data risk

1. **Shared misspellings** are the most-typed form in every current list: `Weinmania racemosa`, `Scheflera digitata`, `Parsonia heterophylla`, `Leonohebe cuppressoides`, `Rakaua simplex`, `Prumnopitys taxifolius`, `Coprosma brunea` (`04a` §2). Any lookup against a correct name misses them. Trailing spaces (217 strings) and a non-breaking space in `Plagianthus regius` defeat exact matches silently.
2. **Three disagreeing `>5m` lists:** 49 flagged in Plants Out (`Master Plant List`, `Trees that Count`, `SUMMARY PLANTS`), 50 in the stocktake and allocation masters, 39 in the 2025/26 pricking-out list, with 11 TTC species unflagged there (`04g` §2.3). Which is right is a WRT question; today each TTC figure depends on its copy.
3. **The threatened flag lives only in Plants Out** (13 species). Nothing upstream can show it.
4. **Double-entered species.** `Leonohebe cupressoides` (B47) and `Veronica cupressoides` (B95) are one species twice in the master block. Whether stock is split across the two rows or counted twice cannot be told from the lists (confidence: low).
5. **Positional links break on insertion** (`00_evidence_summary`, Linkage), and a species list kept by position is exactly that case.
6. **No stable ID.** The `#` column is a row counter. In Autumn 2026 it reaches 100 and stops (`B:99–100`, then blank), so appended species carry no number at all.
7. **Appended species have no status.** Autumn 2026 `C104:C119` adds 16 rows, each with a single small count (1–11, in one column; I did not read what that column is). Twelve are not in any core list (`04a` §4). Nothing marks them as new range or one-off requests.
8. **No data validation at all.** I found zero validation rules in all ten current workbooks (openpyxl over the export, confidence: medium that the export preserves dropdowns).

## 6. Is the information duplicated?

Yes, heavily. Method: for every `.xlsx` in the folder, every sheet, I counted the distinct names from the 98-row block found *typed* in one column (threshold 60 of 98, first 400 rows). Linked cells (formulas) do not count, so this is a **minimum**.

| Scope | Sheets | Files |
|---|---|---|
| All of the folder | **201** | **67** |
| Ten current workbooks used in the loop | **48** | 10 |
| Archive, old, template and blank copies (rough split) | about 139 | about 44 |

The 48 in the current ten: forecast 16, potting-on 13, Plants Out 6, Spring 2026 allocation 3, Autumn 2026 allocation 2, Autumn 2027 allocation 2, pricking-out 2, master template 2, Standard list 1, stocktake 1.

So the block exists as roughly **48 live typed copies** (and about 150 historical ones). Correcting one spelling is up to 48 edits. This is the strongest evidence in this report.

## 7. Could the existing Sheet simply be improved? (Level A)

Yes, and this is the right first move. The fault is not the tool; it is 48 copies of a list that should exist once, with no status and no check. Level A means:

- one **Species Master** Google Sheet (new, small), seeded from `Master Plant List`;
- an **Aliases** tab;
- one imported tab per live workbook plus dropdowns and a check column.

No new software; WRT can run it after Tech Lab leaves.

## 8. Could other spreadsheets derive from it automatically?

Yes, with three guard-rails. Confidence: medium on mechanics (I could not test).

**By key, not by position.** Downstream sheets should look up a species by its name (INDEX/MATCH or XLOOKUP on a cleaned name), never by "row 47 of the master".

**Do not make the typed spine a formula where numbers are typed beside it.** If `B4:B101` in a live workbook becomes `=Master!B4` and the master is later sorted or has a row inserted, names move and typed numbers do not. That silently misaligns counts, the worst possible failure. Rules instead: (a) the Master is **append-only** (new species at the bottom, never inserted, never re-sorted; sort only in a view); (b) live seasonal sheets keep their typed names for the current season; (c) new-season forms may pull the spine from the Master at creation, then be pasted as values.

**Freeze at season close.** A workbook that keeps a live link would change retroactively if the Master renames something. At season close, paste-values the species and flag columns, so history does not move ("do not manufacture history").

**Mechanics.** One `=IMPORTRANGE(…)` per workbook into one local tab ("Species (from Master)"); everything else points at that tab, so there is one thing to authorise and repair per workbook. Dropdowns usually want a range in the same file, hence the local tab (medium confidence). Risk: IMPORTRANGE needs a one-time permission grant and breaks if access is withdrawn. Fallback with no link: paste the Master tab into each new-season workbook once a year, with a check cell reporting differences.

## 9. Specific questions

**Could one canonical Species Master feed every other operational sheet?** Yes for the current loop. The seed and cutting logs need a dropdown, not a spine: 27 groups occur only there.

**Could dropdowns replace free-text entry?** Partly; weekly entry is mostly numbers against pre-printed names. Dropdowns matter for appended rows, seed/cutting logs and orders. Use "show warning", not "reject", so a volunteer or the nursery manager can still type a one-off. Add a visible check column (`OK / not on Master / alias of X`) and a count of "not on Master" at the foot. Wherever staff type, normalise first: `TRIM`, `CLEAN` and replace character 160 before matching.

**Could legacy spellings be kept as aliases?** Yes, and they must be. An **Aliases** tab: `alias text | species (picked from the Master) | reviewed (Y/N)`, seeded from `04a_species_variants.csv` (820 rows). Rows flagged `uncertain = Y` (208 rows) go in as *proposed* and are never matched automatically. Exclude abbreviations (97 strings, e.g. `Car pet`) until reviewed. Rule: any rename in the Master adds the old text to Aliases in the same edit. Historical sheets are never rewritten; aliases are used only when history is read or imported.

**Could species IDs be introduced without staff seeing or typing them?** Yes. The ID lives only in the Master (narrow, grey, protected first column, `SP-0001` style, issued once, never reused). Staff pick names; no ID appears in any downstream Level A sheet. An ID is needed only when something must be joined reliably (Level B: history import, TTC export), where a script or helper column resolves name → alias → ID. Until then the cleaned name is the key, protected by the alias rule.

**Where should the `>5m` flag and threatened flag live?** On the Species Master, one column each, as attributes of the species (one fact, one home). Downstream sheets show them by lookup, so the existing SUMIF over a column of `Y` still works. Before filling, WRT must rule on the 49 / 50 / 39 disagreement (section 5.2), so the Master starts with the Plants Out value plus a `to confirm` mark on the disputed species. Two cautions: (a) a changed flag would rewrite past TTC reports, so pasted TTC sheets stay pasted and Level B should store the flag as it stood at each report; (b) what "threatened" means (which list, which year) is not recorded anywhere, so add a blank `basis` column for WRT. I make no ruling.

**How to handle appended species (Autumn 2026 rows 104–119) and contested pairs without deciding taxonomy?** Add a **Status** column on the Master: `Core`, `Added – to review`, `One-off request`, `Retired`, `Merged into [row]` (never delete a row). The 16 Autumn 2026 appended rows, the four docx-only species and the other extras go in as `Added – to review`. The nursery manager rules on them (`04a` question 7), and "how many species" becomes a filter on Status. For contested pairs (Cyathoides/Leptecophylla *juniperina*; *Carex maorica* / *secta*; *Coprosma dumosa*/*tayloriae*; the three *Ozothamnus*; the *Kunzea* set; *Rata (KPCA)*; the cupressoides double row) keep **both rows as they stand**, add a `Contested – same as?` column naming the partner as text, and add no cross-pair aliases. Only typo, whitespace and case variants within one row's own family are aliased. Merging changes counts, so it happens only after WRT rules, as a Status change keeping both rows. A site tag such as `Rata (KPCA)` belongs in a site field, not the Master (`04a` §6).

## 10. Is software justified?

Not for the species list on its own; a properly kept Sheet answers every need the evidence shows. The Master is also a **no-regret dependency**: any later tool, bespoke or existing (Terraware, Spriggo, SeedSource), needs a cleaned, owned species table first, and Aliases is the import map for history. The blocking decision is **who at WRT owns the list and may rule** (decision 2). Limit edit rights to two people (protected range); everyone else views.

## 11. Smallest useful change

1. **Name the owner** (role) and a deputy. One short conversation; no tooling.
2. **Create the Species Master Sheet**, seeded from `Master Plant List` plus the extras: `ID (hidden) | Name as WRT writes it | Proposed correction (blank) | Common | Māori | >5m | Threatened | Grown / Purchased | Status | Contested – same as? | Notes`. Append-only; both cupressoides rows kept. Spelling errors are listed in "Proposed correction" for approval later, not changed.
3. **Create the Aliases tab** from the census file, proposed and reviewed marked separately.
4. **Pilot in one place:** the next natural copy. That is the January 2027 pricking-out list (it goes to the propagation lead each January) or the Autumn 2027 allocation. Add the local import tab, a warning dropdown on any appended-row range, and the check column. Do **not** retrofit this season's live workbooks, other than perhaps the check column.
5. **Add a season-close step**: paste values over the species and flag columns before archiving.
6. **Retire the seven-place instruction** in `Plants Out › Notes`, replaced by "add a row at the foot of the Species Master; set Status".

Effort: a day or two to build, plus one short session with the nursery manager and propagation lead on Status and the contested pairs. Reversible: delete the import tab.

## 12. Verdict

| Level | Verdict |
|---|---|
| **A — fix the current Sheets** | **Recommended now.** Master + Aliases + imported tab + dropdown/check, piloted at the next yearly copy. |
| **B — canonical data + hybrid** | **Next, only when needed.** Stable IDs resolved by script when history is imported or a TTC/other export needs it. The Level A Master is its seed table. |
| **C — purpose-built software** | **Not justified by the species list.** Revisit only as part of a wider build; do not let this problem be the reason for one. |

Open questions for WRT: owner and rulings (section 9); which `>5m` list is right; what the single-count columns on the appended rows are. None blocks building the empty Master; they block filling `Status` and the flags.
