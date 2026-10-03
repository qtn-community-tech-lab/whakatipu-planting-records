#!/usr/bin/env python3
"""Profile one workbook (or csv) for the WRT discovery scouts. Read-only.

Usage: profile_workbook.py "<path relative to source root or absolute>" [--sheets "A|B"] [--out dir] [--sample N]

Writes <out>/<slug>.json with, per sheet: header-row guess, data rows, column
profiles (type, non-null %, distinct, top values, min/max), formula patterns and
cross-sheet/external refs, fill colours, merged ranges, text blocks, sample rows.
Output goes to the scratchpad by default so raw values never sit in discovery/.
"""
import argparse, json, re, sys, warnings, datetime as dt
from collections import Counter
from pathlib import Path
warnings.filterwarnings("ignore")
import openpyxl
from openpyxl.utils import get_column_letter

ROOT = Path("/home/claude/_source_copy/_ALL Plant Lists")
CONV = Path("/home/claude/_converted")
DEFAULT_OUT = Path("/tmp/claude-0/-home-claude/01b4c8c7-87fc-50d1-99da-bcff854e2f87/scratchpad/profiles")
ROW_CAP, COL_CAP = 3000, 80
SHEET_REF = re.compile(r"(?:'([^']+)'|([A-Za-z0-9_\. ]+))!")
EXT_REF = re.compile(r"\[([^\]]+)\]")


def resolve(p: str) -> Path:
    path = Path(p)
    if not path.is_absolute():
        path = ROOT / p
    if path.suffix.lower() in (".xls",):
        c = CONV / path.relative_to(ROOT).with_suffix(".xlsx")
        if c.exists():
            return c
    return path


def trunc(v, n=40):
    if isinstance(v, (dt.datetime, dt.date)):
        return v.isoformat()[:10]
    s = str(v)
    return s if len(s) <= n else s[: n - 1] + "…"


def cell_type(v):
    if v is None: return None
    if isinstance(v, bool): return "bool"
    if isinstance(v, int): return "int"
    if isinstance(v, float): return "int" if v.is_integer() else "float"
    if isinstance(v, (dt.datetime, dt.date)): return "date"
    if isinstance(v, str):
        if v.startswith("="): return "formula"
        if v.startswith("#"): return "error"
        return "text"
    return "other"


def formula_pattern(f: str) -> str:
    return re.sub(r"\d+", "#", f)[:80]


