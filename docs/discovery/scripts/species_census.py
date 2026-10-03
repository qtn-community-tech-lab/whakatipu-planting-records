#!/usr/bin/env python3
"""S4a species-name census for the WRT data discovery (read-only on sources).

Stage 1 (extract):  python3 species_census.py extract
    Opens every sheet that a scout identified as having a species column
    (02_scouts/B*.json -> sheets[].species_name_column), reads that column (or
    columns, e.g. "A,D,G") from the row after the header to the end of the sheet,
    and writes raw cell strings to RAW_OUT (one row per cell).  Also reads the
    docx species lists.
Stage 2 (build):    python3 species_census.py build
    Normalises, groups, counts and writes 04a_species_variants.csv and
    04a_census_tables.json (list-by-list counts used in the report).

Run both:  python3 species_census.py all
"""
import csv, glob, json, os, re, sys, unicodedata, collections
import openpyxl

ROOT = '/home/claude/_source_copy/_ALL Plant Lists/'
CONV = '/home/claude/_converted/'
DISC = '/home/claude/discovery/'
import tempfile
SCRATCH = os.environ.get('CENSUS_SCRATCH', os.path.join(tempfile.gettempdir(), 'species_census_work') + '/')
RAW_OUT = SCRATCH + 'species_raw_cells.csv'
MAX_ROW = 3000  # phantom used ranges exist (1,048,576 rows); real data ends far earlier

# batch -> source type.  seedlog = free-text species columns in seed/cutting records.
BATCH_TYPE = {
    'B01': 'forecast', 'B02': 'forecast', 'B03': 'masterlist', 'B04': 'forecast',
    'B05': 'plan', 'B06': 'plan',
    'B07': 'seedlog', 'B08': 'seedlog', 'B09': 'seedlog', 'B10': 'seedlog',
    'B11': 'seedlog', 'B12': 'seedlog',
    'B13': 'potting', 'B14': 'potting', 'B15': 'potting',
    'B16': 'stocktake', 'B17': 'stocktake', 'B18': 'stocktake',
    'B19': 'allocation', 'B20': 'allocation', 'B21': 'allocation', 'B22': 'allocation',
    'B23': 'history', 'B24': 'order',
}
# source types counted as "plan/stocktake/allocation/history" (i.e. not seed-log)
NON_SEEDLOG = lambda t: t != 'seedlog'

DOCX_LISTS = [
    ('5. Seasonal Planting Lists & Collection Schedule/2026 Autumn Plant Lists/Nursery plant names list.docx', 'docxlist'),
    ('2. Propagation (cuttings and seeds)/Helen Resources/Te Kakano restoration plant species.docx', 'reference'),
]


def src_path(rel):
    p = ROOT + rel
    stem, ext = os.path.splitext(rel)
    if os.path.exists(p) and ext.lower() not in ('.xls', '.doc'):
        return p
    for e in ('.xlsx', '.docx'):
        q = CONV + stem + e
        if os.path.exists(q):
            return q
    # also try conversion of original ext
    q = CONV + rel + 'x'
    return q if os.path.exists(q) else None


def col_letters(spec):
    return [c.strip() for c in re.split(r'[,;/ ]+', spec) if c.strip()]


def extract():
    rows = []
    errors = []
    sheets_done = 0
    cache = {}
    for f in sorted(glob.glob(DISC + '02_scouts/B*.json')):
        d = json.load(open(f))
        bid = d['batch_id'][:3]
        for fi in d['files']:
            for s in fi.get('sheets', []):
                spec = s.get('species_name_column')
                if not spec:
                    continue
                rel = fi['path']
                p = src_path(rel)
                if p is None:
                    errors.append((rel, s['name'], 'source not found'))
                    continue
                stype = BATCH_TYPE.get(bid, 'other')
                try:
                    if p.lower().endswith('.csv'):
                        with open(p, encoding='cp1252', newline='') as fh:
                            allrows = list(csv.reader(fh))
                        for ln, r in enumerate(allrows, 1):
                            if ln <= (s['header_row'] or 0):
                                continue
                            for L in col_letters(spec):
                                ci = openpyxl.utils.column_index_from_string(L) - 1
                                if ci < len(r) and r[ci].strip():
                                    rows.append((rel, s['name'], stype, bid, L, ln, r[ci]))
                        sheets_done += 1
                        continue
                    wb = cache.get(p)
                    if wb is None:
                        wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
                        cache = {p: wb}
                    if s['name'] not in wb.sheetnames:
                        errors.append((rel, s['name'], 'sheet not in workbook'))
                        continue
                    ws = wb[s['name']]
                    hdr = s['header_row'] or 0
                    letters = col_letters(spec)
                    idx = [openpyxl.utils.column_index_from_string(L) - 1 for L in letters]
                    top = max(idx) + 1
                    for ln, r in enumerate(ws.iter_rows(min_row=hdr + 1, max_row=MAX_ROW,
                                                         max_col=top, values_only=True), hdr + 1):
                        for L, ci in zip(letters, idx):
                            if ci < len(r):
                                v = r[ci]
                                if isinstance(v, str) and v.strip('  '):
                                    rows.append((rel, s['name'], stype, bid, L, ln, v))
                    sheets_done += 1
                except Exception as e:  # noqa
                    errors.append((rel, s['name'], repr(e)))
    # docx lists
    from docx import Document
    for rel, stype in DOCX_LISTS:
        p = src_path(rel)
        doc = Document(p)
        if doc.tables:
            t = doc.tables[0]
            for ri, r in enumerate(t.rows):
                if ri == 0:
                    continue
                cells = [c.text for c in r.cells]
                if cells[0].strip():
                    rows.append((rel, '(document table)', stype, 'B03', 'botanical', ri + 1, cells[0]))
                # keep common / Maori names alongside, to help scientific vs common crosswalk
                if len(cells) > 1 and cells[1].strip():
                    rows.append((rel, '(document table)', 'docxlist_common', 'B03', 'common', ri + 1, cells[1]))
                if len(cells) > 2 and cells[2].strip():
                    rows.append((rel, '(document table)', 'docxlist_maori', 'B03', 'maori', ri + 1, cells[2]))
        else:
            for pi, para in enumerate(doc.paragraphs):
                txt = para.text.replace(' ', ' ')
                if not txt.strip() or len(txt) > 90:
                    continue
                first = re.split(r'\t+', txt.strip())[0].strip()
                if re.search(r'\t+\s*(major|minor)\s*$', txt.strip(), re.I) or re.search(r'[A-Z][a-z]+ [a-z]{3,}', first):
                    rows.append((rel, '(document text)', stype, 'B03', 'line', pi + 1, first))
    os.makedirs(SCRATCH, exist_ok=True)
    with open(RAW_OUT, 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['file', 'sheet', 'source_type', 'batch', 'col', 'row', 'raw'])
        w.writerows(rows)
    print(f'extracted {len(rows)} cells from {sheets_done} sheets; {len(errors)} errors')
    for e in errors:
        print('ERR', e)



# ======================================================================
# Stage 2: normalise, group, count
# ======================================================================
import difflib

