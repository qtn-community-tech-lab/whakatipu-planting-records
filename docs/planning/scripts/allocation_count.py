#!/usr/bin/env python3
"""
allocation_count.py - S2 (Phase 2): how much of the 2025-2026 allocation masters repeats Plants Out Master?
Read-only.  For three allocation masters it counts species x site cells and compares them with the
matching Plants Out Master season block (Spring 2025, Autumn 2026) at the grain species-group x proposed-site.
  "same"   = both sides non-zero and equal
  "differs"= both sides non-zero, different quantity
  "alloc only" / "history only" = present on one side
Spring 2026 has no Plants Out block (MASTER stops at Autumn 2026), so it is counted but not compared.
Site names are mapped with 04d_sites_variants.csv, species with 04a_species_variants.csv (same keys as history_count.py).
Run: python3 allocation_count.py
"""
import importlib.util, re
from collections import defaultdict, Counter
from pathlib import Path
import openpyxl
from openpyxl.utils import column_index_from_string as CI, get_column_letter as L

here = Path(__file__).parent
spec = importlib.util.spec_from_file_location("hc", here / "history_count.py"); hc = importlib.util.module_from_spec(spec); spec.loader.exec_module(hc)
sites, sp = hc.load_sites(), hc.load_species()
B5 = Path("/home/claude/_source_copy/_ALL Plant Lists/5. Seasonal Planting Lists & Collection Schedule")

def sgroup(name):
    h = sp.get(hc.norm(name)) if isinstance(name, str) else None
    return h["proposed_group"] if h else (hc.norm(name) if isinstance(name, str) else None)

def sname(raw):
    h = sites.get(hc.norm(raw))
    if not h: return None, None
    p = h["proposed_site"]
    if "paper4trees" in p.lower() or "paper 4 trees" in hc.norm(raw) or "paper for trees" in hc.norm(raw): return "SCHEME: Paper4Trees", None
    return re.sub(r"\s*\((?:[0-9]+[A-Z]?|no ID)\)\s*$", "", p), h["proposed_area_or_subsite"]

num = lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)

def read_alloc(path, sheet, hdr_row, c1, c2, first, last, name_col="C"):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sn = [s for s in wb.sheetnames if s.strip() == sheet.strip()][0]
    g = [list(r) for r in wb[sn].iter_rows(min_row=1, max_row=last, max_col=CI(c2), values_only=True)]
    cols = [j for j in range(CI(c1) - 1, CI(c2)) if g[hdr_row - 1][j] not in (None, "")]
    cells, unmapped, ncols = [], set(), 0
    for j in cols:
        raw = g[hdr_row - 1][j]
        if re.search(r"total|over|under|(ns\s*#)|combined", str(raw), re.I): continue
        ncols += 1
        s, a = sname(raw)
        if s is None: unmapped.add(j); s = "UNMAPPED:" + L(j + 1)
        for i in range(first - 1, last):
            v = g[i][j] if j < len(g[i]) else None
            nm = g[i][CI(name_col) - 1]
            if num(v) and v != 0 and isinstance(nm, str) and "total" not in nm.lower():
                cells.append((sgroup(nm), s, v, L(j + 1) + str(i + 1)))
    return cells, ncols, len(unmapped)

def by_col(cells):
    d = defaultdict(dict)
    for sg, s, v, ref in cells:
        d[re.sub(r"\d+", "", ref)][sg] = d[re.sub(r"\d+", "", ref)].get(sg, 0) + v
    return d

def column_match(alloc, po):
    """Mapping-free: does each allocation column have an identical (species -> quantity) vector in a Plants Out column?"""
    A, P = by_col(alloc), by_col(po)
    exact = near = 0; cells_exact = cells_near = cells_all = 0; plants_exact = plants_all = 0
    used = set()
    for ca, va in A.items():
        cells_all += len(va); plants_all += sum(va.values())
        best, bj = 0, None
        for cp, vp in P.items():
            if cp in used: continue
            inter = sum(1 for k, v in va.items() if vp.get(k) == v)
            j = inter / max(1, len(set(va) | set(vp)))
            if j > best: best, bj = j, cp
        if best == 1.0: exact += 1; cells_exact += len(va); plants_exact += sum(va.values()); used.add(bj)
        elif best >= 0.8: near += 1; cells_near += len(va); used.add(bj)
    print(f"  column-vector match (no site mapping needed): {len(A)} allocation columns; identical to a Plants Out column {exact} "
          f"({cells_exact} of {cells_all} cells, {plants_exact:,.0f} of {plants_all:,.0f} plants); near-identical (>=80% cells equal) {near} ({cells_near} cells); "
          f"no counterpart {len(A)-exact-near}; Plants Out columns with no allocation counterpart {len(P)-len(used)}")

