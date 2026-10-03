#!/usr/bin/env python3
"""
history_count.py  -  S2 (Phase 2): how many clean history records can be made
from `_JMN Plants Out Master.xlsx > MASTER`?

Read-only.  Opens the source copy with openpyxl (read_only, data_only), never
writes to it.  Prints counts only; with --emit PATH it also writes the long
format (season, year, site_id, site_name_original, species_id,
species_name_original, quantity, source_record, confidence) to PATH so S7 can
reuse the same logic.  Site and person-name text is never printed.

Run:   python3 history_count.py [--emit /some/path/records.csv]

Method (all choices are visible below; change a constant, re-run):
  * Season blocks   = runs of identical row-1 labels (case-folded).  A block may
                      contain a blank spacer column (Spring 2020 does).
  * Site columns    = columns with a row-1 season label whose row-4 header is
                      not blank and not "TOTAL".  (Zero-only columns such as
                      "Paper for Trees" are kept in the column count.)
  * Species rows    = MASTER rows 8-106.  Rows 8-105 are the numbered 98-row
                      block; row 106 is an unnumbered 99th species that sits
                      below the SUM range of row 107.
  * Record          = one non-zero numeric cell in (species row x site column).
  * Site mapping    = normalised row-4 header looked up in
                      04d_sites_variants.csv (proposed_site, uncertain).
                      "AUTO" needs: key found, uncertain == N, proposed site
                      has a place (not a scheme / "no ID" fallback is still a
                      place).  Row-5 ID is then compared with the ID in the
                      proposed site's brackets.
  * Species mapping = normalised column-D name looked up in
                      04a_species_variants.csv (proposed_group, uncertain).
  * Confidence      = high   site AUTO + row-5 ID agrees + species AUTO (no merge)
                      medium site AUTO but ID blank / 2015 old numbering,
                              or species AUTO but merged with another row,
                              or species only awaiting a taxonomic ruling
                              (04a "GROUP CONTESTED"; the string itself is exact),
                              or site fixable by a documented rule
                      low    site header uncertain / not found / scheme column
                              (Paper4Trees) / non-numeric cell
"""
import argparse
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter as L

SRC = Path("/home/claude/_source_copy/_ALL Plant Lists/_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx")
DISC = Path("/home/claude/discovery")
SITES_CSV = DISC / "04d_sites_variants.csv"
SPECIES_CSV = DISC / "04a_species_variants.csv"

FIRST_SPECIES_ROW, LAST_NUMBERED_ROW, LAST_SPECIES_ROW, TOTAL_ROW = 8, 105, 106, 107
FIRST_SITE_COL = 7  # G
OLD_ID_YEAR = 2015  # Autumn 2015 uses the old site numbering (04d 3.2)
# Known ID faults from 04d 3.2 (cell-level, by season block and register ID); used only to
# say "ID conflict is explained", never to fix anything.
# (row-5 ID as typed, ID in the register) pairs documented in 04d section 3.2
FAULT_PAIRS = {("13C", "11"), ("11", "23B"), ("!!A", "11A"), ("9E", "9F"), ("13A", "13D")}
SCHEME_WORDS = ("paper4trees", "p4t", "paper for trees", "paper 4 trees")


def norm(s):
    s = str(s).replace("\\n", " ").replace("\n", " ").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def load_sites():
    out = {}
    for r in csv.DictReader(open(SITES_CSV, encoding="utf-8")):
        k = r["normalised_key"]
        # prefer the row that was seen in MASTER row 4
        if k not in out or "PO:MASTER!r4" in r["where_seen"]:
            out[k] = r
    return out


def load_species():
    out = {}
    for r in csv.DictReader(open(SPECIES_CSV, encoding="utf-8")):
        k = r["normalised_key"]
        if k not in out or "history" in r["source_types"]:
            out[k] = r
    return out


def site_id_from_proposed(p):
    m = re.search(r"\(([0-9]+[A-Z]?)\)\s*$", p or "")
    return m.group(1) if m else None


def norm_id(v):
    if v is None or v == "":
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip().upper()


