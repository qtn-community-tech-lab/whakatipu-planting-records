#!/usr/bin/env python3
"""S5 Lineage Tracer: value-matching checks for 'rekeyed' hops, plus assembly of the lineage edge list.

Read-only. Opens workbooks under /home/claude/_source_copy/_ALL Plant Lists/ with openpyxl.
Writes (all under /home/claude/discovery/):
    05_lineage_edges.csv   - from, to, type, evidence, confidence
    05_lineage.mmd         - Mermaid flowchart (top nodes only)
    05_lineage_checks.json - raw match numbers (for audit)

Matching rule for 'rekeyed' hops
    * species names are aligned after NFKC, non-breaking-space removal, whitespace collapse, trim and case-fold
      (nothing else: typos stay typos, so a typo shows up as an unmatched name);
    * "compared" = species present on both sides where either value is non-zero (blank counts as 0);
    * "equal" = absolute difference < 0.5.
Evidence strings report  equal/compared  and, where useful, aligned/left/right name counts.

Usage:  python3 lineage_check.py            (runs every check, writes the three outputs)
"""
import csv, glob, json, os, re, sys, unicodedata
from collections import Counter, defaultdict, OrderedDict
from datetime import datetime, date

import openpyxl
from openpyxl.utils import column_index_from_string as CI, get_column_letter as CL

SRC = "/home/claude/_source_copy/_ALL Plant Lists/"
OUT = "/home/claude/discovery/"
PROFILES = glob.glob("/tmp/claude-0/-home-claude/*/scratchpad/profiles")

# --------------------------------------------------------------------------------------
# short names used in the CSV / diagram (personal names are masked: [name])
# --------------------------------------------------------------------------------------
F = {
    "FORECAST":   "1. Forecasting/_JMN PLANT Forecasting 2026_2027.xlsx",
    "KEYSTONE25": "1. Forecasting/Archive to sort through/Aug 2025 Keystone Sites Plants Summary.xlsx",
    "MPL2024":    "1. Forecasting/Archive to sort through/Master plant list 2024.xlsx",
    "NSTEMPLATE": "1. Forecasting/Blanks templates (active)/Nursery Stock and planting list TEMPLATE.xlsx",
    "NEILL":      "_MASTER Nursery records and templates/Standard Annual Plant List for JMN (Neill) MASTER.xlsx",
    "SUGGESTED":  "2. Propagation (cuttings and seeds)/Suggested plant speies and numbers each site per year. 2025 onwards.xlsx",
    "PO2425":     "2. Propagation (cuttings and seeds)/_Pricking out lists/Pricking out 2024-25 for potting 25-26.xlsx",
    "PO2526":     "2. Propagation (cuttings and seeds)/_Pricking out lists/Pricking out 2025-2026 for potting 26-27.xlsx",
    "PO2627":     "2. Propagation (cuttings and seeds)/_Pricking out lists/_Pricking out 2026-27 for potting 27-28 .xlsx",
    "TALLY2026":  "2. Propagation (cuttings and seeds)/_Pricking out lists/Propagation numbers from July to December 2026.xlsx",
    "TALLY2024":  "2. Propagation (cuttings and seeds)/_Pricking out lists/Archive/Propagation numbers from July - Dec 2024.xlsx",
    "SOW2025":    "2. Propagation (cuttings and seeds)/_Seed and Cutting Records/Seed Sowing /1. Seed Sowing 2025.xlsx",
    "SOW2026":    "2. Propagation (cuttings and seeds)/_Seed and Cutting Records/Seed Sowing /Seed Sowing 2026 .xlsx",
    "SEEDLOG":    "2. Propagation (cuttings and seeds)/_Seed and Cutting Records/2. Seed records MASTER.xlsx",
    "CUTLOG":     "2. Propagation (cuttings and seeds)/_Seed and Cutting Records/1. Cuttings records MASTER.xlsx",
    "RESULTS":    "2. Propagation (cuttings and seeds)/_Seed and Cutting Records/3. Seed & Cutting results MASTER.xlsx",
    "POTON":      "3. Potting On/2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx",
    "POTON2425":  "3. Potting On/Archive/2024-25 JMN Potting On - August 2024 - July 2025.xlsx",
    "POTON2324":  "3. Potting On/Archive/2023-24 JMN Potting On - August 2023 - July 2024.xlsx",
    "POTON2526":  "3. Potting On/Archive/2025-26 JMN Potting On - August 2025 - July 26.xlsx",
    "V150_26":    "4. Stocktakes/Old propagation stocktakes/V150 stocktake 31 March 2026.xlsx",
    "V150_25":    "4. Stocktakes/2025/V150 stocktake 31.3.25.xlsx",
    "ST_MAY25":   "4. Stocktakes/2025/20 May 2025 JMN Stocktake.xlsx",
    "ST_MASTER":  "4. Stocktakes/_Stocktake Master CURRENT.xlsx",
    "AL_SP25":    "5. Seasonal Planting Lists & Collection Schedule/Archive/2025 Spring Planting Lists/JMN Plant Allocation Master SPRING 2025.xlsx",
    "AL_AU26":    "5. Seasonal Planting Lists & Collection Schedule/2026 Autumn Plant Lists/JMN Plant Allocation Master AUTUMN 2026.xlsx",
    "NSFEB26":    "5. Seasonal Planting Lists & Collection Schedule/2026 Autumn Plant Lists/Nursery Stock and planting list Feb 2026 for autumn(Sheet1).xlsx",
    "AL_SP26":    "5. Seasonal Planting Lists & Collection Schedule/2026 Spring planting/_JMN Plant Allocations Spring 2026.xlsx",
    "PLANTSOUT":  "_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx",
}
SHORT = {k: os.path.splitext(os.path.basename(v))[0].strip() for k, v in F.items()}
SHORT["NEILL"] = "Standard Annual Plant List for JMN ([name]) MASTER"
SHORT["AL_SP25"] = "JMN Plant Allocation Master SPRING 2025"
SHORT["SUGGESTED"] = "Suggested plant species and numbers each site per year 2025 onwards"
SHORT["V150_26"] = "V150 stocktake 31 March 2026"
SHORT["NSFEB26"] = "Nursery Stock and planting list Feb 2026 for autumn"
SHORT["POTON"] = "2026-27 JMN Potting On"
SHORT["POTON2425"] = "2024-25 JMN Potting On (archive)"
SHORT["POTON2324"] = "2023-24 JMN Potting On (archive)"
SHORT["POTON2526"] = "2025-26 JMN Potting On (archive)"
SHORT["ST_MASTER"] = "_Stocktake Master CURRENT"
SHORT["AL_SP26"] = "_JMN Plant Allocations Spring 2026"
SHORT["PO2627"] = "_Pricking out 2026-27 for potting 27-28"
SHORT["SOW2025"] = "Seed Sowing 2025"
SHORT["SOW2026"] = "Seed Sowing 2026"
SHORT["KEYSTONE25"] = "Aug 2025 Keystone Sites Plants Summary (archive)"

NAME_MASK = re.compile(open("/home/claude/_private/name_mask.txt").read().strip())  # mask pattern kept outside the shared folder


def mask(s):
    return NAME_MASK.sub("[name]", s)


def node(k, sheet=None):
    s = SHORT[k]
    return mask(f"{s} › {sheet}" if sheet else s)


# --------------------------------------------------------------------------------------
# loading helpers
# --------------------------------------------------------------------------------------
_cache = {}


def wb(key, formulas=False):
    ck = (key, formulas)
    if ck not in _cache:
        _cache[ck] = openpyxl.load_workbook(SRC + F[key], data_only=not formulas)
    return _cache[ck]


def norm(s):
    s = unicodedata.normalize("NFKC", str(s)).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip().casefold()


def num(v):
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        t = v.strip().replace(",", "")
        try:
            return float(t)
        except ValueError:
            return None
    return None


SKIP_NAMES = {"", "total", "totals", "plant name", "name", "grand total", "species", "none"}


def series(key, sheet, name_col, val_col, r0, r1):
    """species-key -> (value, 'COL ROW'); first occurrence wins, duplicates counted."""
    ws = wb(key)[sheet]
    nc, vc = CI(name_col), CI(val_col)
    out, dups = OrderedDict(), 0
    for r in range(r0, r1 + 1):
        n = ws.cell(r, nc).value
        if n is None or not isinstance(n, str):
            continue
        k = norm(n)
        if k in SKIP_NAMES or k.startswith("total"):
            continue
        if k in out:
            dups += 1
            continue
        out[k] = (num(ws.cell(r, vc).value), f"{val_col}{r}")
    out.dups = dups if hasattr(out, "dups") else None
    return out


def compare(A, B):
    common = [k for k in A if k in B]
    cmp_ = eq = 0
    unequal = []
    for k in common:
        a, b = A[k][0] or 0.0, B[k][0] or 0.0
        if a != 0 or b != 0:
            cmp_ += 1
            if abs(a - b) < 0.5:
                eq += 1
            else:
                unequal.append((k, a, b))
    return {"aligned": len(common), "left": len(A), "right": len(B), "compared": cmp_, "equal": eq,
            "unequal": unequal[:8]}


def conf(res, min_n=20):
    c, e = res["compared"], res["equal"]
    if c == 0:
        return "low"
    r = e / c
    if r >= 0.9 and c >= min_n:
        return "high"
    if r >= 0.9 or (r >= 0.6 and c >= min_n):
        return "medium"
    return "low"


