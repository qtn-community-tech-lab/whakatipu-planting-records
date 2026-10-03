#!/usr/bin/env python3
"""
stocktake_count.py - S2 (Phase 2): per-event cell counts for the historic stocktakes (read-only).
For each spreadsheet-based event listed in 04e section 2.1 it counts, in the main species block:
  species rows (col A or B holds text), non-zero numeric count cells, typed-arithmetic cells (=41-10),
  text-in-count cells ("360+", "~96", "dead"), and the plants (sum of numeric cells in the count columns).
Count columns = all columns right of the species name up to column J, excluding columns whose header holds
'goal', 'projected', 'total', 'surplus', 'deficit', 'notes', 'comment', 'location', 'bench'.
Run: python3 stocktake_count.py
"""
import re, datetime
from pathlib import Path
import openpyxl

B = Path("/home/claude/_source_copy/_ALL Plant Lists/4. Stocktakes")
P = Path("/home/claude/_source_copy/_ALL Plant Lists/2. Propagation (cuttings and seeds)/_Pricking out lists/Archive")
EVENTS = [  # (event, file, sheet, header_rows, name_col(0-based), layout)
 ("1  5 Jun 2018",  B/"Old Stocktakes/JMN Stocktake 5 June 2018.xlsx", "STOCKTAKE", "A", 1),
 ("2  21 Oct 2018", B/"Old Stocktakes/JMN Stocktake 21 October 2018.xlsx", "STOCKTAKE", "A", 1),
 ("3  12 May 2019", B/"Old Stocktakes/JMN Stocktake 12 May 2019.xlsx", "STOCKTAKE", "A", 1),
 ("4  26 Oct 2019", B/"Old Stocktakes/JMN Stocktake 26 Oct 2019.xlsx", "STOCKTAKE", "A", 1),
 ("5  29 Jan 2020", B/"Old Stocktakes/JMN PB3 Stocktake 29 Jan 2020.xlsx", "STOCKTAKE", "A", 1),
 ("7  May 2020",    B/"Old Stocktakes/Stocktake Spreadsheet  May 2020.xlsx", "Sheet1", "A", 2),
 ("10 23 Feb 2022", B/"Old propagation stocktakes/2022 Prop Stocktake 23 Feb 2022.xlsx", "Sheet1", "A", 1),
 ("12 Oct 2022",    B/"Old Stocktakes/Stocktake Spreadsheet October 2022.xlsx", "Sheet1", "A", 2),
 ("13 31 Mar 2023", P/"4. 22-23 plant projections Final.xlsx", "Sheet1", "A", 1),
 ("14 Oct 2023",    B/"Old Stocktakes/Stocktake Spreadsheet October 2023.xlsx", "Sheet1", "A", 2),
 ("15 28 Feb 2024", B/"2025/Rolling Stocktakes Feb 2024.xlsx", "Sheet1", "A", 1),
 ("16 27 Mar 2024", B/"Old propagation stocktakes/2024 prop stocktake 27 March24.xlsx", "Sheet1", "A", 1),
 ("18 18 Oct 2024", B/"2025/18 October 24 JMN Stocktake.xlsx", "Oct 24", "A", 1),
 ("19 19 Feb 2025", B/"2025/19 Feb 2025 JMN Stocktake.xlsx", "Oct 24", "A", 1),
 ("20 31 Mar 2025", B/"2025/V150 stocktake 31.3.25.xlsx", "Sheet1", "A", 1),
 ("21 28 May 2025", B/"2025/20 May 2025 JMN Stocktake.xlsx", "Oct 24", "A", 1),
 ("23 31 Mar 2026", B/"Old propagation stocktakes/V150 stocktake 31 March 2026.xlsx", "Sheet1", "A", 1),
 ("22-25 2026 Master", B/"_Stocktake Master CURRENT.xlsx", "Autumn 2026 Master Stocktake", "A", 1),
]
SKIP = ("goal", "projected", "total", "surplus", "deficit", "note", "comment", "location", "bench", "pricked", "forecast")
ARITH = re.compile(r"^=\s*[\d.\s+\-*/()]+$")

def num(x): return isinstance(x, (int, float)) and not isinstance(x, bool)

print(f"{'event':18s}{'sp.rows':>8s}{'nonzero':>9s}{'arith':>7s}{'text':>6s}  count columns")
for ev, f, sh, _, _ in EVENTS:
    try:
        wf = openpyxl.load_workbook(f, read_only=True, data_only=False)
        wv = openpyxl.load_workbook(f, read_only=True, data_only=True)
        s = sh if sh in wf.sheetnames else wf.sheetnames[0]
        gf = [list(r) for r in wf[s].iter_rows(min_row=1, max_row=125, max_col=12, values_only=True)]
        gv = [list(r) for r in wv[s].iter_rows(min_row=1, max_row=125, max_col=12, values_only=True)]
    except Exception as e:
        print(ev, "could not open:", e); continue
    # species rows: first col (A or B) with alphabetic text, past header region (row>=4) and not a total/header word
    nc = 0
    for c in (0, 1):
        n = sum(1 for r in gv[3:] if isinstance(r[c], str) and re.match(r"^[A-Z][a-z]+( [a-z]+)?", r[c].strip()) and "total" not in r[c].lower())
        if n > nc: nc, name_col = n, c
    hdr_rows = gv[:6]
    cols = []
    for j in range(name_col + 1, 10):
        h = " ".join(str(r[j]) for r in hdr_rows if j < len(r) and r[j] is not None).lower()
        if any(k in h for k in SKIP): continue
        cols.append((j, h[:18]))
    sp_rows = [i for i, r in enumerate(gv) if i >= 3 and isinstance(r[name_col], str) and re.match(r"^[A-Z][a-z]+", r[name_col].strip()) and "total" not in r[name_col].lower()]
    nz = ar = tx = 0; pl = 0
    for i in sp_rows:
        for j, _ in cols:
            v, fx = gv[i][j] if j < len(gv[i]) else None, gf[i][j] if j < len(gf[i]) else None
            if isinstance(fx, str) and ARITH.match(fx): ar += 1
            if num(v) and v != 0: nz += 1; pl += v
            elif isinstance(v, str) and v.strip() and not isinstance(v, datetime.datetime): tx += 1
    print(f"{ev:18s}{len(sp_rows):8d}{nz:9d}{ar:7d}{tx:6d}  {[h for _, h in cols][:5]}")
