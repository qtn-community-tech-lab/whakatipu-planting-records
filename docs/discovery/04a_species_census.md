# S4a — Species name census

Specialist: S4a (species name census) for the WRT data discovery. Read-only on the source files. British English.

Companion files:
- `04a_species_variants.csv` — one row per distinct string found in a species column (820 rows; 8 columns as agreed).
- `scripts/species_census.py` — the extraction and grouping script (`python3 species_census.py all`). It reads the species column that each scout named, over the data rows, in every sheet. It does not use the scouts' samples.

## 1. What was read

| Item | Count |
|---|---|
| Source files opened (spreadsheets, one CSV, two Word documents) | 106 |
| Sheets read (every sheet where a scout named a species column) | 304 |
| Non-blank text cells read from species columns (docx common-name and Māori-name columns not counted) | 42,576 |
| of which in seed/cutting logs ("seed-log" type) | 18,790 (44%) |
| of which in forecasts, plans, potting-on, stocktakes, allocations, planting history, master lists, orders and reference lists ("non-seed-log" types) | 23,786 |
| Distinct raw strings | 1,799 |
| of which are not plant names (tray/seed codes, headings, totals, notes, error values) | 1,070 |
| of which are plant-like (species, common names, genus only, mixed) | 729 |
| Species-level distinct strings (a species or a common name that points at one) | 664 |
| Distinct spellings once case, spaces, brackets, tails and qualifiers are removed (`normalised_key`) | 368 |
| Proposed groups at species level | 160 (156 if varieties are folded into their parent species) |
| of which also appear outside the seed logs | 133 |
| Proposed groups that only appear in seed-log sheets | 27 |

How the count works (so it can be checked):
- "Raw rows" means non-blank text cells in the species column, from the row after the header to the end of the sheet. Totals, headings, spreadsheet errors and tray codes are counted separately as "not a species".
- `Source type` is taken from the scout batch: `forecast`, `masterlist`, `plan` (pricking-out and propagation lists), `potting`, `stocktake`, `allocation`, `history` (Plants Out Master), `order`, `docxlist`, `reference` (Te Kakano list) and `seedlog`. Use the `source_types` column in the CSV to read the census with or without seed-log noise. The `note` column also gives the non-seed-log occurrence count for each string.
- The group name in `proposed_group` is only a handle. It is the spelling typed most often (non-seed-log sources first). It is not a ruling on the accepted name. Several handles are themselves misspellings (see section 5).
- Free-text notes, dated stamps and tray codes are collapsed into single rows in the CSV. They are not listed one by one, because some contain seed-source or personal detail. A few cultivar or source tags inside species strings were replaced with `[redacted]`, because they look like seed-source or personal names.

## 2. Headline findings

1. **The "97" and the "93" are probably both real, and they count different things** (confidence: low to medium; the arithmetic is exact, the reading of it is an inference).
   - The core master list holds 98 rows. `Standard Annual Plant List for JMN (Neill) MASTER.xlsx › Sheet1 › B4:B101`, `_JMN Plants Out Master.xlsx › Master Plant List › D4:D101`, the 2026-27 pricking-out workbook, and the 2026-27 forecasting workbook all carry the same 98 rows. One species is entered twice: once under its old genus (`Leonohebe cupressoides`, B47) and once as `Veronica cupressoides` (B95). Merged, that is **97 species**.
   - `Nursery plant names list.docx` has 97 rows (table rows 2–98). After removing four re-entries it gives **93**. After also merging the two cupressoides rows it gives **92**. The ladder is in section 4.
2. **There is a common core of 97 species that every current planning list shares.** The docx list differs from it: nine core species are missing from the docx and four species are in the docx but not in the core.
3. **Current lists copy the same misspellings.** In every current list the most frequent spelling is not the standard one: `Weinmania racemosa`, `Scheflera digitata`, `Parsonia heterophylla`, `Leonohebe cuppressoides`, `Rakaua simplex`, `Prumnopitys taxifolius`, `Coprosma brunea`. Any lookup against a clean species table will miss these unless variants are mapped.
4. **Variants are widespread but mostly simple.** The 664 species-level strings collapse into 368 distinct spellings and then into 160 groups. Typos (142 strings), abbreviations (97), trailing or odd whitespace (217), old genus names (24) and names with brackets (36) make up most of the difference. No macrons or other diacritics occur in any species column (0 strings), so Māori names are written without them (`Kowhai`, `Ti kouka`).
5. **Seed-log species columns are the noisy ones.** The "Seed & Cutting results" sheets use column A for species headings and tray codes together. 8,937 cells in that column are codes such as C123 or S45, not species. In the plan, stocktake and allocation lists the species cells are clean apart from the shared misspellings above.
6. **Spreadsheet structure affects the counts.** In `_Pricking out 2026-27 for potting 27-28 .xlsx › Sheet1`, the TOTAL row is A100 with `=SUM(C2:C99)` in C100, and `Weinmania racemosa` sits below it at A101 with `?` in C101. That row is outside the total (confidence: high for the formula range, medium that it is unintended).

