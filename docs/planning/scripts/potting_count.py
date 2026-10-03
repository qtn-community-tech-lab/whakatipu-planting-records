#!/usr/bin/env python3
"""
potting_count.py - S2 (Phase 2): size the potting-on history and the over-typed Summary problem.
Read-only (openpyxl).  Prints counts only.  Run: python3 potting_count.py

Definitions
  session column : a column on a month sheet, right of the Total column, with a non-blank row-3 header
                   that holds at least one number in the species rows 4-101 (row 3 is the header row)
  session x species cell : a non-zero numeric cell in a session column
  Summary month cell : Summary rows 4-101, in a column whose row-3 header is a month name
  over-typed         : a Summary month cell that is a constant (number) where the book's own pattern is a
                       link to the month sheet ( =Aug!C4 ). Blank cells are not over-typed.
  mismatch           : Summary month cell (cached) differs from the sum of that month sheet's session cells
"""
import glob, re, datetime
from pathlib import Path
import openpyxl

BASE = Path("/home/claude/_source_copy/_ALL Plant Lists/3. Potting On")
MONNUM = {"aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12, "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6}
MONTHS = ("aug", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "jun")
FILES = sorted(glob.glob(str(BASE / "Archive" / "20*.xlsx"))) + [str(BASE / "2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx")]
FILES = [f for f in FILES if "Copy of" not in f]   # the Copy of 2025-26 is a duplicate (checked separately)

def prod_year_start(fname):
    m = re.search(r"(20\d\d)-\d\d JMN", fname) or re.search(r"(20\d\d)-\d\d JMN", fname.replace("2. ", ""))
    return int(m.group(1)) if m else None

def parse_header(h, sheet_month_num, start_year):
    """Return (date or None, how).  Uses the SHEET'S month and the production year (Aug-Jul), not the typed year."""
    if h is None: return None, "none"
    yr = start_year if sheet_month_num >= 8 else start_year + 1
    if isinstance(h, (datetime.datetime, datetime.date)):
        d, m = (h.day, h.month)
        if m != sheet_month_num and d == sheet_month_num: d, m = m, d       # swapped parse
        elif m != sheet_month_num: return None, "datetime-unresolved"
        try: return datetime.date(yr, m, d), "datetime"
        except ValueError: return None, "datetime-unresolved"
    t = str(h).strip()
    mm = re.match(r"^0?(\d{1,2})[/.]0?(\d{1,2})(?:[/.]\d{2,4})?", t)
    if mm and int(mm.group(2)) == sheet_month_num:
        try: return datetime.date(yr, int(mm.group(2)), int(mm.group(1))), "text"
        except ValueError: return None, "text-unresolved"
    return None, "label-only"

def is_num(x): return isinstance(x, (int, float)) and not isinstance(x, bool)
def mon(h): 
    h = str(h or "").strip().lower()
    return next((m for m in MONTHS if h.startswith(m)), None)