def ev(res, where, extra=""):
    s = (f"{where}: {res['equal']}/{res['compared']} species equal "
         f"(names aligned {res['aligned']} of {res['left']} left / {res['right']} right; compared = non-zero in either)")
    return s + (f"; {extra}" if extra else "")


def pool(results):
    return {"aligned": sum(r["aligned"] for r in results), "left": sum(r["left"] for r in results),
            "right": sum(r["right"] for r in results), "compared": sum(r["compared"] for r in results),
            "equal": sum(r["equal"] for r in results), "unequal": []}


# --------------------------------------------------------------------------------------
# result collection
# --------------------------------------------------------------------------------------
EDGES = []      # dicts: from, to, type, evidence, confidence, (stage_from, stage_to unused)
CHECKS = {}     # name -> raw numbers


def add(frm, to, typ, evidence, confidence, check=None):
    EDGES.append({"from": mask(frm), "to": mask(to), "type": typ, "evidence": mask(evidence), "confidence": confidence})
    if check:
        CHECKS[check[0]] = check[1]


def rekeyed(name, frm, to, res, where, extra="", min_n=20, typ="rekeyed", confidence=None):
    add(frm, to, typ, ev(res, where, extra), confidence or conf(res, min_n), (name, res))


# ======================================================================================
# 1. REKEYED CHECKS
# ======================================================================================
def run_rekeyed():
    # ---- 1. Standard Annual Plant List ([name]) -> Pricking-out 2026-27 Sheet2 (C "8000", D "Spares 2500")
    a = series("NEILL", "Sheet1", "B", "N", 4, 101); b = series("PO2627", "Sheet2", "B", "C", 3, 100)
    r1 = compare(a, b)
    a = series("NEILL", "Sheet1", "B", "K", 4, 101); b = series("PO2627", "Sheet2", "B", "D", 3, 100)
    r1b = compare(a, b)
    rekeyed("neill_to_po_C", node("NEILL", "Sheet1"), node("PO2627", "Sheet2"), r1,
            "[name] list N4:N101 'Subtotal keystone x3' vs Sheet2 C3:C100 'Neill 8000'", "typed copy; Sheet2 E = C+D is a formula")
    rekeyed("neill_to_po_D", node("NEILL", "Sheet1"), node("PO2627", "Sheet2"), r1b,
            "[name] list K4:K101 'Spare' vs Sheet2 D3:D100 'Spares 2500'")

    # ---- Neill total (L) -> Potting On 'Master' sheet I and Suggested list I (same 'total if 6500' typed)
    pm = [s for s in wb("POTON").sheetnames if s.strip().endswith("Master")][0]
    a = series("NEILL", "Sheet1", "B", "L", 4, 101); b = series("POTON", pm, "B", "I", 4, 92)
    r = compare(a, b)
    rekeyed("neill_to_pomaster_I", node("NEILL", "Sheet1"), node("POTON", "[name] Master"), r,
            f"[name] list L4:L101 'Total required if 6500' vs Potting On '[name] Master' I4:I92")
    b = series("SUGGESTED", "Sheet1", "B", "I", 4, 92)
    r = compare(series("NEILL", "Sheet1", "B", "L", 4, 101), b)
    rekeyed("neill_to_suggested_I", node("NEILL", "Sheet1"), node("SUGGESTED", "Sheet1"), r,
            "[name] list L4:L101 vs Suggested list I4:I92 'Total required if 6500'")

    # ---- 2. Pricking-out -> Seed Sowing 'Projected potting'
    a = series("PO2627", "Sheet1", "A", "C", 3, 101); b = series("SOW2026", "Sheet1", "A", "B", 3, 57)
    r2a = compare(a, b)
    rekeyed("po2627_to_sow2026", node("PO2627", "Sheet1"), node("SOW2026", "Sheet1"), r2a,
            "Sheet1 C3:C101 '2026/2027' vs Seed Sowing 2026 Sheet1 B3:B57 'Projected potting'")
    a = series("PO2526", "Sheet1", "A", "B", 2, 97); b = series("SOW2025", "Sheet1", "A", "B", 3, 90)
    r2b = compare(a, b)
    rekeyed("po2526_to_sow2025", node("PO2526", "Sheet1"), node("SOW2025", "Sheet1"), r2b,
            "Pricking out 2025-26 Sheet1 B2:B97 vs Seed Sowing 2025 Sheet1 B3:B90 'Projected potting 2026-27' (text-typed numbers)")

    # ---- 3. Pricking-out -> V150 stocktake 'Projected'
    a = series("PO2627", "Sheet1", "A", "B", 3, 101); b = series("V150_26", "Sheet1", "A", "B", 2, 89)
    r3a = compare(a, b)
    rekeyed("po2627_to_v150_26", node("PO2627", "Sheet1"), node("V150_26", "Sheet1"), r3a,
            "Pricking-out 2026-27 Sheet1 B3:B101 '2025/2026' vs V150 stocktake 31 Mar 2026 B2:B89 'Projected PU25/26'")
    a = series("PO2526", "Sheet1", "A", "B", 2, 97)
    r3a2 = compare(a, b)
    rekeyed("po2526_to_v150_26", node("PO2526", "Sheet1"), node("V150_26", "Sheet1"), r3a2,
            "Pricking-out 2025-26 (archive-folder draft) B2:B97 vs V150 stocktake 31 Mar 2026 B2:B89")
    a = series("PO2425", "Sheet1", "A", "B", 2, 97); b = series("V150_25", "Sheet1", "A", "B", 2, 89)
    r3b = compare(a, b)
    rekeyed("po2425_to_v150_25", node("PO2425", "Sheet1"), node("V150_25", "Sheet1"), r3b,
            "Pricking-out 2024-25 Sheet1 B2:B97 vs V150 stocktake 31.3.25 Sheet1 B2:B89 'Projected PU25/26'")

    # ---- 3c. Pricking-out -> Master stocktake col C 'Projected pricked out' (is it filled?)
    ws = wb("ST_MASTER")["Autumn 2026 Master Stocktake"]
    filled = sum(1 for r in range(5, 109) if num(ws.cell(r, 3).value) not in (None, 0.0))
    CHECKS["master_C_filled"] = filled

    # ---- 4. V150 stocktake D -> Stocktake master D ; also T28 E -> E
    for lab, vc_src, vc_dst, desc in (("D", "D", "D", "Stage 2 V150 count"), ("E", "E", "E", "Stage 2 T28 count")):
        a = series("V150_26", "Sheet1", "A", vc_src, 2, 89)
        b = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", vc_dst, 5, 108)
        r = compare(a, b)
        rekeyed(f"v150_to_master_{lab}", node("V150_26", "Sheet1"), node("ST_MASTER", "Autumn 2026 Master Stocktake"), r,
                f"V150 stocktake 31 Mar 2026 {vc_src}2:{vc_src}89 vs Master stocktake {vc_dst}5:{vc_dst}108 ({desc})", min_n=20)

    # D alone misses species whose count the Master moved into the T28 column; test D against D+E
    a = series("V150_26", "Sheet1", "A", "D", 2, 89)
    bd = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", "D", 5, 108)
    be = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", "E", 5, 108)
    bde = OrderedDict((k, ((bd[k][0] or 0) + (be.get(k, (0,))[0] or 0), bd[k][1])) for k in bd)
    r4c = compare(a, bde)
    CHECKS["v150_D_to_master_D_plus_E"] = r4c
    EDGES[-2]["evidence"] += f"; against Stage 2 V150 + Stage 2 T28 combined: {r4c['equal']}/{r4c['compared']} equal (" + "; ".join(f"{k} {int(x)} vs {int(y)}" for k, x, y in r4c["unequal"]) + " differ); the five unequal species on D alone are T28 species whose count sits in the Master's T28 column"
    EDGES[-2]["confidence"] = "high" if r4c["equal"] / max(r4c["compared"], 1) >= 0.9 else EDGES[-2]["confidence"]

    # ---- 5. V150 stocktake D -> Potting On Summary D 'Goal Set'; E -> Less T28
    a = series("V150_26", "Sheet1", "A", "D", 2, 89); b = series("POTON", "Summary", "B", "D", 4, 101)
    r5 = compare(a, b)
    rekeyed("v150_to_poton_goal", node("V150_26", "Sheet1"), node("POTON", "Summary"), r5,
            "V150 stocktake D2:D89 'Stocktake' vs Potting On Summary D4:D101 'Goal Set'", "Goal Set is typed in 2026-27 (no formula in D4:D101)")
    a = series("V150_26", "Sheet1", "A", "E", 2, 89); b = series("POTON", "Summary", "B", "E", 4, 101)
    r5b = compare(a, b)
    rekeyed("v150_to_poton_t28", node("V150_26", "Sheet1"), node("POTON", "Summary"), r5b,
            "V150 stocktake E2:E89 \"T28's\" vs Potting On Summary E4:E101 'Less T28'", min_n=3)

    # ---- 5c. Potting On '[name] Master' J -> Summary D (VLOOKUP in 2024/25 & 2025/26, typed in 2026/27)
    a = series("POTON", pm, "B", "J", 4, 92); b = series("POTON", "Summary", "B", "D", 4, 101)
    r5c = compare(a, b)
    rekeyed("pomaster_to_summary_2627", node("POTON", "[name] Master"), node("POTON", "Summary"), r5c,
            "'[name] Master' J4:J92 'Annual Projection (Best case)' vs Summary D4:D101 'Goal Set' (2026-27)",
            "previous years use =VLOOKUP(...,'[name] Master'!B4:J93,9,FALSE); 2026-27 overtyped", min_n=20)

    # ---- 6. Potting On Summary -> PB3 stocktake (any relation?)
    wsf = wb("POTON", formulas=True)["Summary"]
    # which column holds the per-species year total of potting? G 'Running Total'
    a = series("POTON", "Summary", "B", "G", 4, 101); b = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", "F", 5, 108)
    r6 = compare(a, b)
    rekeyed("poton_to_pb3_F", node("POTON", "Summary"), node("ST_MASTER", "Autumn 2026 Master Stocktake"), r6,
            "Summary G4:G101 'Running Total' (PB3 potted this year) vs Master stocktake F5:F108 'Potted Up PB3 (Stage 3)'",
            "no relation found; stage 3 counts are typed with their own date stamp", min_n=20, confidence="low")
    b2 = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", "H", 5, 108)
    r6b = compare(a, b2)
    CHECKS["poton_to_ready_H"] = r6b

    # ---- 7. Stocktake master -> allocation Spring 2026 stock columns (D:I -> E:J)
    pairs = [("D", "E", "Stage 2 V150"), ("E", "F", "Stage 2 T28"), ("F", "G", "Stage 3 PB3 growing"),
             ("G", "H", "Stage 3 T28"), ("H", "I", "Stage 4 PB3 ready"), ("I", "J", "Stage 4 T28 ready")]
    res = []
    for sc, dc, lab in pairs:
        a = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", sc, 5, 108)
        b = series("AL_SP26", "Plant Allocations ", "C", dc, 6, 107)
        r = compare(a, b); r["lab"] = lab; res.append(r)
    CHECKS["master_to_spring26_cols"] = res
    p = pool(res)
    detail = "; ".join(f"{r['lab']} {r['equal']}/{r['compared']}" for r in res)
    rekeyed("master_to_spring26", node("ST_MASTER", "Autumn 2026 Master Stocktake"), node("AL_SP26", "Plant Allocations"), p,
            "Master stocktake D5:I108 vs Spring 2026 'Plant Allocations' E6:J107 (six stock columns pooled)", detail, min_n=20)

    # ---- 8. May 2025 stocktake -> Spring 2025 allocation master stock columns
    res = []
    for sc, dc, lab in (("C", "E", "PB3 south large"), ("E", "F", "PB3 north large"), ("B", "G", "V150/35F T28")):
        a = series("ST_MAY25", "Oct 24", "A", sc, 7, 106); b = series("AL_SP25", "Spring 2025", "C", dc, 6, 105)
        r = compare(a, b); r["lab"] = lab; res.append(r)
    CHECKS["may25_to_spring25_cols"] = res
    detail = "; ".join(f"{r['lab']} {r['equal']}/{r['compared']}" for r in res)
    rekeyed("may25_to_spring25", node("ST_MAY25", "Oct 24"), node("AL_SP25", "Spring 2025"), pool(res),
            "20 May 2025 stocktake B,C,E (rows 7-106) vs Spring 2025 allocation E,F,G (rows 6-105)", detail +
            "; the two 'small' PB3 columns are not carried over")

    # ---- 9. Feb 2026 'Nursery Stock and planting list' Stock -> Autumn 2026 allocation 'StockTake' H
    a = series("NSFEB26", "Nursery Stock and planting list", "B", "D", 5, 90) if "Nursery Stock and planting list" in wb("NSFEB26").sheetnames else {}
    b = series("AL_AU26", "Autumn 2026", "C", "H", 6, 119)
    r9 = compare(a, b)
    rekeyed("nsfeb26_to_autumn26", node("NSFEB26", "Nursery Stock and planting list"), node("AL_AU26", "Autumn 2026"), r9,
            "Feb 2026 list D5:D90 'Stock' vs Autumn 2026 allocation H6:H119 'StockTake'")
    a = series("ST_MASTER", "Autumn 2026 Master Stocktake", "B", "H", 5, 108)
    r9b = compare(a, b)
    rekeyed("master_to_autumn26", node("ST_MASTER", "Autumn 2026 Master Stocktake"), node("AL_AU26", "Autumn 2026"), r9b,
            "Master stocktake H5:H108 'Ready for planting' vs Autumn 2026 allocation H6:H119 'StockTake' (Master is dated May 2026, allocation uses a Feb figure)",
            confidence="low")

    # ---- 10. Allocation 'Total Allocated' -> Plants Out Master MASTER season block
    ws = wb("PLANTSOUT")["MASTER"]
    blocks = []   # (label, start col idx, total col idx)
    for c in range(1, ws.max_column + 1):
        v = ws.cell(1, c).value
        if isinstance(v, str) and re.match(r"\s*(autumn|spring)\s+\d{4}", v, re.I):
            t = next((cc for cc in range(c, c + 40) if str(ws.cell(4, cc).value).strip().upper() == "TOTAL"), None)
            blocks.append((norm(v), c, t))
    BLK = {}
    for b_ in blocks:
        BLK.setdefault(b_[0], b_)       # row 1 repeats the label over merged cells: keep the first (left-most) column
    CHECKS["plantsout_blocks"] = {b[0]: [CL(b[1]), CL(b[2]) if b[2] else None] for b in blocks}

    def master_season(label):
        b = BLK[label]
        return series("PLANTSOUT", "MASTER", "D", CL(b[2]), 8, 105)

    a = series("AL_SP25", "Spring 2025", "C", "N", 6, 105); m = master_season("spring 2025")
    r10a = compare(a, m)
    rekeyed("alloc_sp25_to_master", node("AL_SP25", "Spring 2025"), node("PLANTSOUT", "MASTER"), r10a,
            f"Spring 2025 N6:N105 'Total Allocated' vs MASTER {CL(BLK['spring 2025'][2])}8:{CL(BLK['spring 2025'][2])}105 (Spring 2025 TOTAL)",
            "MASTER Spring 2025 block is typed constants", min_n=20)
    a = series("AL_AU26", "Autumn 2026", "C", "M", 6, 119); m = master_season("autumn 2026")
    r10b = compare(a, m)
    rekeyed("alloc_au26_to_master", node("AL_AU26", "Autumn 2026"), node("PLANTSOUT", "MASTER"), r10b,
            f"Autumn 2026 M6:M119 'Total Allocated' vs MASTER {CL(BLK['autumn 2026'][2])}8:{CL(BLK['autumn 2026'][2])}105 (Autumn 2026 TOTAL)",
            "MASTER Autumn 2026 block is typed constants", min_n=20)
    # Spring 2026 not yet planted -> check there is no block
    CHECKS["spring2026_block_in_master"] = "spring 2026" in BLK

    # per-site column check (content match): allocation site columns vs MASTER block columns with identical column total
    def site_cols(wsx, row_hdr, c0, c1, r0, r1, namecol):
        cols = {}
        for c in range(c0, c1 + 1):
            vals = OrderedDict()
            for r in range(r0, r1 + 1):
                n = wsx.cell(r, namecol).value
                if isinstance(n, str) and norm(n) not in SKIP_NAMES:
                    k = norm(n)
                    if k not in vals:
                        vals[k] = (num(wsx.cell(r, c).value) or 0.0, f"{CL(c)}{r}")
            tot = sum(v[0] for v in vals.values())
            cols[c] = (str(wsx.cell(row_hdr, c).value)[:24], tot, vals)
        return cols

    def site_pairs(alloc_key, alloc_sheet, a0, a1, label):
        wa = wb(alloc_key)[alloc_sheet]
        A = site_cols(wa, 4, CI(a0), CI(a1), 6, 105, 3)
        b = BLK[label]
        wm = wb("PLANTSOUT")["MASTER"]
        nxt = [x for x in blocks if x[1] > b[1]]
        M = site_cols(wm, 4, b[1], b[2] - 1, 8, 105, 4)
        used, pairs_ = set(), []
        for ca, (ha, ta, va) in A.items():
            if ta == 0:
                continue
            for cm, (hm, tm, vm) in M.items():
                if cm in used or tm != ta:
                    continue
                r = compare({k: (v[0], v[1]) for k, v in va.items()}, {k: (v[0], v[1]) for k, v in vm.items()})
                if r["compared"] and r["equal"] == r["compared"]:
                    used.add(cm); pairs_.append((ha, hm, ta, r["equal"], r["compared"])); break
        n_alloc = sum(1 for c, (h, t, v) in A.items() if t)
        return n_alloc, pairs_

    for alloc_key, alloc_sheet, a0, a1, label, nm in (("AL_SP25", "Spring 2025", "P", "AM", "spring 2025", "alloc_sp25_sites"),
                                                    ("AL_AU26", "Autumn 2026", "O", "AM", "autumn 2026", "alloc_au26_sites")):
        n_alloc, pr = site_pairs(alloc_key, alloc_sheet, a0, a1, label)
        CHECKS[nm] = {"alloc_site_cols_nonzero": n_alloc, "cols_with_identical_master_column": len(pr),
                      "pairs": [list(p) for p in pr]}
        add(node(alloc_key, alloc_sheet), node("PLANTSOUT", "MASTER"), "rekeyed",
            f"site columns {a0}:{a1}: {len(pr)} of {n_alloc} non-empty allocation site columns have a MASTER {label.title()} column with identical species values "
            f"(matched on column total, then every species row equal)", "medium" if len(pr) >= n_alloc * 0.6 else "low")

    # ---- 11. Allocation Spring 2026 Paper4Trees2 (school grid) -> master 'Paper 4 Trees' column
    try:
        wsA = wb("AL_SP26")["Plant Allocations "]
        pc = next(c for c in range(1, wsA.max_column + 1) if "paper 4 trees" in norm(wsA.cell(5, c).value or "") or "paper4trees" in norm(wsA.cell(5, c).value or ""))
        a = series("AL_SP26", "Paper4Trees2", "A", "L", 5, 106); b = series("AL_SP26", "Plant Allocations ", "C", CL(pc), 6, 107)
        r = compare(a, b)
        rekeyed("p4t_to_master_sp26", node("AL_SP26", "Paper4Trees2"), node("AL_SP26", "Plant Allocations"), r,
                f"Paper4Trees2 L5:L106 (school grid total) vs Plant Allocations {CL(pc)}6:{CL(pc)}107 'Paper 4 Trees'", min_n=10)
    except StopIteration:
        pass

    # ---- 12. Seed log -> results register (tag + date), seed sowing tags -> seed log
    def tag_date_sets(key, tagcol, datecol, r0, r1):
        ws = wb(key)["Sheet1"]
        s = set(); tags = set()
        for r in range(r0, r1 + 1):
            t = ws.cell(r, CI(tagcol)).value; d = ws.cell(r, CI(datecol)).value
            if isinstance(t, str):
                t = t.strip().split()[0].upper() if t.strip() else t
                tags.add(t)
                if isinstance(d, (datetime, date)):
                    s.add((t, d.date() if isinstance(d, datetime) else d))
        return s, tags

    sl, sl_tags = tag_date_sets("SEEDLOG", "A", "G", 4, 960)
    cl, cl_tags = tag_date_sets("CUTLOG", "A", "E", 3, 600)
    wr = wb("RESULTS")["Sheet1"]
    s_n = s_m = c_n = c_m = 0
    for r in range(2, 1530):
        t = wr.cell(r, 1).value; d = wr.cell(r, 4).value
        if not isinstance(t, str) or not isinstance(d, (datetime, date)):
            continue
        tk = t.strip().split()[0].upper()
        dd = d.date() if isinstance(d, datetime) else d
        if re.match(r"^S\d", tk):
            s_n += 1; s_m += (tk, dd) in sl
        elif re.match(r"^C\d", tk):
            c_n += 1; c_m += (tk, dd) in cl
    CHECKS["results_vs_logs"] = {"S_rows_with_date": s_n, "S_match": s_m, "C_rows_with_date": c_n, "C_match": c_m}
    add(node("SEEDLOG", "Sheet1"), node("RESULTS", "Sheet1"), "rekeyed",
        f"Seed log A4:A960 (tag) + G (date sown) vs Results register A (tag) + D (date sown): {s_m}/{s_n} S-tag rows match on tag + date "
        f"(S4f reported 611/729, 84%); no formula link", "medium", None)
    add(node("CUTLOG", "Sheet1"), node("RESULTS", "Sheet1"), "rekeyed",
        f"Cuttings log A3:A600 (tag) + E (date propagated) vs Results register A + D: {c_m}/{c_n} C-tag rows match on tag + date (S4f reported 455/488, 93%)",
        "medium", None)

    # seed sowing 2025 notes tag -> seed log tag (and species)
    ws = wb("SOW2025")["Sheet1"]
    tg = []
    for r in range(3, 100):
        t = ws.cell(r, 9).value; n = ws.cell(r, 1).value
        if isinstance(t, str) and re.match(r"^\s*S\d+", t) and isinstance(n, str):
            tg.append((re.match(r"^\s*(S\d+)", t).group(1).upper(), norm(n)))
    wl = wb("SEEDLOG")["Sheet1"]
    log_sp = {}
    for r in range(4, 960):
        t = wl.cell(r, 1).value; sp = wl.cell(r, 2).value
        if isinstance(t, str) and isinstance(sp, str):
            log_sp[t.strip().split()[0].upper()] = norm(sp)
    in_log = sum(1 for t, n in tg if t in log_sp)
    sp_eq = sum(1 for t, n in tg if log_sp.get(t) and (log_sp[t].split()[:2] == n.split()[:2]))
    CHECKS["sow2025_tags"] = {"tags_in_notes": len(tg), "found_in_seed_log": in_log, "genus_species_equal_where_found": sp_eq}
    add(node("SEEDLOG", "Sheet1"), node("SOW2025", "Sheet1"), "rekeyed",
        f"Seed Sowing 2025 Sheet1 I3:I99 'Notes' hold seed-log tags: {len(tg)} tags, {in_log} found in Seed log A4:A960, "
        f"{sp_eq} of those with the same genus + species; tags typed by hand, no formula",
        "medium" if in_log >= 0.6 * max(len(tg), 1) else "low")

    # ---- weekly tally goals -> pricking-out lists
    try:
        a = series("TALLY2024", "Sheet1", "A", "B", 3, 85); b = series("PO2425", "Sheet1", "A", "B", 2, 97)
        r = compare(a, b)
        rekeyed("tally2024_to_po2425", node("PO2425", "Sheet1"), "Propagation numbers from July - Dec 2024 › Sheet1", r,
                "Pricking-out 2024-25 B2:B97 vs tally sheet B3:B85 (goals; weekly cells blank)")
    except Exception as e:
        CHECKS["tally2024_error"] = str(e)
    try:
        a = series("PO2627", "Sheet1", "A", "C", 3, 101); b = series("TALLY2026", "Sheet1", "A", "B", 3, 87)
        r = compare(a, b)
        rekeyed("po2627_to_tally2026", node("PO2627", "Sheet1"), "Propagation numbers from July to December 2026 › Sheet1", r,
                "Pricking-out 2026-27 C3:C101 vs tally sheet B3:B87 goals (S4b: goals match neither list)", min_n=10)
    except Exception as e:
        CHECKS["tally2026_error"] = str(e)