## 3. Variant types found

Counts are distinct raw strings among the 729 plant-like strings. A string can fall in more than one type.

| Type | Strings | Example (as written) | Where |
|---|---|---|---|
| Spelling errors in genus or epithet | 142 | `Aristolia fruiticosa`, `Coprosma brunea`, `Weinmania racemosa` | Everywhere; the three examples are in current lists |
| Abbreviations (genus and epithet shortened) | 97 | `Cop prop`, `Pho ten`, `Ole fim` | Template-style rows with quantities after the name; `Coprosma prop`, `Pittosporum eug` in the seed logs |
| Leading, trailing or tab whitespace | 217 | `Carex secta\t\t`, `Halocarpus bidwillii ` | All source types |
| Non-breaking spaces inside or after names | 26 | `Plagianthus  regius`, `Coprosma dumosa` | Seed records, Standard list B77 |
| Case differences only | 6 clean forms | `Carex Maorica` / `Carex maorica`, `Hebe Salicifolia` | Seed logs and stocktakes |
| Old or synonym genus (Hebe, Leonohebe, Leonehebe, Cyathodes, Cyathoides, Parsonia) | 24 | `Hebe salicifolia`, `Leonohebe cupressoides`, `Cyathoides juniperina` | Current lists have `Leonohebe`, `Cyathoides` and `Parsonia` |
| Latin name inside brackets with a common name outside | 30 | `Kowhai (Sophora microphylla)`, `Matagouri (Discaria toumatou)` | Te Kakano reference list |
| Site or qualifier tag in brackets | 6 | `Carex maorica (Slope Hill)`, `Carex Maorica (Slope Hill Trial)`, `Rata (KPCA)` | Seed logs, docx list row 98, stocktake B108 |
| Stray or unclosed bracket | 3 | `Ozothamnus leptophyllus)`, `Toetoe (Austrodieria richardii` | Standard list B68–B69 |
| Common or Māori name used alone | 24 | `Kowhai`, `Rata`, `Matai`, `Toetoe`, `Kanuka` | Mostly seed logs and the reference list |
| Genus only (including "sp.", "spp.") | 40 | `Hoheria`, `Carmichaelia`, `Coprosma sp.` | Seed logs |
| More than one taxon in a cell | 11 | `Coprosma dumosa/tayloriae`, `Olearia fimbriata / virgata?` | Forecast site sheets, seed logs |
| Variety kept as its own line | 13 | `Olearia nummulariifolia var cymbifolia`, `Veronica hectorii v demissa` | Seed logs |
| Question mark in the source | 12 | `Olearia lineata ?`, `Hoheria ?` | Seed logs |
| Leading `#` (threatened-species marker) | 11 | `#Olearia lineata` | Te Kakano reference list only |
| Cultivars, ornamentals or non-native lines | 7 | `Hebe Emerald Green`, `Rhodo?` | Seed records |

Groups with the most written variants (distinct strings): Prumnopitys taxifolius / matai (13), Olearia fimbriata (13), Sophora microphylla / kowhai (13), Austroderia richardii / toetoe (13), Fuscospora cliffortioides / mountain beech (13), Coprosma propinqua (12), Olearia lineata (12), Veronica cupressoides (12). Evidence: `04a_species_variants.csv`, filter on `proposed_group`.

## 4. The "93 vs 97" table

Each row is one list in the current (2026) set, plus two earlier lists for comparison. Columns:
- **Raw rows**: species-name cells in the list, excluding totals, headings and error cells.
- **Distinct strings**: different raw strings among those rows.
- **After normalisation**: distinct spellings once whitespace, case, brackets and tails are removed.
- **Proposed groups**: distinct groups after merging typos, abbreviations, old genus names and common names.
- **Likely real species**: a range. The upper figure is the proposed groups. The lower figure also treats three contested sets as one line each (Carex maorica with Carex secta, Carmichaelia crassicaulis with Carmichaelia racemosa, and the Ozothamnus leptophyllus / vauvilliersii / fulvida set), where those sets appear in the list.

