# Planting location references

Checked 7 October 2026. The map contains 50 public reference points across 29 of the 38 physical site groups. The second research batch investigated 20 additional groups, found supported references for 18, and added KingsView School as a further identifiable school site. Skippers–DOC and Kingston remain unmapped.

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

## Sub-location audit

A third research batch focused on parts within the already mapped groups. It added **12 reference points**, keeping the same 29 mapped groups. Seven existing markers now count only their identified ledger part: Slope Hill Road, Bush Creek, Feehly cemetery, Peace Park, Morning Star, Shotover Wetland and Jardine Nursery Reference Gardens. The CSV ledger and whole-site totals are unchanged. This prevents unmapped or separately mapped parts from inflating a specific marker's count.

| Group | New sub-location | Parcel | Recorded plants, including review |
|---|---|---|---:|
| Lake Hayes | West / Project Gold | 9 | 2,259 |
| Lake Hayes | East / Rowing Club | 9H | 1,130 |
| Arthurs Point | Atley Downs / Atley Road Reserve | 6 | 592 |
| Arthurs Point | DOC Office / Cavells Building | 6A | 115 |
| Feehly Hill | Powder Magazine | 12 | 50 |
| Feehly Hill | Manse Road Reserve | 12B | 370 |
| Arrowtown and Bush Creek | Arrowtown Primary School | 13B | 220 |
| Arrowtown and Bush Creek | Derby Street Road Reserve | 13D | 73 |
| Peace Park and Frankton | Frankton Beach / Domain | 21A | 155 |
| Peace Park and Frankton | Boyes Crescent residents planting | 21B | 508 |
| Shotover Primary | Internal school grounds | 20B | 700 |
| Jardine Park | Welcome Forest | 23B | 6,995 |

**Planting-area references:** QLDC community planting polygons explicitly identify the Rowing Club, Derby Street restoration group, Boyes Crescent residents, and WRT native planting in Jardine Park. The [March 2025 Jardine development plan](https://www.qldc.govt.nz/media/tbupdms0/jardine-park-cdp-reve-final-lr-4032025.pdf) identifies Welcome Forest in the southern park, corroborating feature 1778. The nursery remains a navigation landmark for Reference Gardens, supported by [QLDC's educational garden expansion approval](https://www.qldc.govt.nz/2022/august/22-08-19-tree-replacement-requests-granted-in-kelvin-peninsula).

**Improved Lake Hayes anchors:** The previous broad ORC wetland point for South is replaced with an interior point in council WRT keystone planting polygon 1845. The Pavilion building landmark is replaced with an interior point in WRT planting polygon 1844. Project Gold uses an interior point in the largest western-shore polygon 1854; the [council's 2019 announcement](https://www.qldc.govt.nz/media/4eipwwf2/qldc-scuttlebutt-april19-issue131-web.pdf) separately confirms WRT's Lake Hayes West planting with DOC. These are references to current mapped areas, not verified historical planting boundaries.

**Published building coordinates:** [Heritage New Zealand](https://www.heritage.org.nz/list-details/2108/Listing) publishes Powder Magazine coordinates. The [official Shotover community response plan](https://www.otagocdem.govt.nz/media/1173/shotover-and-lake-hayes-community-response-plan.pdf) publishes the school's coordinates; these identify internal school grounds rather than the separate wetland. DOC confirms its office at Cavells Building, and Queenstown Trails supplies a shared building pin. Arrowtown Primary's official address corroborates its named OSM school polygon.

**Broader locality references:** Atley Downs, Manse Road and Frankton Beach use named public reserve geometry. Their descriptions explicitly leave historical planting patches unconfirmed. Project Gold also has only a broader correspondence: some council attribute names say Lake Hayes South, while geometry lies on the western shore and the notes identify Project Gold.

**Independent coordinate audit:** Every new rounded council reference was checked inside its cited polygon. Several concave or separated polygons had centroids outside their geometry. South, Manse and Frankton therefore use the midpoint of an interior horizontal segment; Pavilion and West use interior centroids of individual representative planting polygons. Source queries and exact derivations are stored with each point. The council's Welcome Forest feature 10902 is in Wanaka and was rejected.

## Unmapped parts and groups

The following parts within the 29 mapped groups remain unresolved. Their quantities are excluded from parcel marker totals.

| Group | Unlocated parts | Why they remain unpinned |
|---|---|---|
| Slope Hill | Coronation 11A; HGF NEW-SLOPE-HILL-HGF | Projects confirmed, but distinct planting areas not spatially identified |
| Lake Hayes | Rutherford Road 9D; Green Cabs 9E; North / Akarua Corner 9F | Ambiguous historical labels; modern nearby planting is insufficient evidence |
| Glenorchy | Entrance 1B; Bible Terrace 1D | Planting projects confirmed, exact reference points not established |
| Kelvin Peninsula | KPCA 22; Corner 22C | KPCA operates throughout peninsula; ledger does not identify which corner |
| Gorge Road area | Wetlands 5; One Mile Creek 5C | Historical QPS/QTMBC records do not identify a particular area; newer projects must not be substituted |
| Arrowtown and Bush Creek | Preschool 13A | Explicit Bush Creek aliases and preschool nature outings suggest an off-campus plot, not either preschool campus |
| Jardine Park | Track Entrance 23A | Multiple entrances; historical ledger does not say which |
| Swiftburn and Kawarau Bridge | Swiftburn 18 | Public funding evidence confirms restoration, but not the planting segment |
| Tucker Beach and Shotover River | Private / unnamed river projects, including 28A and unresolved parcel IDs | Public evidence does not establish correspondence to those records |
| Lake Hayes Estate | Trail 10A | No particular trail section established |
| Queenstown Hill and Primary | QCC plot 4A | Organizer describes a secret location; a generic hill trailhead is not substituted |

The preschool part 13A is distinct from the separate unmapped Arrowtown Preschool group. Location research does not resolve uncertain source identifiers or the review status of quantities.

Skippers–DOC has only a generic 2017 header and no subsite. DOC describes the wider locality but does not identify that planting place. Kingston has a generic 2020 community entry; later reserve enhancement and predator-trapping projects do not establish where those plants went. Both need WRT or project staff to identify the relevant place.

Other still-unmapped groups are Little Difference, Paererewa, Arrowtown Preschool, Rapley Close, Arrow River, Hidden Island and Cecil Peak, and QLDC Tohu. Their identities or specific locations were not resolved by this batch. Paper4Trees is an order scheme and has no physical marker.

## Rejected location matches

- An indexed Coal Pit Road assessment point is more than 1 km from the actual Gibbston Community Reserve. The map uses the named council reserve polygon.
- QEII's Jardines page embeds a coordinate far south of the named boulder field. The climbing area's corroborated location is used instead.
- Kingston Street Reserve is not evidence for Kingston town's planting records.
- A Wye Creek event's Frankton meeting place was a carpool location, not the restoration site.
- Blackbird Hill, a Matakauri planting polygon from another season, and a generic Queenstown Hill planting feature are not substituted for differently named historical parts.

Independent coordinate checks also confirmed that the original Feehly cemetery, Peace Park, Rees lakefront and Shotover wetland points match their cited council geometries when rounded to four decimals.