# ======================================================================================
# 2. PLANTS OUT MASTER -> summary / TTC sheets
# ======================================================================================
def run_plants_out():
    ws = wb("PLANTSOUT")["MASTER"]
    wf = wb("PLANTSOUT", formulas=True)
    blocks = {}
    for c in range(1, ws.max_column + 1):
        v = ws.cell(1, c).value
        if isinstance(v, str) and re.match(r"\s*(autumn|spring)\s+\d{4}", v, re.I):
            t = next((cc for cc in range(c, c + 40) if str(ws.cell(4, cc).value).strip().upper() == "TOTAL"), None)
            blocks[norm(v)] = CL(t)

    def m(label):
        return series("PLANTSOUT", "MASTER", "D", blocks[label], 8, 105)

    def fcount(sheet, col, r0, r1):
        w = wf[sheet]; f = k = 0
        for r in range(r0, r1 + 1):
            v = w[f"{col}{r}"].value
            if isinstance(v, str) and v.startswith("="): f += 1
            elif v is not None: k += 1
        return f, k

    # SUMMARY PLANTS: E.. blocks, Autumn=col, Spring=col+1, years 2015..2025
    year_cols = {}
    ws_sp = wb("PLANTSOUT")["SUMMARY PLANTS"]
    for c in range(1, ws_sp.max_column + 1):
        v = ws_sp.cell(2, c).value
        if isinstance(v, (int, float)) and 2015 <= v <= 2026:
            year_cols[int(v)] = c
    tot_eq = tot_cmp = 0; seasons = []
    link_f = link_k = 0
    typed_eq = typed_cmp = 0; linked_eq = linked_cmp = 0
    for y, c in sorted(year_cols.items()):
        for off, sea in ((0, "autumn"), (1, "spring")):
            lab = f"{sea} {y}"
            if lab not in blocks:
                continue
            col = CL(c + off)
            r = compare(series("PLANTSOUT", "SUMMARY PLANTS", "D", col, 6, 104), m(lab))
            f_, k_ = fcount("SUMMARY PLANTS", col, 6, 104)
            seasons.append({"season": lab, "col": col, "formula_cells": f_, "typed_cells": k_, **{x: r[x] for x in ("aligned", "compared", "equal")}})
            if f_ > k_:
                linked_eq += r["equal"]; linked_cmp += r["compared"]
            else:
                typed_eq += r["equal"]; typed_cmp += r["compared"]
            link_f += f_; link_k += k_
    CHECKS["summary_plants_seasons"] = seasons
    linked = [s["season"] for s in seasons if s["formula_cells"] > s["typed_cells"]]
    typed_n = len([s for s in seasons if s["formula_cells"] <= s["typed_cells"]])
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "SUMMARY PLANTS"), "formula",
        f"SUMMARY PLANTS season columns that are formula-driven ({', '.join(linked) or 'none'}): {linked_eq}/{linked_cmp} species equal to MASTER season TOTAL; "
        f"{link_f} formula cells vs {link_k} typed cells across all season columns", "high")
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "SUMMARY PLANTS"), "manual_summary",
        f"{typed_n} of {len(seasons)} season columns (E6:AT104 other than the formula ones) are typed species-by-season figures: {typed_eq}/{typed_cmp} species equal to MASTER season TOTAL",
        "high" if typed_cmp and typed_eq / typed_cmp > 0.9 else "medium")

    # Trees that Count: E Autumn 2025, F Spring 2025, K Autumn 2024, L Spring 2024
    res = []; det = []
    for col, lab in (("E", "autumn 2025"), ("F", "spring 2025"), ("K", "autumn 2024"), ("L", "spring 2024")):
        r = compare(series("PLANTSOUT", "Trees that Count", "D", col, 4, 102), m(lab)); res.append(r)
        f_, k_ = fcount("Trees that Count", col, 4, 102)
        det.append(f"{lab} {r['equal']}/{r['compared']} ({f_} formula, {k_} typed)")
    CHECKS["ttc_2425"] = res
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "Trees that Count"), "manual_summary",
        "Trees that Count D4:D102 season columns E, F, K, L vs MASTER season TOTALs: " + "; ".join(det) +
        "; only column J (98 cells) links to MASTER; headline block F106:I111 is typed",
        "high" if sum(r["equal"] for r in res) / max(sum(r["compared"] for r in res), 1) > 0.9 else "medium")
    f_, k_ = fcount("Trees that Count", "J", 4, 102)
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "Trees that Count"), "formula",
        f"Trees that Count J4:J102 'Coronation': {f_} formula cells (=MASTER!MG#), {k_} typed", "high")

    # TTC Audit 2025 (2020 data): D Autumn 2020, E Spring 2020
    res = []; det = []
    for col, lab in (("D", "autumn 2020"), ("E", "spring 2020")):
        r = compare(series("PLANTSOUT", "Trees that Count Audit 2025", "C", col, 4, 102), m(lab)); res.append(r)
        det.append(f"{lab} {r['equal']}/{r['compared']}")
    CHECKS["ttc_audit"] = res
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "Trees that Count Audit 2025"), "manual_summary",
        "Trees that Count Audit 2025 C4:C102 (the data are 2020) columns D, E vs MASTER season TOTALs: " + "; ".join(det) +
        "; F and J are formulas, D, E, H, I typed",
        "high" if sum(r["equal"] for r in res) / max(sum(r["compared"] for r in res), 1) > 0.9 else "medium")
    # Audit Sit (2019): totals U (autumn) and AL (spring)
    res = []; det = []
    for col, lab in (("U", "autumn 2019"), ("AL", "spring 2019")):
        r = compare(series("PLANTSOUT", "Trees that Count Audit 2025 Sit", "C", col, 7, 105), m(lab)); res.append(r)
        det.append(f"{lab} {r['equal']}/{r['compared']}")
    CHECKS["ttc_audit_sit"] = res
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "Trees that Count Audit 2025 Sit"), "manual_summary",
        "Audit Sit C7:C105 (2019 by site) total columns U, AL vs MASTER 2019 season TOTALs: " + "; ".join(det) +
        "; site columns D:AK typed, only U and AL are formulas",
        "high" if sum(r["equal"] for r in res) / max(sum(r["compared"] for r in res), 1) > 0.9 else "medium")

    # SUMMARY SITES: formula vs typed, and season totals row 3 vs MASTER row 107 grand totals
    wss = wb("PLANTSOUT")["SUMMARY SITES"]; wsf = wf["SUMMARY SITES"]
    f_ = k_ = 0
    for row in wsf.iter_rows(min_row=4, max_row=82, min_col=CI("F"), max_col=CI("AZ")):
        for c in row:
            if isinstance(c.value, str) and c.value.startswith("="):
                if "MASTER" in c.value: f_ += 1
            elif isinstance(c.value, (int, float)): k_ += 1
    # season total comparison
    eq = n = 0
    for y in range(2015, 2027):
        for off, sea in ((0, "autumn"), (1, "spring")):
            lab = f"{sea} {y}"
            if lab not in blocks:
                continue
            hdr = next((c for c in range(1, wss.max_column + 1) if wss.cell(1, c).value == y), None)
            if not hdr: continue
            ss = num(wss.cell(3, hdr + off).value)
            mm = num(wb("PLANTSOUT")["MASTER"][f"{blocks[lab]}107"].value)
            if ss is not None and mm is not None:
                n += 1; eq += abs(ss - mm) < 0.5
    CHECKS["summary_sites"] = {"formula_cells_to_MASTER": f_, "typed_numeric_cells": k_, "season_totals_equal": eq, "season_totals_compared": n}
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "SUMMARY SITES"), "formula",
        f"SUMMARY SITES F4:AZ82: {f_} cells formula-linked to MASTER (row-offset links such as =MASTER!G107; several point at empty MASTER rows)", "high")
    add(node("PLANTSOUT", "MASTER"), node("PLANTSOUT", "SUMMARY SITES"), "manual_summary",
        f"SUMMARY SITES F4:AZ82: {k_} typed numeric cells (site by season); season total row 3 equals MASTER row 107 in {eq}/{n} seasons (2025 differs)",
        "high")

    # Copy of TTC Audit -> TTC Audit : copied_version
    names = wb("PLANTSOUT").sheetnames
    cp = next((s for s in names if s.startswith("Copy of Trees that Count")), None)
    if cp:
        a = series("PLANTSOUT", cp, "D", "E", 4, 102); b = series("PLANTSOUT", "Trees that Count", "D", "E", 4, 102)
        r = compare(a, b)
        add(node("PLANTSOUT", "Trees that Count"), node("PLANTSOUT", cp.strip()), "copied_version",
            f"sheet copy inside one workbook; species in column D aligned {r['aligned']} of {r['left']} / {r['right']}; column E equal {r['equal']}/{r['compared']}",
            "medium")

    # Potting On Annual: pasted rows vs formula row
    wfa = wb("POTON", formulas=True)["Annual"]
    fr = {}
    for r in range(4, 10):
        lab = wfa.cell(r, 1).value
        vals = [wfa.cell(r, c).value for c in range(2, 14)]
        fr[r] = (str(lab)[:12], sum(1 for v in vals if isinstance(v, str) and v.startswith("=")), sum(1 for v in vals if isinstance(v, (int, float))))
    CHECKS["poton_annual"] = fr
    pasted_rows = [f"row {r} '{l}' ({k} typed)" for r, (l, f_, k) in fr.items() if k and not f_]
    linked_rows = [f"row {r} '{l}' ({f_} formula)" for r, (l, f_, k) in fr.items() if f_]
    add(node("POTON", "Summary"), node("POTON", "Annual"), "formula",
        "Annual B8:M8 =Summary!J104:U104 (12 monthly totals); the 'Cumulative' rows (B5, B7, B9) are in-sheet running sums (=C4+B5)", "high")
    add("(no source sheet in folder)", node("POTON", "Annual"), "manual_summary",
        f"Annual rows with pasted values and no source sheet: {', '.join(pasted_rows) or 'none'} (old-year totals typed in; labels stale)", "high")


