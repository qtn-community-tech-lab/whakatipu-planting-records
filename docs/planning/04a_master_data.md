# 04a: Canonical master data (S4A, Phase 2)

Assumptions: the Google Sheets are live and match the export; WRT keeps typing weekly in Sheets; volunteers keep paper; nothing historical is edited in place; planting areas are a future idea; seed-source locations stay out. Roles are used, not names. **Level A** now (four small tabs); **Level B** only when a script must resolve history; **Level C** is not justified by master data.

## 1. The minimum master data

Four lists, held as tabs in one "Master data" Sheet. Working sheets read them through one imported tab each (S1A §8). Rules for all four:

- **Append-only.** New rows go at the foot, never inserted, never re-sorted (sort in a view). Nothing is deleted; a row is retired by status.
- **IDs are issued once, never reused, and live in a narrow protected first column.** Staff see names. Dropdowns show names; a lookup resolves name to ID underneath.
- **Aliases** sit in a tab beside the list: `alias text | match key | picked from list | alias type | confidence | reviewed Y/N`. Any rename adds the old text in the same edit. Aliases are used to read or import history, which is never rewritten.
- **Two editors per list, everyone else views.** Owners below are proposals pending decision 2.

### Species

- **Fields:** ID (hidden); name as WRT writes it (the handle, e.g. `Weinmania racemosa`); suggested spelling (blank until approved; 10 offered); common name; Māori name (no macrons today); `over_5m`; `threatened`; `threatened basis` (blank: which list, which year, is nowhere recorded); status; `contested with`; note.
- **Not carried:** Grown/Purchased (columns G–H of `Master Plant List` are empty in all 98 rows); container (a per-year choice, kept in the Plan); tray sizes.
- **`>5m` source (S1F's correction).** The flag comes from the 49-species `Plants Out Master › Master Plant List` column A, not `MASTER` column B. That column is an unlabelled "x" (48 species, only 23 overlapping) and gives 7,492 for 2020 against the 5,496 reported. The 50 and 39 lists in stocktake, allocation and pricking-out stay unreconciled until WRT rules. A changed flag must not rewrite a past TTC figure, so history tables carry the flag as it stood at each report (Level B).
- **Owner:** nursery manager; deputy, propagation lead.
- **Aliases:** every spelling in the crosswalk (section 3).
- **Status:** `core` (on the 98-row list), `appended` (typed below it; shown "Added, to review" until the nursery manager marks core, one-off or retired), `contested` (WRT may keep two lines), `seedlog_only`. Contested pairs keep both rows and both IDs, with no cross-pair aliases. A merge happens only after a ruling, as a status change (`merged into SP-nnn`) that keeps both rows.
- **Read by:** pricking-out Plan, forecast tabs, potting `Species`/`Targets`, stocktake `Log`, allocation, Plants Out history and TTC pivots, seed and cutting logs (dropdown).

### Sites

- **Fields:** ID (hidden); name as WRT writes it; WRT site number as staff know it (`15`, `9G`; blank for the 14 sites that never had one); class K/C/S (blank allowed; at least seven sites disagree between sources); landowner organisation only (never a contact); status (`active`, `historic`, `scheme`, `merged`); parent site (optional, for parcels such as 9A/9G and Slope Hill's sub-parts).
- **Not carried:** coordinates, polygons, area codes. The GIS project owns them; a `gis ref` column can be added if it arrives. The HGF carve-out in TTC is a property of a site and season, not of the site.
- **Owner:** operations manager; deputy, nursery manager.
- **Aliases:** the 400 header strings in `04d_sites_variants.csv`, plus `site_id_as_typed` for faulty IDs (old 2015 numbering, the 13C/11 and 9E/9F swaps, `!!A`). S2: 360 non-zero history columns collapse to 75 sites, 90% automatically.
- **Status:** Paper4Trees is a `scheme`, not a place (11 columns, 160 records). The four unclear headers and three new sites await WRT; they enter as `active`, "to review". Register ID `6` is duplicated and needs a ruling.
- **Read by:** allocation, `Season_site`, `Planting` history, forecast site tabs, TTC class totals.

### Seasons and production years

- **Fields (a generated `Calendar` tab):** planting season label in WRT's words (`Spring 2026`); year; start and end month (Spring Sep to Nov, Autumn Mar to May); production year pricked and potted (`2024/25`, `2025/26`); sowing year. The offsets are stored per row, not assumed (`04f` §6.3: for spring Y, sown about Y-3, pricked (Y-2)/(Y-1), potted (Y-1)/Y).
- **Production year** is August to July and is computed from a date (S1C's formula), never typed.
- **Owner:** nobody edits it; the nursery manager adds one row a year.
- **Aliases:** `2026-27`, `2026/2027`, `26-27`, `2025,2026`; `SPRING 2026`, `Spring 26`. `Springburn` is a supplier, and `Winter 2026` or `Summer 2027` are stocktake moments, not seasons.
- **Status:** none needed.
- **Read by:** Plan, potting `Production year`, allocation `season`, `Planting`, TTC columns.

### Containers and states

- **`Containers`:** V150 (24 per tray), T28 (28), PB3 (plants per unit not stated), 35F (legacy, unknown), bay (135 plants, a space unit). These are typed inside about 400 formula cells today.
- **`States`:** `V150`, `T28-growing`, `PB3-growing`, `PB3-ready`, `T28-ready`; each with container, stage 2/3/4 and `counts as available`. "Ready" is defined here only. Legacy import-only states: `PB3-unsplit`, `V150+T28 combined`, `T28-stage3 (legacy)`, `READY-unsplit`.
- **Owner:** nursery manager.
- **Aliases:** `v150`, `V 150`, `7V150`; `T 28`, `2 T 28`, `8T28`, `T28's` (`04b_container_terms.csv`). A leading number is a tray count: parse it, never store it as the name.
- **Status:** `live` or `import-only`. Whether T28 counts are plants or trays is open (01d, question 4).
- **Read by:** Plan, stocktake `Log`/`Latest`, potting `From`/`To`.

## 2. Species crosswalk prototype

Script `scripts/species_crosswalk.py` (read-only; output `scripts/species_crosswalk_output.txt`) reads `04a_species_variants.csv` and the `Master Plant List`, and writes `prototype/species_crosswalk.csv` and `prototype/species_master_proposed.csv`. Canonical names are WRT's own most-typed spelling; corrections are only suggested. Place or provenance tags are withheld from `raw_name`, and file names are replaced by counts.

### (a) Counts

| Measure | Result |
|---|---|
| Variant rows read | 820 |
| Excluded (tray and seed codes, headings, totals, notes) | 91 + 1 free-text note |
| Crosswalk rows | 728 |
| Distinct species IDs | **164** (162 Phase 1 groups with a named taxon, plus two pairs split) |
| Rows with an ID / without | 668 / 60 (genus only, multi-taxon, descriptor, non-native) |
| Cell occurrences landing on an ID | 32,251 of 32,743 (98.5%) |
| Confidence (rows with ID) | high 473, medium 181, low 14 |
| `needs_wrt_decision = Y` | **114 rows**: 89 in contested sets, 12 alias-level, 13 unmapped |
| Rulings behind them | 13 identity rulings (9 sets, 3 single IDs, `Carex comans red`), 7 alias strings (rata, kowhai, totara and similar), and whether 10 multi-taxon strings stay unmapped |

Aliases per type, rows with an ID: exact 154, case_space 190, typo 118, abbreviation 103, common_name 31, site_tagged 25, maori_name 24, old_genus 12, variety 10, multi 1. Abbreviations are never better than medium and are import-only. The 98 `Master Plant List` rows map to 98 distinct IDs (the 97-or-98 question stays open: the cupressoides rows are two IDs).

Status of the 164: core 88 and contested 24 (10 of them on the 98-row list); appended 31; seedlog_only 21. `over_5m`: 49 Y, 49 N (on the list, unflagged), 66 unknown (not on the list). `threatened`: 13 Y. The two cupressoides rows differ on the threatened flag: only the Veronica row carries it.

Contested: Leptecophylla and Cyathoides juniperina; Leonohebe and Veronica cupressoides; Carex maorica and secta; three Kunzea; three Ozothamnus; the Carmichaelia crassicaulis, variety and racemosa trio; three parent and variety pairs; and three singles (`Pseudopanax arborscens`, `Muehlenbeckia coci`, the faucicola variety). Three `Master Plant List` names also appear on `plants removed from list`: Aciphylla aurea, Brachyglottis cassinioides and Carmichaelia crassicaulis.

### (b) How the ID stops the row-order and spelling failure, without staff typing IDs

The current failure has two halves: a typed count beside a name that shifts when a row is inserted, and a lookup that misses `Weinmania`, `Weinmannia` or a trailing space. With the master:

1. Staff pick the name from a dropdown (show-warning, so a one-off can still be typed) and see only names, in the familiar order.
2. A hidden column beside the name holds the ID, filled by lookup on the chosen name. Totals, `SUMIFS` and `QUERY` join on the ID, so sorting, inserting or renaming cannot move a count to the wrong species.
3. Imports (history, old logs) pass raw text through the `Aliases` tab on `match key`; no key shared by two IDs (checked: none). Unmatched text goes to an `Unmapped` tab, never into the data.
4. `Weinmania racemosa` (218) and `Weinmannia racemosa` (15) become one ID and one total. A rename is a master edit: the ID stays and the old text becomes an alias.
5. Contested pairs stay two IDs until WRT rules; merging is then one status cell, not edits in up to 48 live copies.

### (c) What the canonical list feeds

- **Production planning:** Plan species ← dropdown; `Plan.species_id` joins `Site Needs` on `species_id`.
- **Stocktake:** `Log.species_id` + `state` → `Latest` by `SUMIFS` on `species_id`, `state`.
- **Allocation:** `Allocation.species_id` (+ `site_id`, `season`) feeds the pick list; ready stock is looked up on `species_id`.
- **History:** `Planting.species_id` ← `MASTER` row text through `Aliases.match key`.
- **TTC reporting:** `SUMIFS(Planting.qty)` on `species_id`, with `over_5m` looked up from the Species list on `species_id`.

## 3. Next steps and limits

1. WRT names the species owner and deputy (decision 2). The rulings can follow; the empty Master can be built first.
2. Seed `Aliases` from the crosswalk with `reviewed = N`; never auto-match `low` rows or abbreviations.
3. Pilot at the next natural copy (January 2027 pricking-out list or Autumn 2027 allocation).

Limits: the crosswalk covers the 820 strings in the export; new text is caught by the check column. Common-name mappings and the two split pairs are my reading (confidence: medium). Spelling suggestions are not applied. Phase 1's census reported 160 species-level groups; counting its CSV by the same rule gives 162 before the two splits, and I did not trace the difference.
