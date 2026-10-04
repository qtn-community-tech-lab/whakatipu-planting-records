# App confusions and proposed fixes

Reviewed on 3 October 2026. This is an audit, with no app or source-data changes. Kyle asked the resumed pass to continue beyond the first broken link. The displayed totals checked during the walk agree for the same scope; the issues below concern labels, missing review coverage, explanations or navigation.

## What a volunteer sees

| URL | What confused me | One-line suggested fix |
| --- | --- | --- |
| `/species/ozothamnus-vauvilliersii`, `/species/ozothamnus-leptophyllus` | The fulvida partner link opens “Page not found”, although the page explicitly asks staff to compare it. | Let a registered species without history have a detail page saying “No history records yet”, with its relationships and evidence. |
| `/species/olearia-nummularifolia`, `/species/veronica-hectorii`, `/species/carmichaelia-crassicaulis` | Four other partner names also open “Page not found”: the Olearia variety, Veronica demissa and both Carmichaelia partners. | Apply the same no-history detail treatment to all five partner species, and check every relationship link. |
| `/`, `/seasons/*`, `/species` | “What went in” and “where and when it went in” imply planting outcomes while the banner says the figures are not verified plantings. | Use “What was recorded” consistently until the outcome is established. |
| `/about-the-data#recorded` | The prose turns allocation comparisons into a claim that the whole history was copied from allocations, then calls the figures what was “sent”. | Describe the comparison evidence and its limits, and keep allocated, sent and planted as distinct statuses. |
| `/records?review=needs-review&theme=new-site` | “Site with no WRT number” finds only three sites, although twelve provisional sites have no official number. | Add a complete “No official site number” filter, keeping identity uncertainty and incomplete numbering separate. |
| `/sites/shotover-rotary-track`, `/sites/kiwi-park` and six other unnumbered sites | Seven have no review flags; Walter Peak has just one unrelated species flag for 15 plants. Their numbering remains unfinished, and three are not in the supplied register at all. | Say “No open mapping flags” and display registration/numbering status alongside it. |
| `/records?place=gorge-road-area&theme=site-identity&q=1+Mile` | Searching for 1 Mile returns all 200 plants in the Gorge Road group, including 35 under Gorge Rd Wetlands / QPS; the group’s aliases match every record. | Offer a source-header or site-part filter, and state when a name search matches an entire site group. |
| `/records?place=tucker-beach-and-shotover-river&theme=site-identity` | The same Source panel says the number does not identify a parcel, then says the parcel came from that number. | Say “Parcel unknown” on the 17 affected records and reserve the assigned-parcel note for the other records. |
| `/sites/tucker-beach-and-shotover-river` | Two entries in “Parts of this site” are both called Shotover River, with 247 and 130 plants; the distinction is hard to see. | Label the registered part and the whole-site/unknown-parcel part distinctly, without restoring removed names. |
| `/species/leptecophylla-juniperina`, `/records?review=needs-review&theme=not-a-number` | The main figure says 0 plants and 0% needing review, but the only record is an unknown TBC quantity. | Show “Quantity unknown: one record needs review”, and make the percentage unavailable when no quantity is known. |
| `/records?review=needs-review&theme=not-a-number` | Source says “Counted as 0”, whereas About says no quantity was imported; these are different claims. | Say “Excluded from numeric sums; quantity unknown” in Source. |
| `/seasons/spring-2025`, `/seasons/spring-2024`, species details | “Sites” includes Paper4Trees, while the Sites page explicitly excludes the scheme from its physical-site count. | Show physical sites and schemes separately wherever a count is displayed. |
| `/sites` | Keystone 8, Community 30 and School 7 add to 45, while All is 39; mixed-class sites appear in more than one filter. | Add “Sites can appear in more than one class” beside the class chips. |
| `/species/carex-secta`, `/species/cordyline-australis` and other alias cards | Literal \\t and \\u00a0 strings appear in source-name badges, making names look corrupted. | Decode known source escapes for display while retaining the immutable raw value in the audit trail. |
| `/species/carmichaelia-crassicaulis`, `/species/ozothamnus-vauvilliersii` | Three-name groups still ask “one species line or two”; this leaves out the possibility of three lines. | Say “Which of these names describe the same stock line?” and list the possible groupings. |
| `/species`, species details | “Threatened” and “Over 5 m” look authoritative but do not state that they are source-register attributes or how current they are. | Label the source and date of these attributes, separately from any current botanical reference. |
| `/`, `/sites/slope-hill` | The 2024 outliers squash the smaller seasonal bars; the chart has no vertical scale and mostly shows year labels. | Add a labelled scale and accessible exact-value labels, with an optional clearly labelled view that isolates the flagged entries. |
| `/about-the-data#totals` | “Typed fudge”, “Per 01f section 5” and internal sum ranges interrupt an explanation intended for volunteers. | Replace these with plain descriptions and put technical formula evidence behind a details control. |
| `/about-the-data#totals` | The SUMMARY PLANTS cause says Autumn 2025's 4,389 is typed, but it is a SUM formula over underlying values; the final missing 19 also lacks all-time row formulas. | Explain the underlying detail and missing formulas accurately, preserving the correct net 4,655 gap. |
| `/records?review=needs-review&theme=other` | “Other check” is offered as a review choice although it has no matching records. | Hide empty themes or show their current record count in the choice. |
| `/sites/slope-hill`, season details | “WRT decision 4” is repeated without a readable decision record or definition of what closing it requires. | Link to a dated ruling with the question, decision maker and outcome, or say plainly that no ruling is recorded yet. |