OUT_CSV = DISC + '04a_species_variants.csv'
OUT_TABLES = SCRATCH + 'census_tables.json'

# Reference vocabulary used ONLY for matching strings to groups.  It is not a ruling on
# accepted names: spellings here are just handles.  (genus, epithet) lower-case.
CANON = """
aristotelia fruticosa|aristotelia serrata|austroderia richardii|astelia fragrans|carex secta|carex buchananii|
carex maorica|carex virgata|carex comans|carex flagellifera|carex testacea|carmichaelia petriei|
carmichaelia crassicaulis|carmichaelia compacta|carmichaelia corrugata|carmichaelia kirkii|carmichaelia racemosa|
carmichaelia williamsii|carmichaelia australis|carmichaelia glabrescens|carpodetus serratus|celmisia lyallii|
celmisia ramulosa|chionochloa conspicua|chionochloa macra|chionochloa rigida|chionochloa rubra|clematis afoliata|
clematis marata|coprosma acerosa|coprosma atropurpurea|coprosma brunnea|coprosma cheesemanii|coprosma colensoi|
coprosma crassifolia|coprosma dumosa|coprosma foweraki|coprosma intertexta|coprosma linariifolia|coprosma lucida|
coprosma petriei|coprosma propinqua|coprosma pseudociliata|coprosma rhamnoides|coprosma rigida|
coprosma rotundifolia|coprosma rugosa|coprosma virescens|coprosma wallii|cordyline australis|corokia cotoneaster|
dacrycarpus dacrydioides|dacrydium cupressinum|discaria toumatou|dracophyllum longifolium|dracophyllum rosmarinifolium|
elaeocarpus hookerianus|elaeocarpus dentatus|fuchsia excorticata|fuscospora cliffortioides|fuscospora fusca|
fuscospora truncata|gaultheria antipoda|griselinia littoralis|halocarpus bidwillii|helichrysum aggregatum|
helichrysum intermedium|helichrysum lanceolatum|hoheria angustifolia|hoheria glabrata|hoheria populnea|
hoheria sexstylosa|juncus edgariae|kunzea ericoides|kunzea robusta|kunzea serotina|leptecophylla juniperina|leptospermum scoparium|
leucopogon fraseri|libertia peregrinans|lophomyrtus obcordata|lophozonia menziesii|melicope simplex|
melicytus alpinus|melicytus ramiflorus|metrosideros umbellata|metrosideros excelsa|metrosideros robusta|
muehlenbeckia astonii|muehlenbeckia axillaris|muehlenbeckia complexa|myrsine australis|myrsine divaricata|
neomyrtus pedunculata|olearia arborescens|olearia avicenniifolia|olearia bullata|olearia coreacea|
olearia fimbriata|olearia fragrantissima|olearia hectorii|olearia ilicifolia|olearia lineata|olearia nummulariifolia|
olearia odorata|olearia polita|ozothamnus leptophyllus|ozothamnus vauvilliersii|ozothamnus fulvidus|
parsonsia heterophylla|pennantia corymbosa|phormium cookianum|phormium tenax|phyllocladus alpinus|
phyllocladus trichomanoides|pimelea aridula|pittosporum eugenioides|pittosporum patulum|pittosporum tenuifolium|
plagianthus regius|poa cita|poa colensoi|podocarpus laetus|podocarpus nivalis|podocarpus totara|
prumnopitys ferruginea|prumnopitys taxifolia|pseudopanax arboreus|pseudopanax colensoi|pseudopanax crassifolius|
pseudopanax ferox|pseudowintera colorata|raukaua simplex|schefflera digitata|sophora microphylla|
sophora longicarinata|streblus heterophyllus|veronica biggarii|veronica cupressoides|veronica hectorii|
veronica odora|veronica propinqua|veronica rakaiensis|veronica salicifolia|veronica pauciramosa|
veronica pimeleoides|weinmannia racemosa|brachyglottis cassinoides|brachyglottis compacta|brachyglottis greyii|
acaena caesiglauca|aciphylla aurea|acrothamnus colensoi|agathis australis|melicytus ramiflorus|
muehlenbeckia compacta|myrsine nummulariifolia|metrosideros umbellata
""".replace('\n', '').split('|')
CANON = sorted({c.strip() for c in CANON if c.strip()})
CANON_GENERA = sorted({c.split()[0] for c in CANON})

# true taxonomic synonyms / old genus names (explicit, so they can be reported as synonym moves)
TYPO_GENUS = {'pimealia': 'pimelea', 'pimealea': 'pimelea', 'aristoderia': 'austroderia', 'astroderia': 'austroderia'}
GENUS_SYNONYM = {
    'hebe': 'veronica', 'leonohebe': 'veronica', 'leonehebe': 'veronica',
    'cyathodes': 'leptecophylla', 'cyathoides': 'leptecophylla', 'cyathodies': 'leptecophylla',
    'parsonia': 'parsonsia',
}
# epithet aliases inside a genus (spelling/gender forms)
EPITHET_ALIAS = {
    ('carpodetus', 'serrata'): 'serratus',
    ('prumnopitys', 'taxifolius'): 'taxifolia', ('primnopitys', 'taxifolius'): 'taxifolia',
    ('myrsine', 'nummularifolia'): 'nummulariifolia',
    ('podocarpus', 'taxifolius'): 'taxifolia',
}
# varieties / forms kept as separate groups (uncertain whether WRT treats them as the base species)
VARIETIES = {'racemosa': 'racemosa', 'cymbifolia': 'cymbifolia', 'demissa': 'demissa', 'oliga': 'oliga',
             'faucola': 'faucicola', 'faucicola': 'faucicola', 'cym': 'cymbifolia', 'ram': 'racemosa', 'race': 'racemosa', 'ra': 'racemosa', 'rac': 'racemosa'}

