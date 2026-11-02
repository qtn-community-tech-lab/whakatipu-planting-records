#!/usr/bin/env python3
"""
build_history_prototype.py  -  S7 (Phase 2): turn `_JMN Plants Out Master.xlsx > MASTER`
into one clean, re-runnable long table, without touching the source.

Reads   (read-only, never written):
  _source_copy/.../_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx
      MASTER          rows 1-6 (season, group, site header, site ID, landowner), 8-107 (counts)
      SUMMARY SITES   register of site IDs and names (columns A and C only; the contact
                      columns are never read)
  discovery/04d_sites_variants.csv      Phase 1 site-header variants -> proposed site
  planning/prototype/species_crosswalk.csv, species_master_proposed.csv   (S4A)
Writes  (all under planning/prototype/):
  planting_history.csv         one row per non-zero species x site-column x season cell
  site_crosswalk.csv           the site mapping table used (original header -> proposed site)
  history_reconciliation.csv   totals from the rows against every total the workbook states

Run:  python3 build_history_prototype.py          (about 10 seconds; prints the review report)

Rules (change a constant or a dict below, re-run; nothing is cleaned silently):
  * A record is one non-zero numeric cell (species row 8-106 x site column).  Zero and blank
    cells are skipped.  A non-numeric, non-blank cell is kept as an exception row with an empty
    quantity and needs_review = Y (there is exactly one: text beside a number).
  * The original species text, original season label, original site header and source cell are
    carried on every row.  Header text that is not in the Phase 1 variants table is treated as
    carrying a personal name and is masked as "[name]" (a known site stem is kept:
    "SHOTOVER RIVER [name]").  The unmasked text is never written anywhere.
  * Species: the S4A crosswalk gives the ID for the exact MASTER string.  Contested pairs keep
    their own IDs (no merge) and are flagged needs_review = Y.
  * Site: the header text is looked up in the Phase 1 variants table; the row-5 ID is compared
    with the ID in the proposed site.  Every disagreement, rule or uncertainty is a flag with a
    reason.  Review reasons carry a kind: RULING (a person must decide), CONFIRM (a rule was
    applied; WRT confirms once), FYI (information only; does not set needs_review).
  * Confidence: high = site found, row-5 ID agrees, species not contested, nothing else noted;
    low = site not found, scheme column, or non-numeric cell; medium = everything else.
"""
import csv
import hashlib
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter as L

BASE = Path("/home/claude")
SRC_REL = "_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx"
SRC = BASE / "_source_copy/_ALL Plant Lists" / SRC_REL
SITES_CSV = BASE / "discovery/04d_sites_variants.csv"
CROSSWALK = BASE / "planning/prototype/species_crosswalk.csv"
MASTER_SP = BASE / "planning/prototype/species_master_proposed.csv"
OUT = BASE / "planning/prototype"

FIRST_SPECIES_ROW, LAST_SPECIES_ROW, LAST_NUMBERED_ROW, TOTAL_ROW = 8, 106, 105, 107
FIRST_SITE_COL = 7  # G
OLD_ID_YEAR = 2015  # Autumn 2015 uses the old site numbering (04d 3.2)
# Old (Autumn 2015) ID -> register ID, from 04d 3.2.  Used only to explain a row-5 ID.
OLD_TO_NEW = {"35": "6", "47": "8", "6": "9", "14": "9D", "3": "12A", "4": "15",
              "10": "16", "49": "17", "12": "24"}
# Row-5 ID typed vs ID in the register, documented in 04d 3.2 (explains, never fixes)
FAULT_PAIRS = {("13C", "11"): "Slope Hill carries Bush Creek's ID (13C)",
               ("11", "23B"): "Welcome Forest carries Slope Hill's ID (11)",
               ("!!A", "11A"): "ID typed as an error text (!!A)",
               ("9E", "9F"): "Akarua Corner typed 9E; the register gives 9E to Green Cabs",
               ("13A", "13D"): "Derby St typed 13A; the register gives 13A to Bush Creek Preschool"}
# Faults whose site is known (Slope Hill Coronation is 11A), so the typo is only a note.
SETTLED_FAULTS = {("!!A", "11A")}
# The two 2024 Slope Hill columns (21% of all plants): WRT decision 4, ruled real.
DECISION4_RULED = "decision 4 ruled: the 2024 Slope Hill columns are real plantings (22,000 trees funded by the Hilton Global Foundation, 7,000 donated by Trees That Count for the coronation)"
DECISION4_SITES = {"Slope Hill HGF", "Slope Hill Coronation"}
DECISION4_YEAR = 2024
SCHEME_WORDS = ("paper4trees", "p4t", "paper for trees", "paper 4 trees")
SUBSITE_AREA_WORDS = {"reference gardens", "internal", "internal planting", "hgf"}