def season_of(label):
    m = re.match(r"\s*(autumn|spring)\s+(\d{4})\s*$", str(label or ""), re.I)
    return (m.group(1).capitalize(), int(m.group(2))) if m else (None, None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emit", help="write long-format CSV here (outside the source copy)")
    args = ap.parse_args()

    sites_map, sp_map = load_sites(), load_species()
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb["MASTER"]
    rows = [list(r) for r in ws.iter_rows(min_row=1, max_row=110, values_only=True)]
    width = max(len(r) for r in rows)
    for r in rows:
        r.extend([None] * (width - len(r)))
    R = lambda n: rows[n - 1]  # 1-based row

    # --- columns ----------------------------------------------------------
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
    # the "Paper for Trees" header at OD has no row-1 label; count it separately
    unlabelled_named = [j for j in range(FIRST_SITE_COL - 1, width)
                        if R(1)[j] in (None, "") and R(4)[j] not in (None, "")
                        and str(R(4)[j]).strip().upper() not in ("TOTAL", "GRAND TOTAL")]

    # season block per site column; blocks by label (spacers allowed)
    block_of = {}
    for j in site_cols:
        s, y = season_of(R(1)[j])
        block_of[j] = (y, s)
    blocks = defaultdict(list)
    for j, b in block_of.items():
        blocks[b].append(j)
    # a total column belongs to the block whose label it carries or, if blank, to the
    # nearest block to its left
    block_total = {}
    ordered_blocks = sorted(blocks, key=lambda b: min(blocks[b]))
    for tj, lab in sorted(total_cols.items()):
        left = [b for b in ordered_blocks if max(blocks[b]) < tj]
        block_total[left[-1]] = tj

    print("== STRUCTURE ==")
    print(f"site columns with a season label and a header : {len(site_cols)}")
    print(f"  of which unlabelled-in-row-1 but named (not counted): {len(unlabelled_named)}")
    print(f"season blocks (distinct season+year)          : {len(blocks)}")
    print(f"TOTAL columns found                           : {len(total_cols)}")
    print(f"label runs (contiguous) vs blocks: Spring 2020 is split by a spacer column (kept as one block)")

    # --- species rows -----------------------------------------------------
    sp_rows = list(range(FIRST_SPECIES_ROW, LAST_SPECIES_ROW + 1))
    sp_tier = {}
    for r in sp_rows:
        name = R(r)[3]
        if name in (None, ""):
            sp_tier[r] = ("blank", None, None)
            continue
        hit = sp_map.get(norm(name))
        if not hit:
            sp_tier[r] = ("review-not-found", None, None)
        elif hit["uncertain"] == "Y" and "GROUP CONTESTED" in hit["note"]:
            sp_tier[r] = ("contested-ruling", hit["proposed_group"], hit["note"])
        elif hit["uncertain"] == "Y":
            sp_tier[r] = ("review-uncertain", hit["proposed_group"], hit["note"])
        else:
            sp_tier[r] = ("auto", hit["proposed_group"], None)
    grp_counts = Counter(v[1] for v in sp_tier.values() if v[1])
    merged_groups = {g for g, c in grp_counts.items() if c > 1}

    print("\n== SPECIES NAMES (MASTER D8:D106) ==")
    c = Counter(v[0] for v in sp_tier.values())
    print(f"rows: {len(sp_rows)} | tiers: {dict(c)}")
    print(f"distinct proposed groups: {len(grp_counts)} | groups reached by >1 row (would merge): {len(merged_groups)}")
    for r in sp_rows:
        t = sp_tier[r]
        if t[0] != "auto" or t[1] in merged_groups:
            print(f"   row {r}: {t[0]}{' (merge target)' if t[1] in merged_groups else ''}")

    # --- site headers -----------------------------------------------------
    site_tier = {}
    for j in site_cols:
        raw = R(4)[j]
        hit = sites_map.get(norm(raw))
        rid = norm_id(R(5)[j])
        year = block_of[j][0]
        if any(w in norm(raw) for w in SCHEME_WORDS) or (hit and "paper4trees" in hit["proposed_site"].lower()):
            site_tier[j] = ("scheme-not-a-place", None, rid)
            continue
        if not hit and norm(raw).startswith("shotover river"):
            # header has a person's first name appended; the CSV withholds it. Rule: strip suffix.
            site_tier[j] = ("rule-shotover-suffix", "SHOTOVER RIVER (28A/28B)", rid)
            continue
        if not hit:
            site_tier[j] = ("review-not-found", None, rid)
            continue
        pid_u = site_id_from_proposed(hit["proposed_site"])
        if hit["uncertain"] == "Y":
            if pid_u is None:
                t = "uncertain-needs-new-site-id"   # new site never given an ID (Preschool, Paererewa, ...)
            elif (rid, pid_u) in FAULT_PAIRS:
                t = "rule-documented-id-fault"      # Akarua Corner 9E/9F
            else:
                t = "review-uncertain"
            site_tier[j] = (t, hit["proposed_site"], rid)
            continue
        pid = site_id_from_proposed(hit["proposed_site"])
        if rid is None:
            t = "auto-id-blank"
        elif year == OLD_ID_YEAR and rid != pid:
            t = "auto-old-numbering-2015"
        elif pid is None:
            t = "auto-id-blank"  # proposal has no ID ("no ID")
        elif rid == pid:
            t = "auto-id-agrees"
        elif (rid, pid) in FAULT_PAIRS:
            t = "rule-documented-id-fault"
        else:
            t = "review-id-conflict"
        site_tier[j] = (t, hit["proposed_site"], rid)

    # --- records ----------------------------------------------------------
    recs, nonnumeric, zero_cells, neg = [], [], 0, 0
    keys = Counter()
    per_block_cells = defaultdict(float)
    per_block_cells_105 = defaultdict(float)
    for r in sp_rows:
        for j in site_cols:
            v = R(r)[j]
            if v is None or v == "":
                continue
            if isinstance(v, bool) or not isinstance(v, (int, float)):
                nonnumeric.append((r, j, type(v).__name__))
                continue
            if v == 0:
                zero_cells += 1
                continue
            if v < 0:
                neg += 1
            b = block_of[j]
            per_block_cells[b] += v
            if r <= LAST_NUMBERED_ROW:
                per_block_cells_105[b] += v
            recs.append((r, j, v))
            keys[(b, sp_tier[r][1] or ("row%d" % r), j)] += 1

    print("\n== RECORDS (non-zero species x site x season cells) ==")
    print(f"non-zero numeric cells (= records)            : {len(recs)}")
    print(f"zero cells (dropped)                          : {zero_cells}")
    print(f"non-numeric non-empty cells (need review)     : {len(nonnumeric)}")
    print(f"negative cells                                : {neg}")
    print(f"non-integer quantities                        : {sum(1 for _,_,v in recs if v != int(v))}")
    print(f"total plants in records                       : {sum(v for *_, v in recs):,.0f}")
    print(f"  of which rows 8-105 only                    : {sum(v for r,_,v in recs if r<=LAST_NUMBERED_ROW):,.0f}")
    dup = sum(1 for k, n in keys.items() if n > 1)
    print(f"records that collide after species merging    : {dup}")

    # --- tiers ------------------------------------------------------------
    def rec_tier(r, j):
        st, sp = site_tier[j][0], sp_tier[r][0]
        if st.startswith("review") or st.startswith("scheme") or sp.startswith("review") or sp == "blank":
            return "low"
        if st in ("auto-id-agrees",) and sp == "auto" and sp_tier[r][1] not in merged_groups:
            return "high"
        return "medium"

    tier_rec = Counter(rec_tier(r, j) for r, j, v in recs)
    tier_plants = defaultdict(float)
    for r, j, v in recs:
        tier_plants[rec_tier(r, j)] += v
    print("\n== SITE HEADERS (site columns) ==")
    cols_by_tier = Counter(site_tier[j][0] for j in site_cols)
    # columns that actually hold a record
    live_cols = {j for r, j, v in recs}
    live_by_tier = Counter(site_tier[j][0] for j in live_cols)
    print(f"{'tier':28s}{'all cols':>9s}{'non-zero cols':>14s}")
    for t in sorted(cols_by_tier):
        print(f"{t:28s}{cols_by_tier[t]:9d}{live_by_tier.get(t,0):14d}")
    print(f"{'TOTAL':28s}{len(site_cols):9d}{len(live_cols):14d}")
    auto_live = sum(n for t, n in live_by_tier.items() if t.startswith("auto"))
    print(f"non-zero columns mapping automatically by name: {auto_live} of {len(live_cols)} "
          f"({100*auto_live/len(live_cols):.0f}%); needing review or scheme handling: {len(live_cols)-auto_live}")
    # distinct raw spellings
    raw_all = {norm(R(4)[j]) for j in site_cols}
    raw_auto = {norm(R(4)[j]) for j in site_cols if site_tier[j][0].startswith("auto")}
    print(f"distinct normalised header spellings: {len(raw_all)} (auto: {len(raw_auto)})")
    dist_sites = {site_tier[j][1] for j in live_cols if site_tier[j][1]}
    print(f"distinct proposed sites among non-zero columns: {len(dist_sites)}")
    # name AND id state of the live columns
    print("row-5 ID blank in non-zero columns:", sum(1 for j in live_cols if site_tier[j][2] is None))

    print("\n== RECORD CONFIDENCE (proposed rule) ==")
    for t in ("high", "medium", "low"):
        print(f"{t:7s} records {tier_rec[t]:6d} ({100*tier_rec[t]/len(recs):4.1f}%)   plants {tier_plants[t]:10,.0f} ({100*tier_plants[t]/sum(tier_plants.values()):4.1f}%)")
    # review share by cause (a record may have several; first cause wins)
    cause = Counter()
    for r, j, v in recs:
        st, sp = site_tier[j][0], sp_tier[r][0]
        if st.startswith("scheme"):
            cause["scheme column (Paper4Trees)"] += 1
        elif st.startswith("review") or sp.startswith("review"):
            cause["site header uncertain / not found / unexplained ID conflict"] += 1
        elif rec_tier(r, j) == "medium":
            cause["medium only (ID blank / 2015 old numbering / merged species)"] += 1
    for k, n in cause.items():
        print(f"   {k:62s}{n:6d}")
    # records that need at least one human ruling (not just a documented rule)
    HUMAN_SITE = ("review-not-found", "review-uncertain", "review-id-conflict", "uncertain-needs-new-site-id", "scheme-not-a-place")
    need = sum(1 for r, j, v in recs if site_tier[j][0] in HUMAN_SITE or sp_tier[r][0] in ("contested-ruling", "review-uncertain", "review-not-found"))
    need_site = sum(1 for r, j, v in recs if site_tier[j][0] in HUMAN_SITE)
    need_sp = sum(1 for r, j, v in recs if sp_tier[r][0] in ("contested-ruling", "review-uncertain", "review-not-found"))
    rule_only = sum(1 for r, j, v in recs if site_tier[j][0].startswith("rule-"))
    print(f"records needing a human ruling (site or species): {need} ({100*need/len(recs):.1f}%); site only {need_site}; species only {need_sp}; fixed by a documented rule (confirm once) {rule_only}")
    # records by site-tier
    print("records by site tier:", dict(Counter(site_tier[j][0] for r, j, v in recs)))
    print("records by species tier:", dict(Counter(sp_tier[r][0] for r, j, v in recs)))
    big = sorted(((v, L(j + 1), r) for r, j, v in recs), reverse=True)[:3]
    print("largest 3 single cells (value, col, row):", big)

    # --- season totals vs MASTER TOTAL columns and PY107 ------------------
    print("\n== SEASON TOTALS ==")
    print(f"{'season':13s}{'sites':>6s}{'recs':>6s}{'cells 8-105':>12s}{'cells 8-106':>12s}{'TOTAL col r107':>15s}{'TOTAL col sum':>14s}{'diff(106 vs r107)':>18s}")
    recs_by_block = Counter(block_of[j] for r, j, v in recs)
    grand_cells = grand_r107 = grand_tcsum = 0
    for b in sorted(blocks, key=lambda b: (b[0], b[1] != "Autumn")):
        tj = block_total.get(b)
        r107 = R(TOTAL_ROW)[tj] if tj is not None else None
        tcsum = sum(x for x in (R(r)[tj] for r in sp_rows) if isinstance(x, (int, float))) if tj is not None else None
        c106 = per_block_cells[b]
        grand_cells += c106
        grand_r107 += r107 or 0
        grand_tcsum += tcsum or 0
        flag = "" if r107 == c106 else "  <-"
        print(f"{b[1]+' '+str(b[0]):13s}{len(blocks[b]):6d}{recs_by_block[b]:6d}{per_block_cells_105[b]:12,.0f}{c106:12,.0f}{(r107 or 0):15,.0f}{(tcsum or 0):14,.0f}{c106-(r107 or 0):18,.0f}{flag}")
    print(f"{'ALL':13s}{len(site_cols):6d}{len(recs):6d}{sum(per_block_cells_105.values()):12,.0f}{grand_cells:12,.0f}{grand_r107:15,.0f}{grand_tcsum:14,.0f}")
    cols = {c: R(TOTAL_ROW)[openpyxl.utils.column_index_from_string(c) - 1] for c in ("PY", "PZ")}
    py_sum = sum(x for x in (R(r)[openpyxl.utils.column_index_from_string("PY") - 1] for r in sp_rows) if isinstance(x, (int, float)))
    print(f"PY107 (grand total cell)        : {cols['PY']:,}")
    print(f"sum of PY8:PY106 (per-species)  : {py_sum:,.0f}")
    print(f"records total vs PY107          : {grand_cells:,.0f} vs {cols['PY']:,} (diff {grand_cells-cols['PY']:+,.0f})")
    print(f"PZ107 (unlabelled, beside PY)   : {cols['PZ']:,}")
    try:
        ss = wb["SUMMARY SITES"]
        sp_ = wb["SUMMARY PLANTS"]
        print(f"SUMMARY SITES!BC3               : {ss['BC3'].value}")
        print(f"SUMMARY PLANTS!AW3 / AW4        : {sp_['AW3'].value} / {sp_['AW4'].value}")
    except Exception as e:  # read-only sheets are sometimes slow/odd; not essential
        print("could not read cross-check totals:", e)

    # --- single-year view for the browseability argument -------------------
    by_year = defaultdict(lambda: [0, 0, set()])
    for r, j, v in recs:
        y = block_of[j][0]
        by_year[y][0] += 1
        by_year[y][1] += v
        by_year[y][2].add(j)
    print("\n== BY YEAR (calendar) ==  records | plants | non-zero site columns")
    for y in sorted(by_year):
        n, p, cs = by_year[y]
        print(f"{y}: {n:5d} | {p:8,.0f} | {len(cs)}")

    # species with any record / sites with any record
    print(f"\nspecies rows with at least one record: {len({r for r,_,_ in recs})} of {len(sp_rows)}")
    # concentration
    top2 = sorted(((v, L(j + 1), block_of[j]) for j in live_cols for v in [sum((R(r)[j] or 0) for r in sp_rows if isinstance(R(r)[j], (int, float)))]), reverse=True)[:2]
    print("two largest site columns (plants, col, season):", top2)

    if args.emit:
        p = Path(args.emit)
        if "_source_copy" in str(p.resolve()):
            sys.exit("refusing to write inside the source copy")
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["season", "year", "site_id", "site_name_original", "species_id",
                        "species_name_original", "quantity", "source_record", "confidence"])
            for r, j, v in recs:
                s, y = block_of[j][1], block_of[j][0]
                sid = site_tier[j][2]
                nm = str(R(4)[j]).replace("\n", " ").strip()
                if norm(nm).startswith("shotover river"):
                    nm = "SHOTOVER RIVER [name withheld]"
                w.writerow([s, y, sid or "", nm, R(r)[0] or "",
                            R(r)[3], int(v) if v == int(v) else v, f"MASTER!{L(j+1)}{r}", rec_tier(r, j)])
        print("wrote", p)


if __name__ == "__main__":
    main()