tot = dict(sheets=0, sessions=0, cells=0, plants=0)
for f in FILES:
    name = Path(f).name
    wf = openpyxl.load_workbook(f, read_only=True, data_only=False)
    wv = openpyxl.load_workbook(f, read_only=True, data_only=True)
    sheets = [s for s in wv.sheetnames if mon(s)]
    # month sheets
    month_sum, sess_n, cell_n, plants = {}, 0, 0, 0
    swapped_hdr = 0; hdr_total = 0; text_hdr = 0
    start_year = prod_year_start(name) or 2026
    pw = {"Wednesday": 0, "other weekday": 0, "weekend": 0, "no date": 0}
    dcls = {"real date (month matches sheet)": 0, "swapped, fixable by sheet-month rule": 0, "text dd/mm matches sheet": 0,
            "week label or no date": 0, "other text / unresolved": 0}
    for s in sheets:
        grid = [list(r) for r in wv[s].iter_rows(min_row=1, max_row=101, max_col=16, values_only=True)]
        if len(grid) < 4: continue
        hdr = grid[2]
        # Total column = first col whose header is 'Total'
        tcol = next((j for j, h in enumerate(hdr) if str(h or "").strip().lower() == "total"), 1)
        ms = 0
        for j in range(tcol + 1, len(hdr)):
            vals = [grid[i][j] for i in range(3, 101) if i < len(grid) and is_num(grid[i][j]) and grid[i][j] != 0]
            if hdr[j] is None and not vals: continue
            if vals:
                sess_n += 1; cell_n += len(vals); plants += sum(vals); ms += sum(vals)
                hdr_total += 1
                h = hdr[j]
                mnum = MONNUM[mon(s)]
                dd, how = parse_header(hdr[j], mnum, start_year)
                if dd is None: pw["no date"] += 1
                elif dd.weekday() == 2: pw["Wednesday"] += 1
                elif dd.weekday() < 5: pw["other weekday"] += 1
                else: pw["weekend"] += 1
                if isinstance(h, (datetime.datetime, datetime.date)):
                    if h.month == mnum: dcls["real date (month matches sheet)"] += 1
                    elif h.day == mnum: dcls["swapped, fixable by sheet-month rule"] += 1
                    else: dcls["other text / unresolved"] += 1
                else:
                    t = str(h or "").strip()
                    m2 = re.match(r"^(\d{1,2})/(\d{1,2})(/\d{2,4})?", t)
                    if h is None or re.match(r"^wk\s*\d", t, re.I): dcls["week label or no date"] += 1
                    elif m2 and int(m2.group(2)) == mnum: dcls["text dd/mm matches sheet"] += 1
                    else: dcls["other text / unresolved"] += 1
                if isinstance(h, (datetime.datetime, datetime.date)): 
                    # day<=12 datetimes are the swapped-parse ones; a real typed 'dd/mm' stays text
                    if h.day <= 12: swapped_hdr += 1
                else: text_hdr += 1
        month_sum[mon(s)] = ms
    # summary
    sg = [list(r) for r in wf["Summary"].iter_rows(min_row=1, max_row=101, max_col=26, values_only=True)]
    sv = [list(r) for r in wv["Summary"].iter_rows(min_row=1, max_row=101, max_col=26, values_only=True)]
    hdr = sg[2]
    mcols = {j: mon(h) for j, h in enumerate(hdr) if mon(h)}
    nform = ntyped = nblank = nmis = 0; summ_sum = {}
    for j, m in mcols.items():
        col = 0
        for i in range(3, 101):
            if i >= len(sg): break
            c = sg[i][j]
            if c is None: nblank += 1
            elif isinstance(c, str) and c.startswith("="): nform += 1
            else: ntyped += 1
            v = sv[i][j]
            if is_num(v): col += v
        summ_sum[m] = col
    # derived (non-month) Summary columns that the book's own pattern fills by formula
    derived = {}
    for j, h in enumerate(hdr):
        hl = str(h or "").strip().lower()
        if hl.startswith("goal set") or hl.startswith("total to be potted") or hl in ("total", "running total", "to go", "less t28"):
            cf = ct = 0
            for i in range(3, 101):
                if i >= len(sg): break
                c = sg[i][j]
                if isinstance(c, str) and c.startswith("="): cf += 1
                elif c is not None and not (is_num(c) and False): ct += 1
            derived[hl[:22]] = (cf, ct)
    nmis = sum(1 for m in mcols.values() if round(summ_sum.get(m, 0)) != round(month_sum.get(m, 0)))
    rows_used = sum(1 for i in range(3, 101) if any(sg[i][j] is not None for j in mcols))
    print(f"\n{name}")
    print(f"  month sheets {len(sheets)} | session columns with data {sess_n} | session x species cells {cell_n} | plants {plants:,.0f}")
    print("  after rule (sheet month + production year; dotted/slashed text allowed): " + "; ".join(f"{k} {v}" for k, v in pw.items()))
    print("  session-date classes: " + "; ".join(f"{k} {v}" for k, v in dcls.items()))
    print(f"  session headers: {swapped_hdr} stored as dates with day<=12 (swap-prone), {text_hdr} as text; {hdr_total} in all")
    print(f"  Summary month cells: {nform} formulas, {ntyped} typed constants, {nblank} blank; month columns {len(mcols)}")
    print("  derived Summary columns (formula, typed) over rows 4-101: " + "; ".join(f"{k}: {a}/{b}" for k, (a, b) in derived.items()))
    print(f"  Summary vs month-sheet totals: months differing {nmis} of {len(mcols)}; sum(Summary months) {sum(summ_sum.values()):,.0f} vs sum(month sheets) {sum(month_sum.values()):,.0f}")
    tot["sessions"] += sess_n; tot["cells"] += cell_n; tot["plants"] += plants
print("\nTOTAL all years: sessions", tot["sessions"], "cells", tot["cells"], "plants", f"{tot['plants']:,.0f}")