def run_extras():
    # Potting On 2026-27: August typed, September linked, later months empty
    wf = wb("POTON", formulas=True)["Summary"]
    cnt = {}
    for col in ("J", "K", "L"):
        f_ = k_ = 0
        for r in range(4, 104):
            v = wf[f"{col}{r}"].value
            if isinstance(v, str) and v.startswith("="): f_ += 1
            elif v is not None: k_ += 1
        cnt[col] = (f_, k_)
    CHECKS["poton_summary_month_cols"] = cnt
    add(node("POTON", "Aug 2026"), node("POTON", "Summary"), "manual_summary",
        f"Summary J4:J103 'Aug': {cnt['J'][1]} typed cells and {cnt['J'][0]} link (J77 only); Sept K4:K103 is {cnt['K'][0]} links; Oct to June (L:T) empty so far",
        "high")

    # species spine: Master Plant List (Plants Out Master) vs the other lists
    spine = series("PLANTSOUT", "Master Plant List", "D", "A", 4, 101)
    for key, sheet, col, r0, r1, lab in (("PLANTSOUT", "MASTER", "D", 8, 105, "MASTER species rows D8:D105"),
                                         ("ST_MASTER", "Autumn 2026 Master Stocktake", "B", 5, 108, "Master stocktake B5:B108"),
                                         ("NEILL", "Sheet1", "B", 4, 101, "[name] list B4:B101"),
                                         ("AL_SP26", "Plant Allocations ", "C", 6, 107, "Spring 2026 allocation C6:C107")):
        names = species_set(key, sheet, col, r0, r1)
        sp = list(spine.keys())
        n = len(set(names) & set(sp))
        rowpos = sum(1 for i, k in enumerate(names[:len(sp)]) if k == sp[i]) if False else None
        CHECKS[f"spine_{key}_{sheet.strip()}"] = [n, len(sp), len(set(names))]
        add(node("PLANTSOUT", "Master Plant List"), node(key, sheet.strip() if key != "PLANTSOUT" else sheet), "rekeyed",
            f"species names only (no figures): {n} of {len(sp)} Master Plant List D4:D101 names equal a name in {lab} ({len(set(names))} distinct names there); names typed in each list, no lookup",
            "high" if n >= 0.9 * len(sp) else "medium")


