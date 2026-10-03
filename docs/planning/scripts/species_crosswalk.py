#!/usr/bin/env python3
"""
species_crosswalk.py  (WRT Phase 2, S4A prototype)

Builds a canonical species crosswalk from the Phase 1 variants table.

Reads (read-only):
  /home/claude/discovery/04a_species_variants.csv        820 distinct raw strings
  /home/claude/_source_copy/.../_JMN Plants Out Master.xlsx > Master Plant List
      (the 98-row master block, the 49-species >5m flag, the 13 threatened flags,
       common and Maori names).  Opened with openpyxl read_only; never saved.

Writes (under /home/claude/planning/prototype/):
  species_crosswalk.csv         one row per raw string, mapped to a species_id
  species_master_proposed.csv   one row per species_id

Run:  python3 species_crosswalk.py          (prints a summary; see species_crosswalk_output.txt)

What it does NOT do: it never decides contested taxonomy.  Where WRT keeps (or may keep)
two lines, they stay two IDs, and every row in the set is marked needs_wrt_decision = Y with
a note naming the ruling.  Canonical names are WRT's own most-typed spelling ("the handle");
spelling corrections are only suggested, in species_master_proposed.csv, for WRT approval.
"""
import csv
import collections
import glob
import os
import re
import sys

import openpyxl

BASE = '/home/claude'
VARIANTS = f'{BASE}/discovery/04a_species_variants.csv'
PO_GLOB = f'{BASE}/_source_copy/_ALL Plant Lists/_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx'
OUT_DIR = f'{BASE}/planning/prototype'

# ----------------------------------------------------------------------------------------
# 0. Small helpers
# ----------------------------------------------------------------------------------------