# Proposed grouping by the numeric part of the site number (parcels share it: 9A..9H, 22A..22C).
GROUPS = {
    "1": "Glenorchy", "2": "Moke Lake", "4": "Queenstown Hill and Primary", "5": "Gorge Road area",
    "6": "Arthurs Point", "8": "Lower Shotover Conservation Area", "9": "Lake Hayes",
    "10": "Lake Hayes Estate", "11": "Slope Hill", "12": "Feehly Hill", "13": "Arrowtown and Bush Creek",
    "14": "Arrow River", "15": "Whitechapel", "16": "Rapley Close", "17": "Arrow Morven",
    "18": "Swiftburn and Kawarau Bridge", "20": "Shotover Primary", "21": "Peace Park and Frankton",
    "22": "Kelvin Peninsula", "23": "Jardine Park", "24": "Wye Creek", "25": "Jardine Boulders",
    "26": "Kingston", "27": "Gibbston", "28": "Tucker Beach and Shotover River", "29": "Quail Rise",
    "30": "Hidden Island and Cecil Peak",
}
CLASS_LETTER = {"keystone": "K", "community": "C", "school": "S"}


# --------------------------------------------------------------------------- helpers
def norm(s):
    s = str(s).replace("\\n", " ").replace("\n", " ").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def norm_id(v):
    if v is None or v == "":
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip().upper()


def pid_of(proposed):
    m = re.search(r"\(([0-9]+[A-Z]?(?:/[0-9]+[A-Z])?)\)\s*$", proposed or "")
    return m.group(1) if m else None


def name_of(proposed):
    return re.sub(r"\s*\([^()]*\)\s*$", "", proposed or "").strip()


def base_num(sid):
    m = re.match(r"(\d+)", sid or "")
    return m.group(1) if m else None


def season_of(label):
    m = re.match(r"\s*(autumn|spring)\s+(\d{4})\s*$", str(label or ""), re.I)
    return (m.group(1).capitalize(), int(m.group(2))) if m else (None, None)


def slug(s):
    return re.sub(r"[^A-Z0-9]+", "-", s.upper()).strip("-")


def display_header(raw):
    """Original header text, line breaks written as the two characters \\n (as Phase 1 did)."""
    return str(raw).replace("\r", "").replace("\n", "\\n")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# --------------------------------------------------------------------------- lookups
def load_sites():
    out, stems = {}, {}
    rows = list(csv.DictReader(open(SITES_CSV, encoding="utf-8")))
    for r in rows:
        k = r["normalised_key"]
        if k not in out or "PO:MASTER!r4" in r["where_seen"]:
            out[k] = r
        if "[name" in r["raw_string"] and "PO:MASTER!r4" in r["where_seen"]:
            stem = norm(re.sub(r"\(?\[name\]\)?", "", r["raw_string"]))
            if stem:
                stems[stem] = r
    by_pid = {}
    for r in rows:
        p = pid_of(r["proposed_site"])
        if p and "/" not in p and p not in by_pid:
            by_pid[p] = r
    return out, stems, by_pid


def load_register():
    """ID -> register name, from SUMMARY SITES (columns A and C only)."""
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    reg = {}
    for r in wb["SUMMARY SITES"].iter_rows(min_row=4, max_row=82, min_col=1, max_col=3, values_only=True):
        sid = norm_id(r[0])
        if sid and not sid.startswith("HISTORIC") and r[2]:
            reg.setdefault(sid, str(r[2]).strip())
    return reg


def load_species():
    cw = defaultdict(list)
    for r in csv.DictReader(open(CROSSWALK, encoding="utf-8")):
        cw[r["match_key"]].append(r)
    master = {r["species_id"]: r for r in csv.DictReader(open(MASTER_SP, encoding="utf-8"))}
    return cw, master


def species_lookup(name, cw, master):
    """-> (species_id, canonical, review_items).  Uses the rows for the exact MASTER string."""
    key = " ".join(re.sub(r"[^a-z0-9 ]+", " ", str(name).lower()).split())
    cands = cw.get(key, [])
    exact = [r for r in cands if " ".join(str(r["raw_name"]).split()).lower() == " ".join(str(name).split()).lower()]
    use = exact or cands
    if not use:
        return "", "", [("RULING", "species text not in the S4A crosswalk")]
    ids = {r["species_id"] for r in use if r["species_id"]}
    if len(ids) != 1:
        return "", "", [("RULING", "species text maps to %s IDs in the crosswalk" % len(ids))]
    sid = ids.pop()
    canon = use[0]["proposed_canonical_name"]
    items = []
    contested = [r for r in use if r["needs_wrt_decision"] == "Y" and r["note"].startswith("Contested")]
    if contested:
        m = master.get(sid, {})
        partners = m.get("contested_with", "")
        tag = re.match(r"Contested (C\d+)", contested[0]["note"]).group(1)
        items.append(("RULING", "species contested (%s) with %s: separate stock lines or one? ID kept as typed, no merge"
                      % (tag, partners.replace("|", ", ") or "partner IDs")))
    if not exact:
        items.append(("FYI", "species text matched by key only (not an exact crosswalk row)"))
    return sid, canon, items