def profile_sheet(ws_f, ws_v, sample_n):
    max_r = min(ws_f.max_row or 0, ROW_CAP)
    max_c = min(ws_f.max_column or 0, COL_CAP)
    grid_f = [[c.value for c in row] for row in ws_f.iter_rows(min_row=1, max_row=max_r, max_col=max_c)]
    grid_v = [[c.value for c in row] for row in ws_v.iter_rows(min_row=1, max_row=max_r, max_col=max_c)] if ws_v is not None else grid_f
    nonempty = [i for i, row in enumerate(grid_v) if any(v is not None and str(v).strip() != "" for v in row)]
    if not nonempty:
        return {"role_guess": "empty", "header_row": None, "data_rows": None, "columns": [], "formulas": [],
                "fills": [], "merged": [], "text_blocks": [], "sample_rows": [], "note": "no data"}
    # header row guess: among first 20 non-empty rows, the row with most text cells that is followed by rows with numbers/dates or more cells
    best, best_score = nonempty[0], -1
    for i in nonempty[:20]:
        row = grid_v[i]
        texts = sum(1 for v in row if isinstance(v, str) and not v.startswith("="))
        filled = sum(1 for v in row if v is not None and str(v).strip() != "")
        nxt = [grid_v[j] for j in nonempty if j > i][:5]
        nxt_filled = max((sum(1 for v in r if v is not None) for r in nxt), default=0)
        score = texts * 2 + (filled if nxt_filled >= filled * 0.5 else -filled)
        if texts >= 2 and score > best_score:
            best, best_score = i, score
    header_row = best
    data_idx = [i for i in nonempty if i > header_row]
    data_start = data_idx[0] + 1 if data_idx else None
    data_end = data_idx[-1] + 1 if data_idx else None
    headers = grid_v[header_row]
    cols = []
    for ci in range(max_c):
        vals = [grid_v[i][ci] for i in data_idx]
        fvals = [grid_f[i][ci] for i in data_idx]
        nn = [v for v in vals if v is not None and str(v).strip() != ""]
        if not nn and (headers[ci] is None):
            continue
        types = Counter(cell_type(v) for v in nn)
        ftypes = Counter(cell_type(v) for v in fvals if v is not None)
        n_form = ftypes.get("formula", 0)
        if n_form and n_form >= 0.5 * max(len(nn), 1):
            t = "formula"
        elif len(types) == 0:
            t = "empty"
        elif len(types) == 1:
            t = next(iter(types))
        else:
            top = types.most_common(1)[0]
            t = top[0] if top[1] >= 0.9 * len(nn) else "mixed"
        nums = [v for v in nn if isinstance(v, (int, float)) and not isinstance(v, bool)]
        dates = [v for v in nn if isinstance(v, (dt.datetime, dt.date))]
        dist = Counter(trunc(v, 60) for v in nn)
        col = {
            "letter": get_column_letter(ci + 1),
            "header": trunc(headers[ci], 80) if headers[ci] is not None else "",
            "type": t, "type_mix": dict(types),
            "non_null_pct": round(100 * len(nn) / max(len(data_idx), 1), 1),
            "distinct": len(dist),
            "top_values": [[k, c] for k, c in dist.most_common(10)],
            "formula_cells": n_form,
            "formula_example": next((trunc(v, 120) for v in fvals if isinstance(v, str) and v.startswith("=")), None),
        }
        if nums:
            col["min"], col["max"] = min(nums), max(nums)
        if dates:
            col["min_date"], col["max_date"] = trunc(min(dates)), trunc(max(dates))
        cols.append(col)
    # formulas
    pats = Counter(); refs = Counter(); ext = Counter(); errors = []
    first_cell = {}
    for i, row in enumerate(grid_f):
        for ci, v in enumerate(row):
            if isinstance(v, str) and v.startswith("="):
                p = formula_pattern(v)
                pats[p] += 1
                first_cell.setdefault(p, f"{get_column_letter(ci+1)}{i+1}")
                for m in SHEET_REF.finditer(v):
                    refs[(m.group(1) or m.group(2)).strip()] += 1
                for m in EXT_REF.finditer(v):
                    ext[m.group(1)] += 1
            elif isinstance(v, str) and v.startswith("#") and len(v) < 10:
                errors.append(f"{get_column_letter(ci+1)}{i+1}:{v}")
    for i, row in enumerate(grid_v):
        for ci, v in enumerate(row):
            if isinstance(v, str) and v.startswith("#") and len(v) < 10 and f"{get_column_letter(ci+1)}{i+1}:{v}" not in errors:
                errors.append(f"{get_column_letter(ci+1)}{i+1}:{v}(cached)")
    formulas = [{"pattern": p, "count": c, "first_cell": first_cell[p]} for p, c in pats.most_common(25)]
    # fills (meaningful colour)
    fills = Counter(); fill_eg = {}
    for row in ws_f.iter_rows(min_row=1, max_row=max_r, max_col=max_c):
        for c in row:
            try:
                f = c.fill
                if f is not None and f.fill_type == "solid":
                    rgb = f.fgColor.rgb if f.fgColor is not None and f.fgColor.type == "rgb" else f"theme{f.fgColor.theme}" if f.fgColor is not None else None
                    if rgb and rgb not in ("00000000", "FFFFFFFF"):
                        fills[rgb] += 1
                        fill_eg.setdefault(rgb, []).append(c.coordinate) if len(fill_eg.get(rgb, [])) < 3 else None
            except Exception:
                pass
    fills_out = [{"colour": k, "cells": v, "examples": fill_eg[k]} for k, v in fills.most_common(12)]
    # font colour (e.g. red text)
    fcol = Counter()
    for row in ws_f.iter_rows(min_row=1, max_row=max_r, max_col=max_c):
        for c in row:
            try:
                col = c.font.color
                if c.value is not None and col is not None and col.type == "rgb" and col.rgb not in ("FF000000", None):
                    fcol[col.rgb] += 1
            except Exception:
                pass
    merged = [str(r) for r in list(ws_f.merged_cells.ranges)[:25]]
    # text blocks: long strings outside header
    text_blocks = []
    for i, row in enumerate(grid_v):
        for ci, v in enumerate(row):
            if isinstance(v, str) and len(v) > 60 and i != header_row:
                text_blocks.append({"cell": f"{get_column_letter(ci+1)}{i+1}", "text": trunc(v, 160)})
            if len(text_blocks) >= 15: break
        if len(text_blocks) >= 15: break
    # sample rows: first ~2/3 of sample from start, rest from end
    head_n = max(sample_n * 2 // 3, 1)
    idxs = data_idx[:head_n] + data_idx[-(sample_n - head_n):] if len(data_idx) > sample_n else data_idx
    seen = set(); sample = []
    for i in idxs:
        if i in seen: continue
        seen.add(i)
        sample.append({"row": i + 1, "values": [trunc(v, 40) if v is not None else None for v in grid_v[i]]})
    # rows that look like totals/summary
    totals = [i + 1 for i in data_idx if any(isinstance(v, str) and re.search(r"\btotal|\bsum\b|grand", v, re.I) for v in grid_v[i])][:15]
    return {
        "dims": {"max_row": ws_f.max_row, "max_col": ws_f.max_column, "capped": (ws_f.max_row or 0) > ROW_CAP or (ws_f.max_column or 0) > COL_CAP},
        "header_row": header_row + 1, "header_values": [trunc(h, 60) if h is not None else None for h in headers],
        "data_rows": f"{data_start}-{data_end}" if data_start else None,
        "n_data_rows": len(data_idx),
        "pre_header_rows": [{"row": i + 1, "values": [trunc(v, 60) for v in grid_v[i] if v is not None]} for i in nonempty if i < header_row][:6],
        "columns": cols,
        "formulas": formulas,
        "formula_sheet_refs": dict(refs.most_common(20)),
        "external_refs": dict(ext.most_common(10)),
        "error_cells": errors[:20],
        "fills": fills_out,
        "font_colours": dict(fcol.most_common(6)),
        "merged": merged, "merged_count": len(ws_f.merged_cells.ranges),
        "totals_rows": totals,
        "text_blocks": text_blocks,
        "sample_rows": sample,
        "hidden": ws_f.sheet_state != "visible",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--sheets", default=None, help="pipe-separated sheet names; default all")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--sample", type=int, default=15)
    a = ap.parse_args()
    src = resolve(a.path)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^A-Za-z0-9]+", "_", a.path)[:120]
    result = {"source_path": a.path, "opened": str(src), "sheets": {}}
    if src.suffix.lower() == ".csv":
        import pandas as pd
        df = pd.read_csv(src, header=None, dtype=str, keep_default_na=False)
        result["sheets"]["(csv)"] = {"dims": {"rows": len(df), "cols": df.shape[1]},
                                      "head": df.head(a.sample).values.tolist(),
                                      "col_nonnull": [(df[c] != "").mean().round(3) for c in df.columns]}
    else:
        wb_f = openpyxl.load_workbook(src, data_only=False)
        try:
            wb_v = openpyxl.load_workbook(src, data_only=True)
        except Exception:
            wb_v = None
        result["sheetnames"] = wb_f.sheetnames
        try:
            result["defined_names"] = [str(n) for n in list(wb_f.defined_names.keys())][:30]
        except Exception:
            result["defined_names"] = []
        want = a.sheets.split("|") if a.sheets else wb_f.sheetnames
        for name in want:
            if name not in wb_f.sheetnames:
                result["sheets"][name] = {"error": "sheet not found"}; continue
            try:
                result["sheets"][name] = profile_sheet(wb_f[name], wb_v[name] if wb_v else None, a.sample)
            except Exception as e:
                result["sheets"][name] = {"error": f"{type(e).__name__}: {e}"}
    dest = out / f"{slug}.json"
    dest.write_text(json.dumps(result, indent=1, default=str))
    print(dest)


if __name__ == "__main__":
    main()