| List (evidence range) | Raw rows | Distinct strings | After normalisation | Proposed groups | Likely real species |
|---|---|---|---|---|---|
| `Nursery plant names list.docx` (2026), table col 1, rows 2–98 | 97 | 95 | 95 | 92 | 91–92 |
| `_MASTER Nursery records and templates/Standard Annual Plant List for JMN (Neill) MASTER.xlsx › Sheet1 › B4:B101` plus stray B107:B108 | 100 (98 + 2) | 100 | 100 | 99 (97 + 2) | 97–99 |
| `_JMN Plants Out Master.xlsx › Master Plant List › D4:D101` | 98 | 98 | 98 | 97 | 95–97 |
| `JMN Plant Allocation Master AUTUMN 2026.xlsx › Autumn 2026 › C6:C119` | 114 | 114 | 114 | 112 | 110–112 |
| `_JMN Plant Allocations Spring 2026.xlsx › Plant Allocations › C6:C107` | 102 | 102 | 102 | 100 | 98–100 |
| `_Stocktake Master CURRENT.xlsx › Autumn 2026 Master Stocktake › B5:B108` | 104 | 104 | 104 | 101 | 99–101 |
| `2. 2026-27 JMN Potting On - August 2026 - July 27.xlsx › Summary › B4:B103` | 100 | 100 | 100 | 99 | 96–99 |
| `_Pricking out 2026-27 for potting 27-28 .xlsx › Sheet1 › A3:A101` | 98 | 98 | 98 | 97 | 95–97 |
| same workbook › Sheet2 › B3:B100 | 98 | 98 | 98 | 97 | 95–97 |
| `Seed Sowing 2026 .xlsx` (seed-log type; a short sowing list, not a master list) | 55 | 55 | 55 | 55 | 55 |
| `_JMN PLANT Forecasting 2026_2027.xlsx › KEYSTONE SITES › B7:B104` | 98 | 98 | 98 | 97 | 95–97 |
| same workbook › Template › B8:B102 | 95 | 95 | 95 | 94 | 93–94 |
| same workbook › SUMMARY › B7:B104 | 98 | 98 | 98 | 97 | 95–97 |
| `Master plant list 2024.xlsx › Sheet1 › B4:B93` (earlier list) | 90 | 90 | 90 | 90 | 89–90 |
| Autumn 2026 master, all 24 sheets with a species column, combined | 1,007 | 115 | 115 | 112 | 110–112 |
| Spring 2026 allocations, all 22 sheets with a species column, combined | 2,064 | 111 | 105 | 101 | 99–101 |

Reading the table:
- **Why the rows exceed the groups.** The "Leonohebe" and "Veronica" cupressoides rows are one species written twice in every master-derived list. Other repeats are listed below.
- **Why the lists differ.** All the current planning lists start from the same alphabetical block of 98 rows that ends at `Weinmania racemosa`. Some lists then add rows below it:
  - Autumn 2026 `C104:C119` adds `Cyathoides juniperina`, `Astelia fragrans`, `Carex comans red`, `Carex flagillera`, and 12 further species (`Coprosma colensoi`, `Olearia coreacea`, `Brachyglottis compacta`, `Dracophyllum longifolium`, `Phyllocladus trichomanoides`, `Eleocarpus dentatus`, `Carmichaelia glabrescsens`, `Olearia polita`, `Fuscospora truncata`, `Clematis afoliata`, `Metrosideros robusta`, `Agathis australis`). The last 12 are not in the core master lists, and look like a separate block of extra requests (confidence: low to medium; I have not read the columns beside them).
  - Spring 2026 `C104:C107` adds `Cyathoides juniperina`, `Astelia fragrans`, `Coprosma wallii`, `Hoheria augustifolia`.
  - Stocktake CURRENT `B103:B108` adds `Cyathoides juniperina`, `Astelia fragrans`, `Carex comans red`, `Carex flagillera`, `Coprosma wallii`, `Rata (KPCA)`.
  - Potting-on Summary `B102:B103` adds `Astelia fragrans` and `Carmichaelia racemosa`.
  - The Standard list has two stray rows, `B107` (`Gaultheria antipoda`) and `B108` (`Hoheria angustifolia`), below its `Totals` row at B102.
  - The pricking-out, forecast KEYSTONE SITES and SUMMARY lists carry no extras: they equal the core 97. The forecasting Template lacks four core species (see below).