# --------------------------------------------------------------------------- site resolution
def resolve_site(raw_header, rid, year, sites, stems, by_pid, register):
    """-> dict with site_original (masked), name, id, group, cls, precision, tier, items, rule."""
    key = norm(raw_header)
    items = []
    row = sites.get(key)
    masked = display_header(raw_header)
    rule = "header in 04d variants table"
    stem_row = None
    if row is None:
        # a header with something appended that Phase 1 withheld (a personal name)
        matched_stem = None
        for stem, srow in sorted(stems.items(), key=lambda kv: -len(kv[0])):
            if key.startswith(stem + " "):
                stem_row, matched_stem = srow, stem
                break
        if stem_row is not None:
            row = stem_row
            prefix = re.match(r"\s*" + r"\s+".join(map(re.escape, matched_stem.split())), str(raw_header).replace("\n", " "), re.I)
            masked = (str(raw_header)[: prefix.end()] if prefix else "") + " [name]"
            masked = masked.strip()
            rule = "rule: appended text withheld; stem matched"
        else:
            masked = "[name]"
            rule = "header not in 04d variants table (withheld as a possible personal name)"
    scheme = False
    if row is not None:
        scheme = any(w in key for w in SCHEME_WORDS) or "paper4trees" in row["proposed_site"].lower()
    res = dict(site_original=masked, id_typed=rid or "", rule=rule, items=items)

    # ---- not found: try the row-5 ID alone
    if row is None:
        cand = rid
        if cand and year == OLD_ID_YEAR and cand in OLD_TO_NEW:
            cand = OLD_TO_NEW[cand]
        if cand and cand in by_pid:
            r2 = by_pid[cand]
            items.append(("RULING", "header not in the variants table (withheld, may carry a personal name); site proposed from the row-5 ID only"))
            res.update(name=name_of(r2["proposed_site"]), id=cand, group=GROUPS.get(base_num(cand), name_of(r2["proposed_site"])),
                       cls=CLASS_LETTER.get(r2["site_class"].lower(), "unknown"), precision="unknown", tier="review-not-found")
        else:
            items.append(("RULING", "header not in the variants table and no usable row-5 ID"))
            res.update(name="", id="", group="", cls="unknown", precision="unknown", tier="review-not-found")
        return res

    proposed = row["proposed_site"]
    pid = pid_of(proposed)
    nm = name_of(proposed)
    cls = CLASS_LETTER.get(row["site_class"].lower(), "unknown")
    area = (row["proposed_area_or_subsite"] or "").lower()

    # ---- scheme column
    if scheme:
        items.append(("RULING", "Paper4Trees is an order scheme, not a place; WRT to rule how scheme columns count"))
        res.update(name="Paper4Trees (scheme)", id="", group="Paper4Trees (scheme)", cls="unknown", precision="scheme", tier="scheme-not-a-place")
        return res

    # ---- site ID
    sid, tier = pid, None
    if pid and "/" in pid:  # Shotover River (28A/28B): the row-5 ID decides
        opts = pid.split("/")
        if rid in opts:
            sid = rid
        else:
            sid = ""
            items.append(("RULING", "Shotover River has two parcels (%s); row-5 ID does not say which" % " and ".join(opts)))
    if stem_row is not None:
        items.append(("CONFIRM", "header carried appended personal text; stripped to the site stem; parcel from the row-5 ID"))
        tier = "rule-appended-text"
    norm_rid = rid
    if tier is None:
        if row["uncertain"] == "Y":
            if pid is None:
                tier = "uncertain-needs-new-site-id"
                items.append(("RULING", "new or unclear site with no WRT site number: %s" % (row["note"] or "site identity to confirm")))
            elif (rid, pid) in FAULT_PAIRS:
                tier = "rule-documented-id-fault"
                items.append(("FYI" if (rid, pid) in SETTLED_FAULTS else "CONFIRM", "row-5 ID %s vs register %s: %s" % (rid, pid, FAULT_PAIRS[(rid, pid)])))
            else:
                tier = "review-uncertain"
                items.append(("RULING", "site identity uncertain: %s" % (row["note"] or "see 04d")))
        else:
            if rid is None:
                tier = "auto-id-blank"
                items.append(("FYI", "row-5 site ID blank in source; site mapped by header text"))
            elif year == OLD_ID_YEAR and OLD_TO_NEW.get(rid) == pid:
                tier = "auto-old-numbering-2015"
                items.append(("FYI", "Autumn 2015 old site number %s = %s in the register" % (rid, pid)))
            elif year == OLD_ID_YEAR and rid != pid:
                tier = "auto-old-numbering-2015"
                items.append(("FYI", "Autumn 2015 old numbering (row-5 ID %s)" % rid))
            elif pid is None:
                tier = "auto-id-blank"
                items.append(("FYI", "site has no WRT site number; provisional ID in this table"))
            elif rid == pid or (sid and rid == sid):
                tier = "auto-id-agrees"
            elif (rid, pid) in FAULT_PAIRS:
                tier = "rule-documented-id-fault"
                items.append(("FYI" if (rid, pid) in SETTLED_FAULTS else "CONFIRM", "row-5 ID %s vs register %s: %s" % (rid, pid, FAULT_PAIRS[(rid, pid)])))
            else:
                tier = "review-id-conflict"
                items.append(("RULING", "row-5 ID %s disagrees with register ID %s for this header" % (rid, pid)))

    # ---- provisional ID for sites that never had a number
    if not sid and pid is None:
        sid = "NEW-" + slug(nm)
        items.append(("FYI", "provisional ID: the Sites master will issue the real one"))
    if sid and not sid.startswith("NEW-") and sid not in register and sid not in OLD_TO_NEW.values():
        items.append(("FYI", "ID %s not found in the SUMMARY SITES register" % sid))

    # ---- group and precision
    if sid.startswith("NEW-"):
        grp = "Slope Hill" if nm.startswith("Slope Hill") else nm
    else:
        grp = GROUPS.get(base_num(sid or pid), nm)
    if "infill" in area:
        precision = "area"
    elif (sid and re.search(r"[A-Z]$", sid) and not sid.startswith("NEW-")) or area in SUBSITE_AREA_WORDS:
        precision = "subsite"
    else:
        precision = "site"
    res.update(name=nm, id=sid or "", group=grp, cls=cls, precision=precision, tier=tier)
    return res