# ======================================================================================
# 3. COPIED VERSIONS / LIST FAMILIES
# ======================================================================================
def species_set(key, sheet, col, r0, r1):
    ws = wb(key)[sheet]
    out = []
    for r in range(r0, r1 + 1):
        v = ws.cell(r, CI(col)).value
        if isinstance(v, str) and norm(v) not in SKIP_NAMES and not norm(v).startswith("total"):
            out.append(norm(v))
    return out


def run_versions():
    a = species_set("MPL2024", "Sheet1", "B", 4, 93)
    b = species_set("SUGGESTED", "Sheet1", "B", 4, 92)
    c = species_set("NSTEMPLATE", "Sheet1", "B", 4, 85)
    d = species_set("NEILL", "Sheet1", "B", 4, 101)

    def jac(x, y):
        sx, sy = set(x), set(y)
        return len(sx & sy), len(sx), len(sy)
    pos = lambda x, y: sum(1 for i, k in enumerate(x[:min(len(x), len(y))]) if k == y[i])

    # numeric overlap: MPL2024 Jardine (G) vs Suggested Jardine (G); total (I)
    r_j = compare(series("MPL2024", "Sheet1", "B", "G", 4, 93), series("SUGGESTED", "Sheet1", "B", "G", 4, 92))
    r_t = compare(series("MPL2024", "Sheet1", "B", "I", 4, 93), series("SUGGESTED", "Sheet1", "B", "I", 4, 92))
    n, la, lb = jac(a, b)
    CHECKS["mpl2024_vs_suggested"] = {"names": [n, la, lb], "jardine": {k: r_j[k] for k in ("aligned", "compared", "equal")}, "total": {k: r_t[k] for k in ("aligned", "compared", "equal")}}
    add(node("MPL2024", "Sheet1"), node("SUGGESTED", "Sheet1"), "copied_version",
        f"same species-by-site layout (PLANT NAME / Common Name / site columns); {n} species names shared of {la} (2024) / {lb} (2025 on); "
        f"Jardine column equal {r_j['equal']}/{r_j['compared']}, total column equal {r_t['equal']}/{r_t['compared']} (list revised in place, not versioned)",
        "high" if n >= 0.9 * min(la, lb) else "medium")
    n, la, lb = jac(b, d)
    r_n = compare(series("SUGGESTED", "Sheet1", "B", "I", 4, 92), series("NEILL", "Sheet1", "B", "L", 4, 101))
    CHECKS["suggested_vs_neill"] = {"names": [n, la, lb], "total": {k: r_n[k] for k in ("aligned", "compared", "equal")}}
    add(node("SUGGESTED", "Sheet1"), node("NEILL", "Sheet1"), "copied_version",
        f"Suggested list is the earlier form of the [name] list: {n} species names shared of {la} / {lb}; 'Total required if 6500' equal {r_n['equal']}/{r_n['compared']}; the later list adds x3/x2 scaled columns and a Subtotal",
        "high" if n >= 0.9 * min(la, lb) else "medium")
    n, la, lb = jac(a, c)
    CHECKS["mpl2024_vs_template"] = {"names": [n, la, lb], "same_row_position": pos(a, c)}
    add(node("MPL2024", "Sheet1"), node("NSTEMPLATE", "Sheet1"), "copied_version",
        f"Nursery Stock and planting list TEMPLATE reuses the species spine: {n} of {lb} template species names also in Master plant list 2024 ({la}); {pos(a, c)} names on the same row; site columns replaced by stock / allocated / over-under",
        "medium")
    e = species_set("NSFEB26", "Nursery Stock and planting list", "B", 5, 90)
    n, la, lb = jac(c, e)
    CHECKS["template_vs_feb26"] = {"names": [n, la, lb]}
    add(node("NSTEMPLATE", "Sheet1"), node("NSFEB26", "Nursery Stock and planting list"), "copied_version",
        f"Feb 2026 filled-in list is a copy of the template with figures added: {n} species names shared of {lb} (Feb 2026) / {la} (template)",
        "high" if n >= 0.9 * min(la, lb) else "medium")

    # Seed Sowing 2026 <- Seed Sowing 2025 (copied layout / rolled forward)
    a = series("SOW2025", "Sheet1", "A", "B", 3, 90); b = series("SOW2026", "Sheet1", "A", "B", 3, 57)
    r = compare(a, b)
    add(node("SOW2025", "Sheet1"), node("SOW2026", "Sheet1"), "copied_version",
        f"annual sowing list is a copy of last year's layout; species aligned {r['aligned']} of {r['left']} / {r['right']}; B 'Projected potting' equal {r['equal']}/{r['compared']} (target for the next year typed in again)",
        "medium")

    # pricking-out year lists (version family)
    for ka, kb, lab in (("PO2425", "PO2526", "2024-25 -> 2025-26"), ("PO2526", "PO2627", "2025-26 -> 2026-27")):
        ca = {"PO2425": "B", "PO2526": "B", "PO2627": "B"}[ka]
        cb = "C" if kb == "PO2627" else "B"
        na = "A"
        a = series(ka, "Sheet1", na, ca, 2, 100); b = series(kb, "Sheet1", "A", cb, 2, 101)
        r = compare(a, b)
        add(node(ka, "Sheet1"), node(kb, "Sheet1"), "copied_version",
            f"yearly pricking-out list is a copy of last year's with targets overtyped ({lab}); species aligned {r['aligned']} of {r['left']} / {r['right']}; target column equal {r['equal']}/{r['compared']}",
            "medium")


    # Potting On yearly workbooks: each year is a copy of the last (Summary species spine)
    for ka, kb in (("POTON2324", "POTON2425"), ("POTON2425", "POTON2526"), ("POTON2526", "POTON")):
        sa = species_set(ka, "Summary", "B", 4, 101); sb = species_set(kb, "Summary", "B", 4, 101)
        n = len(set(sa) & set(sb))
        sheets_a, sheets_b = set(wb(ka).sheetnames), set(wb(kb).sheetnames)
        add(node(ka, "Summary"), node(kb, "Summary"), "copied_version",
            f"yearly Potting On workbook is a copy of the previous year (same sheets, formulas and species spine): {n} species names shared of {len(set(sa))} / {len(set(sb))}; "
            f"{len(sheets_a & sheets_b)} of {len(sheets_b)} sheet names shared", "high" if n >= 0.9 * min(len(set(sa)), len(set(sb))) else "medium")
    # Allocation masters: each season's workbook is a copy of the last
    for ka, sha, kb, shb in (("AL_SP25", "Spring 2025", "AL_AU26", "Autumn 2026"), ("AL_AU26", "Autumn 2026", "AL_SP26", "Plant Allocations ")):
        sa = species_set(ka, sha, "C", 6, 105); sb = species_set(kb, shb, "C", 6, 107)
        n = len(set(sa) & set(sb))
        sheets_a, sheets_b = set(wb(ka).sheetnames), set(wb(kb).sheetnames)
        add(node(ka, sha), node(kb, shb.strip()), "copied_version",
            f"allocation master is copied forward each season (stock and site columns overtyped): {n} species names shared of {len(set(sa))} / {len(set(sb))}; "
            f"{len(sheets_a & sheets_b)} of {len(sheets_b)} sheet names shared (site sheets carried over)", "high" if n >= 0.9 * min(len(set(sa)), len(set(sb))) else "medium")