### Core versus the docx list

- Core = the Standard list block `B4:B101` merged for the cupressoides pair: **97 species**.
- Docx = **92 groups**. They share 88 species.
- In the core but not in the docx (9): Carex buchananii, Carex maorica, Carex virgata, Carmichaelia crassicaulis, Coprosma acerosa, Coprosma brunea (as written), Coprosma cheesemanii, Discaria toumatou, Dracophyllum rosmarifolium (as written).
- In the docx but not in the core (4): Astelia fragrans, Carex comans (written `Carex comans red`), Carex flagellifera (written `Carex flagillera`), Coprosma wallii.
- 97 − 9 + 4 = 92.

### Ladder for the docx list (97 rows to 93 and 92)

| Step | Rows left | Evidence |
|---|---|---|
| Rows in the table | 97 | table rows 2–98 |
| minus `Astelia fragrans` repeated | 96 | row 94 repeats row 5 |
| minus `Coprosma wallii` repeated | 95 | row 97 repeats row 22 |
| minus `Cyathoides juniperina` (row 93) as the old name of `Leptecophylla juniperina` (row 37) | 94 | contested, see section 5 |
| minus `Rata (KPCA)` (row 98), a site-tagged entry next to `Metrosideros umbellata` (row 45) | **93** | contested |
| minus `Leonohebe cupressoides` (row 38) as the same species as `Veronica cupressoides` (row 86) | **92** | contested |

Reading: removing the repeats, the old/new name pair and the site-tagged entry gives exactly 93. Keeping the cupressoides pair apart is what leaves 93 rather than 92. The core lists reach 97 only after merging the cupressoides pair. That is a plausible source of "93" and "97", but I cannot show which count WRT had in mind (confidence: low). The scout for batch B14 recorded the same "93/97" question without an answer.

### Other differences worth knowing

- `_JMN PLANT Forecasting 2026_2027.xlsx › Template › B8:B102` lacks Carex maorica, Chionochloa conspicua, Coprosma brunea and Dracophyllum rosmarifolium (as written) compared with the core, and has `Kunzea ericoides` at B46 that the core does not.
- `Master plant list 2024.xlsx` lacks nine species now in the core (Carex maorica, Carex virgata, Chionochloa conspicua, Coprosma brunea, Dracophyllum rosmarifolium, Muehlenbeckia axillaris, Podocarpus totara, Raukaua simplex, Veronica biggarii) and has Gaultheria antipoda and Hoheria angustifolia.
- The "all sheets combined" rows show that site sheets repeat the same names with extra spellings (Spring 2026 combined: 111 strings, 105 spellings, 101 groups).

## 5. Uncertain groupings (proposed, not decided)

All of these are flagged `Y` in the `uncertain` column. The group names are handles only.

