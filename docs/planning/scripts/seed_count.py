#!/usr/bin/env python3
"""
seed_count.py - S2 (Phase 2): how usable are the seed and cutting logs WITHOUT the sensitive columns?
Read-only.  Never reads or prints the Site/Source column (seed_log C, cuttings C, results B), nor the notes/comment columns'
content (only whether a note is present).  Prints counts only.
Run: python3 seed_count.py
"""
import re, datetime, importlib.util
from collections import Counter, defaultdict
from pathlib import Path
import openpyxl

here = Path(__file__).parent
spec = importlib.util.spec_from_file_location("hc", here / "history_count.py"); hc = importlib.util.module_from_spec(spec); spec.loader.exec_module(hc)
sp = hc.load_species()
D = Path("/home/claude/_source_copy/_ALL Plant Lists/2. Propagation (cuttings and seeds)/_Seed and Cutting Records")
TAG = re.compile(r"^\s*([SC])\s*(\d+)\s*([a-z]?)\b", re.I)
CONT = re.compile(r"^(v150|t28|pb3|35f|63f|90|7|5|1l|pot)\b", re.I)
UNIT = re.compile(r"(tsp|tbsp|cup|\bg\b|\bkg\b|gram|tray|pinch|handful|fluff|ml|seeds?)", re.I)
isd = lambda x: isinstance(x, (datetime.datetime, datetime.date))
num = lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)

def species_tier(name):
    if not isinstance(name, str) or not name.strip(): return "blank"
    h = sp.get(hc.norm(name))
    if not h: return "not in 04a"
    return "auto" if h["uncertain"] == "N" else "uncertain"

def era_of(row_no, kind):
    if kind == "S": return 1 if row_no <= 407 else (2 if row_no <= 568 else 3)
    return 1 if row_no <= 346 else (2 if row_no <= 468 else 3)

def sheet_rows(path, ncols, first):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    for i, r in enumerate(ws.iter_rows(min_row=first, max_col=ncols, values_only=True), start=first):
        yield i, list(r) + [None] * (ncols - len(r))

def report(label, path, first, cols, kind):
    """cols: dict name->index (0-based) for tag, species, collected, amount, sown, pricked_date, pricked_n, container, notes"""
    rows = []
    for i, r in sheet_rows(path, 12, first):
        t = r[cols["tag"]]
        if isinstance(t, str) and re.match(r"^\s*[SC]\s*\d", t, re.I): rows.append((i, r))
        elif isinstance(t, str) and re.match(r"^\s*[SC]\d{4,6}", t, re.I): rows.append((i, r))
    print(f"\n== {label}: {len(rows)} rows with a tag-shaped value ==")
    era = Counter(era_of(i, kind) for i, _ in rows)
    print("  tag eras (by row block, 04f 7.1/7.2):", dict(sorted(era.items())))
    st = Counter(species_tier(r[cols["species"]]) for _, r in rows)
    print("  species name vs 04a: ", dict(st), f"-> auto {100*st['auto']/len(rows):.0f}%")
    def dstat(k):
        c = Counter("date" if isd(r[cols[k]]) else ("blank" if r[cols[k]] in (None, "") else "text") for _, r in rows)
        return dict(c)
    for k in ("collected", "sown", "pricked_date"):
        if k in cols: print(f"  {k:13s}", dstat(k))
    if "amount" in cols:
        c = Counter()
        for _, r in rows:
            v = r[cols["amount"]]
            c["integer" if num(v) else ("unit text" if isinstance(v, str) and UNIT.search(v) else ("blank" if v in (None, "") else "other text"))] += 1
        print("  amount        ", dict(c))
    if "pricked_n" in cols:
        c = Counter("number" if num(r[cols["pricked_n"]]) else ("blank" if r[cols["pricked_n"]] in (None, "") else "text") for _, r in rows)
        print("  count pricked/set", dict(c))
    if "container" in cols:
        c = Counter()
        for _, r in rows:
            v = r[cols["container"]]
            s = str(int(v)) if isinstance(v, float) and v.is_integer() else str(v or "").strip()
            c["blank" if not s else ("known code" if CONT.match(s) else "other")] += 1
        print("  container     ", dict(c))
    # outcome known: a pricked date or a pricked/survived count
    n_out = sum(1 for _, r in rows if isd(r[cols.get("pricked_date", cols["sown"])]) and "pricked_date" in cols or num(r[cols["pricked_n"]]))
    print(f"  outcome signal (pricked date or count) present: {n_out} of {len(rows)} ({100*n_out/len(rows):.0f}%)")
    # key uniqueness
    def tagkey(r):
        m = TAG.match(str(r[cols["tag"]]));
        return (m.group(1).upper() + m.group(2) + m.group(3).lower()) if m else str(r[cols["tag"]]).strip()
    def yr(v): return v.year if isd(v) else None
    k1 = Counter(tagkey(r) for _, r in rows)
    print(f"  tag alone unique: {sum(1 for _, r in rows if k1[tagkey(r)] == 1)} of {len(rows)}; distinct tags {len(k1)}")
    # candidate rule: tag + era, era = 'A' if first-use date before 2022-03-01 else 'B' (date = sown, else collected, else set)
    def when(r):
        for k in ("sown", "collected"):
            if k in cols and isd(r[cols[k]]): return r[cols[k]]
        return None
    def rule(r):
        w = when(r)
        if w is None: return None
        return (tagkey(r), "A" if w < datetime.datetime(2022, 3, 1) else "B")
    keyed = [(rule(r), r) for _, r in rows]
    k2 = Counter(k for k, _ in keyed if k)
    nodate = sum(1 for k, _ in keyed if k is None)
    uniq = sum(1 for k, _ in keyed if k and k2[k] == 1)
    print(f"  rule 'tag + era(date < 2022-03-01 -> A else B)': unique {uniq}, still duplicated {sum(1 for k, _ in keyed if k and k2[k] > 1)}, no usable date {nodate}")
    k3 = Counter((tagkey(r), when(r)) for _, r in rows if when(r))
    print(f"  tag + exact date unique: {sum(1 for _, r in rows if when(r) and k3[(tagkey(r), when(r))] == 1)}")
    return rows