# ======================================================================================
# 4. FORMULA EDGES from the profiles (counts) + scouts
# ======================================================================================
KEY_FILES = {  # profile source_path suffix -> short key
    F["FORECAST"]: "FORECAST", F["KEYSTONE25"]: "KEYSTONE25", F["POTON"]: "POTON", F["POTON2425"]: "POTON2425",
    F["ST_MASTER"]: "ST_MASTER", F["AL_SP25"]: "AL_SP25", F["AL_AU26"]: "AL_AU26", F["AL_SP26"]: "AL_SP26",
    F["PLANTSOUT"]: "PLANTSOUT", F["RESULTS"]: "RESULTS",
}


SKIP_PROFILE = {   # curated, cell-level edges exist for these (see run_plants_out / run_forecast_cells)
    "FORECAST": "all", "KEYSTONE25": "all",
    "PLANTSOUT": {("MASTER", "SUMMARY SITES"), ("MASTER", "SUMMARY PLANTS"), ("MASTER", "Trees that Count")},
    "POTON": {("Summary", "Annual")},
}


def run_formulas():
    seen = {}
    for pdir in PROFILES:
        for pf in glob.glob(os.path.join(pdir, "*.json")):
            try:
                j = json.load(open(pf))
            except Exception:
                continue
            sp = j.get("source_path", "")
            rel = sp.split("_ALL Plant Lists/")[-1] if "_ALL Plant Lists/" in sp else sp
            if rel in KEY_FILES:
                seen[rel] = j
    CHECKS["profiles_used"] = sorted(KEY_FILES[r] for r in seen)
    MIN_CELLS = 3
    for rel, j in seen.items():
        key = KEY_FILES[rel]
        skip = SKIP_PROFILE.get(key, set())
        if skip == "all":
            continue
        names = set(j.get("sheetnames", j["sheets"].keys()))
        pairs = defaultdict(int)            # (target, formula-sheet) -> cells
        missing = defaultdict(int)          # formula sheet -> cells pointing at a deleted sheet
        missing_names = Counter()
        for sn, s_ in j["sheets"].items():
            for tgt, cnt in (s_.get("formula_sheet_refs") or {}).items():
                if tgt == sn:
                    continue
                if tgt == "REF":
                    missing[sn] += cnt; missing_names["#REF!"] += cnt
                elif tgt not in names:
                    missing[sn] += cnt; missing_names[tgt.strip()] += cnt
                else:
                    pairs[(tgt, sn)] += cnt
        # collapse A: many formula sheets reading one target (site sheets <- master)
        by_tgt = defaultdict(list)
        for (tgt, sn), c in pairs.items():
            if (tgt, sn) in skip or c < MIN_CELLS:
                continue
            by_tgt[tgt].append((sn, c))
        # collapse B: many targets read by one formula sheet (months -> summary)
        by_sn = defaultdict(list)
        for tgt, lst in list(by_tgt.items()):
            if len(lst) > 3:
                tot = sum(c for _, c in lst)
                add(f"{SHORT[key]} › {tgt.strip()}", f"{SHORT[key]} › {len(lst)} site/view sheets (e.g. {', '.join(n.strip() for n, _ in lst[:3])})",
                    "formula", f"{len(lst)} sheets read '{tgt.strip()}' by column links matched on row position ({tot} formula cells)", "high")
                del by_tgt[tgt]
        for tgt, lst in by_tgt.items():
            for sn, c in lst:
                by_sn[sn].append((tgt, c))
        for sn, lst in by_sn.items():
            if len(lst) > 3:
                tot = sum(c for _, c in lst)
                add(f"{SHORT[key]} › {len(lst)} monthly sheets ({', '.join(t.strip() for t, _ in lst[:3])}, ...)", f"{SHORT[key]} › {sn.strip()}", "formula",
                    f"{tot} formula cells on '{sn.strip()}' link to the monthly sheets' total columns (=Sept!C4 etc.)", "high")
            else:
                for tgt, c in lst:
                    add(f"{SHORT[key]} › {tgt.strip()}", f"{SHORT[key]} › {sn.strip()}", "formula",
                        f"{c} formula cells on '{sn.strip()}' read '{tgt.strip()}'", "high")
        tot_missing = sum(missing.values())
        if tot_missing:
            lst = sorted(missing.items(), key=lambda x: -x[1])
            add(f"{SHORT[key]} › (deleted sheets: {', '.join(sorted(missing_names)[:4])})",
                f"{SHORT[key]} › {len(lst)} sheets (largest: {', '.join(n.strip() for n, _ in lst[:3])})", "formula",
                f"{tot_missing} formula cells point at a sheet that no longer exists (#REF! or a missing sheet name): BROKEN links", "high")

    # curated external link of the results register (profile only shows '[1]')
    add("2a Seed records.xls (external workbook, not in folder)", node("RESULTS", "Sheet1"), "formula",
        "Sheet1 A36:C36 =[1]Sheet1!$A$333 / $C$333 / $F$333 (3 cells; older versions A27:C34 the same); link target missing, cached #REF! in older copies", "medium")
    add(node("POTON2425", "[name] Master"), node("POTON2425", "Summary"), "formula",
        "Summary D4:D101 =VLOOKUP($B4,'[name] Master'!$B$4:$J$93,9,FALSE) in 2024-25 and 2025-26 (84 cells); typed in 2026-27", "high")


