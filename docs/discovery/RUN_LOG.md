# RUN_LOG — WRT data discovery

Run date: 3 Oct 2026 (NZDT), orchestrated by Claude Fable 5.1; every subagent set to `model: sonnet` (Sonnet 5.5). Source folder read-only; outputs in `discovery/`.

| Stage | Agents | Outcome | Time |
|---|---|---|---|
| S0 Inventory | orchestrator (script) | inventory.py: 190 files, 381 sheets; 10 legacy files converted | ~1 min |
| S1 Triage | orchestrator | 24 batches, 7 duplicate groups, priorities from Summary of Records | — |
| S2 Scouts B01–B10 | 10 × Sonnet 5.5 | all passed contract check | 106–274 s each |
| S2 Scouts B11–B20 | 10 × Sonnet 5.5 | all passed; B16 '34 of 59' later corrected to 35 of 60 | 107–398 s each |
| S2 Scouts B21–B24 | 4 × Sonnet 5.5 | B23 archive copy reported as diff (accepted); B24 lake-name note scrubbed | 129–340 s each |
| S3 Contract check | orchestrator (script) | 359 sheets catalogued; 0 schema failures; 0 sensitive hits by regex; 0 retries needed | — |
| S4a Species census | Sonnet 5.5 | 04a_* + species_census.py | ~19 min |
| S4b Pathways | Sonnet 5.5 | 04b_* | ~17 min |
| S4c Forecasting | Sonnet 5.5 | 04c_* (two wording fixes applied after S6) | ~19 min |
| S4d Sites/events | Sonnet 5.5 | 04d_* | ~19 min |
| S4e Stock/losses | Sonnet 5.5 | 04e_* | ~21 min |
| S4f Conventions | Sonnet 5.5 | 04f_* | ~21 min |
| S4g Reporting/sensitivity | Sonnet 5.5 | 04g_* (first launch completed its files before a user interrupt; relaunch cancelled by user — outputs verified present) | ~15 min |
| Live artefact | Sonnet 5.5 (extra, user request) | discovery/live/progress.html published | ~5 min |
| S5 Lineage | Sonnet 5.5 | 05_lineage_edges.csv (122 edges), 05_lineage.mmd, lineage_check.py | ~16 min |
| S6 Sceptic | Sonnet 5.5 | 06_verification.md: 6 PASS / 4 PARTIAL / 0 FAIL; leak scan clean bar 1 place name + script redaction lists | ~13 min |
| Post-S6 fixes | orchestrator | B24 scrubbed; B16 and 04c wording fixed; redaction lists moved to /home/claude/_private/ | — |
| S7 Synthesis | orchestrator | DATA_SHAPE.md, RUN_LOG.md | — |

**Totals:** 24 scouts + 7 specialists + 1 lineage + 1 verifier + 1 artefact builder = 34 Sonnet agents; 0 retries; 0 failures. Scouts ran in three waves (10/10/4); specialists in one wave of 7.

**Interrupts:** the user interrupted twice during S4 (to supply the Google Sheets links for WRT's ten records, and to ask for a live progress page). The S4g agent had already written its outputs; its relaunch was cancelled and the existing outputs used.

**Deviations from the brief:** B23 reported the archive copy of Plants Out Master as a cell-by-cell diff rather than 12 separate sheet entries (accepted, noted in 03_gaps.md). Profiles were written to the session scratchpad rather than `discovery/` so raw sample values never sit in the shared folder.

**Files produced**
```
discovery/
  00_inventory.csv, 00_sheets.csv, 01_batches.json
  02_scouts/B01…B24.json
  03_sheet_catalogue.csv, 03_gaps.md
  04a_species_census.md, 04a_species_variants.csv
  04b_pathways.md, 04b_container_terms.csv
  04c_forecasting.md
  04d_planting_history.md, 04d_sites_variants.csv
  04e_stock_and_losses.md
  04f_conventions.md, 04f_identifier_patterns.csv
  04g_reporting.md, 04g_sensitivity_register.csv
  05_lineage_edges.csv, 05_lineage.mmd, 05_lineage_checks.json
  06_verification.md
  DATA_SHAPE.md, RUN_LOG.md
  live/progress.html (published artefact)
  scripts/ (inventory.py, profile_workbook.py, contract_check.py, species_census.py, lineage_check.py, briefs)
```