| What is unclear | What the data shows | Confidence in the proposed grouping |
|---|---|---|
| **Cyathoides / Cyathodes juniperina vs Leptecophylla juniperina** | Both appear in the same current list: docx rows 37 and 93; Autumn 2026 C48 and C104; Spring 2026 C48 and C104; Stocktake CURRENT B47 and B103. The core lists have only `Leptecophylla juniperina`. `Cyathoides juniperina` is in allocation, stocktake and planting-history sheets (34 cells, 10 files). The older spelling `Cyathodes juniperina` is in the seed records only (16 cells, 8 files), and `Leptecopylla juniperina` (a typo) is in seed logs (8 cells). | Medium. One plant under an old and a new name is the simplest reading, but the nursery may keep two stock lines. Grouped together. |
| **Carex maorica vs Carex secta ("oio")** | Separate rows in the core list (Standard B8 and B9). `Carex maorica` occurs 221 times in 59 files, including site-tagged forms (`Carex maorica (Slope Hill)`, 19 cells; `(Slope Hill Trial)`, 1). The nickname "oio" does not occur in any species column I read. | Kept as two groups. Not merged; WRT should say whether they are the same stock. |
| **Coprosma dumosa vs C. tayloriae** | `Coprosma dumosa/tayloriae` is 18 cells in 8 files, mostly the forecast site sheets (e.g. `_JMN PLANT Forecasting 2026_2027.xlsx › Feehly Hill (12A) › B30`, `Lake Hayes South (9A) › B30`, `Earnslaw Slipway (22A) › B27`) and 2019 stocktakes. The core lists use plain `Coprosma dumosa` (340 cells). | Slash string kept as its own group `MULTI: coprosma dumosa tayloriae`; not merged with C. dumosa. |
| **Kunzea ericoides vs other Kunzea** | `Kunzea ericoides` is not in the core. It is in the forecast Template B46, forecast site sheets and the Oct 2024 to May 2025 stocktakes. The Te Kakano reference list writes `Kanuka (Kunzea robusta)` and `Kanuka (Kunzea serotina)`. | Three Kunzea groups kept apart. The common name "kanuka" alone has no stored group. |
| **Ozothamnus leptophyllus / vauvilliersii / fulvida** | Core lists carry two rows with a stray bracket (Standard B68 `Ozothamnus leptophyllus)`, B69 `Ozothamnus vauvilliersii  )`). One string reads `Ozothamnus leptophyllus inc. vauvilliersii and fulvida`. `Ozothamnus fulvida` appears in seed logs. | Three groups kept apart; the combined string is `MULTI`. Low confidence either way. |
| **Hebe / Leonohebe / Leonehebe → Veronica** | Genus synonyms, grouped with Veronica. `Leonohebe cupressoides` and `Veronica cupressoides` are both rows in every core list. | High that these are the same name for the same species; the double row is the finding. |
| **Rata** | `Rata` (41 cells), `Rata row 1&2`, `Rata (KPCA)` (docx row 98, Stocktake B108), `Metrosideros umbellata` (261). The reference list also has `Metrosideros robusta - Northern rata` (Autumn 2026 C118). | Rata grouped with Metrosideros umbellata; low confidence. The KPCA tag may mark a separate order. |
| **Kowhai** | `Kowhai` (50+ cells) grouped with Sophora microphylla. `Sophora longicarinata` (10 cells, 9 stocktake files) is written separately. | Medium. |
| **Carmichaelia crassicaulis vs variety racemosa vs C. racemosa** | `var racemosa`, `v race`, `Coral broom Car cras v rac` kept as their own group. `Carmichaelia racemosa` is a separate row at Potting-on Summary B103. | Low. Three groups. |
| **Olearia nummulariifolia vs variety cymbifolia** | `Olearia num var cymbifolia`, `Olearia nummularifolia cym`, `Olearia cymbifolia` kept as a variety group. The core spelling is `Olearia nummularifolia` (one `i` fewer than the full epithet). | Medium. |
| **Veronica hectorii var demissa; Pimelea aridula var oliga; Veronica pimeleoides var faucicola** | Varieties written in the seed logs only. | Medium; kept as variety groups. |
| **Podocarpus laetus / totara / "mountain totara"** | Separate core rows for `Podocarpus laetus` and `Podocarpus totara`. The plain word `Totara` (16 cells) is grouped with Podocarpus totara. | Medium. |
| **Melicope simplex vs Raukaua simplex** | Same epithet in different genera. `Rakaua simplex` / `Rauakau simplex` are treated as Raukaua. | Medium. |
| **Pseudopanax arborscens (18 cells)** | Not matched to any list name. It may be a typo for `Pseudopanax arboreus` or a mix-up with `Olearia arborescens`. | Low. Left as an unresolved group. |
| **Carex comans red; Carex flagillera** | Appended rows in docx and Stocktake CURRENT. `red` may be a cultivar; `flagillera` is probably `flagellifera`. | Medium. |
| **Common names with no species** (`Karamu`, `Snow tussock`, `Weeping Broom`, `Broom`) | Not mapped. | Cannot be resolved from the data. |
| **"Matai MIRO?" and similar** | Two common names in one cell. | Not grouped. |

Not uncertain, but worth knowing: a bracketed Latin name and the common name before it sometimes disagree (`Mountain wineberry (Arisotelia serrata)` — the common name is normally Aristotelia fruticosa; the bracket says serrata). Both groupings are flagged.

### Groups found only in seed-log sheets (27)