# ======================================================================================
# 5. FILE-LEVEL VERSION FAMILIES (inventory exact duplicates + 01_batches notes)
# ======================================================================================
def run_inventory_versions():
    rows = list(csv.DictReader(open(OUT + "00_inventory.csv", encoding="utf-8")))
    seen = set()
    for r in rows:
        d = r["exact_duplicate_of"].strip()
        if not d:
            continue
        group = tuple(sorted([r["path"]] + [x.strip() for x in d.split("|")]))
        if group in seen:
            continue
        seen.add(group)
        first = group[0]
        for other in group[1:]:
            add(first, other, "copied_version", f"byte-identical content hash (00_inventory.csv exact_duplicate_of), {len(group)} copies", "high")
    # scouts is_version_of
    for f in sorted(glob.glob(OUT + "02_scouts/B*.json")):
        j = json.load(open(f))
        for fl in j["files"]:
            iv = fl.get("is_version_of")
            if iv:
                note = ""
                m_ = re.match(r"^(.*?)\s*\((.*)\)\s*$", iv)
                if m_:
                    iv, note = m_.group(1), m_.group(2)
                add(iv, fl["path"], "copied_version",
                    f"scout {j['batch_id']} is_version_of: file is a version/copy of the earlier file" + (f" ({note})" if note else ""), "medium")
    # keystone family from batches
    add(node("FORECAST"), node("KEYSTONE25"), "copied_version",
        "same 16-sheet look-ahead workbook; the Aug 2025 version holds the populated roll-up (4-104 rows linked), the 2026/27 copy's master block is empty",
        "high")


# ======================================================================================
# 6. Forecast cell-level formula evidence (hand-checked cells)
# ======================================================================================
def run_forecast_cells():
    wf = wb("KEYSTONE25", formulas=True); wv = wb("KEYSTONE25")
    la = "3 Year Plant Look Ahead (Keysto"
    ks, su = "KEYSTONE SITES", "SUMMARY"
    d28 = wf[la]["D28"].value; ay28 = wf[la]["AY28"].value
    ksc28 = wf[ks]["C28"].value; suc28 = wf[su]["C28"].value; suv = wv[su]["C28"].value
    CHECKS["forecast_cells_aug25"] = {"LookAhead!D28": d28, "LookAhead!AY28": ay28, "KEYSTONE!C28": ksc28, "SUMMARY!C28": suc28, "SUMMARY!C28 value": suv}
    add(node("KEYSTONE25", "Whitechapel (15) / Slope Hill Rd (11) / other site sheets"), node("KEYSTONE25", "3 Year Plant Look Ahead (Keysto"), "formula",
        f"Look Ahead D4:AW104: one link per site per season, e.g. D28 {d28}; about 570-576 link cells per site sheet (Bush Creek 480); 9 site sheets feed it (Whitechapel, Lake Hayes Pavilion, Slope Hill Rd, Jardine Park, Feehly Hill, Peace Park, Bush Creek, ...)", "high")
    add(node("KEYSTONE25", "3 Year Plant Look Ahead (Keysto"), node("KEYSTONE25", "KEYSTONE SITES"), "formula",
        f"KEYSTONE SITES C4:H104, e.g. C28 {ksc28} (cached 450; column heading says Autumn 2024 but pulls the Spring 2025 block)", "high")
    add(node("KEYSTONE25", "KEYSTONE SITES"), node("KEYSTONE25", "SUMMARY"), "formula",
        f"SUMMARY C7:H104 {suc28}; cached value {suv}: BROKEN, the SCHOOLS sheet is missing", "high")
    wf2 = wb("FORECAST", formulas=True); wv2 = wb("FORECAST")
    la2 = "3 Year Plant Look Ahead (Keysto"
    cells = {c: wf2[la2][c].value for c in ("L13", "AK34", "BQ34", "BV34")}
    CHECKS["forecast_cells_2627"] = cells
    typed = sum(1 for row in wf2[la2].iter_rows(min_row=13, max_row=110, min_col=CI("L"), max_col=CI("BJ")) for c in row if isinstance(c.value, (int, float)))
    forms = sum(1 for row in wf2[la2].iter_rows(min_row=13, max_row=110, min_col=CI("L"), max_col=CI("BJ")) for c in row if isinstance(c.value, str) and c.value.startswith("="))
    CHECKS["forecast_2627_master_block"] = {"typed_numeric_cells_L13:BJ110": typed, "formula_cells": forms}
    add(node("FORECAST", "Whitechapel (15) / Slope Hill Rd (11) / other site sheets"), node("FORECAST", "3 Year Plant Look Ahead (Keysto"), "formula",
        f"master block L13:BJ110 holds {typed} typed numbers and {forms} formulas (S4c: template, not a forecast); only 8 header cells link to site sheets (D8:AR8 etc.)", "high")
    add(node("FORECAST", "3 Year Plant Look Ahead (Keysto"), node("FORECAST", "KEYSTONE SITES"), "formula",
        "KEYSTONE SITES C4:H104 ='3 Year Plant Look Ahead (Keysto'!BQ{r+6} (season sums of an empty block)", "high")
    add(node("FORECAST", "KEYSTONE SITES"), node("FORECAST", "SUMMARY"), "formula",
        "SUMMARY C7:H104 =KEYSTONE SITES + COMMUNITY GROUPS + SCHOOLS; SCHOOLS sheet missing so every total is #REF!", "high")
    add(node("FORECAST", "3 Year Plant Look Ahead (Keysto"), node("FORECAST", "DR-3 Year Plant Look Ahead (ALL"), "formula",
        "DR-3 Year Plant Look Ahead (ALL I6:I103 reads '3 Year Plant Look Ahead (Keysto'!BQ:BT; 95 further #REF! cells", "high")
    # site sheets -> pricking-out : rekeyed (Neill list x scaling equals site sheet?)  check Whitechapel AC (Spring) vs Neill E
    try:
        a = series("FORECAST", "Whitechapel (15)", "B", "AC", 5, 102); b = series("NEILL", "Sheet1", "B", "E", 4, 101)
        r = compare(a, b)
        rekeyed("whitechapel_vs_neill", node("NEILL", "Sheet1"), node("FORECAST", "Whitechapel (15)"), r,
                "[name] list E4:E101 'WC 3000' (=D x 3) vs Whitechapel (15) AC5:AC102 first look-ahead season", "S4c noted equal by value, no link", min_n=20, confidence=None)
    except Exception as e:
        CHECKS["wc_error"] = str(e)
    # Pricking-out target vs forecast roll-up (Aug 2025 look-ahead total AY) : any relation?
    try:
        a = series("KEYSTONE25", la, "B", "AY", 4, 104); b = series("PO2526", "Sheet1", "A", "B", 2, 97)
        r = compare(a, b)
        rekeyed("forecast_to_po2526", node("KEYSTONE25", "KEYSTONE SITES"), node("PO2526", "Sheet1"), r,
                "Aug 2025 Look Ahead AY4:AY104 (first-season total) vs Pricking-out 2025-26 B2:B97", "pricking-out target is an independent typed number; no relation expected",
                min_n=20, confidence="low")
    except Exception as e:
        CHECKS["fc_po_error"] = str(e)


