# Cross-cutting Specialist — shared instructions

Read `/home/claude/discovery/scripts/SHARED_BRIEF.md` first (context, hard rules, tools). Then:

## Your inputs
- All 24 ScoutReports: `/home/claude/discovery/02_scouts/B*.json` (ScoutReport schema: files[] → sheets[] → columns[] with concept mapping, formulas, quality_issues, sensitive_columns; plus open_questions_for_wrt). Several are 40–90 KB: load them with a short Python snippet and pull out only what you need (e.g. all columns whose concept matches X), rather than reading every file whole with the Read tool.
- Sheet catalogue: `/home/claude/discovery/03_sheet_catalogue.csv` (one row per sheet: file, sheet, workflow_stage, grain, header_row, data_rows, species_column, years, confidence).
- Inventory: `/home/claude/discovery/00_inventory.csv`, `/home/claude/discovery/00_sheets.csv`.
- Batch plan with version families: `/home/claude/discovery/01_batches.json`.
- You may re-open specific source ranges **only to check a point** or to pull distinct values by script, using `profile_workbook.py` or openpyxl directly on `/home/claude/_source_copy/_ALL Plant Lists/…` (or `/home/claude/_converted/…` for .xls). Read-only. Never paste whole sheets into context.

## Your outputs
Write exactly the files named in your task, into `/home/claude/discovery/`. The markdown report must:
- be in British English, plain language, readable by WRT staff as well as developers;
- cite evidence as `file › sheet › range` for every claim and mark inferences `confidence: low|medium|high` with the reason;
- never contain seed-source locations, coordinates, landowner names, personal names, emails or phone numbers (describe such columns by location and type only);
- end with a section headed **Questions for WRT** (only questions Anna/Sarah/Helen could answer; keep to the most useful 5–10).

CSV outputs use UTF-8, a header row, and the columns named in your task.

Reply with a short summary (≤ 300 words) of what you found and the paths you wrote. Do not paste the report into the reply.