Acaena caesiglauca, Acrothamnus colensoi, Brachyglottis greyii, Carex testacea, Carmichaelia corrugata, Carmichaelia crassicaulis var racemosa, Celmesia lyallii, Celmisia ramulosa, Chionochloa macra, Clematis morata, Coprosma atropurpurea, Coprosma petriei, Coprosma pseudociliata, Hoheria populnea, Leucopogan fraseri, Libertia peregrinans, Muehlenbeckia compacta, Myrsine nummulariifolia, Neomyrtus pedunculata, Olearia ilicifolia, Olearia nummulariifolia var cymbifolia, Ozothamnus fulvida, Pimelea aridula, Pimelea aridula var oliga, Veronica hectorii var demissa, Veronica pauciramosa, Veronica pimeliodesv var faucicola. (Spellings as most often typed in the logs.) These are species that WRT collects or sows but that never reach a plan, stocktake or allocation list (confidence: medium; I read only the species columns).

Reading the census without seed logs: 133 groups instead of 160. With seed logs only 27 extra groups appear, plus many extra spellings.

## 6. Implications for a normalised species table (descriptive, not a fix)

- Keep the raw string and add a key (lower case, spaces collapsed, brackets and tails removed). That already collapses 340 strings to 124 forms (whitespace and case).
- Map keys to a group through a lookup table that WRT approves. The CSV is a starting point: `raw_string` to `proposed_group`, with `uncertain = Y` as the review list (208 rows, 81 groups).
- The lookup needs three kinds of entry: typo variants (142), old genus names (24), and abbreviations (97). Abbreviations are risky as automatic matches. For example `Car pet` is only unique because of the epithet.
- A site tag (`Slope Hill`, `KPCA`) belongs in a site field, not in the species name.

## 7. Method and limits

- The script opens each workbook read-only, reads the scout's `species_name_column` (including multi-column cases `A,D,G`) from header row + 1 to row 3,000 (some stocktake files carry a phantom 1,048,576-row used range; real data ends far earlier), and reads the docx tables and the Te Kakano paragraphs. The `.xls` files were read through the converted copies.
- Grouping uses a hand-written reference vocabulary of about 156 genus and epithet pairs, plus fuzzy matching (similarity 0.8 or more for typos), prefix matching for abbreviations, and explicit tables for synonyms, varieties and common names. Every rule is in `species_census.py`.
- Limits: (1) a string that matches no vocabulary entry becomes its own group, so rare species spelled badly can appear as separate groups; (2) common-name mappings are my reading (medium confidence at best); (3) the list-by-list counts assume the scouts' species column and header row are right; (4) the "Seed & Cutting results" sheets mix species headings and tray codes in column A, so occurrence counts for those species are counts of heading rows, not of seed lots; (5) species names in sheets where no scout identified a species column (56 sheets) are not covered; (6) I did not read cell comments or colours.

## Questions for WRT

1. Which list is the official species list, and what do "93" and "97" count? Is 97 the master list after merging `Leonohebe cupressoides` with `Veronica cupressoides`, and is 93 the Nursery plant names list after removing repeats?
2. Is `Leonohebe cupressoides` the same nursery line as `Veronica cupressoides`? Is `Cyathoides juniperina` the same line as `Leptecophylla juniperina`? Both pairs appear in the same lists.
3. Are Carex maorica and Carex secta separate stock lines, or is one a local form of the other (the nickname "oio")?
4. Is `Coprosma dumosa/tayloriae` one line, and which Kunzea (ericoides, robusta, serotina) do you actually grow as "kanuka"?
5. Are Ozothamnus leptophyllus, O. vauvilliersii and O. fulvida three lines or one? The core lists have the first two with stray brackets in B68 and B69.
6. What is `Rata (KPCA)`: a normal rata line with a site tag, or a special order for that site? Is plain "Rata" southern rata?
7. In Autumn 2026 (rows 104–119), which of the extra species (for example Coprosma colensoi, Olearia polita, Agathis australis) are one-off requests, and which are new additions to the nursery range? The same question applies to Astelia fragrans, Carex comans, Carex flagellifera and Coprosma wallii, which are in the docx but not in the core master list.
8. In the 2026-27 pricking-out sheet, is `Weinmania racemosa` (A101) meant to sit below the TOTAL row and be left out of the sum?
9. Should Māori names be shown with macrons in the app (kōwhai, tī kōuka)? No species column contains a macron today.
10. For seed and cutting logs, should the species name be checked against the master list at entry? Twenty-seven groups occur only in the seed logs.
