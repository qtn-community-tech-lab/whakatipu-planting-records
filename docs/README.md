# WRT documentation: discovery and planning

Documentation for the Wakatipu Reforestation Trust (WRT) nursery and planting software work.

## The two phases

- **Phase 1, discovery** (`discovery/`): a read-only survey of the nursery's source spreadsheets. It records what data exists, how it is shaped, how sheets relate, where the gaps are and what is sensitive. Output: a data-shape report, catalogues, per-topic findings (04a to 04g), a lineage graph and a verification report.
- **Phase 2, planning** (`planning/`): turns those findings into a practical plan. Output: evidence reports (00 to 09), a practical plan, options, a migration plan, an adoption review and a small prototype (crosswalks and a planting-history table) with the scripts that built it.

## How to read

1. Start with [`discovery/DATA_SHAPE.md`](discovery/DATA_SHAPE.md).
2. Then read [`planning/PRACTICAL_PLAN.md`](planning/PRACTICAL_PLAN.md).
3. Dip into the numbered reports below for evidence behind any claim.

## Application reference guides

- [Species photo guide](species-photo-guide.md): shared names, identification profiles, photo sources, attribution and future offline use.
- [Species coverage audit and remaining work](species-photo-guide.md#coverage-audit-and-remaining-work): the reviewed 95-entry coverage, nine batches of five, photo-to-species checks, remaining identity/image/name gaps and the 69 register-only entries.

## Sensitivity rule

These docs hold no seed-source locations and no personal data. Coordinates, emails and the one surname found in file paths were scrubbed (surname shown as `[name]`). The source spreadsheet folder must never be committed to this repo.

## Discovery files

- [DATA_SHAPE.md](discovery/DATA_SHAPE.md), [RUN_LOG.md](discovery/RUN_LOG.md), [03_gaps.md](discovery/03_gaps.md), [06_verification.md](discovery/06_verification.md)
- [00_inventory.csv](discovery/00_inventory.csv), [00_sheets.csv](discovery/00_sheets.csv), [01_batches.json](discovery/01_batches.json), [03_sheet_catalogue.csv](discovery/03_sheet_catalogue.csv)
- 04a: [species census](discovery/04a_species_census.md), [variants](discovery/04a_species_variants.csv)
- 04b: [pathways](discovery/04b_pathways.md), [container terms](discovery/04b_container_terms.csv)
- 04c: [forecasting](discovery/04c_forecasting.md)
- 04d: [planting history](discovery/04d_planting_history.md), [site variants](discovery/04d_sites_variants.csv)
- 04e: [stock and losses](discovery/04e_stock_and_losses.md)
- 04f: [conventions](discovery/04f_conventions.md), [identifier patterns](discovery/04f_identifier_patterns.csv)
- 04g: [reporting](discovery/04g_reporting.md), [sensitivity register](discovery/04g_sensitivity_register.csv)
- Lineage: [edges](discovery/05_lineage_edges.csv), [graph (.mmd)](discovery/05_lineage.mmd)
- Scouts: `discovery/02_scouts/B01` to `B24` (JSON, one per batch)
- Scripts: [SHARED_BRIEF](discovery/scripts/SHARED_BRIEF.md), [SPECIALIST_BRIEF](discovery/scripts/SPECIALIST_BRIEF.md), [SCOUT_SCHEMA](discovery/scripts/SCOUT_SCHEMA.md), [WRT_SUMMARY_LINKS](discovery/scripts/WRT_SUMMARY_LINKS.md), and the `.py` files in `discovery/scripts/`

## Planning files

- [PRACTICAL_PLAN.md](planning/PRACTICAL_PLAN.md), [RUN_LOG.md](planning/RUN_LOG.md)
- [00 evidence summary](planning/00_evidence_summary.md)
- 01: [species](planning/01a_species.md), [production](planning/01b_production.md), [potting](planning/01c_potting.md), [stock](planning/01d_stock.md), [allocation](planning/01e_allocation.md), [reporting](planning/01f_reporting.md)
- [02 historical data](planning/02_historical_data.md), [03 staff needs](planning/03_staff_needs.md)
- 04: [master data](planning/04a_master_data.md), [spreadsheet future](planning/04b_spreadsheet_future.md), [history browser](planning/04c_history_browser.md), [software opportunities](planning/04d_software_opportunities.md), [transition](planning/04e_transition.md)
- [05 spreadsheet system](planning/05_spreadsheet_system.md), [06 lightweight software](planning/06_lightweight_software.md), [07 migration plan](planning/07_migration_plan.md), [08 options](planning/08_options.md), [09 adoption review](planning/09_adoption_review.md)
- Sources: [PHASE2_BRIEF](planning/_sources/PHASE2_BRIEF.md), [staff_context](planning/_sources/staff_context.md)
- Prototype (`planning/prototype/`): [history_queries_output.md](planning/prototype/history_queries_output.md), [history_reconciliation.csv](planning/prototype/history_reconciliation.csv), [planting_history.csv](planning/prototype/planting_history.csv), [site_crosswalk.csv](planning/prototype/site_crosswalk.csv), [species_crosswalk.csv](planning/prototype/species_crosswalk.csv), [species_master_proposed.csv](planning/prototype/species_master_proposed.csv)
- Scripts and outputs: `planning/scripts/*.py` and `*_output.txt`