def read_po(label_up):
    wb = openpyxl.load_workbook(hc.SRC, read_only=True, data_only=True)
    g = [list(r) for r in wb["MASTER"].iter_rows(min_row=1, max_row=106, values_only=True)]
    W = max(map(len, g)); [r.extend([None] * (W - len(r))) for r in g]
    cells = []
    for j in range(6, W):
        if str(g[0][j] or "").strip().upper() != label_up or str(g[3][j]).strip().upper() == "TOTAL": continue
        s, a = sname(g[3][j])
        if s is None and hc.norm(g[3][j]).startswith("shotover river"): s = "Shotover River"
        for i in range(7, 106):
            v = g[i][j]
            if num(v) and v != 0: cells.append((sgroup(g[i][3]), s or "UNMAPPED:" + L(j + 1), v, L(j + 1) + str(i + 1)))
    return cells

def compare(alloc, po, label):
    A, P = defaultdict(float), defaultdict(float)
    for sg, s, v, _ in alloc: A[(sg, s)] += v
    for sg, s, v, _ in po: P[(sg, s)] += v
    keys = set(A) | set(P)
    same = sum(1 for k in keys if k in A and k in P and A[k] == P[k])
    diff = sum(1 for k in keys if k in A and k in P and A[k] != P[k])
    ao = sum(1 for k in keys if k in A and k not in P); po_ = sum(1 for k in keys if k in P and k not in A)
    print(f"  compare with Plants Out {label}: species x site pairs: alloc {len(A)}, history {len(P)}; same {same}, differs {diff}, alloc only {ao}, history only {po_}")
    print(f"    plants: alloc {sum(A.values()):,.0f} vs history {sum(P.values()):,.0f}; "
          f"history plants on pairs that are 'same': {sum(P[k] for k in keys if k in A and k in P and A[k]==P[k]):,.0f} "
          f"({100*sum(P[k] for k in keys if k in A and k in P and A[k]==P[k])/max(1,sum(P.values())):.0f}%)")
    sites_a = {s for _, s in A}; sites_p = {s for _, s in P}
    print(f"    sites: alloc {len(sites_a)}, history {len(sites_p)}, in both {len(sites_a & sites_p)}")

CASES = [
 ("Spring 2025 master", B5 / "Archive/2025 Spring Planting Lists/JMN Plant Allocation Master SPRING 2025.xlsx", "Spring 2025", 4, "P", "AL", 6, 105, "SPRING 2025"),
 ("Autumn 2026 master", B5 / "2026 Autumn Plant Lists/JMN Plant Allocation Master AUTUMN 2026.xlsx", "Autumn 2026", 4, "O", "AO", 6, 119, "AUTUMN 2026"),
 ("Spring 2026 plan", B5 / "2026 Spring planting/_JMN Plant Allocations Spring 2026.xlsx", "Plant Allocations ", 5, "V", "AV", 6, 107, None),
]
for name, path, sheet, hr, c1, c2, r1, r2, po_label in CASES:
    cells, ncols, unm = read_alloc(path, sheet, hr, c1, c2, r1, r2)
    print(f"\n{name}: site columns {ncols} (unmapped headers {unm}); species x site cells (non-zero) {len(cells)}; plants {sum(c[2] for c in cells):,.0f}; species rows used {len({c[0] for c in cells})}")
    sch = Counter(c[1].startswith("SCHEME") for c in cells)
    print(f"  of which scheme (Paper4Trees) cells: {sch[True]}")
    if po_label:
        po = read_po(po_label)
        print(f"  Plants Out {po_label.title()} block: cells {len(po)}, plants {sum(c[2] for c in po):,.0f}")
        compare(cells, po, po_label.title())
        column_match(cells, po)
