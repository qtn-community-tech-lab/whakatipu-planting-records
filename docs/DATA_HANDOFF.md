# WRT — extracted data handoff (for the app planner)

*3 Oct 2026. Everything below is in this repo under `docs/planning/prototype/` (data) and `docs/planning/scripts/` (how it was made). Nothing in WRT's source spreadsheets was changed. These CSVs are retained as inputs to the one-off workbook import. The live app now reads Supabase only.*

## What we have

| File | Rows | What one row is | Status |
|---|---|---|---|
| `planting_history.csv` | 5,449 | one species × one site × one season, Autumn 2015 → Autumn 2026 (23 seasons), 140,068 plants | **Ready to use.** 87.8% of rows fully resolved; 12.2% flagged for a WRT ruling or a one-time confirmation, never guessed |
| `species_master_proposed.csv` | 164 | one species ID with canonical handle, status (core / appended / contested / seed-log only), over-5 m flag (TTC), threatened flag | Ready; 24 IDs are contested pairs awaiting ~7 rulings |
| `species_crosswalk.csv` | 728 | one raw spelling found anywhere in the folder → species ID, with alias type (typo, abbreviation, old genus, common name, Māori name…) and confidence | Ready; resolves 98.5% of all species cells in the folder |
| `site_crosswalk.csv` | 134 | one site header string as typed → site ID, canonical name, group, class (Keystone / Community / School), precision | Ready; 96.8% of history rows carry a site ID |
| `history_reconciliation.csv` | 29 | generated total per season vs the workbook's own TOTAL cells | All 23 seasons match exactly |

## `planting_history.csv` columns

`record_id, year, season (Autumn|Spring), season_label_original, site_original, site_id_proposed, site_group_proposed, site_class (K|C|S), species_original, species_id_proposed, species_canonical, quantity, precision (site|subsite|area|scheme|unknown), confidence (high|medium|low), needs_review (Y|N), review_reason, source_file, source_sheet, source_cell`

Keep `*_original` and `source_cell` in the app's data layer: they are the audit trail back to the exact spreadsheet cell.

## How it was made (short version)

1. **Discovery (34 agents, read-only).** Inventoried 190 files / 381 sheets; profiled every sheet by script; found that the planting history lives in one grid (`Plants Out Master › MASTER`: 98 species rows × ~411 site columns in 23 season blocks) and that the species list is a 98-row block retyped into 48 sheets with shared misspellings.
2. **Species census.** Every string in every species column (42,576 cells, 1,799 distinct strings) was normalised (case, spaces, brackets), then grouped by fuzzy matching for typos, prefix matching for abbreviations, and explicit tables for old genus names (Hebe/Leonohebe → Veronica), common and Māori names. Each group got an opaque ID (`SP-001`…). Contested pairs were kept as separate IDs, not merged.
3. **Site census.** The 116 header spellings in `MASTER` row 4 were grouped and tied to the site IDs WRT already keeps (`MASTER` row 5 and the `SUMMARY SITES` register), with class attached. Known ID faults (a 2015 old numbering, two sites swapped in 2024–25, `!!A`) were handled by rule and flagged.
4. **Unpivot.** `build_history_prototype.py` reads `MASTER` and emits one row per non-zero cell with both crosswalks applied. Anything uncertain is left blank with `needs_review = Y` and a reason.
5. **Reconcile.** Per-season totals are compared with the workbook's own TOTAL cells (all 23 equal). The three different grand totals the workbook shows (140,049 / 139,948 / 135,413) are each explained to the plant (a SUM range one row short; a mistyped 4,389; Autumn 2026 not yet added).
6. **Verify.** An independent sceptic agent re-opened source cells for a random sample of claims (0 of 10 failed) and scanned every output for leaked sensitive values (none).

Regenerate with `python3 docs/planning/scripts/build_history_prototype.py` then `history_queries.py` (needs the source export, which is not in the repo).

## What it already answers (see `history_queries_output.md`)

- Whitechapel in 2019: 2,105 plants, 32 species (1,005 autumn / 1,100 spring)
- Whitechapel year by year with a running total (8,096 by end of 2019)
- any species across all 23 seasons; totals by season; sites planted in a season

## Caveats the UI must respect

1. **"Planted" means "allocated".** Spreadsheet history was the allocation sheet retyped; treat quantities as recorded, not verified. Show it as a label, not a footnote.
2. **Flags are data.** 667 rows (26% of plants — mostly the 29,000-plant Slope Hill 2024 columns and contested species) carry `needs_review = Y`. Every total shown must display a recorded / needs-review split; never show a bare grand total.
3. **Precision is site-level.** 56% of rows are sub-site (a registered parcel), 41% site, 0.2% area. No planting dates, event types, volunteer counts, coordinates or photos exist. Do not invent them.
4. **IDs stay hidden.** Users see canonical names; `SP-xxx` and site IDs are join keys only. Search must ignore macrons and tolerate typos (the crosswalk's `match_key` column is the lookup).
5. **Not in scope yet:** current nursery stock, seed lots, potting sessions. Those datasets are not at this level of cleanliness; only the history is.
6. **Sensitive data:** none of these files contain seed-source locations or personal data, and the raw spreadsheet export must never be committed.