# --------------------------------------------------------------------------- main
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if "_source_copy" in str(OUT.resolve()):
        sys.exit("refusing to write inside the source copy")
    sites, stems, by_pid = load_sites()
    register = load_register()
    cw, master_sp = load_species()

    st = SRC.stat()
    print("== SOURCE (read-only) ==")
    print(f"file     : {SRC_REL}")
    print(f"bytes    : {st.st_size:,}")
    print(f"sha256   : {sha256(SRC)}")

    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    wf = openpyxl.load_workbook(SRC, read_only=True, data_only=False)  # formulas: only to flag typed sums
    rows = [list(r) for r in wb["MASTER"].iter_rows(min_row=1, max_row=110, values_only=True)]
    frows = [list(r) for r in wf["MASTER"].iter_rows(min_row=1, max_row=110, values_only=True)]
    width = max(len(r) for r in rows)
    for r in rows + frows:
        r.extend([None] * (width - len(r)))
    R = lambda n: rows[n - 1]

    # ---- columns
    site_cols, total_cols = [], {}
    for j in range(FIRST_SITE_COL - 1, width):
        lab, hdr = R(1)[j], R(4)[j]
        if isinstance(hdr, str) and hdr.strip().upper() == "TOTAL":
            total_cols[j] = lab
            continue
        if isinstance(hdr, str) and hdr.strip().upper() == "GRAND TOTAL":
            continue
        if lab and hdr not in (None, ""):
            site_cols.append(j)
    block_of = {j: (season_of(R(1)[j])[1], season_of(R(1)[j])[0]) for j in site_cols}
    blocks = defaultdict(list)
    for j, b in block_of.items():
        blocks[b].append(j)
    ordered = sorted(blocks, key=lambda b: min(blocks[b]))
    block_total = {}
    for tj in sorted(total_cols):
        left = [b for b in ordered if max(blocks[b]) < tj]
        block_total[left[-1]] = tj

    # ---- site resolution per column
    site_info = {}
    for j in site_cols:
        yr = block_of[j][0]
        site_info[j] = resolve_site(R(4)[j], norm_id(R(5)[j]), yr, sites, stems, by_pid, register)

    # ---- species per row
    sp_info = {}
    for r in range(FIRST_SPECIES_ROW, LAST_SPECIES_ROW + 1):
        nm = R(r)[3]
        if nm in (None, ""):
            continue
        sp_info[r] = (str(nm),) + species_lookup(nm, cw, master_sp)

    # ---- records
    recs = []
    for r in range(FIRST_SPECIES_ROW, LAST_SPECIES_ROW + 1):
        if r not in sp_info:
            continue
        for j in site_cols:
            v = R(r)[j]
            if v is None or (isinstance(v, str) and not v.strip()):
                continue
            numeric = isinstance(v, (int, float)) and not isinstance(v, bool)
            if numeric and v == 0:
                continue
            si = site_info[j]
            spn, spid, spcanon, spitems = sp_info[r]
            yr, season = block_of[j]
            items = list(si["items"]) + list(spitems)
            qty = None
            if numeric:
                qty = int(v) if v == int(v) else v
            else:
                items.append(("RULING", "cell holds text '%s', not a number; no quantity imported" % str(v).strip()))
            fv = frows[r - 1][j]
            if isinstance(fv, str) and fv.startswith("=") and re.fullmatch(r"=[0-9+\-*/.() ]+", fv):
                items.append(("FYI", "cell is a typed sum in the source (%s)" % fv))
            if r > LAST_NUMBERED_ROW:
                items.append(("FYI", "species row 106 is below the numbered list and outside the PY107 grand-total range"))
            if yr == DECISION4_YEAR and si["name"] in DECISION4_SITES and numeric:
                items.append(("FYI", DECISION4_RULED))
            kinds = {k for k, _ in items}
            needs = "Y" if kinds & {"RULING", "CONFIRM"} else "N"
            if si["tier"].startswith("review") or si["tier"] == "scheme-not-a-place" or not numeric:
                conf = "low"
            elif si["tier"] == "auto-id-agrees" and not (kinds & {"RULING", "CONFIRM"}):
                conf = "high"
            else:
                conf = "medium"
            order = {"RULING": 0, "CONFIRM": 1, "FYI": 2}
            reason = "; ".join("%s: %s" % (k, t) for k, t in sorted(items, key=lambda kt: order[kt[0]]))
            cell = f"{L(j + 1)}{r}"
            recs.append(dict(
                record_id=f"PH-{yr}{season[0]}-{cell}",
                year=yr, season=season, season_label_original=str(R(1)[j]),
                site_original=si["site_original"], site_id_proposed=si["id"],
                site_group_proposed=si["group"], site_class=si["cls"],
                species_original=spn, species_id_proposed=spid, species_canonical=spcanon,
                quantity="" if qty is None else qty, precision=si["precision"], confidence=conf,
                needs_review=needs, review_reason=reason,
                source_file=SRC_REL, source_sheet="MASTER", source_cell=cell,
                _col=j, _row=r, _kinds=kinds, _tier=si["tier"], _items=items,
            ))
    recs.sort(key=lambda d: (d["year"], d["season"] != "Autumn", d["_col"], d["_row"]))
    cols = ["record_id", "year", "season", "season_label_original", "site_original", "site_id_proposed",
            "site_group_proposed", "site_class", "species_original", "species_id_proposed", "species_canonical",
            "quantity", "precision", "confidence", "needs_review", "review_reason", "source_file",
            "source_sheet", "source_cell"]
    with open(OUT / "planting_history.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(recs)
    ids = [d["record_id"] for d in recs]
    assert len(ids) == len(set(ids)), "record_id not unique"

    # ---- site crosswalk (distinct masked header x typed ID x proposed site)
    xw = defaultdict(lambda: dict(cols=set(), recs=0, plants=0, years=set()))
    for j in site_cols:
        si = site_info[j]
        k = (si["site_original"], si["id_typed"], si["id"], si["name"], si["group"], si["cls"], si["precision"], si["tier"], si["rule"])
        xw[k]["cols"].add(j)
    for d in recs:
        si = site_info[d["_col"]]
        k = (si["site_original"], si["id_typed"], si["id"], si["name"], si["group"], si["cls"], si["precision"], si["tier"], si["rule"])
        xw[k]["recs"] += 1
        xw[k]["plants"] += d["quantity"] if d["quantity"] != "" else 0
        xw[k]["years"].add(d["year"])
    xrows = []
    for k, v in xw.items():
        so, idt, sid, nm, grp, cls, prec, tier, rule = k
        kinds_note = Counter()
        sample = next((site_info[j] for j in v["cols"]), None)
        sitems = list(sample["items"])
        if nm in DECISION4_SITES:
            sitems.append(("FYI", "decision 4 ruled: this site's %s records are real plantings" % DECISION4_YEAR))
        txt = "; ".join(dict.fromkeys(t for kk, t in sitems))
        needs = "Y" if any(kk in ("RULING", "CONFIRM") for kk, _ in sitems) else "N"
        conf = ("low" if tier in ("review-not-found", "scheme-not-a-place", "review-uncertain") else
                "high" if tier == "auto-id-agrees" else "medium")
        xrows.append(dict(site_original=so, site_id_as_typed=idt, site_id_proposed=sid, site_name_proposed=nm,
                          site_group=grp, **{"class": cls}, precision=prec, confidence=conf, needs_review=needs,
                          mapping_rule=tier + " | " + rule, columns=len(v["cols"]), records=v["recs"], plants=v["plants"],
                          seasons_with_records=(f"{min(v['years'])}-{max(v['years'])}" if v["years"] else "none"),
                          note=txt))
    xrows.sort(key=lambda d: (d["site_group"], d["site_id_proposed"], d["site_original"], d["site_id_as_typed"]))
    xcols = ["site_original", "site_id_as_typed", "site_id_proposed", "site_name_proposed", "site_group", "class",
             "precision", "confidence", "needs_review", "mapping_rule", "columns", "records", "plants",
             "seasons_with_records", "note"]
    with open(OUT / "site_crosswalk.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=xcols)
        w.writeheader()
        w.writerows(xrows)

    # ---- reconciliation
    num = [d for d in recs if d["quantity"] != ""]
    total_plants = sum(d["quantity"] for d in num)
    plants_8_105 = sum(d["quantity"] for d in num if d["_row"] <= LAST_NUMBERED_ROW)
    rec_rows = []
    by_block = defaultdict(float)
    by_block_n = Counter()
    for d in num:
        b = (d["year"], d["season"])
        by_block[b] += d["quantity"]
        by_block_n[b] += 1
    print("\n== SEASON TOTALS: rows vs MASTER TOTAL column (row 107, SUM over rows 8-105 or 8-106) ==")
    print(f"{'season':13s}{'cols':>5s}{'rows':>6s}{'sum of rows':>12s}{'TOTAL r107':>11s}{'diff':>6s}{'TOTAL col 8-106':>16s}{'diff':>6s}")
    n_ok = 0
    for b in sorted(blocks, key=lambda b: (b[0], b[1] != "Autumn")):
        tj = block_total[b]
        t107 = R(TOTAL_ROW)[tj]
        tsum = sum(x for x in (R(r)[tj] for r in range(FIRST_SPECIES_ROW, LAST_SPECIES_ROW + 1)) if isinstance(x, (int, float)))
        gen = by_block[b]
        label = f"{b[1]} {b[0]}"
        print(f"{label:13s}{len(blocks[b]):5d}{by_block_n[b]:6d}{gen:12,.0f}{t107:11,.0f}{gen - t107:6,.0f}{tsum:16,.0f}{gen - tsum:6,.0f}")
        n_ok += gen == t107
        rec_rows.append(dict(item="season", label=label, generated=int(gen), stated=int(t107), difference=int(gen - t107),
                             stated_cell=f"MASTER!{L(tj + 1)}{TOTAL_ROW}", records=by_block_n[b],
                             cause="" if gen == t107 else "see report"))
    print(f"seasons where rows equal the TOTAL column: {n_ok} of {len(blocks)}")

    def cellv(sheet, ref):
        try:
            return wb[sheet][ref].value
        except Exception:
            return None

    py = R(TOTAL_ROW)[openpyxl.utils.column_index_from_string("PY") - 1]
    pz = R(TOTAL_ROW)[openpyxl.utils.column_index_from_string("PZ") - 1]
    py_rows = sum(x for x in (R(r)[openpyxl.utils.column_index_from_string("PY") - 1] for r in range(FIRST_SPECIES_ROW, LAST_SPECIES_ROW + 1)) if isinstance(x, (int, float)))
    bc3, aw3, aw4 = cellv("SUMMARY SITES", "BC3"), cellv("SUMMARY PLANTS", "AW3"), cellv("SUMMARY PLANTS", "AW4")
    n2026 = sum(d["quantity"] for d in num if d["year"] == 2026)
    row106 = sum(d["quantity"] for d in num if d["_row"] == LAST_SPECIES_ROW)
    grand = [
        ("grand", "MASTER!PY107 (grand total, SUM(PY4:PY105))", py,
         "The SUM range stops at row 105. Row 106 (an unnumbered 99th species, Cyathoides juniperina, 19 plants, Spring 2025) is outside it. The Spring 2025 block total (PA107) does include row 106."),
        ("grand", "MASTER!PY8:PY106 summed (per-species totals)", py_rows, "Per-species row totals include row 106; agrees with the rows."),
        ("grand", "MASTER!PZ107 (unlabelled cell beside the grand total)", pz,
         "A typed fudge: =SUM(PZ105+1772) over a typed =6237+129264. Not a total of the counts; ignored."),
        ("grand", "SUMMARY SITES!BC3 (all-time, by site)", bc3,
         "Per 01f section 5: the 2025 per-site total cells add to 10,597 although the Autumn and Spring site cells add to 10,717 (120 lower)."),
        ("grand", "SUMMARY PLANTS!AW4 (all-time, by species)", aw4,
         "Per 01f section 5: Autumn 2026 not added (4,556) + Autumn 2025 typed 4,389 not 4,469 (80) + row 104 outside its sum (19) = 4,655."),
    ]
    print("\n== GRAND TOTAL ==")
    print(f"sum of {len(num):,} numeric records (rows 8-106)         : {total_plants:,.0f}")
    print(f"  of which rows 8-105 only                       : {plants_8_105:,.0f}   (row 106 = {row106:,.0f})")
    print(f"sum of the 23 TOTAL r107 cells                    : {sum(r['stated'] for r in rec_rows if r['item']=='season'):,.0f}")
    for kind, label, val, cause in grand:
        if val is None:
            print(f"{label:55s}: not readable")
            continue
        print(f"{label:55s}: {val:>10,.0f}  rows minus stated {total_plants - val:+,.0f}")
        rec_rows.append(dict(item=kind, label=label, generated=int(total_plants), stated=int(val), difference=int(total_plants - val),
                             stated_cell=label.split(" ")[0], records=len(num), cause=cause))
    print(f"(for reference) records excluding Autumn 2026      : {total_plants - n2026:,.0f}")
    text_cells = [d for d in recs if d["quantity"] == ""]
    rec_rows.append(dict(item="exception", label="non-numeric cells kept as exception rows (no quantity)", generated=len(text_cells),
                         stated=0, difference=len(text_cells), stated_cell=";".join("MASTER!" + d["source_cell"] for d in text_cells),
                         records=len(text_cells), cause="Text 'TBC' on the Leptecophylla juniperina row, beside 19 on the Cyathoides juniperina row, same site and season (contested pair C1). Not counted; it is not a number."))
    with open(OUT / "history_reconciliation.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["item", "label", "generated", "stated", "difference", "stated_cell", "records", "cause"])
        w.writeheader()
        w.writerows(rec_rows)

    # ---- self-checks (each prints PASS or FAIL; a FAIL is a bug, not a data finding)
    print("\n== SELF-CHECKS ==")
    matrix_sum = sum(v for r in range(FIRST_SPECIES_ROW, LAST_SPECIES_ROW + 1) for j in site_cols
                     for v in [R(r)[j]] if isinstance(v, (int, float)) and not isinstance(v, bool))
    checks = [
        ("every numeric cell in the matrix is in the table once (matrix sum = row sum)", matrix_sum == total_plants),
        ("record_id is unique", len(ids) == len(set(ids))),
        ("every blank site_id_proposed or species_id_proposed has needs_review = Y",
         all(d["needs_review"] == "Y" for d in recs if not d["site_id_proposed"] or not d["species_id_proposed"])),
        ("every needs_review = Y row has a review_reason", all(d["review_reason"] for d in recs if d["needs_review"] == "Y")),
        ("no row has a quantity of zero or below", all(d["quantity"] == "" or d["quantity"] > 0 for d in recs)),
        ("every row cites a source cell", all(d["source_cell"] and d["source_sheet"] == "MASTER" for d in recs)),
        ("no masked header leaks an unmasked suffix (masked texts all exist in the 04d table or end in [name])",
         all(norm(d["site_original"]) in sites or d["site_original"].endswith("[name]") for d in recs)),
    ]
    py_col = openpyxl.utils.column_index_from_string("PY") - 1
    row_diff = []
    for r in sp_info:
        got = sum(d["quantity"] for d in num if d["_row"] == r)
        stated_r = R(r)[py_col]
        if isinstance(stated_r, (int, float)) and got != stated_r:
            row_diff.append((r, got, stated_r))
    checks.append(("each species row sums to its PY (all-time per-species) cell: %d of %d agree" % (len(sp_info) - len(row_diff), len(sp_info)), not row_diff))
    for label, ok in checks:
        print(("PASS  " if ok else "FAIL  ") + label)
    for r, got, st in row_diff:
        print(f"      row {r}: rows give {got:,}, PY cell says {st:,}")

    # ---- structure and review report
    print("\n== STRUCTURE ==")
    print(f"site columns with a season label and header : {len(site_cols)}   TOTAL columns: {len(total_cols)}   season blocks: {len(blocks)}")
    print(f"species rows read                           : {len(sp_info)} (rows 8-106)")
    print(f"rows in planting_history.csv                : {len(recs):,} ({len(num):,} with a quantity + {len(text_cells)} exception row)")
    print(f"zero cells skipped                          : {sum(1 for r in range(8,107) for j in site_cols if isinstance(R(r)[j],(int,float)) and not isinstance(R(r)[j],bool) and R(r)[j]==0):,}")
    print(f"distinct proposed site IDs                   : {len({d['site_id_proposed'] for d in recs if d['site_id_proposed']})}"
          f"   (provisional NEW- IDs: {len({d['site_id_proposed'] for d in recs if d['site_id_proposed'].startswith('NEW-')})})")
    print(f"distinct proposed groups                     : {len({d['site_group_proposed'] for d in recs if d['site_group_proposed']})}")
    print(f"distinct original header texts (masked)      : {len({d['site_original'] for d in recs})}")
    print(f"rows with a blank site_id_proposed           : {sum(1 for d in recs if not d['site_id_proposed']):,}")
    print(f"species IDs used                             : {len({d['species_id_proposed'] for d in recs if d['species_id_proposed']})}"
          f"   rows with a species flag: {sum(1 for d in recs if any(k=='RULING' and 'species' in t for k,t in d['_items'])):,}")

    N = len(recs)
    plants_by = lambda f: sum(d["quantity"] for d in num if f(d))
    print("\n== CONFIDENCE ==")
    for c in ("high", "medium", "low"):
        n = sum(1 for d in recs if d["confidence"] == c)
        p = plants_by(lambda d: d["confidence"] == c)
        print(f"{c:7s}{n:6d} ({100*n/N:5.1f}%)   plants {p:9,.0f} ({100*p/total_plants:4.1f}%)")

    print("\n== REVIEW SHARE ==")
    ruling = [d for d in recs if "RULING" in d["_kinds"]]
    confirm_only = [d for d in recs if "RULING" not in d["_kinds"] and "CONFIRM" in d["_kinds"]]
    clean = [d for d in recs if not (d["_kinds"] & {"RULING", "CONFIRM"})]
    pl = lambda ds: sum(d["quantity"] for d in ds if d["quantity"] != "")
    print(f"needs a ruling (RULING)            : {len(ruling):5d} ({100*len(ruling)/N:4.1f}% of rows)  plants {pl(ruling):9,.0f} ({100*pl(ruling)/total_plants:4.1f}%)")
    print(f"rule applied, confirm once (CONFIRM): {len(confirm_only):5d} ({100*len(confirm_only)/N:4.1f}%)  plants {pl(confirm_only):9,.0f} ({100*pl(confirm_only)/total_plants:4.1f}%)")
    print(f"needs_review = Y in total           : {len(ruling)+len(confirm_only):5d} ({100*(len(ruling)+len(confirm_only))/N:4.1f}%)  plants {pl(ruling)+pl(confirm_only):9,.0f} ({100*(pl(ruling)+pl(confirm_only))/total_plants:4.1f}%)")
    print(f"automatic (needs_review = N)        : {len(clean):5d} ({100*len(clean)/N:4.1f}%)  plants {pl(clean):9,.0f} ({100*pl(clean)/total_plants:4.1f}%)")
    cause = Counter()
    cause_p = Counter()
    for d in ruling:
        tags = set()
        for k, t in d["_items"]:
            if k != "RULING":
                continue
            if t.startswith("species contested"):
                tags.add("species contested (needs a stock-line ruling)")
            elif "Paper4Trees" in t:
                tags.add("Paper4Trees scheme column")
            elif t.startswith("decision 4"):
                tags.add("2024 Slope Hill columns (decision 4)")
            elif t.startswith("cell holds text"):
                tags.add("text cell")
            else:
                tags.add("site header unclear / new site / ID conflict")
        for t in tags:
            cause[t] += 1
            cause_p[t] += d["quantity"] if d["quantity"] != "" else 0
    print("by cause (a row can have more than one):")
    for t, n in cause.most_common():
        print(f"   {t:52s}{n:5d} rows ({100*n/N:4.1f}%)  plants {cause_p[t]:9,.0f}")
    only_species = sum(1 for d in ruling if all(t.startswith("species contested") for k, t in d["_items"] if k == "RULING"))
    only_site = sum(1 for d in ruling if not any(t.startswith("species contested") for k, t in d["_items"] if k == "RULING"))
    print(f"rows needing a species ruling only: {only_species};  rows needing no species ruling (site/scheme/quantity only): {only_site}")
    print("\nrows by site tier :", dict(Counter(d["_tier"] for d in recs)))
    print("rows by precision :", dict(Counter(d["precision"] for d in recs)))
    print("rows by class     :", dict(Counter(d["site_class"] for d in recs)))
    distinct_rule = {(si["tier"]) for si in site_info.values()}
    cols_by_tier = Counter(si["tier"] for si in site_info.values())
    live = {d["_col"] for d in recs}
    print("site columns by tier (all / non-zero):", {t: (cols_by_tier[t], sum(1 for j in live if site_info[j]['tier'] == t)) for t in sorted(cols_by_tier)})
    print(f"non-zero site columns: {len(live)}   crosswalk rows: {len(xrows)}   distinct (masked) header texts: {len({site_info[j]['site_original'] for j in live})}")
    print("\nwrote", OUT / "planting_history.csv")
    print("wrote", OUT / "site_crosswalk.csv")
    print("wrote", OUT / "history_reconciliation.csv")


if __name__ == "__main__":
    main()
