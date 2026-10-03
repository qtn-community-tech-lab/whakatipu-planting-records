#!/usr/bin/env python3
"""S3: validate ScoutReports against the contract, check batch coverage and
scan for sensitive-looking values. Writes 03_sheet_catalogue.csv and prints
failures per batch."""
import csv, json, re, sys
from pathlib import Path

D = Path("/home/claude/discovery")
batches = {b["batch_id"]: b for b in json.load(open(D / "01_batches.json"))}
STAGES = {"forecast","production_plan","pricking_out","potting_up","stocktake","allocation","planting_history","species_list","seed_provenance","ttc_reporting","site_map","admin","unknown"}
ROLES = {"data","summary","lookup","form","notes","chart","empty"}
SHEET_KEYS = {"name","role","header_row","data_rows","grain","columns","formulas","species_name_column","species_distinct_count","quality_issues","sensitive_columns","confidence"}
COL_KEYS = {"letter","header","concept","type","non_null_pct","distinct","examples","notes"}
COORD = re.compile(r"-?4[4-6]\.\d{3,}|16[89]\.\d{3,}|\b[NS]\s?\d{1,2}°|\b\d{1,2}°\s?\d")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"\b0\d{1,2}[ -]?\d{3}[ -]?\d{3,4}\b|\+64")

catalogue = []; failures = {}; sens_hits = []
for bid, b in batches.items():
    f = D / "02_scouts" / f"{bid}.json"
    errs = []
    if not f.exists():
        failures[bid] = ["report file missing"]; continue
    try:
        r = json.load(open(f))
    except Exception as e:
        failures[bid] = [f"invalid JSON: {e}"]; continue
    if r.get("batch_id") != bid: errs.append(f"batch_id mismatch: {r.get('batch_id')}")
    if "open_questions_for_wrt" not in r: errs.append("missing open_questions_for_wrt")
    reported = {}
    for fe in r.get("files", []):
        p = fe.get("path")
        for k in ("purpose_guess","workflow_stage","years_covered","is_version_of","sheets"):
            if k not in fe: errs.append(f"{p}: missing file key {k}")
        if fe.get("workflow_stage") not in STAGES: errs.append(f"{p}: bad workflow_stage {fe.get('workflow_stage')}")
        reported[p] = fe
        for sh in fe.get("sheets", []):
            missing = SHEET_KEYS - set(sh)
            if missing: errs.append(f"{p} › {sh.get('name')}: missing sheet keys {sorted(missing)}")
            if sh.get("role") not in ROLES: errs.append(f"{p} › {sh.get('name')}: bad role {sh.get('role')}")
            if sh.get("confidence") not in ("low","medium","high"): errs.append(f"{p} › {sh.get('name')}: bad confidence")
            for c in sh.get("columns", []):
                miss = COL_KEYS - set(c)
                if miss: errs.append(f"{p} › {sh.get('name')} › col {c.get('letter')}: missing {sorted(miss)}")
                ex = c.get("examples") or []
                if len(ex) > 5: errs.append(f"{p} › {sh.get('name')} › col {c.get('letter')}: >5 examples")
                for v in ex:
                    s = str(v)
                    if COORD.search(s) or EMAIL.search(s) or PHONE.search(s):
                        sens_hits.append((bid, p, sh.get("name"), c.get("letter"), s[:60]))
                if "SENSITIVE" in str(c.get("concept","")).upper() or c.get("concept") == "seed_location":
                    if ex: sens_hits.append((bid, p, sh.get("name"), c.get("letter"), f"examples present on sensitive column: {ex}"))
            catalogue.append({
                "batch_id": bid, "file": p, "sheet": sh.get("name"), "role": sh.get("role"),
                "workflow_stage": fe.get("workflow_stage"), "grain": (sh.get("grain") or "")[:200],
                "header_row": sh.get("header_row"), "data_rows": sh.get("data_rows"),
                "species_column": sh.get("species_name_column"), "species_distinct": sh.get("species_distinct_count"),
                "years": fe.get("years_covered"), "is_version_of": fe.get("is_version_of") or "",
                "n_columns": len(sh.get("columns", [])), "n_quality_issues": len(sh.get("quality_issues", [])),
                "n_sensitive_cols": len(sh.get("sensitive_columns", [])), "confidence": sh.get("confidence"),
            })
    # coverage
    for path, sheets in b["sheets"].items():
        fe = reported.get(path)
        if fe is None:
            errs.append(f"file not covered: {path}"); continue
        if fe.get("is_version_of") and not fe.get("sheets"):
            continue  # declared duplicate, allowed
        got = {s.get("name") for s in fe.get("sheets", [])}
        for s in sheets:
            if s not in got and not (s == "(csv)" and got) and not (path.lower().endswith((".docx",".doc",".gpx")) and "(document)" in got):
                errs.append(f"sheet not covered: {path} › {s}")
    if errs: failures[bid] = errs

with open(D / "03_sheet_catalogue.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(catalogue[0].keys())); w.writeheader(); w.writerows(catalogue)
print(f"catalogue rows: {len(catalogue)}")
print("\nFAILURES:")
for bid, e in failures.items():
    print(f"  {bid}:")
    for x in e[:15]: print("    -", x)
    if len(e) > 15: print(f"    ... {len(e)-15} more")
print("\nSENSITIVE-LOOKING HITS:")
for h in sens_hits: print("  ", h)
