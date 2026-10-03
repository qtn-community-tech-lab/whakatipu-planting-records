#!/usr/bin/env python3
"""S0 inventory for WRT data discovery. Read-only on the source folder.

Writes discovery/00_inventory.csv (one row per file) and discovery/00_sheets.csv
(one row per sheet). Legacy .xls/.doc are converted as copies into
_converted/ (mirroring the source tree) using LibreOffice headless.
"""
import csv, hashlib, os, re, subprocess, sys, json, warnings
from datetime import datetime
from pathlib import Path

warnings.filterwarnings("ignore")
import openpyxl
from openpyxl.utils import get_column_letter

ROOT = Path("/home/claude/_source_copy/_ALL Plant Lists")
CONV = Path("/home/claude/_converted")
OUT = Path("/home/claude/discovery")
CONV.mkdir(exist_ok=True)

TYPE_MAP = {".xlsx": "xlsx", ".xlsm": "xlsx", ".xls": "xls", ".csv": "csv",
            ".docx": "docx", ".doc": "doc", ".pdf": "pdf", ".gpx": "other",
            ".png": "image", ".jpg": "image", ".jpeg": "image"}

VERSION_PAT = re.compile(r"(copy|\(\d\)|v\d|old|final|master|archive|to be updated|\b20\d\d\b|\d{8})", re.I)


def convert(src: Path, target_ext: str) -> Path | None:
    rel = src.relative_to(ROOT)
    outdir = CONV / rel.parent
    outdir.mkdir(parents=True, exist_ok=True)
    expected = outdir / (src.stem + target_ext)
    if expected.exists():
        return expected
    try:
        subprocess.run(["soffice", "--headless", "--convert-to", target_ext.lstrip("."),
                        "--outdir", str(outdir), str(src)],
                       capture_output=True, timeout=180, check=False)
    except Exception as e:
        print("convert failed", src, e, file=sys.stderr)
    return expected if expected.exists() else None


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def profile_workbook(path: Path):
    """Return (wb_info, [sheet rows])."""
    sheets = []
    info = {"sheet_count": 0, "sheet_names": "", "external_links": 0,
            "defined_names": 0, "hidden_sheets": 0, "error": ""}
    try:
        wb = openpyxl.load_workbook(path, read_only=False, data_only=False, keep_links=True)
    except Exception as e:
        info["error"] = f"{type(e).__name__}: {e}"[:200]
        return info, sheets
    try:
        info["external_links"] = len(getattr(wb, "_external_links", []) or [])
    except Exception:
        pass
    try:
        dn = wb.defined_names
        info["defined_names"] = len(dn) if hasattr(dn, "__len__") else len(list(dn.definedName))
    except Exception:
        pass
    names = wb.sheetnames
    info["sheet_count"] = len(names)
    info["sheet_names"] = " | ".join(names)
    for ws in wb.worksheets:
        hidden = ws.sheet_state != "visible"
        if hidden:
            info["hidden_sheets"] += 1
        max_r, max_c = ws.max_row or 0, ws.max_column or 0
        nonempty_rows = set(); nonempty_cols = set(); n_formulas = 0; n_cells = 0
        ext_refs = 0; err_cells = 0
        # cap scan for huge sheets
        r_cap = min(max_r, 5000); c_cap = min(max_c, 100)
        for row in ws.iter_rows(min_row=1, max_row=r_cap, max_col=c_cap):
            for cell in row:
                v = cell.value
                if v is None or (isinstance(v, str) and not v.strip()):
                    continue
                n_cells += 1
                nonempty_rows.add(cell.row); nonempty_cols.add(cell.column)
                if isinstance(v, str) and v.startswith("="):
                    n_formulas += 1
                    if "[" in v:
                        ext_refs += 1
                if isinstance(v, str) and v.startswith("#"):
                    err_cells += 1
        try:
            merged = len(ws.merged_cells.ranges)
        except Exception:
            merged = 0
        tables = len(getattr(ws, "tables", {}) or {})
        used = f"A1:{get_column_letter(max_c)}{max_r}" if max_r and max_c else ""
        sheets.append({
            "path": str(path.relative_to(ROOT)) if ROOT in path.parents else str(path.relative_to(CONV)),
            "sheet": ws.title, "hidden": hidden, "used_range": used,
            "max_row": max_r, "max_col": max_c,
            "nonempty_rows": len(nonempty_rows), "nonempty_cols": len(nonempty_cols),
            "nonempty_cells": n_cells, "formulas": n_formulas, "external_formula_refs": ext_refs,
            "error_cells": err_cells, "merged_ranges": merged, "tables": tables,
            "scan_capped": (max_r > 5000 or max_c > 100),
        })
    wb.close()
    return info, sheets