# ======================================================================================
# OUTPUTS
# ======================================================================================
def write_csv():
    # order: type groups, drop exact duplicate rows
    seen = set(); rows = []; cv = {}
    for e in EDGES:
        if e["type"] == "copied_version" and (e["evidence"].startswith("byte-identical") or e["evidence"].startswith("scout ")):
            k = frozenset((e["from"], e["to"]))
            if k in cv:
                if e["evidence"].startswith("byte-identical") and not cv[k]["evidence"].startswith("byte-identical"):
                    cv[k]["evidence"] = e["evidence"] + "; " + cv[k]["evidence"]; cv[k]["confidence"] = "high"
                continue
            cv[k] = e; rows.append(e); continue
        k = (e["from"], e["to"], e["type"], e["evidence"])
        if k in seen:
            continue
        seen.add(k); rows.append(e)
    with open(OUT + "05_lineage_edges.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["from", "to", "type", "evidence", "confidence"])
        w.writeheader(); w.writerows(rows)
    return rows


def fr(r):
    return f"{r['equal']}/{r['compared']}"


def write_mmd():
    C = CHECKS
    sp = C["summary_plants_seasons"]
    typed = [x for x in sp if x["formula_cells"] <= x["typed_cells"]]
    t_eq, t_cmp = sum(x["equal"] for x in typed), sum(x["compared"] for x in typed)
    ttc = C["ttc_2425"]; ttc_eq, ttc_cmp = sum(x["equal"] for x in ttc), sum(x["compared"] for x in ttc)
    ss = C["summary_sites"]
    rl = C["results_vs_logs"]; st = C["sow2025_tags"]
    mst = C["master_to_spring26"]
    L = []
    A = L.append
    A("%% S5 lineage: sheet-level data flow. Solid = formula, dashed = re-keyed (value-matched), thick = copied version / typed summary.")
    A("%% Numbers are equal/compared species from lineage_check.py. Generated file: do not edit by hand.")
    A("flowchart LR")
    A("  subgraph SL[species list]")
    A('    MPLST["Master Plant List<br/>(Plants Out Master)"]')
    A("  end")
    A("  subgraph FC[forecast]")
    A('    SITES["Forecast site sheets<br/>(Whitechapel, Slope Hill, ...)"]')
    A('    LOOK["3 Year Look Ahead"]')
    A('    KEY["KEYSTONE SITES / SUMMARY<br/>(totals broken, SCHOOLS sheet missing)"]')
    A("  end")
    A("  subgraph PP[production_plan - site plant lists]")
    A('    MPL["Master plant list 2024 /<br/>Suggested lists"]')
    A('    NEILL["Std Annual Plant List<br/>([name]) MASTER"]')
    A("  end")
    A("  subgraph PO[pricking_out]")
    A('    POL["Pricking out 2026-27<br/>(target per species)"]')
    A('    TAL["Weekly tally sheets<br/>(goals only, weeks blank)"]')
    A("  end")
    A("  subgraph SS[seed_sowing / seed_provenance]")
    A('    SOW["Seed Sowing 2026<br/>Projected potting"]')
    A('    SLOG["Seed log MASTER"]')
    A('    RES["Seed and Cutting<br/>results register"]')
    A("  end")
    A("  subgraph PU[potting_up]")
    A('    PUM["Potting On<br/>monthly sheets"]')
    A('    HM["[name] Master<br/>(site targets)"]')
    A('    PUS["Potting On Summary<br/>Goal Set"]')
    A('    ANN["Potting On Annual"]')
    A("  end")
    A("  subgraph STK[stocktake]")
    A('    V150["V150 stocktake<br/>31 Mar 2026"]')
    A('    MST["Stocktake Master CURRENT<br/>Stage 2 / 3 / 4"]')
    A("  end")
    A("  subgraph AL[allocation]")
    A('    NSF["Nursery Stock list<br/>Feb 2026"]')
    A('    ALL["Allocation masters<br/>(stock + site columns)"]')
    A('    SITE["Site print sheets"]')
    A("  end")
    A("  subgraph PH[planting_history]")
    A('    POM["Plants Out Master<br/>MASTER"]')
    A("  end")
    A("  subgraph TTC[ttc_reporting]")
    A('    SPS["SUMMARY PLANTS /<br/>SUMMARY SITES"]')
    A('    TTCS["Trees that Count<br/>sheets (3)"]')
    A("  end")
    E = []   # (src, dst, arrow, label, style)
    def e(src, dst, kind, label=""):
        E.append((src, dst, kind, label))
    # formula
    e("SITES", "LOOK", "formula", "links, about 570 cells per site (Aug 2025 copy)")
    e("LOOK", "KEY", "broken", "REF! in every total")
    e("PUM", "PUS", "formula", "=Sept!C4 etc. (Aug typed)")
    e("HM", "PUS", "formula", "VLOOKUP to 2025-26, typed 2026-27")
    e("PUS", "ANN", "formula", "=Summary!J104:U104")
    e("ALL", "SITE", "formula", "16 to 18 sheets, row-position links")
    e("POM", "SPS", "formula", f"{sum(1 for x in sp if x['formula_cells'] > x['typed_cells'])} of {len(sp)} season columns + {ss['formula_cells_to_MASTER']} site cells")
    # rekeyed
    r = lambda k: C[k]
    e("NEILL", "POL", "rekeyed", f"Neill 8000: {fr(r('neill_to_po_C'))}; Spares: {fr(r('neill_to_po_D'))}".replace("Neill", "[name]"))
    e("NEILL", "HM", "rekeyed", f"Total if 6500: {fr(r('neill_to_pomaster_I'))}")
    e("POL", "SOW", "rekeyed", f"{fr(r('po2627_to_sow2026'))} (2026)")
    e("POL", "V150", "rekeyed", f"Projected: {fr(r('po2627_to_v150_26'))}")
    e("POL", "TAL", "rekeyed", f"2024 goals {fr(r('tally2024_to_po2425'))}; 2026 {fr(r('po2627_to_tally2026'))}")
    e("V150", "MST", "rekeyed", f"Stage 2: {fr(r('v150_to_master_D'))}, {fr(C['v150_D_to_master_D_plus_E'])} with T28")
    e("V150", "PUS", "rekeyed", f"Goal Set: {fr(r('v150_to_poton_goal'))}")
    e("PUS", "MST", "rekeyed", f"PB3 potted vs Stage 3: {fr(r('poton_to_pb3_F'))} (no link)")
    e("MST", "ALL", "rekeyed", f"stock cols D:I: {fr(mst)}")
    e("NSF", "ALL", "rekeyed", f"Autumn 2026 StockTake: {fr(r('nsfeb26_to_autumn26'))}")
    e("ALL", "POM", "rekeyed", f"Total Allocated: {fr(r('alloc_sp25_to_master'))} (Spr 2025), {fr(r('alloc_au26_to_master'))} (Aut 2026)")
    e("SLOG", "RES", "rekeyed", f"tag + date: {rl['S_match']}/{rl['S_rows_with_date']}")
    e("SLOG", "SOW", "rekeyed", f"tags in Notes: {st['found_in_seed_log']}/{st['tags_in_notes']}")
    e("MPLST", "MST", "rekeyed", "species names")
    e("MPLST", "POM", "rekeyed", "species names")
    # manual summary / copy
    e("POM", "SPS", "manual", f"typed columns: {t_eq}/{t_cmp}; {ss['typed_numeric_cells']} typed site cells")
    e("POM", "TTCS", "manual", f"typed 2024-25: {ttc_eq}/{ttc_cmp}")
    e("MPL", "NEILL", "copy", "revised in place")
    e("MPL", "NSF", "copy", "template spine")
    A("")
    arrows = {"formula": "-->", "broken": "-.->", "rekeyed": "-.->", "manual": "==>", "copy": "==>"}
    idx = {k: [] for k in arrows}
    for i, (a, b, k, lab) in enumerate(E):
        lab = lab.replace('"', "'")
        A(f'  {a} {arrows[k]}|"{lab}"| {b}' if lab else f"  {a} {arrows[k]} {b}")
        idx[k].append(i)
    A("")
    A("  classDef plain fill:#f7f7f2,stroke:#555,color:#111;")
    A("  classDef warn fill:#fdeaea,stroke:#b3261e,color:#111;")
    A("  class MPLST,SITES,LOOK,MPL,NEILL,POL,TAL,SOW,SLOG,RES,PUM,HM,PUS,ANN,V150,MST,NSF,ALL,SITE,POM,SPS,TTCS plain;")
    A("  class KEY warn;")
    if idx["rekeyed"]:
        A(f"  linkStyle {','.join(map(str, idx['rekeyed']))} stroke:#c2410c,stroke-width:2px,stroke-dasharray:6 4;")
    if idx["broken"]:
        A(f"  linkStyle {','.join(map(str, idx['broken']))} stroke:#b3261e,stroke-width:2px,stroke-dasharray:2 3;")
    if idx["manual"]:
        A(f"  linkStyle {','.join(map(str, idx['manual']))} stroke:#0f766e,stroke-width:3px;")
    if idx["copy"]:
        A(f"  linkStyle {','.join(map(str, idx['copy']))} stroke:#6d28d9,stroke-width:3px;")
    open(OUT + "05_lineage.mmd", "w", encoding="utf-8").write(mask("\n".join(L)) + "\n")
    return len(E)


if __name__ == "__main__":
    steps = [run_rekeyed, run_plants_out, run_extras, run_versions, run_forecast_cells, run_formulas, run_inventory_versions]
    for s in steps:
        try:
            s()
        except Exception as ex:
            import traceback; traceback.print_exc()
            print("STEP FAILED", s.__name__, ex, file=sys.stderr)
    rows = write_csv()
    try:
        write_mmd()
    except Exception:
        import traceback; traceback.print_exc()
    json.dump(CHECKS, open(OUT + "05_lineage_checks.json", "w"), indent=1, default=str)
    cnt = Counter(r["type"] for r in rows)
    print(len(rows), "edges", dict(cnt))
    for e in rows:
        if e["type"] in ("rekeyed", "manual_summary"):
            print(e["confidence"], "|", e["from"][-40:], "->", e["to"][-40:], "|", e["evidence"][:150])