Broken-link evidence: [species-link-error.png](screenshots/species-link-error.png). All five distinct companion targets were followed in the browser and displayed the error screen. The first stop was respected; the expanded run followed Kyle's explicit instruction to continue.

During screenshot capture the live app briefly showed a build error for a missing `@/data/species-photos.json` import. It recovered after that file appeared, and the 44 captures were completed. Treat this as a development interruption, rather than a reproduced failure in the final state. The newly added photo catalogue was outside the original page walk and has not been fully audited here.

## Proposed fixes in an order that protects the evidence

1. **Correct the visible trust problems:** no-history species details; consistent recorded/allocated/sent/planted language; missing quantity display; accurate reconciliation explanations.
2. **Make review coverage complete:** show all provisional sites; carry alias-specific decisions into history flags; distinguish an inferred match from a WRT-approved match.
3. **Make imports repeatable:** stable stock-line IDs, one Unicode-aware normaliser, source hashes, detected sheet layout, and explicit exception inventory.
4. **Improve names through reviewed proposals:** link approved WRT stock lines to dated botanical references, then use AI to explain unresolved candidates and prepare review entries. See the design in [ANSWERED.md](ANSWERED.md).

These are proposals, not applied changes. Existing numbers should remain intact while labels and validation are improved.

## Technical evidence behind the proposals

- [Species route](/Users/kyleg/wtr-app-tree-reforestation/app/species/[slug]/page.tsx:49) rejects a species without a history span. The contested callout nevertheless builds a link to every partner. A source-register entry and a history span need separate display rules.
- [Source panel](/Users/kyleg/wtr-app-tree-reforestation/components/wrt/records.tsx:36) uses “Counted as 0” for missing quantities. The record table itself correctly shows a dash.
- [Provisional-number treatment](/Users/kyleg/wtr-app-tree-reforestation/docs/planning/scripts/build_history_prototype.py:285) often adds an FYI note, which does not set the review flag. Across the eight extra small sites, 101 records and 1,285 plants are marked resolved despite incomplete numbering; Walter Peak has another 15 plants amber for an unrelated species question.
- [Site-name lookup](/Users/kyleg/wtr-app-tree-reforestation/lib/wrt/csv/csv-repository.ts:211) keys the mapping by cleaned header alone. Repeated current headers resolve to the same name, so no present wrong name was found; a future header reused for another number could overwrite its mapping. Carry the resolved name on each history record or key by header and proposed number.
- The current generated site headers are already masked. No removed personal name was observed in the saved output. Source rendering relies on upstream masking; retain that contract and test it before any AI inputs or exports.
- The register-ID concern was checked against the original workbook: current IDs are in column A and B is blank. The Python reader is correct; earlier discovery citations to B need correction.