def main():
    files = sorted(p for p in ROOT.rglob("*") if p.is_file())
    inv_rows, sheet_rows = [], []
    hashes = {}
    for p in files:
        ext = p.suffix.lower()
        ftype = TYPE_MAP.get(ext, "other")
        st = p.stat()
        row = {"path": str(p.relative_to(ROOT)), "extension": ext, "size_bytes": st.st_size,
               "modified": datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d"),
               "type": ftype, "content_hash": sha(p), "converted_copy": "",
               "sheet_count": "", "sheet_names": "", "external_links": "", "defined_names": "",
               "hidden_sheets": "", "total_formulas": "", "read_error": "",
               "version_markers": ",".join(sorted(set(m.lower() for m in VERSION_PAT.findall(p.stem)))),
               "base_name": re.sub(r"[\s_\-\.]*(copy|\(\d\)|final|master|old|to be updated|archive)[\s_\-\.]*", " ",
                                   p.stem, flags=re.I).strip().lower()}
        wb_path = None
        if ftype == "xlsx":
            wb_path = p
        elif ftype == "xls":
            c = convert(p, ".xlsx")
            row["converted_copy"] = str(c.relative_to(CONV)) if c else "CONVERSION FAILED"
            wb_path = c
        elif ftype == "doc":
            c = convert(p, ".docx")
            row["converted_copy"] = str(c.relative_to(CONV)) if c else "CONVERSION FAILED"
        if wb_path:
            info, sheets = profile_workbook(wb_path)
            row.update({"sheet_count": info["sheet_count"], "sheet_names": info["sheet_names"],
                        "external_links": info["external_links"], "defined_names": info["defined_names"],
                        "hidden_sheets": info["hidden_sheets"], "read_error": info["error"],
                        "total_formulas": sum(s["formulas"] for s in sheets)})
            for s in sheets:
                s["path"] = row["path"]  # always refer to the source path
            sheet_rows.extend(sheets)
        if ftype == "csv":
            with open(p, newline="", encoding="utf-8", errors="replace") as f:
                n = sum(1 for _ in f)
            row["sheet_count"] = 1; row["sheet_names"] = "(csv)"
            sheet_rows.append({"path": row["path"], "sheet": "(csv)", "hidden": False, "used_range": "",
                               "max_row": n, "max_col": "", "nonempty_rows": n, "nonempty_cols": "",
                               "nonempty_cells": "", "formulas": 0, "external_formula_refs": 0,
                               "error_cells": 0, "merged_ranges": 0, "tables": 0, "scan_capped": False})
        hashes.setdefault(row["content_hash"], []).append(row["path"])
        inv_rows.append(row)

    # duplicate / version detection
    by_base = {}
    for r in inv_rows:
        by_base.setdefault(r["base_name"], []).append(r["path"])
    for r in inv_rows:
        dups = [x for x in hashes[r["content_hash"]] if x != r["path"]]
        sibs = [x for x in by_base[r["base_name"]] if x != r["path"]]
        r["exact_duplicate_of"] = " | ".join(dups)
        r["likely_version_family"] = " | ".join(sibs)
        r["looks_like_version"] = bool(dups or sibs or r["version_markers"])

    with open(OUT / "00_inventory.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(inv_rows[0].keys()))
        w.writeheader(); w.writerows(inv_rows)
    with open(OUT / "00_sheets.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(sheet_rows[0].keys()))
        w.writeheader(); w.writerows(sheet_rows)
    print(f"files={len(inv_rows)} sheets={len(sheet_rows)}")
    from collections import Counter
    print(Counter(r["type"] for r in inv_rows))
    print("read errors:", [(r["path"], r["read_error"]) for r in inv_rows if r["read_error"]])
    print("conversion failed:", [r["path"] for r in inv_rows if r["converted_copy"] == "CONVERSION FAILED"])


if __name__ == "__main__":
    main()