seed = report("Seed log (2. Seed records MASTER)", D / "2. Seed records MASTER.xlsx", 4,
    dict(tag=0, species=1, collected=3, amount=5, sown=6, pricked_date=7, pricked_n=8, container=9, notes=10), "S")
cut = report("Cuttings log (1. Cuttings records MASTER)", D / "1. Cuttings records MASTER.xlsx", 3,
    dict(tag=0, species=1, sown=4, amount=3, pricked_date=5, pricked_n=6, container=7, notes=8), "C")
# results register
rows = []
for i, r in sheet_rows(D / "3. Seed & Cutting results MASTER.xlsx", 8, 2):
    if isinstance(r[0], str) and re.match(r"^\s*[SC]\s*\d", r[0], re.I): rows.append((i, r))
print(f"\n== Results register: {len(rows)} tag rows; sown date present {sum(1 for _,r in rows if isd(r[3]))}; "
      f"pricked date {sum(1 for _,r in rows if isd(r[4]))}; '# survived' number {sum(1 for _,r in rows if num(r[5]))}; "
      f"'%survival' column holds a fraction {sum(1 for _,r in rows if num(r[6]) and 0 <= r[6] <= 1)}")

# --- what the non-sensitive columns can answer (counts only) ---
cc = Counter(); both = 0; usable = []
for _, r in seed:
    t = species_tier(r[1]); g = sp.get(hc.norm(r[1]), {}).get("proposed_group") if isinstance(r[1], str) else None
    c, s = r[3], r[6]
    if g and t == "auto" and isd(c) and datetime.datetime(2016, 1, 1) <= c <= datetime.datetime(2026, 10, 3):
        cc[g] += 1; usable.append(c.month)
    if isd(c) and isd(s) and c <= s: both += 1
print(f"\nSeed log: rows with auto species + plausible collected date (2016 to now): {len(usable)}; species with >=3 such lots: {sum(1 for v in cc.values() if v >= 3)} of {len(cc)}")
print(f"Seed log: rows with collected <= sown (both dates): {both}")
print("Seed log: collected-month histogram (those rows):", dict(sorted(Counter(usable).items())))