def clean(s):
    """Undo the escaped whitespace Phase 1 wrote into raw strings (literal backslash-t and
    backslash-u00a0), collapse spaces, drop stray brackets, strip."""
    s = s.replace('\\t', ' ').replace('\\u00a0', ' ').replace('\\n', ' ').replace(' ', ' ').replace('\t', ' ')
    s = s.replace('…', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def keyify(s):
    """Same idea as the Phase 1 normalised_key: lower case, punctuation out, spaces collapsed."""
    s = clean(s).lower()
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def lev(a, b):
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def latin_tokens(s):
    """Alphabetic tokens of the part of s outside brackets (numbers and punctuation dropped)."""
    s = re.sub(r'\([^)]*\)?', ' ', s)
    return re.findall(r"[A-Za-z]+", s)


# ----------------------------------------------------------------------------------------
# 1. Editorial tables.  Everything WRT might want to argue with is here, in one place.
# ----------------------------------------------------------------------------------------

# Groups that never receive a species ID, and why.
NO_ID_GROUPS = {
    '(common name, unresolved) weeping broom': ('unknown', 'common name only; species not stated in the source'),
    '(non-native / cultivar / other)': ('unknown', 'ornamental, cultivar or non-native line; not a native species line'),
    'Carmichaelia east': ('unknown', 'genus plus a descriptor or tag (tag redacted in Phase 1); no species named'),
    'Carmichaelia light': ('unknown', 'genus plus a descriptor; no species named'),
}
NOTE_ROW_PREFIX = 'phormium cookianum and melicytus alpinus are coming'   # a free-text note, not a name

# Splitting two groups that Phase 1 merged, because WRT keeps both as rows (contested pairs).
SPLITS = {
    'Leptecophylla juniperina': [
        ('Cyathoides juniperina', re.compile(r'^\W*cyath', re.I)),
    ],
    'Veronica cupressoides': [
        ('Leonohebe cupressoides', re.compile(r'^\W*leon', re.I)),
    ],
}

# Handle (canonical name as WRT writes it) where the Phase 1 group name is not itself a written form.
HANDLE_OVERRIDE = {
    'Carex comans': 'Carex comans red',
    'Veronica pimeliodesv var faucicola': 'Veronica pimeliodesv faucola',
    'Veronica hectorii var demissa': 'Veronica hectorii v demissa',
}

# Spelling suggestions for WRT approval (not applied).  Only where the correct form also occurs in the data
# or the Phase 1 census names it.  (census 04a section 2 point 3 and section 5)
SUGGESTED_SPELLING = {
    'Weinmania racemosa': 'Weinmannia racemosa',
    'Scheflera digitata': 'Schefflera digitata',
    'Parsonia heterophylla': 'Parsonsia heterophylla',
    'Coprosma brunea': 'Coprosma brunnea',
    'Prumnopitys taxifolius': 'Prumnopitys taxifolia',
    'Carex flagillera': 'Carex flagellifera',
    'Eleocarpus dentatus': 'Elaeocarpus dentatus',
    'Celmesia lyallii': 'Celmisia lyallii',
    'Olearia nummularifolia': 'Olearia nummulariifolia',
    'Veronica pimeliodesv faucola': 'Veronica pimeleoides var. faucicola',
    'Leonohebe cupressoides': 'Veronica cupressoides',     # only if WRT rules the pair is one line
    'Cyathoides juniperina': 'Leptecophylla juniperina',    # only if WRT rules the pair is one line
}
# Where a suggestion would merge two IDs it is a ruling, not a spelling: mark it so.
SUGGESTION_IS_A_RULING = {'Leonohebe cupressoides', 'Cyathoides juniperina'}

# Contested sets: IDs stay separate; every row in the set gets needs_wrt_decision = Y.
CONTESTED_SETS = [
    ('C1', ['Leptecophylla juniperina', 'Cyathoides juniperina'],
     'Same nursery line as Cyathoides juniperina (allocation, stocktake, history)? Merging changes counts.'),
    ('C2', ['Leonohebe cupressoides', 'Veronica cupressoides'],
     'One species written twice in every master list (Master Plant List rows 44 and 92)? Threatened flag is on the Veronica row only.'),
    ('C3', ['Carex maorica', 'Carex secta'],
     'Separate stock lines, or one a local form of the other (nickname "oio")?'),
    ('C4', ['Kunzea ericoides', 'Kunzea robusta', 'Kunzea serotina'],
     'Which Kunzea does WRT grow as kanuka? Three lines or one? Plain "kanuka" has no mapping.'),
    ('C5', ['Ozothamnus leptophyllus', 'Ozothamnus vauvilliersii', 'Ozothamnus fulvida'],
     'Three lines or one? Core rows carry a stray bracket; one string reads "leptophyllus inc. vauvilliersii and fulvida".'),
    ('C6', ['Carmichaelia crassicaulis', 'Carmichaelia crassicule var racemosa', 'Carmichaelia racemosa'],
     'Is the racemosa variety its own line, and is Carmichaelia racemosa (potting Summary) the same as it?'),
    ('C7', ['Olearia nummularifolia', 'Olearia nummulariifolia var cymbifolia'],
     'Is the cymbifolia variety its own line or folded into the parent?'),
    ('C8', ['Veronica hectorii', 'Veronica hectorii v demissa'],
     'Is the demissa variety its own line or folded into the parent?'),
    ('C9', ['Pimelea aridula', 'Pimelea aridula var oliga'],
     'Is the oliga variety its own line or folded into the parent?'),
]
# Single IDs whose identity needs a ruling but have no partner ID.
CONTESTED_SINGLES = {
    'Pseudopanax arborscens': ('C10', 'Matches no list name: typo for Pseudopanax arboreus, a mix-up with Olearia arborescens, or its own line? Which species?'),
    'Muehlenbeckia coci': ('C11', 'Seed logs only ("Muehlenbeckia coci?"); matches no species. Which species is meant?'),
    'Veronica pimeliodesv faucola': ('C12', 'Variety written as its own line with no parent line in any list. Own line, or a form of Veronica pimeleoides?'),
}
VAR_IDS = {'Carmichaelia crassicule var racemosa', 'Olearia nummulariifolia var cymbifolia', 'Veronica hectorii v demissa',
           'Pimelea aridula var oliga', 'Veronica pimeliodesv faucola'}
RULING_SINGLES_NOT_CONTESTED = {
    'Carex comans red': 'Is "red" a cultivar or form, or part of the line name? Row is an appended (Autumn 2026, stocktake, docx) addition.',
}

# Aliases whose mapping is ambiguous or conflicts with the master list's own common names (alias-level rulings).
RAW_OVERRIDE = {
    # raw (cleaned, lower)                    : (alias_type, confidence, needs, note)
    'mountain wineberry (arisotelia serrata)': ('common_name', 'low', 'Y', 'Master Plant List gives "Mountain wineberry" to Aristotelia fruticosa and "Wineberry" to A. serrata; the bracket says serrata. Common name and Latin name disagree.'),
    'mountain totara (podocarpus laetus)': ('common_name', 'low', 'Y', 'Master Plant List gives "Halls Totara" to P. laetus and "Mountain Totara" to P. nivalis; the bracket says laetus.'),
    'totara': ('maori_name', 'medium', 'Y', 'Plain "totara" could be Podocarpus totara or Halls totara (P. laetus); mapped to P. totara as the Master Plant List has it.'),
    'rata': ('maori_name', 'low', 'Y', 'Plain "rata" mapped to Metrosideros umbellata (southern rata) as on the Master Plant List; Metrosideros robusta (northern rata) is now also on the Autumn 2026 list.'),
    'rata row 1&2': ('site_tagged', 'low', 'Y', 'Bed or row tag after "Rata"; same ambiguity as plain "rata".'),
    'rata row 3&4': ('site_tagged', 'low', 'Y', 'Bed or row tag after "Rata"; same ambiguity as plain "rata".'),
    'rata (kpca)': ('site_tagged', 'low', 'Y', 'Site-tagged rata (docx list row 98, stocktake). A normal rata line with a site tag, or a special order for that site? Tag belongs in a site field.'),
    'kowhai': ('maori_name', 'medium', 'Y', 'Plain "kowhai" mapped to Sophora microphylla as on the Master Plant List; Sophora longicarinata is also kowhai and has its own ID.'),
    'kowhai seedlings': ('maori_name', 'medium', 'Y', 'As "kowhai"; "seedlings" is a qualifier.'),
    'mtn ribbonwood': ('common_name', 'low', 'Y', 'Master Plant List calls Hoheria glabrata "Mountain lacebark"; "ribbonwood" is also used for Plagianthus. Mapped to H. glabrata on the strength of "mountain".'),
    'kowhai ([redacted])': ('site_tagged', 'medium', 'Y', 'Kowhai with a provenance tag (withheld by Phase 1); as plain "kowhai", also ambiguous with Sophora longicarinata.'),
    'podocarpustaxifolius (matai)': ('old_genus', 'medium', 'N', 'Older Latin name (Podocarpus taxifolius) with "Matai" in brackets; matai is Prumnopitys taxifolius on the Master Plant List.'),
    'ozothamnus leptophyllus (vauvilliersii)': ('multi', 'low', 'Y', 'Two taxa in one cell; filed under leptophyllus (its first name) only for lack of a rule.'),
}

# Maori names used on their own, or as the first word, in the data (as in the Master Plant List's Maori column).
MAORI_FIRST = {'kowhai', 'toetoe', 'matai', 'miro', 'totara', 'rata', 'manuka', 'kanuka', 'kohuhu', 'koromiko',
               'rohutu', 'mingimingi', 'matagouri', 'karamu', 'tauhinau'}
# Words that are tags or qualifiers after a name, not part of it.
TAG_WORDS = {'redacted', 'seedlings', 'seedliings', 'seedling', 'plants', 'plant', 'duff', 'split', 'heavy', 'light', 'med', 'wood',
             'max', 'bl', 'row', 'ex', 'x', 'sp'}
COMMON_TAILS = {'miro', 'manuka', 'matai', 'lancewood', 'mtn', 'totara', 'beech', 'leafless', 'clematis', 'hard',
                'northern', 'rata', 'pink', 'flowering', 'broom'}
# Old or alternative genus names seen in the data -> treated as old_genus when they differ from the handle's genus.
OLD_GENERA = {'hebe', 'leonohebe', 'leonehebe', 'cyathodes', 'cyathodies', 'nothofagus', 'podocarpustaxifolius'}
PLACE_TAG = re.compile(r'slope hill|kpca|\[redacted\]', re.I)

# Status rules (see species_master_proposed.csv)
NON_PLAN_SOURCES = {'seedlog', 'reference'}


# ----------------------------------------------------------------------------------------
# 2. Read the Plants Out Master "Master Plant List" (read-only)
# ----------------------------------------------------------------------------------------

def read_master_plant_list():
    paths = glob.glob(PO_GLOB)
    if not paths:
        sys.exit('Plants Out Master not found')
    wb = openpyxl.load_workbook(paths[0], read_only=True, data_only=True)
    ws = wb['Master Plant List']
    rows = []
    for r in ws.iter_rows(min_row=4, max_row=101, max_col=8, values_only=True):
        if r[3] is None:
            continue
        rows.append({
            'over5m': (str(r[0]).strip().upper() == 'Y') if r[0] else False,
            'threatened': (str(r[1]).strip().upper() == 'T') if r[1] else False,
            'no': int(r[2]) if r[2] else None,
            'botanical': str(r[3]),
            'common': (str(r[4]).strip() if r[4] else ''),
            'maori': (str(r[5]).strip() if r[5] else ''),
        })
    wb.close()
    return rows


# ----------------------------------------------------------------------------------------
# 3. Main
# ----------------------------------------------------------------------------------------

def read_removed_list():
    """Names on Plants Out Master > 'plants removed from list' (column A, rows 3 to 8)."""
    paths = glob.glob(PO_GLOB)
    wb = openpyxl.load_workbook(paths[0], read_only=True, data_only=True)
    ws = wb['plants removed from list']
    names = [str(r[0]).strip() for r in ws.iter_rows(min_row=3, max_row=8, max_col=1, values_only=True) if r[0]]
    wb.close()
    return names


def main():
    rows = list(csv.DictReader(open(VARIANTS, encoding='utf-8')))
    stats = collections.OrderedDict()
    stats['variants_rows_read'] = len(rows)

    # ---- 1. exclusions: tray codes, headings, notes ----
    excluded = collections.Counter()
    kept = []
    for r in rows:
        g = r['proposed_group']
        if g == '(not a species)':
            excluded['not a species: tray or seed code, heading, total, note, error value'] += 1
            continue
        if g.lower().startswith('multi: ' + NOTE_ROW_PREFIX):
            excluded['free-text note'] += 1
            continue
        kept.append(r)
    stats['excluded_rows'] = dict(excluded)

    # ---- 2. internal groups (after splitting the two merged pairs), handles, IDs ----
    def internal_group(r):
        g = r['proposed_group']
        if g in SPLITS:
            for newname, pat in SPLITS[g]:
                if pat.search(clean(r['raw_string'])):
                    return newname
        return g

    handle_of = {}
    for r in kept:
        g = internal_group(r)
        r['_grp'] = g
        r['_noid'] = bool(g in NO_ID_GROUPS or g.endswith('(genus only)') or g.startswith('MULTI:'))
        if not r['_noid']:
            handle_of[g] = HANDLE_OVERRIDE.get(g, g)
    handles = sorted(set(handle_of.values()), key=lambda h: h.lower())
    id_of_handle = {h: f'SP-{i:03d}' for i, h in enumerate(handles, 1)}
    grp_of_handle = {v: k for k, v in handle_of.items()}

    def htoks(h):
        t = h.lower().split()
        return t[0], (t[1] if len(t) > 1 else '')

    # tokens seen in each group (longer, near-handle spellings only, so truncations do not count as full forms)
    GEN, EPI = {}, {}
    for g, h in handle_of.items():
        hg, he = htoks(h)
        GEN[g] = {hg}
        EPI[g] = {he}
    for r in kept:
        if r['_noid'] or '…' in r['raw_string']:
            continue
        g = r['_grp']
        hg, he = htoks(handle_of[g])
        t = [x.lower() for x in latin_tokens(clean(r['raw_string']))]
        if len(t) >= 2:
            if len(t[0]) >= len(hg) - 1 and lev(t[0], hg) <= 3:
                GEN[g].add(t[0])
            if len(t[1]) >= len(he) - 1 and lev(t[1], he) <= 3:
                EPI[g].add(t[1])
    ALL_GEN = set().union(*GEN.values()) | OLD_GENERA

    def genus_like(tok):
        t = tok.lower()
        if not t:
            return False
        if t in ALL_GEN:
            return True
        if len(t) >= 3 and any(g.startswith(t) for g in ALL_GEN):
            return True
        return len(t) >= 5 and any(lev(t, g) <= 2 for g in ALL_GEN)

    def abbreviation_candidates(gt, et):
        out_ = []
        for g, h in handle_of.items():
            if any(x.startswith(gt) for x in GEN[g]) and (
                    not et or any(x.startswith(et) or (len(et) >= 4 and lev(et, x) <= 2) for x in EPI[g])):
                out_.append(h)
        return out_

    # ---- 3. contested lookups ----
    contested_of = {}
    for sid, hs, ruling in CONTESTED_SETS:
        for h in hs:
            contested_of[h] = (sid, ruling, [x for x in hs if x != h])
    for h, (sid, ruling) in CONTESTED_SINGLES.items():
        contested_of[h] = (sid, ruling, [])
    missing = [h for h in contested_of if h not in id_of_handle]
    if missing:
        sys.exit(f'contested handle not found: {missing}')

    # ---- 4. classify every kept row ----
    def bracket_conf(inner, H):
        t = [x.lower() for x in latin_tokens(inner)]
        hg, he = htoks(H)
        if len(t) < 2:
            return 'low'
        eg = (t[0] == hg) or (t[0] in OLD_GENERA) or lev(t[0], hg) <= 2
        de = lev(t[1], he)
        if eg and de <= 2:
            return 'high'
        if de <= 4:
            return 'medium'
        return 'low'

    out = []
    for r in kept:
        raw = r['raw_string']
        s0 = clean(raw)
        occ = int(r['occurrences'])
        nfiles = 0
        for f in [f for f in r['files'].split(';') if f]:
            m = re.match(r'\(\+(\d+) more\)', f.strip())
            nfiles += int(m.group(1)) if m else 1
        sources = '|'.join(x for x in r['source_types'].split(';') if x) + f' ({nfiles} files)'

        # -- rows with no species ID --
        if r['_noid']:
            g = r['_grp']
            need = 'Y'
            if g in NO_ID_GROUPS:
                atype, why = NO_ID_GROUPS[g]
                if g == '(non-native / cultivar / other)':
                    note = 'Ornamental, cultivar or non-native line. No ID. WRT to say whether such lines belong on the Species list at all.'
                else:
                    note = f'{why[0].upper()}{why[1:]}. No ID. Which species is meant, or leave unmapped?'
            elif g.startswith('MULTI:'):
                atype = 'multi'
                note = 'More than one taxon in one cell. No single ID. Which stock line was meant?'
                if g == 'MULTI: coprosma dumosa tayloriae':
                    note = ('Slash string in the forecast site sheets. Coprosma dumosa alone, or its own line? '
                            'Not aliased to Coprosma dumosa (no cross-pair aliases).')
            else:
                atype = 'unknown'
                need = 'N'
                note = 'Genus only. Stays unmapped by rule (shows "not on Master") unless WRT says which species it stands for.'
            conf = 'low'
            if g == '(non-native / cultivar / other)':
                need = 'N'
            out.append(dict(species_id='', raw_name=raw, proposed_canonical_name='', alias_type=atype,
                            confidence=conf, needs_wrt_decision=need, occurrences=occ, sources=sources,
                            note=note, match_key=r['normalised_key']))
            continue

        H = handle_of[r['_grp']]
        sid = id_of_handle[H]
        hg, he = htoks(H)
        ht = H.lower().split()
        s = s0.lstrip('#').strip()
        low = s.lower()
        notes = []
        mask_raw = False
        ov = RAW_OVERRIDE.get(low)

        s_nobr = re.sub(r'\s+', ' ', re.sub(r'[()?]|\s-\s*$', ' ', s)).strip()
        br = re.search(r'\(([^)]*)\)?', s)
        outside = re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)?', ' ', s)).strip()
        out_first = outside.split()[0] if outside.split() else ''
        toks = latin_tokens(s)
        t0 = toks[0].lower() if toks else ''
        g_tok = t0
        e_tok = toks[1].lower() if len(toks) > 1 else ''
        tail = [x.lower() for x in toks[2:]] if len(ht) == 2 else []
        tail_tags = [x for x in tail if x in TAG_WORDS]
        tail_common = [x for x in tail if x in COMMON_TAILS]

        if raw == H:
            atype, conf = 'exact', 'high'
        elif low == H.lower():
            atype, conf = 'case_space', 'high'
            if raw.lstrip().startswith('#'):
                notes.append('"#" is the threatened-species marker in the Te Kakano list')
        elif s_nobr.lower() == H.lower():
            atype, conf = 'case_space', 'high'
            notes.append('stray bracket or dash removed')
            if '?' in s:
                conf = 'medium'
                notes[-1] = 'trailing "?" = recorder unsure'
        elif br and PLACE_TAG.search(br.group(1)):
            atype, conf = 'site_tagged', 'medium'
            mask_raw = bool(re.search(r'slope hill|kpca', br.group(1), re.I))
            notes.append('tag belongs in a site or batch field, not in the species name')
        elif br and len(latin_tokens(br.group(1))) >= 2 and not genus_like(out_first):
            first = out_first.lower()
            atype = 'maori_name' if first in MAORI_FIRST else 'common_name'
            conf = bracket_conf(br.group(1), H)
            notes.append('Latin name in brackets decides the match')
        elif br and len(latin_tokens(br.group(1))) >= 2 and genus_like(out_first):
            atype, conf = 'common_name', bracket_conf(br.group(1), H)
            notes.append('genus used as a common name, Latin name in brackets')
        elif t0 and not genus_like(t0):
            atype = 'maori_name' if t0 in MAORI_FIRST else 'common_name'
            conf = 'medium'
            rest = [x.lower() for x in toks[1:]]
            if any(x in TAG_WORDS for x in rest if x not in ('ex', 'redacted')):
                notes.append('qualifier word after the name (e.g. seedlings)')
            if 'ex' in rest:
                atype = 'site_tagged'
                notes.append('"ex" = provenance tag (withheld by Phase 1); tag belongs in a source field')
            if len(toks) >= 3 and any(genus_like(x) for x in toks[1:]):
                notes.append('Latin name follows the common name')
        elif len(ht) >= 3:
            # variety handles: any shortened or re-ordered form is a variety alias
            atype, conf = 'variety', 'medium'
            notes.append('variety written in a short or different form')
        else:
            gg = GEN[r['_grp']]
            ee = EPI[r['_grp']]
            g_abbr = len(g_tok) < len(hg) and g_tok not in gg and any(x.startswith(g_tok) for x in gg)
            e_abbr = bool(e_tok) and e_tok not in ee and any(x.startswith(e_tok) and len(e_tok) < len(x) for x in ee)
            ellipsis = '…' in raw or '...' in raw
            g_old = g_tok in OLD_GENERA and g_tok not in gg
            if g_abbr or e_abbr or ellipsis:
                cands = abbreviation_candidates(g_tok, e_tok)
                atype = 'abbreviation'
                others = [id_of_handle[c] for c in cands if c != H]
                if H in cands and not others:
                    conf = 'medium'
                    notes.append('unique prefix match; import-only, not offered in dropdowns')
                else:
                    conf = 'low'
                    notes.append('prefix also fits ' + ', '.join(others) if others else 'prefix match not unique')
                if g_abbr and e_tok and e_tok not in ee and not e_abbr:
                    notes.append('epithet also misspelt')
                if tail_tags:
                    notes.append('also carries a qualifier')
                if tail_common:
                    notes.append('common name appended')
            elif tail_tags and genus_like(g_tok):
                atype, conf = 'site_tagged', 'medium'
                notes.append('qualifier after the name (e.g. seedlings, duff, a cap or a wood grade); belongs in a batch field')
                if e_tok not in ee or g_tok not in gg:
                    notes.append('name part also differs in spelling')
            elif tail_common and genus_like(g_tok):
                atype = 'common_name'
                conf = 'high' if (g_tok in gg and e_tok in ee) else 'medium'
                notes.append('common name written after the Latin name')
            elif g_old:
                atype = 'old_genus'
                conf = 'high' if lev(e_tok, he) <= 2 else 'medium'
                notes.append(f'genus "{toks[0]}" is an older or alternative genus name')
                if tail_tags:
                    notes.append('also carries a qualifier')
            elif len(toks) > 2 and tail and not tail_tags:
                atype, conf = 'site_tagged', 'medium'
                notes.append('extra words after the name, not recognised; belongs in a batch or site field')
            else:
                d = lev(f'{g_tok} {e_tok}'.strip(), f'{hg} {he}'.strip())
                if d == 0:
                    atype, conf = 'case_space', 'high'
                else:
                    atype = 'typo'
                    conf = 'high' if d <= 2 else ('medium' if d <= 4 else 'low')
                    if r['uncertain'] == 'Y' and conf == 'high':
                        conf = 'medium'
                    if H in SUGGESTED_SPELLING and H not in SUGGESTION_IS_A_RULING \
                            and low == SUGGESTED_SPELLING[H].lower():
                        notes.append("this is the standard spelling; WRT's list uses the other form")
            if tail_tags and atype != 'site_tagged' and 'also carries a qualifier' not in notes:
                notes.append('also carries a qualifier')

        # variety IDs: any non-exact, non-case alias is a variety alias
        if H in VAR_IDS and atype not in ('exact', 'case_space', 'variety'):
            notes.append(f'(first read as {atype})')
            atype = 'variety'
            conf = 'medium' if conf == 'high' else conf
        if ov:
            atype, conf, _need, onote = ov
            notes = [onote]

        # needs_wrt_decision
        need = 'N'
        if H in contested_of:
            sid_c, ruling, partners = contested_of[H]
            need = 'Y'
            pn = (' Partner ' + ', '.join(id_of_handle[p] for p in partners) + '.') if partners else ''
            notes.insert(0, f'Contested {sid_c}: {ruling}{pn}')
        elif H in RULING_SINGLES_NOT_CONTESTED:
            need = 'Y'
            notes.insert(0, RULING_SINGLES_NOT_CONTESTED[H])
        if conf == 'low':
            need = 'Y'
        if ov and ov[2] == 'Y':
            need = 'Y'
        if H == 'Veronica cupressoides' and low.startswith('hebe'):
            atype, conf, need = 'old_genus', 'low', 'Y'
            notes.append('old genus "Hebe" filed under the Veronica row by the genus rule; confirm when the pair is ruled on')

        raw_out = raw
        if mask_raw:
            raw_out = re.sub(r'\(([^)]*)\)', '([site tag withheld])', raw)
            notes.append('tag text withheld here; the full string is in 04a_species_variants.csv')

        out.append(dict(species_id=sid, raw_name=raw_out, proposed_canonical_name=H, alias_type=atype,
                        confidence=conf, needs_wrt_decision=need, occurrences=occ, sources=sources,
                        note='; '.join(n for n in notes if n), match_key=r['normalised_key']))

    out.sort(key=lambda x: (x['species_id'] == '', x['species_id'], -x['occurrences'], x['raw_name']))

    os.makedirs(OUT_DIR, exist_ok=True)
    cols = ['species_id', 'raw_name', 'proposed_canonical_name', 'alias_type', 'confidence', 'needs_wrt_decision',
            'occurrences', 'sources', 'note', 'match_key']
    with open(f'{OUT_DIR}/species_crosswalk.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(out)

    # ---- 5. species_master_proposed.csv ----
    mpl = read_master_plant_list()
    removed = read_removed_list()
    key_to_handle = collections.defaultdict(set)
    for r in out:
        if r['species_id']:
            key_to_handle[r['match_key']].add(r['proposed_canonical_name'])
    core, core_unmatched = {}, []
    for m in mpl:
        k = keyify(m['botanical'])
        hs = key_to_handle.get(k, set())
        if len(hs) == 1:
            core[next(iter(hs))] = m
        else:
            core_unmatched.append(m['botanical'])
    removed_handles = {}
    for n in removed:
        hs = key_to_handle.get(keyify(n), set())
        if len(hs) == 1:
            removed_handles[next(iter(hs))] = n
    stats['master_plant_list_rows'] = len(mpl)
    stats['master_plant_list_unmatched'] = core_unmatched
    stats['over5m_in_list'] = sum(1 for m in mpl if m['over5m'])
    stats['threatened_in_list'] = sum(1 for m in mpl if m['threatened'])

    by_id = collections.defaultdict(list)
    for r in out:
        if r['species_id']:
            by_id[r['species_id']].append(r)
    src_by_handle = collections.defaultdict(set)
    for r in kept:
        if not r['_noid']:
            for s_ in r['source_types'].split(';'):
                if s_:
                    src_by_handle[handle_of[r['_grp']]].add(s_)

    master_rows = []
    for h in handles:
        sid = id_of_handle[h]
        rs = by_id[sid]
        srcs = src_by_handle[h]
        in_core = h in core
        if h in contested_of:
            status = 'contested'
        elif in_core:
            status = 'core'
        elif srcs - NON_PLAN_SOURCES:
            status = 'appended'
        else:
            status = 'seedlog_only'
        m = core.get(h)
        part, note = '', ''
        if h in contested_of:
            sid_c, ruling, partners = contested_of[h]
            part = ' '.join(id_of_handle[p] for p in partners)
            note = f'{sid_c}: {ruling}'
        elif h in RULING_SINGLES_NOT_CONTESTED:
            note = RULING_SINGLES_NOT_CONTESTED[h]
        if h in removed_handles:
            note = (note + ' ' if note else '') + 'Also named on Plants Out Master > "plants removed from list"; status of that list is unexplained.'
        sug = SUGGESTED_SPELLING.get(h, '')
        if h in SUGGESTION_IS_A_RULING:
            sug = ''
        needs = 'Y' if (h in contested_of or h in RULING_SINGLES_NOT_CONTESTED) else 'N'
        master_rows.append(dict(
            species_id=sid, canonical_handle=h, suggested_spelling=sug,
            common_name=(m['common'] if m else ''), maori_name=(m['maori'] if m else ''),
            status=status, in_core_98=('Y' if in_core else 'N'),
            over_5m=(('Y' if m['over5m'] else 'N') if m else ''),
            threatened=(('Y' if m['threatened'] else 'N') if m else ''),
            needs_wrt_decision=needs, contested_with=part,
            alias_rows=len(rs), occurrences=sum(x['occurrences'] for x in rs),
            source_types='|'.join(sorted(srcs)), note=note))
    mcols = ['species_id', 'canonical_handle', 'suggested_spelling', 'common_name', 'maori_name', 'status',
             'in_core_98', 'over_5m', 'threatened', 'needs_wrt_decision', 'contested_with', 'alias_rows',
             'occurrences', 'source_types', 'note']
    with open(f'{OUT_DIR}/species_master_proposed.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=mcols)
        w.writeheader()
        w.writerows(master_rows)

    # ---- 6. summary ----
    withid = [r for r in out if r['species_id']]
    noid = [r for r in out if not r['species_id']]
    C = collections.Counter
    print('== species_crosswalk.py summary ==')
    print('variants rows read:', stats['variants_rows_read'])
    print('excluded rows:', stats['excluded_rows'])
    print('rows in crosswalk:', len(out), '(with an ID:', len(withid), '; without an ID:', len(noid), ')')
    print('distinct species IDs:', len(handles))
    print('alias_type, rows with an ID:', dict(C(r['alias_type'] for r in withid)))
    print('alias_type, rows without an ID:', dict(C(r['alias_type'] for r in noid)))
    print('confidence, rows with an ID:', dict(C(r['confidence'] for r in withid)))
    print('confidence, rows without an ID:', dict(C(r['confidence'] for r in noid)))
    print('needs_wrt_decision = Y:', sum(1 for r in out if r['needs_wrt_decision'] == 'Y'),
          '(with ID', sum(1 for r in withid if r['needs_wrt_decision'] == 'Y'),
          '; without ID', sum(1 for r in noid if r['needs_wrt_decision'] == 'Y'), ')')
    in_set = lambda r: r['proposed_canonical_name'] in contested_of or r['proposed_canonical_name'] in RULING_SINGLES_NOT_CONTESTED
    print('needs Y with ID: because the ID is in a contested set or has a ruling:',
          sum(1 for r in withid if r['needs_wrt_decision'] == 'Y' and in_set(r)),
          '; alias-level only:', sum(1 for r in withid if r['needs_wrt_decision'] == 'Y' and not in_set(r)))
    print('occurrences covered by rows with an ID:', sum(r['occurrences'] for r in withid), 'of', sum(r['occurrences'] for r in out))
    print('status counts:', dict(C(m['status'] for m in master_rows)))
    print('contested sets:', len(CONTESTED_SETS), '+', len(CONTESTED_SINGLES), 'single IDs; IDs with status contested:',
          sum(1 for m in master_rows if m['status'] == 'contested'))
    print('decisions (rulings) behind the Y rows: sets', len(CONTESTED_SETS), '+ single IDs', len(CONTESTED_SINGLES),
          '+ Carex comans red 1 + alias-level rulings on distinct strings:',
          len({r['match_key'] for r in withid if r['needs_wrt_decision'] == 'Y' and not in_set(r)}))
    print('Master Plant List rows:', stats['master_plant_list_rows'], '; unmatched:', stats['master_plant_list_unmatched'])
    print('over_5m flagged in Master Plant List:', stats['over5m_in_list'], '; threatened:', stats['threatened_in_list'])
    print('over_5m Y/N/unknown in proposed master:', sum(1 for m in master_rows if m['over_5m'] == 'Y'),
          sum(1 for m in master_rows if m['over_5m'] == 'N'), sum(1 for m in master_rows if m['over_5m'] == ''))
    print('threatened = Y:', sum(1 for m in master_rows if m['threatened'] == 'Y'))
    print('IDs with a suggested spelling:', sum(1 for m in master_rows if m['suggested_spelling']))
    print('core IDs (on the 98-row list):', sum(1 for m in master_rows if m['in_core_98'] == 'Y'))
    print('names on "plants removed from list" matched to an ID:', sorted(removed_handles.values()))
    # integrity checks
    km = collections.defaultdict(set)
    for r in withid:
        km[r['match_key']].add(r['species_id'])
    clash = {k: v for k, v in km.items() if len(v) > 1}
    print('match_key shared by more than one ID:', len(clash), list(clash.items())[:5])
    ids = [m['species_id'] for m in master_rows]
    print('IDs unique:', len(ids) == len(set(ids)), '; alphabetical by handle:',
          [m['canonical_handle'].lower() for m in master_rows] == sorted(m['canonical_handle'].lower() for m in master_rows))


if __name__ == '__main__':
    main()
