# 03 — Gaps and contract-check notes

## Contract check (S3)

All 24 ScoutReports parsed, carried the required keys, and used valid enumerations. The automated scan found no coordinate-, email- or phone-shaped strings in any `examples` array and no `examples` on any column mapped to `seed_location`.

One coverage flag, accepted without re-dispatch:

- **B23_plants_out_master** — `_MASTER Nursery records and templates/archive/_JMN Plants Out Master.xlsx` was reported as a cell-by-cell diff against the live copy (identical cached values on all 11 shared sheets except 3 cells, plus one extra sheet `Copy of Trees that Count Audit `) rather than as 12 separate sheet entries. The batch notes asked for exactly that, so the sheets are covered by reference to the live file's entries.

## Things the scouts could not read or resolve

- **Legacy formats**: all 8 `.xls` and 2 `.doc` files converted cleanly with LibreOffice; scouts read the converted copies. No conversion failures.
- **`.csv` (Nursery Stock and planting list Feb 2026)**: Windows-1252 encoded; the profiler's csv path failed on it, so the B16 scout compared it to the sibling `.xlsx` by script instead (967/968 cells match).
- **V150 stocktake files (2.6 MB each)**: carry a phantom used range of 1,048,576 rows; real data ends at row 92. Profiler capped at 3,000 rows — nothing missed.
- **External links**: `3. Seed & Cutting results` versions link to a `2a Seed records.xls` (OneDrive) that is not in the folder; those cells are cached `#REF!`/`#ERROR!`. The forecasting SUMMARY points at a `SCHOOLS` sheet that does not exist in the workbook.
- **PDFs (62)**: listed in the inventory only. They are printed allocation sheets (2022–2025), old stocktake printouts (2020–2022), Paper4Trees order forms, a QLDC seed-collection approval letter, a supplier invoice and quote, and a 2026 PB3 stocktake printout. Not read, per the brief. Where an xlsx of the same season exists, the PDF is a print of it.
- **Images**: `Untitled document.docx` (2025 Spring Planting Lists) contains only two images — a site plan with zones A–E and a polygon labelled 150.98 m² — which were not OCR'd.
- **Cell comments**: present in the Oct 2024 / May 2025 stocktakes and the allocation masters; recorded as existing (with author names withheld), content not profiled.