# common / Maori / part-scientific names -> (canonical or None, uncertain, note)
COMMON = {
    'kowhai': ('sophora microphylla', True, 'common name; could also be Sophora longicarinata/prostrata'),
    'totara': ('podocarpus totara', True, 'common name; Podocarpus totara vs P. laetus (mountain totara) not distinguished'),
    'matai': ('prumnopitys taxifolia', True, 'common name'),
    'kahikatea': ('dacrycarpus dacrydioides', False, 'common name'),
    'ti kouka': ('cordyline australis', False, 'Maori name'),
    'cabbage tree': ('cordyline australis', False, 'common name'),
    'toetoe': ('austroderia richardii', True, 'common name; toetoe can also mean other Austroderia/Cortaderia'),
    'broadleaf': ('griselinia littoralis', False, 'common name'),
    'matagouri': ('discaria toumatou', False, 'common name'),
    'korokio': ('corokia cotoneaster', False, 'Maori name'),
    'mingimingi': ('coprosma propinqua', True, 'common name; also used for other small-leaved Coprosma'),
    'wineberry': ('aristotelia serrata', False, 'common name'),
    'mountain wineberry': ('aristotelia fruticosa', False, 'common name'),
    'makomako': ('aristotelia serrata', False, 'Maori name'),
    'purei': ('carex secta', False, 'Maori name'),
    'putaputaweta': ('carpodetus serratus', False, 'Maori name'),
    'kotukutuku': ('fuchsia excorticata', False, 'Maori name'),
    'tree fuschia': ('fuchsia excorticata', False, 'common name, misspelt'),
    'pokaka': ('elaeocarpus hookerianus', False, 'Maori name'),
    'marbleleaf': ('carpodetus serratus', False, 'common name'),
    'lancewood': ('pseudopanax crassifolius', True, 'common name; lancewood could also be P. ferox (fierce lancewood)'),
    'mountain beech': ('fuscospora cliffortioides', False, 'common name'),
    'mt beech': ('fuscospora cliffortioides', True, 'abbreviated common name'),
    'mtn beech': ('fuscospora cliffortioides', True, 'abbreviated common name'),
    'red beech': ('fuscospora fusca', False, 'common name'),
    'silver beech': ('lophozonia menziesii', False, 'common name'),
    'hard beech': ('fuscospora truncata', False, 'common name'),
    'manuka': ('leptospermum scoparium', False, 'common name'),
    'mountain ribbonwood': ('hoheria glabrata', False, 'common name'),
    'mtn ribbonwood': ('hoheria glabrata', True, 'abbreviated common name'),
    'lowland ribbonwood': ('plagianthus regius', False, 'common name'),
    'rohutu': ('lophomyrtus obcordata', False, 'Maori name'),
    'weeping mapou': ('myrsine divaricata', False, 'common name'),
    'mountain totara': ('podocarpus laetus', True, 'common name'),
    'desert broom': ('carmichaelia petriei', False, 'common name'),
    'coral broom': ('carmichaelia crassicaulis var racemosa', True, 'common name'),
    'lowland flax': ('phormium tenax', False, 'common name'),
    'kohuhu': ('pittosporum tenuifolium', False, 'Maori name'),
    'koromiko': ('veronica salicifolia', True, 'common name; koromiko is applied to several Veronica'),
    'karamu': (None, True, 'common name; Coprosma robusta or other Coprosma - unresolved'),
    'rata': ('metrosideros umbellata', True, 'common name; southern rata vs northern rata (M. robusta) vs M. excelsa'),
    'rata row': ('metrosideros umbellata', True, 'common name with row tag'),
    'kanuka': ('kunzea ericoides', True, 'common name; Kunzea robusta/serotina/ericoides not distinguished'),
    'snow tussock': (None, True, 'common name; Chionochloa rigida / macra / other - unresolved'),
    'red tussock': ('chionochloa rubra', False, 'common name'),
    'tawhai raunui': ('fuscospora fusca', True, 'Maori name, red beech (medium confidence)'),
    'tawhai rauriki': ('fuscospora cliffortioides', True, 'Maori name, mountain beech (medium confidence)'),
    'weeping broom': (None, True, 'common name; species unresolved'),
    'broom': (None, True, 'common name; species unresolved'),
    'tauhinau': ('ozothamnus vauvilliersii', True, 'common name; Ozothamnus species not distinguished'),
}
NON_NZ_ORNAMENTAL = [r'apple tree', r'azealea', r'rhodo', r'hebe emerald', r'hebe james', r'whipcord hebe', r'gravilla']

LABEL_PATTERNS = [
    r'totals?', r'sub ?totals?', r'total by species', r'total plants', r'total number of plants allocated',
    r'stocktake total', r'total planted.*', r'plant names?.*', r'plant description', r'plant numbers', r'species',
    r'scientific name', r'notes:?', r'last updated.*', r'goal.*', r'cumulative.*', r'extras', r'misc',
    r'excess stock', r'numbers', r'values', r'sum of .*', r'date of stocktake.*', r'over / under', r'plus', r'good',
    r'neutral', r'missing', r'surplus', r'on hold,?', r'autumn planting season', r'seasonal site (notes|totals)',
    r'site id', r'landowner', r'maps', r'plant protection', r'threatened species count', r'trees > 5m',
    r'trees that count.*', r'total trees that count species', r'other species', r'shrub species', r'tree species',
    r'wetland species', r'wetland fringe species', r'moderate rainfall.*', r'still to plant.*', r'spring 20\d\d',
    r'requested by school', r'not listed to propagate', r'errors and omissions.*', r'example \d.*',
    r'these species.*', r'if above plants.*', r'plants below.*', r'so roughly.*', r'mix up .*',
    r'te kakano restoration plant species', r'ex te kakano', r'neills plants', r'20\d\d - \d+ trees funded',
    r'\d+ cardboard kits', r'big wool.*', r'cuttings/pieces', r'seedlings', r'self sown', r'weka poo!',
    r'red into t28.*', r'slope hill', r'other cop.*', r'stock required', r'upper', r'lower',
]
LABEL_RE = re.compile(r'^(' + '|'.join(LABEL_PATTERNS) + r')$', re.I)
ERR_RE = re.compile(r'^#(REF!|ERROR!|N/A|VALUE!|NAME\?|DIV/0!)$')
CODE_RE = re.compile(r'^([CS]|[CS]\s?\d[\w`, ]*(\(.*\))?\s*(seedlings)?)$', re.I)
DATE_NOTE_RE = re.compile(r'^(dated|updated|stocktake \d)', re.I)

import runpy as _rp
REDACT = _rp.run_path('/home/claude/_private/census_redact.py')['REDACT']  # redaction terms kept outside the shared folder
def redact(t):
    for p in REDACT:
        t = re.sub(p, '[redacted]', t, flags=re.I if p not in (r'\bHM\b', r'\bBT\b', r'\bAA\b') else 0)
    return t

def fold(s):
    s = unicodedata.normalize('NFKD', s)
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()

def esc(raw):
    return raw.replace('\t', '\\t').replace('\u00a0', '\\u00a0').replace('\n', '\\n').replace('\r', '\\r')

