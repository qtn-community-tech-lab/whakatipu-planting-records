#!/usr/bin/env python3
"""
allocation_pdf_count.py - S2 (Phase 2): can the 2022-2025 allocation PDFs be turned into species x site x season rows?
Read-only.  Uses `pdftotext -layout`.  For each per-site allocation PDF it parses the three-block "Plant name / No. of plants"
grid, compares the parsed sum with the printed TOTAL NUMBER OF PLANTS ALLOCATED, and records whether a planting date is typed.
Then compares each PDF's total with the Plants Out Master column total for the same season and mapped site.
Run: python3 allocation_pdf_count.py
"""
import re, subprocess, importlib.util
from pathlib import Path
from collections import defaultdict, Counter
import openpyxl
from openpyxl.utils import get_column_letter as L

here = Path(__file__).parent
spec = importlib.util.spec_from_file_location("hc", here / "history_count.py"); hc = importlib.util.module_from_spec(spec); spec.loader.exec_module(hc)
sites = hc.load_sites()
A = Path("/home/claude/_source_copy/_ALL Plant Lists/5. Seasonal Planting Lists & Collection Schedule/Archive")
DIRS = {"2022 Spring Plant Allocation Sheets": ("Spring", 2022), "2023 Autumn Plant Allocation Sheets": ("Autumn", 2023),
        "2024 Autumn Plant Lists": ("Autumn", 2024), "2024 Spring PLant Lists": ("Spring", 2024), "2025 Autumn Plant Lists": ("Autumn", 2025)}

# Plants Out column totals per (season, year, proposed site)
wb = openpyxl.load_workbook(hc.SRC, read_only=True, data_only=True)
g = [list(r) for r in wb["MASTER"].iter_rows(min_row=1, max_row=107, values_only=True)]
W = max(map(len, g)); [r.extend([None] * (W - len(r))) for r in g]
po = defaultdict(float)
for j in range(6, W):
    lab, hdr = g[0][j], g[3][j]
    s, y = hc.season_of(lab)
    if not s or hdr in (None, "") or str(hdr).strip().upper() == "TOTAL": continue
    h = sites.get(hc.norm(hdr))
    key = re.sub(r"\s*\((?:[0-9]+[A-Z]?|no ID)\)\s*$", "", h["proposed_site"]) if h else (hc.norm(hdr))
    po[(s, y, key)] += sum(v for v in (g[i][j] for i in range(7, 106)) if isinstance(v, (int, float)))

def parse(pdf):
    txt = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True).stdout
    lines = txt.splitlines()
    n_tot = sum("TOTAL NUMBER OF PLANTS ALLOCATED" in l.upper() for l in lines)
    if n_tot == 0: return None
    if n_tot > 1: return "MULTI"
    ent = []
    for l in lines[3:]:
        if re.match(r"\s*(Subtotal|TOTAL|Notes|Plant name|No\. of|plants|Number of plants)", l, re.I): continue
        toks = [t for t in re.split(r"\s{2,}", l.strip()) if t]
        cur = None
        for t in toks:
            if re.fullmatch(r"\d{1,5}", t):
                if cur is not None and cur[1] is None: cur[1] = int(t)
            elif re.match(r"^[A-Z][a-z]+( [A-Za-z\-]+)?", t) and "Location" not in t:
                cur = [t, None]; ent.append(cur)
    stated = None
    for l in lines:
        m = re.search(r"TOTAL NUMBER OF PLANTS ALLOCATED\s+(\d+)", l, re.I)
        if m: stated = int(m.group(1))
    head = lines[0].strip()
    pdate = ""
    for l in lines[:4]:
        m = re.search(r"Planting Date:\s*(.*)$", l)
        if m: pdate = m.group(1).strip()
    return head, ent, stated, pdate

tot = Counter(); rows = []
for d, (season, year) in DIRS.items():
    for pdf in sorted((A / d).glob("*.pdf")):
        r = parse(pdf)
        if r is None: tot["not a per-site list"] += 1; continue
        if r == "MULTI": tot["multi-site collation (needs page split)"] += 1; continue
        head, ent, stated, pdate = r
        q = [e for e in ent if e[1]]
        ps = sum(e[1] for e in q)
        site_guess = re.sub(r"\s*\(.*?\)|\s*(Spring|Autumn)\s*\d{4}.*$", "", head).strip()
        h = sites.get(hc.norm(site_guess))
        key = re.sub(r"\s*\((?:[0-9]+[A-Z]?|no ID)\)\s*$", "", h["proposed_site"]) if h else None
        po_t = po.get((season, year, key)) if key else None
        rows.append((season, year, len(q), ps, stated, bool(pdate), po_t))
        tot["lists"] += 1; tot["records"] += len(q); tot["plants parsed"] += ps
        tot["parsed == printed"] += int(stated == ps); tot["planting date typed"] += int(bool(pdate))
        if po_t is not None: tot["site matched to Plants Out"] += 1; tot["total equals Plants Out column"] += int(abs(po_t - (stated or ps)) < 0.5)
for k, v in tot.items(): print(f"{k:34s}{v:8,d}")
by = defaultdict(lambda: [0, 0, 0, 0, 0, 0])
for s, y, n, ps, st, d, pt in rows:
    b = by[(y, s)]; b[0] += 1; b[1] += n; b[2] += ps; b[3] += int(d); b[4] += int(pt is not None); b[5] += int(pt is not None and abs(pt - (st or ps)) < 0.5)
print(f"\n{'season':14s}{'lists':>6s}{'records':>8s}{'plants':>8s}{'dated':>6s}{'matched':>8s}{'equal':>6s}")
for (y, s), b in sorted(by.items()): print(f"{s+' '+str(y):14s}{b[0]:6d}{b[1]:8d}{b[2]:8,d}{b[3]:6d}{b[4]:8d}{b[5]:6d}")
