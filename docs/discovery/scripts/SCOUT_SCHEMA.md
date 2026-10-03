# Workbook Scout — task and contract

For each sheet in your batch:
1. Run the profiling script. Check the header-row guess against the sample rows and `pre_header_rows`; headers are often not on row 1 and there may be more than one table on a sheet. Note formula columns and what they refer to, cross-sheet and cross-workbook references, colour or formatting that carries meaning (e.g. red = dead), totals rows, notes and blocks of free text.
2. Look at about 15 sample rows to understand what they mean.
3. Decide what **one row represents**: the grain. Examples: "one species per season with target and pricked-out tally", "one species × container count at one stocktake", "one planting event × species".
4. Map each column to a **candidate concept** from the concept list.
5. List quality problems with examples and cell references: mixed types, typos and variants in species names, merged headers, summary rows mixed in with data, hard-coded numbers that look like they were pasted in from elsewhere, broken formulas (#REF!), date formats, blank padding.

Where the batch notes say to SAMPLE a file (an old version), profile it but keep its `sheets[].columns` to the species column and 2–3 key columns, and put what differs from the fully profiled version in `purpose_guess`/`notes`. Exact duplicates named in the notes are not profiled: add them as a file entry with `is_version_of` set and `sheets: []`.

For `.docx`/`.doc`/`.gpx` files, make one sheet entry named `(document)` with `role: "notes"`, `grain` describing the content, `columns: []`, and put the substance in `purpose_guess` and `quality_issues`/`notes`.

**Return only one JSON object** matching the `ScoutReport` schema below. Also save it to `/home/claude/discovery/02_scouts/{batch_id}.json` with the Write tool. Your whole reply must be the JSON, with no other text, no code fences.

```json
{
  "batch_id": "string",
  "files": [{
    "path": "string (relative to source root, exactly as in the batch)",
    "purpose_guess": "string (one sentence)",
    "workflow_stage": "forecast|production_plan|pricking_out|potting_up|stocktake|allocation|planting_history|species_list|seed_provenance|ttc_reporting|site_map|admin|unknown",
    "years_covered": "e.g. 2019–2024 or unknown",
    "is_version_of": "path|null",
    "sheets": [{
      "name": "string",
      "role": "data|summary|lookup|form|notes|chart|empty",
      "header_row": 0,
      "data_rows": "start-end",
      "grain": "string: what one row represents",
      "columns": [{
        "letter": "A",
        "header": "raw header text",
        "concept": "from the concept list",
        "type": "text|int|float|date|bool|mixed|formula",
        "non_null_pct": 0,
        "distinct": 0,
        "examples": ["≤5 values; NEVER sensitive values"],
        "notes": "string"
      }],
      "formulas": [{"range": "A1:A9", "pattern": "e.g. =SUM(D2:G2)", "refs_other_sheets": ["Sheet!A:B or [Book]Sheet"]}],
      "species_name_column": "letter|null",
      "species_distinct_count": 0,
      "quality_issues": [{"issue": "string", "evidence": "file › sheet › range", "severity": "low|med|high"}],
      "sensitive_columns": ["letter + description, values withheld"],
      "confidence": "low|medium|high"
    }]
  }],
  "open_questions_for_wrt": ["questions only Anna/Sarah can answer"]
}
```

Rules for the JSON: every sheet listed in your batch must appear (hidden and empty ones included, with `role: "empty"` if so). `examples` must never contain seed locations, coordinates, landowner names, personal names, phone numbers or emails. Keep `examples` to 5 or fewer short strings. Keep the whole report under about 60 KB: for sheets with more than 40 columns, give full detail for the first 25 and summarise repeating column groups in one entry with `letter` as a range (e.g. "K–AZ").
