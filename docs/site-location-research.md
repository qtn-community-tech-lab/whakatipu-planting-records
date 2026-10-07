# Planting location references

Checked 7 October 2026. The map contains 38 public reference points across 29 of the 38 physical site groups. The second research batch investigated 20 additional groups, found supported references for 18, and added KingsView School as a further identifiable school site. Skippers–DOC and Kingston remain unmapped.

Coordinates, source links, derivations and checked dates are maintained in [site-locations.json](../data/site-locations.json). These references locate named reserves, schools, restoration projects and historical events. They do not reconstruct the boundaries of historical planting patches. Recorded quantities come from the existing planting CSV and follow the reader's review switch. Public project totals are never substituted for the application's quantities.

## Additional references

Numbers below are full-history quantities, including records needing review. Multiple markers within a group count distinct registered parcels. A single mapped part can also exclude the group's other parts. The location picker and selection panel show that distinction.

| Site group | Added references | Plants represented by the new markers |
|---|---|---:|
| Glenorchy | Lagoon walkway, lakefront wharf, Pigeon Island, school | 3,519 |
| Kelvin Peninsula | Earnslaw Slipway, Queenstown Golf Club | 1,252 |
| Quail Rise | Jim's Way historic WRT event pin | 2,168 |
| Swiftburn and Kawarau Bridge | Kawarau Gorge Suspension Bridge | 579 |
| Gibbston | Gibbston Community Reserve on Coal Pit Road | 745 |
| Tucker Beach and Shotover River | Tucker Beach Wildlife Reserve historic WRT event pin | 120 |
| Walter Peak Station | Beach Point campsite and lakeshore walkway reference | 496 |
| Shotover Rotary Track | Southern end of the Rotary Tucker Beach Trail | 400 |
| Wye Creek | Main Wall climbing area | 361 |
| Lake Hayes Estate | Widgeon Park | 195 |
| Queenstown Hill and Primary | Queenstown Primary School, Kerry Drive Reserve | 93 |
| Kiwi Park | Brecon Street park grounds | 105 |
| Jardine Boulders | Jardines Boulder Field | 100 |
| Moke Lake | DOC campsite | 80 |
| Bridesdale | Bridesdale Bush Trust project on Hayes Creek | 80 |
| Matakauri Wetlands | ORC wetland centre | 80 |
| Arrow Morven | Arrow River / Morven Ferry Reserve locality reference | 70 |
| Lower Shotover Conservation Area | Interior point in the named DOC conservation area | 45 |
| Kingsview | KingsView School at 14 Yewlett Crescent | 25 |

## Evidence and interpretation

**Historic event pins:** Quail Rise and Tucker Beach are direct points from the [official WRT Spring 2022 event map](https://www.google.com/maps/d/kml?mid=1xjcJLd9yNvuMP6KkSce-tRHYfHJWQbQ&forcekml=1). The [WRT 2024 impact report](https://wrtqt.org.nz/wp-content/uploads/2025/03/WRT-Impact-Report-2024-final.pdf) independently names Jim's Way and Kelvin Peninsula Golf Course. Quail Rise's native restoration area is distinct from the nearby community orchard.

**Council and DOC geometry:** Named council reserve or community planting polygons provide references for Gibbston, Earnslaw Slipway, Pigeon Island, Widgeon Park, Kerry Drive, Bridesdale and Morven Ferry. Query URLs identify individual features in the JSON. Polygon centroids are calculated after translating vertices to a local origin, avoiding floating-point cancellation on small polygons. The Lower Shotover reserve centroid falls outside its winding riverbank polygon, so its marker uses the midpoint of an interior horizontal segment. The rounded point was independently checked inside the official DOC polygon. This reserve is distinct from the downstream Shotover Primary wetland.

**Published landmarks:** DOC supplies direct coordinates for [Moke Lake campsite](https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/queenstown-area/things-to-do/moke-lake-campsite/) and Beach Point at Walter Peak. [RealNZ](https://www.realnz.com/en/conservation/key-conservation-projects/walter-peak-land-restoration-project/) documents WRT's September 2017 volunteer planting on adjacent DOC land, matching the planting history's season. IPENZ publishes the Kawarau bridge centre to three decimal places. ORC supplies Matakauri's centre in NZTM, converted to WGS84. Glenorchy Lagoon Walkway uses a published named locality from Manaaki Whenua's collection database. Named OSM objects locate the wharf, schools, golf course and Kiwi Park, with identities and addresses checked against their operators or the Ministry of Education.

**Climbing areas:** [Queenstown Climbing Club](https://queenstownclimbingclub.com/conservation) explicitly identifies native restoration around Wye Creek's Main Wall. Published climbing route coordinates provide an area reference. Jardines uses the named bouldering area's published map and [QEII's location description](https://qeiinationaltrust.org.nz/places/lake-wakatipu-jardines-boulder-field/). Both are approximate area references.

**Moderate correspondence:** Bridesdale's reference is a known 2023 Bush Trust planting polygon in the WRT-supported project; the ledger's 2025 records do not establish that exact patch. Arrow Morven's historic register alias is “Arrow River Track – Arrow Junction” in [the site variants](discovery/04d_sites_variants.csv). The council reserve plan places Morven Ferry Reserve beside that river and trail. This supports a locality reference, while the 2015 planting stretch remains unknown. Both limitations are visible in the marker descriptions.

## Unmapped parts and groups

The following parts of otherwise mapped groups remain unlocated: Glenorchy Entrance and Bible Terrace; Kelvin Peninsula KPCA and Corner; Swiftburn; Shotover River private or unnamed projects; Lake Hayes Estate Trail; and the Queenstown Hill QCC plot. Their quantities are excluded from the new parcel markers. The QCC plot is described by its organizer as a secret location, so a generic hill trailhead is not substituted.

Skippers–DOC has only a generic 2017 header and no subsite. DOC describes the wider locality but does not identify that planting place. Kingston has a generic 2020 community entry; later reserve enhancement and predator-trapping projects do not establish where those plants went. Both need WRT or project staff to identify the relevant place.

Other still-unmapped groups are Little Difference, Paererewa, Arrowtown Preschool, Rapley Close, Arrow River, Hidden Island and Cecil Peak, and QLDC Tohu. Their identities or specific locations were not resolved by this batch. Paper4Trees is an order scheme and has no physical marker.

## Rejected location matches

- An indexed Coal Pit Road assessment point is more than 1 km from the actual Gibbston Community Reserve. The map uses the named council reserve polygon.
- QEII's Jardines page embeds a coordinate far south of the named boulder field. The climbing area's corroborated location is used instead.
- Kingston Street Reserve is not evidence for Kingston town's planting records.
- A Wye Creek event's Frankton meeting place was a carpool location, not the restoration site.
- Blackbird Hill, a Matakauri planting polygon from another season, and a generic Queenstown Hill planting feature are not substituted for differently named historical parts.

Independent coordinate checks also confirmed that the original Feehly cemetery, Peace Park, Rees lakefront and Shotover wetland points match their cited council geometries when rounded to four decimals.