def close(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()

def match_genus(g):
    """returns (canonical genus, how, ratio) or None"""
    if g in GENUS_SYNONYM:
        return GENUS_SYNONYM[g], 'synonym', 1.0
    if g in TYPO_GENUS:
        return TYPO_GENUS[g], 'typo', 0.9
    if g in CANON_GENERA:
        return g, 'exact', 1.0
    best = max(CANON_GENERA + list(GENUS_SYNONYM), key=lambda x: close(g, x))
    r = close(g, best)
    if r >= 0.8:
        return GENUS_SYNONYM.get(best, best), 'typo', r
    return None

def epithets_of(genus):
    return [c.split()[1] for c in CANON if c.split()[0] == genus]

def match_epithet(genus, e):
    eps = epithets_of(genus)
    e = EPITHET_ALIAS.get((genus, e), e)
    if e in eps:
        return e, 'exact', 1.0
    if not eps:
        return None
    best = max(eps, key=lambda x: close(e, x))
    r = close(e, best)
    if r >= 0.8:
        return best, 'typo', r
    pre = [x for x in eps if x.startswith(e)] if len(e) >= 3 else []
    if len(pre) == 1:
        return pre[0], 'abbrev', 0.7
    if len(e) >= 4 and not pre:
        pre2 = [x for x in eps if x[0] == e[0] and close(e, x[:len(e)]) >= 0.74]
        if len(pre2) == 1:
            return pre2[0], 'abbrev', 0.7
    return None

def abbrev_search(g, e):
    """both tokens abbreviated, e.g. 'cop prop', 'car pet': unique prefix match across the vocabulary."""
    if len(g) < 3 or len(e) < 3:
        return None
    hits = [c for c in CANON if c.split()[0].startswith(g) and c.split()[1].startswith(e)]
    if len(hits) == 1:
        return hits[0]
    if not hits:
        hits = [c for c in CANON if c.split()[0].startswith(g) and close(e, c.split()[1][:len(e) + 1]) >= 0.8]
        if len(hits) == 1:
            return hits[0]
    return None

CONTESTED = {
    'carex maorica': 'Carex maorica vs Carex secta (the nursery sometimes calls a local form "oio"): same plant or not?',
    'carex secta': 'Carex secta: may include the local form written elsewhere as Carex maorica / "oio"',
    'coprosma dumosa': 'Coprosma dumosa vs C. tayloriae: written as "dumosa/tayloriae" in some lists',
    'kunzea ericoides': 'Kunzea: kanuka could be K. ericoides, K. robusta or K. serotina',
    'kunzea robusta': 'Kunzea: kanuka could be K. ericoides, K. robusta or K. serotina',
    'kunzea serotina': 'Kunzea: kanuka could be K. ericoides, K. robusta or K. serotina',
    'leptecophylla juniperina': 'Leptecophylla juniperina (also written Cyathodes/Cyathoides juniperina): one line or two?',
    'ozothamnus leptophyllus': 'Ozothamnus leptophyllus / vauvilliersii / fulvidus: one line or several?',
    'ozothamnus vauvilliersii': 'Ozothamnus leptophyllus / vauvilliersii / fulvidus: one line or several?',
    'ozothamnus fulvidus': 'Ozothamnus leptophyllus / vauvilliersii / fulvidus: one line or several?',
    'olearia nummulariifolia': 'Olearia nummulariifolia vs its variety cymbifolia',
    'carmichaelia crassicaulis': 'Carmichaelia crassicaulis vs variety racemosa ("coral broom") vs C. racemosa',
    'carmichaelia racemosa': 'Carmichaelia crassicaulis var racemosa vs C. racemosa: one species or two?',
    'veronica hectorii': 'Veronica hectorii vs variety demissa',
    'podocarpus laetus': 'Podocarpus laetus (mountain totara) vs P. totara: distinct, but common name "totara" blurs them',
    'metrosideros umbellata': 'Rata: M. umbellata vs M. robusta vs M. excelsa; "Rata (KPCA)" carries a site tag',
    'sophora microphylla': 'Kowhai: S. microphylla vs S. longicarinata (seen separately in seed logs)',
    'melicope simplex': 'Melicope simplex vs Raukaua simplex: same epithet, different genera; "Rakaua simplex" is probably Raukaua',
    'raukaua simplex': 'Melicope simplex vs Raukaua simplex: same epithet, different genera',
    'carex comans': 'Carex comans "red" may be a cultivar',
}

# groups that WRT might treat as one line (used only to give a low end of the "likely real" range)
MAYBE_SAME = [('carex maorica', 'carex secta'), ('carmichaelia crassicaulis', 'carmichaelia racemosa'),
              ('ozothamnus leptophyllus', 'ozothamnus vauvilliersii', 'ozothamnus fulvidus')]

# explicit handling of strings the generic rules cannot resolve (key = fold+ws-clean string)
OVERRIDES = {
    'ari ric': ('austroderia richardii', True, 'abbreviation; "Ari" is probably a slip for Aus(troderia)/Aris(toderia) richardii (low confidence)'),
    'carex sp unknown': (None, True, 'Carex, species unknown'),
    'carex unknown': (None, True, 'Carex, species unknown'),
    'carex new': (None, True, 'Carex (new): species not stated'),
    'carex comans red': ('carex comans', True, 'colour/cultivar tag "red"'),
    'matai miro': ('MULTI', True, 'two common names (matai / miro) in one cell'),
    'matai podocarpus taxifolia': ('prumnopitys taxifolia', True, 'matai with old genus Podocarpus'),
    'podocarpustaxifolius matai': ('prumnopitys taxifolia', True, 'matai with old genus Podocarpus; missing space'),
    'nothofagus mtn beech': ('fuscospora cliffortioides', True, 'old genus Nothofagus plus common name; mapped to mountain beech (medium confidence)'),
    'podocarpustaxifolius': ('prumnopitys taxifolia', True, 'matai written with old genus Podocarpus and no space'),
    'acaena bidibid': (None, True, 'Acaena; "Bidibid" is a common name, species not stated'),
    'fuchsia escortia': ('fuchsia excorticata', False, 'epithet misspelt'),
    'olearia cymbifolia': ('olearia nummulariifolia var cymbifolia', True, 'written as a species; usually a variety of O. nummulariifolia'),
}



def try_binomial(text):
    """Return (group_id, how, ratio, rest_tokens, extra_notes) if text starts with a recognisable binomial."""
    toks = [re.sub(r'[^a-z]', '', w) for w in fold(text).split()]
    toks = [w for w in toks if w]
    if len(toks) < 2:
        return None
    g, e, rest = toks[0], toks[1], toks[2:]
    notes = []
    gm = match_genus(g)
    if gm:
        genus, ghow, gr = gm
        if ghow == 'synonym':
            notes.append(f'old/synonym genus "{g}" -> grouped with {genus.capitalize()}')
        elif ghow == 'typo' and g != genus:
            notes.append('genus spelling variant')
        em = match_epithet(genus, e)
        if em:
            ep, ehow, er = em
            if ehow == 'typo' and ep != e:
                notes.append('epithet spelling variant')
            if ehow == 'abbrev':
                notes.append('abbreviated epithet')
            how = 'abbrev' if (ehow == 'abbrev') else ('typo' if 'typo' in (ghow, ehow) else ('synonym' if ghow == 'synonym' else 'exact'))
            ratio = min(gr, er)
            return f'{genus} {ep}', how, ratio, rest, notes
        # genus fine, epithet not in vocabulary
        hit = abbrev_search(g, e)
        if hit:
            return hit, 'abbrev', 0.7, rest, notes + ['abbreviation']
        if len(e) >= 2:
            return f'{genus} {e}?', 'unresolved_epithet', 0.0, rest, notes + [f'epithet "{e}" not in the reference vocabulary']
    hit = abbrev_search(g, e)
    if hit:
        return hit, 'abbrev', 0.7, rest, ['abbreviation (genus and epithet shortened)']
    return None


QUAL_WORDS = {'seedlings', 'seedling', 'duff', 'plants', 'split', 'plant'}

def classify(raw):
    """Classify one raw string.  Returns dict(kind, group, key, uncertain, notes[])."""
    notes = []
    if ' ' in raw:
        notes.append('non-breaking space')
    if '\t' in raw:
        notes.append('tab characters')
    if raw != raw.strip(' \t \n\r') and raw.strip():
        notes.append('leading/trailing whitespace')
    t = re.sub(r'\s+', ' ', raw.replace(' ', ' ')).strip()
    if ERR_RE.match(t):
        return dict(kind='error', group='(not a species)', key='', uncertain=False, notes=['formula error value'])
    if CODE_RE.match(t) and not re.match(r'^(Sophora|Schef|Scheff|Streb|Sop|Strebl)', t):
        return dict(kind='code', group='(not a species)', key='', uncertain=False, notes=['tray / seed code'])
    if DATE_NOTE_RE.match(t):
        return dict(kind='note', group='(not a species)', key='', uncertain=False, notes=['dated note'])
    tl = fold(t)
    if LABEL_RE.match(t):
        return dict(kind='label', group='(not a species)', key=tl, uncertain=False, notes=['header / total / label'])
    for p in NON_NZ_ORNAMENTAL:
        if re.search(p, tl):
            return dict(kind='other', group='(non-native / cultivar / other)', key=tl, uncertain=True,
                        notes=['ornamental, cultivar or non-native line; not matched to a native species'])
    uncertain = False
    threatened = False
    if t.startswith('#'):
        threatened = True
        t = t[1:].strip()
        notes.append('leading # (threatened-species marker in the Te Kakano list)')
    # stray brackets
    if t.count('(') > t.count(')') and ')' not in t:
        t = t + ')'
        notes.append('unclosed bracket')
    elif t.count(')') > t.count('('):
        t = t.replace(')', '').strip()
        notes.append('stray closing bracket')
    outer, inner = t, None
    m = re.match(r'^(.*?)\s*\((.*)\)\s*(.*)$', t)
    if m:
        outer, inner = (m.group(1) + ' ' + m.group(3)).strip(), m.group(2).strip()
    # trailing '?' and numbers (template cells like 'Aus ric   10   150')
    def strip_tail(x):
        nonlocal uncertain
        x2 = x
        while True:
            y = re.sub(r'(\s+(\d+|\?))+$', '', x2).strip()
            y = re.sub(r'\s*\?$', '', y).strip()
            y = re.sub(r'[,.]+$', '', y).strip()
            if y == x2:
                break
            x2 = y
        if x2 != x and '?' in x[len(x2):]:
            uncertain = True
            notes.append('question mark in source')
        return x2
    outer = strip_tail(outer)
    # dash tails: "Fuscospora truncata - Hard Beech"
    qual = []
    if ' - ' in outer or outer.endswith(' -'):
        left, _, right = outer.partition(' -')
        outer = left.strip()
        if right.strip():
            qual.append(right.strip())
    # trailing qualifier words
    ow = outer.split()
    while ow and fold(ow[-1]).strip('.,') in QUAL_WORDS:
        qual.insert(0, ow.pop())
    outer = ' '.join(ow)
    ow_f = re.sub(r'[^a-z ]', ' ', fold(outer))
    ow_f = re.sub(r'\s+', ' ', ow_f).strip()
    if ow_f.endswith(' sp') or ow_f.endswith(' spp'):
        base = ow_f.rsplit(' ', 1)[0]
        gm = match_genus(base.split()[0]) if base else None
        if gm and len(base.split()) == 1:
            notes.append('sp./spp. (species not stated)')
            return dict(kind='genus_only', group=f'{gm[0]} (genus only)', key=base, uncertain=True, notes=notes)
    # overrides on whole cleaned string
    ov = OVERRIDES.get(ow_f)
    if ov:
        grp, unc, note = ov
        if grp == 'MULTI':
            return dict(kind='multi', group='MULTI: ' + ow_f, key=ow_f, uncertain=True, notes=notes + [note])
        if grp is None:
            g0 = ow_f.split()[0]
            return dict(kind='genus_only', group=f'{match_genus(g0)[0]} (genus only)', key=ow_f, uncertain=True, notes=notes + [note])
        return dict(kind='species', group=grp, key=ow_f, uncertain=unc or uncertain, notes=notes + [note])
    # bracket content
    br_note = None
    if inner and re.search(r'/|\bor\b|&', inner):
        return dict(kind='multi', group='MULTI: ' + ow_f + ' (' + fold(inner) + ')', key=ow_f + ' ' + fold(inner), uncertain=True,
                    notes=notes + ['more than one taxon named in brackets'])
    if inner:
        bi = try_binomial(inner)
        if bi and bi[1] != 'unresolved_epithet':
            grp, how, ratio, rest, bn = bi
            kn = re.sub(r'[^a-z ]', ' ', fold(inner)); kn = re.sub(r'\s+', ' ', kn).strip()
            res = dict(kind='species', group=grp, key=' '.join(kn.split()[:2]), uncertain=uncertain or how in ('abbrev',) or ratio < 0.85,
                       notes=notes + bn + [f'common/other name outside brackets: "{redact(outer)}"' if outer else 'scientific name in brackets'])
            cm = COMMON.get(ow_f)
            if cm and cm[0] and cm[0].split(' var ')[0] != grp:
                res['uncertain'] = True
                res['notes'].append(f'common name "{ow_f}" normally means {cm[0]} - disagrees with bracketed name')
            return res
        br_note = f'bracket tag "({redact(inner)})" ignored (site/qualifier)'
        notes.append(br_note)
    # multi-taxon strings
    if re.search(r'/|\bor\b|&|\band\b|\binc\.', outer, re.I) and not re.match(r'^rata row', ow_f):
        return dict(kind='multi', group='MULTI: ' + ow_f, key=ow_f, uncertain=True, notes=notes + ['more than one taxon named in one cell'])
    # common names (progressively shorten)
    wtoks = ow_f.split()
    first_is_genus = bool(wtoks) and bool(match_genus(wtoks[0])) and len(wtoks) >= 1 and len(wtoks[0]) >= 4 and wtoks[0] not in COMMON
    if not first_is_genus:
        for n in range(len(wtoks), 0, -1):
            kk = ' '.join(wtoks[:n])
            if kk in COMMON:
                grp, unc, cnote = COMMON[kk]
                extra = ' '.join(wtoks[n:])
                nn = notes + [cnote]
                if extra:
                    nn.append(f'extra words: "{redact(extra)}"')
                if grp is None:
                    return dict(kind='common_unresolved', group=f'(common name, unresolved) {kk}', key=kk, uncertain=True, notes=nn)
                return dict(kind='common', group=grp, key=kk, uncertain=unc or uncertain, notes=nn)
    # binomial / abbreviation
    if len(wtoks) >= 1:
        bi = try_binomial(outer)
        if bi:
            grp, how, ratio, rest, bn = bi
            rest = [r for r in rest if r]
            var = None
            if rest:
                if rest[0] in ('var', 'v') and len(rest) > 1:
                    vv = rest[1]
                    var = VARIETIES.get(vv) or (difflib.get_close_matches(vv, list(VARIETIES.values()), 1, 0.7) or [vv])[0]
                    rest = rest[2:]
                elif rest[0] in VARIETIES:
                    var = VARIETIES[rest[0]]
                    rest = rest[1:]
            bk = fold(outer)
            bk = re.sub(r'[^a-z ]', ' ', bk); bk = re.sub(r'\s+', ' ', bk).strip()
            key = ' '.join(bk.split()[:2]) + (f' var {var}' if var else '')
            if var:
                grp = f'{grp} var {var}'
                bn.append(f'variety "{var}" kept as its own group')
            if rest:
                bn.append(f'extra words: "{redact(" ".join(rest))}"')
            if qual:
                bn.append('qualifier: ' + redact(' '.join(qual)))
            unc = uncertain or how in ('unresolved_epithet',) or (how == 'typo' and ratio < 0.85) or bool(var)
            kind = 'species' if how != 'unresolved_epithet' else 'species_unresolved'
            return dict(kind=kind, group=grp, key=key, uncertain=unc, notes=notes + bn, how=how)
    # genus only
    if len(wtoks) >= 1:
        gm = match_genus(wtoks[0])
        if gm and len(wtoks[0]) >= 4 and len(wtoks) <= 2:
            n2 = notes + ['genus only (no species given)']
            if len(wtoks) == 2:
                n2.append(f'second word "{wtoks[1]}" not a usable epithet')
            if gm[1] == 'synonym':
                n2.append(f'old/synonym genus "{wtoks[0]}"')
            return dict(kind='genus_only', group=f'{gm[0]} (genus only)', key=wtoks[0], uncertain=True, notes=n2)
    # nothing matched
    kind = 'note' if (len(t) > 45 or re.search(r'\d', t)) else 'unclassified'
    return dict(kind=kind, group='(not a species)' if kind == 'note' else f'(unclassified) {tl}', key=tl, uncertain=kind != 'note', notes=notes + ['not recognised as a plant name'])



SPECIES_KINDS = ('species', 'species_unresolved', 'common', 'genus_only', 'multi', 'common_unresolved', 'other')
REAL_KINDS = ('species', 'common')          # "species-level" groups (counted as likely real species)

def short_file(rel):
    b = os.path.splitext(os.path.basename(rel))[0].strip()
    return b[:48]

# key current lists for the "93 vs 97" table: (label, file substring, sheet exact or None, source_type filter or None)
KEY_LISTS = [
    ('Nursery plant names list.docx (2026) - botanical column', 'Nursery plant names list.docx', None, 'docxlist'),
    ('Standard Annual Plant List (Neill) MASTER - Sheet1', 'Standard Annual Plant List for JMN (Neill) MASTER.xlsx', 'Sheet1', None),
    ('_JMN Plants Out Master - Master Plant List', '_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx', 'Master Plant List', None),
    ('_JMN Plants Out Master - MASTER (planting history)', '_MASTER Nursery records and templates/_JMN Plants Out Master.xlsx', 'MASTER', None),
    ('Autumn 2026 allocation master - "Autumn 2026" sheet', 'JMN Plant Allocation Master AUTUMN 2026.xlsx', 'Autumn 2026', None),
    ('Autumn 2026 allocation master - all sheets combined', 'JMN Plant Allocation Master AUTUMN 2026.xlsx', '*', None),
    ('Spring 2026 allocations - "Plant Allocations" sheet', '_JMN Plant Allocations Spring 2026.xlsx', 'Plant Allocations ', None),
    ('Spring 2026 allocations - all sheets combined', '_JMN Plant Allocations Spring 2026.xlsx', '*', None),
    ('_Stocktake Master CURRENT - Autumn 2026 Master Stocktake', '_Stocktake Master CURRENT.xlsx', 'Autumn 2026 Master Stocktake', None),
    ('_Stocktake Master CURRENT - Stage 4 Stocktake Sheet', '_Stocktake Master CURRENT.xlsx', 'Stage 4 Stocktake Sheet', None),
    ('2026-27 Potting On - Summary', '2. 2026-27 JMN Potting On', 'Summary', None),
    ('2026-27 Potting On - Helen Master', '2. 2026-27 JMN Potting On', 'Helen Master', None),
    ('_Pricking out 2026-27 - Sheet1', '_Pricking out 2026-27 for potting 27-28', 'Sheet1', None),
    ('_Pricking out 2026-27 - Sheet2', '_Pricking out 2026-27 for potting 27-28', 'Sheet2', None),
    ('Seed Sowing 2026 (seed-log type)', 'Seed Sowing /Seed Sowing 2026 .xlsx', '*', None),
    ('Forecasting 2026_2027 - KEYSTONE SITES', '_JMN PLANT Forecasting 2026_2027.xlsx', 'KEYSTONE SITES', None),
    ('Forecasting 2026_2027 - Template', '_JMN PLANT Forecasting 2026_2027.xlsx', 'Template', None),
    ('Forecasting 2026_2027 - SUMMARY', '_JMN PLANT Forecasting 2026_2027.xlsx', 'SUMMARY', None),
    ('Forecasting 2026_2027 - 3 Year Look Ahead (Keystone)', '_JMN PLANT Forecasting 2026_2027.xlsx', '3 Year Plant Look Ahead (Keystone Sites)', 'prefix'),
    ('Master plant list 2024 (earlier list)', '1. Forecasting/Archive to sort through/Master plant list 2024.xlsx', 'Sheet1', None),
]


def build():
    cells = list(csv.DictReader(open(RAW_OUT, encoding='utf-8')))
    cells = [c for c in cells if c['source_type'] not in ('docxlist_common', 'docxlist_maori')] + \
            [c for c in cells if c['source_type'] in ('docxlist_common', 'docxlist_maori')]
    main_cells = [c for c in cells if c['source_type'] not in ('docxlist_common', 'docxlist_maori')]
    cls = {}
    for raw in {c['raw'] for c in main_cells}:
        cls[raw] = classify(raw)

    # --- per raw string aggregates
    agg = {}
    for c in main_cells:
        a = agg.setdefault(c['raw'], dict(n=0, nonseed=0, files=collections.Counter(), types=set()))
        a['n'] += 1
        if c['source_type'] != 'seedlog':
            a['nonseed'] += 1
        a['files'][short_file(c['file'])] += 1
        a['types'].add(c['source_type'])

    # --- group labels: most used clean spelling (non seed-log first)
    by_group = collections.defaultdict(list)
    for raw, k in cls.items():
        by_group[k['group']].append(raw)
    label = {}
    for g, raws in by_group.items():
        if k_is_special(g):
            label[g] = g[:1].upper() + g[1:]
            continue
        want = 4 if ' var ' in g else 2
        cand = [r for r in raws if cls[r]['kind'] in ('species', 'species_unresolved')
                and len(cls[r]['key'].split()) == want and cls[r].get('how') != 'abbrev']
        if cand:
            best = max(cand, key=lambda r: (agg[r]['nonseed'], agg[r]['n'], cls[r]['key'] == g, cls[r].get('how') == 'exact'))
            lab = cls[best]['key']
        else:
            lab = g
        label[g] = lab[:1].upper() + lab[1:]

    # --- collapse non-species noise
    rows = []
    collapsed = {}
    for raw, k in sorted(cls.items(), key=lambda kv: (-agg[kv[0]]['n'], kv[0])):
        a = agg[raw]
        if k['kind'] in ('code', 'error') or (k['kind'] == 'note') or (k['kind'] == 'unclassified'):
            name = {'code': '[tray / seed code such as C123 or S45 - collapsed]',
                    'error': '[spreadsheet error value (#REF! / #ERROR!) - collapsed]',
                    'note': '[free-text note or dated stamp - collapsed]',
                    'unclassified': '[unrecognised short text - collapsed]'}[k['kind']]
            d = collapsed.setdefault(name, dict(n=0, nonseed=0, files=collections.Counter(), types=set(), distinct=0, kind=k['kind']))
            d['n'] += a['n']; d['nonseed'] += a['nonseed']; d['files'].update(a['files']); d['types'] |= a['types']; d['distinct'] += 1
            continue
        note = '; '.join(dict.fromkeys(k['notes']))
        note = redact(note)
        if k['kind'] in ('species', 'species_unresolved', 'common', 'genus_only', 'multi', 'common_unresolved', 'other'):
            g = k['group']
            gl = label.get(g, g)
            base = g.split(' var ')[0]
            if base in CONTESTED:
                k['uncertain'] = True
                note = (note + '; ' if note else '') + 'GROUP CONTESTED: ' + CONTESTED[base]
            # old genus names the user asked to see flagged
            if ' juniperina' in raw.lower() and raw.lower().strip().startswith('cyath'):
                k['uncertain'] = True
        else:
            gl = g = k['group']
        note = (note + '; ' if note else '') + f'non-seed-log occurrences: {a["nonseed"]}'
        fl = [f for f, _ in a['files'].most_common()]
        files = ';'.join(fl[:10]) + (f';(+{len(fl) - 10} more)' if len(fl) > 10 else '')
        rows.append(dict(raw_string=redact(esc(raw)), normalised_key=redact(k['key']), proposed_group=gl, occurrences=a['n'],
                         files=files, source_types=';'.join(sorted(a['types'])), uncertain='Y' if k['uncertain'] else 'N', note=note))
    for name, d in collapsed.items():
        fl = [f for f, _ in d['files'].most_common()]
        rows.append(dict(raw_string=name, normalised_key='', proposed_group='(not a species)', occurrences=d['n'],
                         files=';'.join(fl[:10]) + (f';(+{len(fl) - 10} more)' if len(fl) > 10 else ''),
                         source_types=';'.join(sorted(d['types'])), uncertain='N',
                         note=f'{d["distinct"]} distinct strings collapsed (not listed, may hold sensitive detail); non-seed-log occurrences: {d["nonseed"]}'))
    rows.sort(key=lambda r: (r['proposed_group'].startswith('('), r['proposed_group'].lower(), -r['occurrences']))
    with open(OUT_CSV, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['raw_string', 'normalised_key', 'proposed_group', 'occurrences', 'files',
                                           'source_types', 'uncertain', 'note'])
        w.writeheader(); w.writerows(rows)

    # --- per-list tables
    def sel(entry):
        lab, fsub, sheet, extra = entry
        out = []
        for c in main_cells:
            if fsub not in c['file']:
                continue
            if sheet == '*' or sheet is None:
                pass
            elif extra == 'prefix':
                if not c['sheet'].startswith(sheet[:25]):
                    continue
            elif c['sheet'] != sheet:
                continue
            if extra and extra != 'prefix' and c['source_type'] != extra:
                continue
            if 'archive/' in c['file'] and 'Plants Out Master' in fsub and not c['file'].startswith('_MASTER Nursery records and templates/_JMN'):
                continue
            out.append(c)
        return out

    tables = []
    members = {}
    for entry in KEY_LISTS:
        cc = sel(entry)
        raws_all = [c['raw'] for c in cc]
        sp = [r for r in raws_all if cls[r]['kind'] in SPECIES_KINDS]
        real = [r for r in sp if cls[r]['kind'] in REAL_KINDS]
        genus_only = [r for r in sp if cls[r]['kind'] == 'genus_only']
        other_sp = [r for r in sp if cls[r]['kind'] in ('multi', 'species_unresolved', 'common_unresolved', 'other')]
        groups = {cls[r]['group'] for r in real}
        unc_groups = {cls[r]['group'] for r in real if cls[r]['uncertain']}
        keys = {cls[r]['key'] for r in real}
        distinct_raw = set(real)
        tables.append(dict(
            list=entry[0], file=entry[1], sheet=entry[2], cells_all=len(raws_all),
            cells_species_level=len(real), cells_genus_only=len(genus_only), cells_other_plant_like=len(other_sp),
            non_species=len(raws_all) - len(sp),
            distinct_raw=len(distinct_raw), distinct_keys=len(keys), groups=len(groups), groups_uncertain=len(unc_groups),
            sheets=len({(c['file'], c['sheet']) for c in cc})))
        members[entry[0]] = sorted(groups)
    # likely real species per list (varieties folded into their parent species)
    for t, entry in zip(tables, KEY_LISTS):
        gs = set(members[entry[0]])
        parents = {g.split(' var ')[0] for g in gs}
        t['likely_real'] = len(parents)
        low = len(parents)
        for pair in MAYBE_SAME:
            low -= max(0, len([x for x in pair if x in parents]) - 1)
        t['likely_low'] = low
    overall = overall_stats(main_cells, cls, agg, label)
    json.dump(dict(tables=tables, members={k: [label.get(g, g) for g in v] for k, v in members.items()}, overall=overall),
              open(OUT_TABLES, 'w'), indent=1)
    kinds = collections.Counter(k['kind'] for k in cls.values())
    print('distinct raw strings:', len(cls), dict(kinds))
    print('variant rows written:', len(rows), '->', OUT_CSV)
    for t in tables:
        print(t['list'][:62].ljust(62), t['cells_all'], t['cells_species_level'], t['distinct_raw'], t['distinct_keys'], t['groups'], t['groups_uncertain'], t['sheets'])



def overall_stats(main_cells, cls, agg, label):
    o = {}
    o['cells_by_type'] = dict(collections.Counter(c['source_type'] for c in main_cells))
    o['sheets_read'] = len({(c['file'], c['sheet']) for c in main_cells})
    o['files_read'] = len({c['file'] for c in main_cells})
    o['distinct_raw'] = len(cls)
    o['kinds_distinct_raw'] = dict(collections.Counter(k['kind'] for k in cls.values()))
    o['kinds_cells'] = dict(collections.Counter(cls[c['raw']]['kind'] for c in main_cells))
    plant = ('species', 'species_unresolved', 'common', 'genus_only', 'multi', 'common_unresolved', 'other')
    sp = {r for r, k in cls.items() if k['kind'] in REAL_KINDS}
    o['species_level_distinct_raw'] = len(sp)
    o['species_level_keys'] = len({cls[r]['key'] for r in sp})
    grp_all = {cls[r]['group'] for r in sp}
    grp_non = {cls[r]['group'] for r in sp if agg[r]['nonseed'] > 0}
    o['species_level_groups'] = len(grp_all)
    o['species_level_groups_nonseedlog'] = len(grp_non)
    o['groups_seedlog_only'] = sorted(label.get(g, g) for g in grp_all - grp_non)
    o['groups_with_parent_fold'] = len({g.split(' var ')[0] for g in grp_all})
    o['groups_nonseedlog_with_parent_fold'] = len({g.split(' var ')[0] for g in grp_non})
    # nonseed groups appearing only on one source type
    gt = collections.defaultdict(set)
    for c in main_cells:
        k = cls[c['raw']]
        if k['kind'] in REAL_KINDS and c['source_type'] != 'seedlog':
            gt[label.get(k['group'], k['group'])].add(c['source_type'])
    o['groups_by_nonseed_type'] = {g: sorted(t) for g, t in gt.items() if len(t) <= 2}
    o['genus_only_distinct_raw'] = sum(1 for k in cls.values() if k['kind'] == 'genus_only')
    o['multi'] = [esc(r)[:60] for r, k in cls.items() if k['kind'] == 'multi' and not LABEL_RE.match(r.strip())]
    # variants per group
    vg = collections.defaultdict(set)
    for r in sp:
        vg[label.get(cls[r]['group'], cls[r]['group'])].add(r)
    o['groups_with_2plus_raw'] = sum(1 for v in vg.values() if len(v) > 1)
    o['top_variant_groups'] = sorted(((g, len(v)) for g, v in vg.items()), key=lambda x: -x[1])[:15]
    # categories (distinct raw strings, species-level + genus-only)
    pool = [r for r, k in cls.items() if k['kind'] in plant]
    def cnt(pred):
        return sum(1 for r in pool if pred(r, cls[r]))
    o['cat_whitespace_nbsp'] = cnt(lambda r, k: ' ' in r)
    o['cat_whitespace_tab'] = cnt(lambda r, k: '\t' in r)
    o['cat_whitespace_edge'] = cnt(lambda r, k: r != r.strip(' \t ') )
    o['cat_nonascii_letters'] = cnt(lambda r, k: any(ord(ch) > 127 and ch != ' ' and ch not in '’–…' for ch in r))
    o['cat_abbrev'] = cnt(lambda r, k: k.get('how') == 'abbrev')
    o['cat_old_genus_synonym'] = cnt(lambda r, k: any('old/synonym genus' in n for n in k['notes']))
    o['cat_bracket_tag'] = cnt(lambda r, k: any(n.startswith('bracket tag') for n in k['notes']))
    o['cat_bracket_latin'] = cnt(lambda r, k: any(n.startswith('common/other name outside') or n.startswith('scientific name in brackets') for n in k['notes']))
    o['cat_common_name'] = cnt(lambda r, k: k['kind'] in ('common', 'common_unresolved'))
    o['cat_question_mark'] = cnt(lambda r, k: any('question mark' in n for n in k['notes']))
    o['cat_sp_spp'] = cnt(lambda r, k: any('sp./spp.' in n for n in k['notes']))
    o['cat_stray_bracket'] = cnt(lambda r, k: any('bracket' in n and ('stray' in n or 'unclosed' in n) for n in k['notes']))
    o['cat_threatened_hash'] = cnt(lambda r, k: any('leading #' in n for n in k['notes']))
    o['cat_typo_variants'] = cnt(lambda r, k: any('spelling variant' in n for n in k['notes']))
    o['cat_variety'] = cnt(lambda r, k: ' var ' in k['group'])
    # case-only collisions
    byfold = collections.defaultdict(set)
    for r in pool:
        byfold[re.sub(r'\s+', ' ', r.replace(' ', ' ')).strip().lower()].add(r)
    o['strings_differing_only_by_case_or_space'] = sum(len(v) for v in byfold.values() if len(v) > 1)
    o['clean_forms_with_case_or_space_variants'] = sum(1 for v in byfold.values() if len(v) > 1)
    o['case_only_pairs'] = sum(1 for v in byfold.values() if len({re.sub(r'\s+', ' ', x.replace(' ', ' ')).strip() for x in v}) > 1)
    # uncertain groups list
    unc = collections.defaultdict(int)
    for r in pool:
        if cls[r]['uncertain']:
            unc[label.get(cls[r]['group'], cls[r]['group'])] += 1
    o['uncertain_strings'] = sum(unc.values())
    o['uncertain_groups'] = len(unc)
    return o



def explain():
    """Reproducible evidence for the 93-vs-97 discussion: block structure and repeats inside each key list."""
    cells = [c for c in csv.DictReader(open(RAW_OUT, encoding='utf-8'))
             if c['source_type'] not in ('docxlist_common', 'docxlist_maori')]
    cls = {r: classify(r) for r in {c['raw'] for c in cells}}
    out = {}
    for entry in KEY_LISTS:
        lab_, fsub, sheet, extra = entry
        if sheet == '*':
            continue
        cc = []
        for c in cells:
            if fsub not in c['file']:
                continue
            if extra == 'prefix':
                if not c['sheet'].startswith(sheet[:25]):
                    continue
            elif sheet is not None and c['sheet'] != sheet:
                continue
            if extra and extra != 'prefix' and c['source_type'] != extra:
                continue
            cc.append(c)
        recs = sorted(((int(c['row']), c['raw'].strip(), cls[c['raw']]) for c in cc), key=lambda x: x[0])
        sp = [(r, raw, k) for r, raw, k in recs if k['kind'] in REAL_KINDS]
        gmap = collections.defaultdict(list)
        for r, raw, k in sp:
            gmap[k['group']].append((r, raw))
        main_end = [r for r, raw, k in sp if k['group'] == 'weinmannia racemosa']
        entry_out = dict(rows=len(sp), first_row=sp[0][0] if sp else None, last_row=sp[-1][0] if sp else None,
                         weinmannia_row=main_end[0] if main_end else None,
                         repeats={g: v for g, v in gmap.items() if len(v) > 1},
                         after_weinmannia=[(r, raw) for r, raw, k in sp if main_end and r > main_end[0]],
                         non_species=[(r, raw) for r, raw, k in recs if k['kind'] not in REAL_KINDS and k['kind'] != 'code'])
        out[lab_] = entry_out
    # set differences between the two reference lists
    def groups_of(l):
        return {g for g in (cls[c['raw']]['group'] for c in cells if l[1] in c['file'] and (l[2] is None or c['sheet'] == l[2])
                            and cls[c['raw']]['kind'] in REAL_KINDS)}
    docx, std = groups_of(KEY_LISTS[0]), groups_of(KEY_LISTS[1])
    out['_diff_docx_vs_standard'] = dict(only_docx=sorted(docx - std), only_standard=sorted(std - docx), both=len(docx & std))
    json.dump(out, open(SCRATCH + 'census_explain.json', 'w'), indent=1, default=str)
    print('explain written', SCRATCH + 'census_explain.json')


def k_is_special(g):
    return g.startswith('(') or g.startswith('MULTI') or g.endswith('(genus only)')



if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if mode in ('extract', 'all'):
        extract()
    if mode in ('build', 'all'):
        build()
    if mode in ('explain', 'all'):
        explain()
