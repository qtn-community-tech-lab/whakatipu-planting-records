# WRT data discovery — shared brief for every subagent

## Context

WRT (Whakatipu Reforestation Trust) is a community native-plant nursery in Queenstown. The nursery is called JMN (Jardine/JM Nursery) in file names. It grows about 94–98 native species from local seed for restoration planting. The data is a web of spreadsheets built up over about 15 years. The species lists don't agree with each other (93 in one place, 97 in another), there are typos in species names, and data has been re-keyed from one sheet to another.

**Production pathways**
- Seed → germination tray (Stage 1, not counted) → pricked out into **V150** (Stage 2) → potted up into **PB3** (Stage 3, growing) → planting-ready (Stage 4)
- Fast species (harakeke/flax, toetoe, tussocks, tī kōuka/cabbage tree): germination → **T28** → ready

**Recording points**
- Production planning / pricking-out list: future planting needs plus 10–15% contingency, giving a target for each species each season
- Weekly pricking-out log
- Weekly potting-up log
- Physical stocktakes about twice a year (V150, T28, PB3 split into growing and ready)
- Plant allocation to planting events
- Planting history by site

**Places**
- Sites: Whitechapel, Jardine Park, Slope Hill, Pigeon Island, and possibly others (Peace Park, Quail Rise, Gibbston, Shotover Wetlands, Morning Star, Boyes Cres, Akarua Corner, Alpine Retreat, Bush Creek, Kelvin Heights, Kingsview, Kiwi Park, QEII, Lake Hayes Pavilion, GY Lakefront, GY Bible Terrace, Shotover Primary… appear in file names)
- Sites contain planting areas (e.g. WH-06)
- Planting events are dated and typed: establishment, infill, replacement, enrichment
- Older records may only be known at site level

**Funder**
- Trees That Count (TTC) needs photos, species counts and geolocated planting sites. Paper4Trees is another plant-order/funder scheme.

**Seasons**
- Planting: Spring (Sep–Nov), Autumn (Mar–May)
- Production years: e.g. 2026/27. Potting-on workbooks run August–July.

**WRT's own summary of records** (`_Summary of Records JM Nursery.docx`) lists, in order: Forecasting sheet (3 years ahead, new); Seed collecting record; Seed records; Cutting records; Seed & Cutting results; **Seed Sowing List** (highlighted); **Pricking out list** (highlighted, Stage 2 — "becomes planting list TWO seasons later"); **Potting on list** (highlighted, Stage 3, starts each July, built from last year's pricking-out list plus the latest propagation stocktake); Nursery stocktake (V150 propagation stocktake; T28/PB3 at least twice a year); Plant Allocation list (one each spring and autumn); JMN Plant Allocation MASTER / Plants Out Master (historical record of everything planted, running tally).

## Hard rules

1. **Read only.** Never change, save over, move or rename anything in the source folder. The source copy is at `/home/claude/_source_copy/_ALL Plant Lists/`. Converted copies of legacy `.xls`/`.doc` files are at `/home/claude/_converted/` (same relative paths, `.xlsx`/`.docx`). All outputs go in `/home/claude/discovery/`.
2. **Use evidence, not guesses.** Every claim needs a reference: `file › sheet › cell range`. If something is inferred, mark it `confidence: low|medium|high` and say why.
3. **Describe, don't fix.** Don't correct spellings or reconcile numbers. Record what is there and flag problems.
4. **Sensitive data.** Seed-source locations (coordinates, directions, landowner names, property descriptions, GPS/GPX points) are sensitive. Report that such a column exists, how many rows it has and its format. **Never copy the values** into any output, including `examples`, quality-issue evidence, or your reply. Do the same for personal names and contact details beyond role-level ("volunteer name column present"). Species names, site names and plant counts are NOT sensitive.
5. **Don't re-read big data.** Read headers, a sample of about 15 rows, and per-column profiles from scripts. Never paste whole sheets into context. Never `cat` an xlsx.
6. **Prefer scripts.** Use Python (openpyxl, pandas) for counts, distinct values, date ranges and formula detection. Use reasoning to interpret the results.
7. **Write in British English.**

## Tools provided

- `python3 /home/claude/discovery/scripts/profile_workbook.py "<path relative to source root>" [--sheets "A|B"] [--sample 15]`
  Writes a JSON profile to `/tmp/claude-0/-home-claude/01b4c8c7-87fc-50d1-99da-bcff854e2f87/scratchpad/profiles/<slug>.json` and prints the path. Per sheet: `header_row` (guess — check it), `header_values`, `data_rows`, `n_data_rows`, `pre_header_rows`, `columns[]` (letter, header, type, type_mix, non_null_pct, distinct, top_values, formula_cells, formula_example, min/max, min_date/max_date), `formulas[]` (pattern, count, first_cell), `formula_sheet_refs`, `external_refs`, `error_cells`, `fills` (solid fill colours with example cells), `font_colours`, `merged`, `totals_rows`, `text_blocks`, `sample_rows`, `hidden`. It handles `.xls` via the converted copy and `.csv`.
  Read the JSON with the Read tool or a short Python snippet; for big sheets print only the parts you need.
- `/home/claude/discovery/00_inventory.csv` and `/home/claude/discovery/00_sheets.csv` — the inventory.
- For `.docx`: `python3 -c "from docx import Document; d=Document(p); print('\n'.join(x.text for x in d.paragraphs)); [print([c.text for c in r.cells]) for t in d.tables for r in t.rows]"` — truncate output sensibly.
- For `.gpx`: count `<wpt`, `<trkpt`, `<name>` tags with grep -c. Do not print coordinates.

## Concept list (for column mapping)

species_name, scientific_name, common_name, maori_name, container (V150/T28/PB3/germ), stage_number, readiness, quantity, target, contingency_pct, date, season_label, production_year, site, planting_area, planting_event, event_type, seed_source_code, seed_location (SENSITIVE), provenance_note, loss_quantity, loss_reason, supplier/bought_in, volunteer_count, photo_ref, coordinates/polygon, ttc_field, notes, unknown.
