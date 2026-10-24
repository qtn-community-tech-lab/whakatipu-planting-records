-- One-time reference seed sourced from data/*.json and historical season labels.
-- Maintain this SQL directly.
-- Stable IDs make reruns safe; existing rows and staff edits are left intact.
-- Creates audit actor usr_000000000001 if missing.
begin;
set local standard_conforming_strings = on;

insert into public.users (id, created_by, updated_by, email, display_name)
values (
  'usr_000000000001', 'usr_000000000001', 'usr_000000000001',
  'bayly.james@gmail.com', 'James Bayly'
),
(
  'usr_000000000002', 'usr_000000000001', 'usr_000000000001',
  'ktgcreative@gmail.com', 'Kyle Grattan'
),
(
  'usr_000000000003', 'usr_000000000001', 'usr_000000000001',
  'dre.cavalcanti@gmail.com', 'Andre Cavalcanti'
)
on conflict (id) do nothing;

-- 50 locations
insert into public.locations (id, geometry, label, source_url, coordinate_source_url, coordinate_method, checked_on, created_by, updated_by)
values
  ('loc_b077067125d4', '{"type":"Point","coordinates":[168.7985,-44.9716]}'::jsonb, 'Slope Hill riparian site', 'https://wrtqt.org.nz/community-planting-days/', 'https://www.google.com/maps/d/kml?mid=1xjcJLd9yNvuMP6KkSce-tRHYfHJWQbQ&forcekml=1', 'Official WRT Spring 2022 event pin beside the riparian site. The larger ledger group also includes Coronation and HGF areas; this point is not their boundary or centroid. Current access is about 1 km along Slope Hill Road from Speargrass Flat Road.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_ced11353550c', '{"type":"Point","coordinates":[168.8546,-44.9736]}'::jsonb, 'Whitechapel Reserve', 'https://wrtqt.org.nz/community-planting-days/', 'https://www.google.com/maps/d/kml?mid=1xjcJLd9yNvuMP6KkSce-tRHYfHJWQbQ&forcekml=1', 'Official WRT Spring 2022 planting-site pin on Whitechapel Road, Arrow Junction. QLDC reserve beside the cycle trail. Approximate reference point, not the reserve boundary or its internal planting areas.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_181c3557c2c8', '{"type":"Point","coordinates":[168.8019,-44.9949]}'::jsonb, 'Lake Hayes South planting area', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1845&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1845&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'Representative interior point of official QLDC Community Planting polygon 1845 in WGS84. Its local-origin signed-ring centroid lies outside the concave polygon, so use the midpoint of the widest interior horizontal slice at centroid latitude (-44.99487952575074, 168.8018652576946); the rounded point is verified inside. Attributes explicitly name Lake Hayes South, Lake Hayes–Arrow Junction Highway and Whakatipu Reforestation Trust keystone site – Community/Volunteer Agreement. Stronger direct WRT-site evidence than the earlier ORC broader wetland centre. Current mapped footprint, not the full historical parcel 9A boundary.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_0a9322eb8970', '{"type":"Point","coordinates":[168.8082,-44.9907]}'::jsonb, 'Lake Hayes Pavilion planting area', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1844&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1844&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'Representative interior point of official QLDC Community Planting polygon 1844, the largest mapped WRT Pavilion polygon. Local-origin signed-ring WGS84 centroid (-44.990670801075645, 168.8082373758633); rounded point verified inside the polygon. Attributes explicitly identify Lake Hayes Pavilion / Showgrounds and WRT keystone site; first plantings Spring 2023. Adjacent polygons 5601 / 10004 identify Spring 2025 planting but do not shift this point. More direct planting-area evidence than the former building coordinate. Current footprint, not all historical parcel 9G plantings.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_5262ef178a5e', '{"type":"Point","coordinates":[168.6941,-45.0454]}'::jsonb, 'Jardine Park / Nursery Reference Gardens', 'https://www.qldc.govt.nz/2022/august/22-08-19-tree-replacement-requests-granted-in-kelvin-peninsula', 'https://www.eventbrite.co.nz/e/community-nursery-volunteer-sessions-tickets-1998116193322', 'WRT organizer-published nursery venue coordinates on Eventbrite (-45.0453584,168.6941158), rounded four decimals. QLDC2022 tree replacement approval confirms expansion of its educational garden and library of native plants near the nursery; TreesThatCount2020 also confirms nursery reference gardens. The venue is an approximate navigation reference for parcel23; it does not mark a surveyed garden centroid. Excludes Track Entrance23A and Welcome Forest23B.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_3e0d15e1777e', '{"type":"Point","coordinates":[168.8276,-44.9373]}'::jsonb, 'Bush Creek', 'https://wrtqt.org.nz/community-planting-days/', 'https://www.google.com/maps/d/kml?mid=1xjcJLd9yNvuMP6KkSce-tRHYfHJWQbQ&forcekml=1', 'Official WRT Spring 2022 event-map KML point for Bush Creek Planting Site, rounded to four decimal places. Historic event reference near the Chinese Settlement, not a boundary or a point for the separate school parcels.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_29289e96524b', '{"type":"Point","coordinates":[168.827,-44.9399]}'::jsonb, 'Feehly Hill / Arrowtown Cemetery', 'https://www.queenstownhistoricalsociety.org.nz/Courier%20101%20published.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Cemeteries/MapServer/4/query?where=OBJECTID%3D384&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of the official QLDC Arrowtown Cemetery polygon in WGS84.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_f7a364e6197b', '{"type":"Point","coordinates":[168.7317,-45.0253]}'::jsonb, 'Peace Park', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D6401&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D6401&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of QLDC Community Planting feature 6401 in WGS84; not a reconciliation of all historical WRT planting records.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_7538d9581346', '{"type":"Point","coordinates":[168.6666,-45.014]}'::jsonb, 'Harvest Gardens', 'https://harvestgardens.nz/resources/native-planting-area/', 'https://www.openstreetmap.org/node/12009361230', 'OSM address node 12009361230 resolved via Nominatim; street address independently corroborated by Charities Services CC40889.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_30e400eb2628', '{"type":"Point","coordinates":[168.5966,-45.0466]}'::jsonb, 'Alpine Retreat', 'https://whakatipuwildlifetrust.org.nz/alpine-retreat/', 'https://www.openstreetmap.org/way/223291862', 'Published Nominatim representative coordinate of OSM road way 223291862.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_7f79e6572577', '{"type":"Point","coordinates":[168.6517,-45.0282]}'::jsonb, 'Ziptrek / Bob’s Peak', 'https://www.ziptrek.co.nz/latest-news/ziptrek-ecotours-achieve-zero-carbon-zipping-for-another-year/', 'https://www.google.com/maps/d/kml?mid=19fTsCPTo5LpPkFS6bYNkwVrX1Xo&forcekml=1', 'Area-weighted centroid of Tour Area polygon in official Ziptrek map embedded at https://www.ziptrek.co.nz/location/ .', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_b84d9d0ae80e', '{"type":"Point","coordinates":[168.6891,-45.0286]}'::jsonb, 'The Rees lakefront', 'https://therees.co.nz/sustainability/environmental/', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D10506&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of QLDC Community Planting feature 10506 in WGS84; adjacent 10507 also maps planting.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_8c37edca720e', '{"type":"Point","coordinates":[168.6679,-44.9809]}'::jsonb, 'Morning Star Reserve', 'https://www.doc.govt.nz/contentassets/982a0ad602034fdda26295c0918db005/morning-star-reserve-submission-9-kapow.pdf', 'https://api.inaturalist.org/v1/places/89383', 'Published location field of iNaturalist reserve place 89383.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_58e8ee6a8b74', '{"type":"Point","coordinates":[168.7735,-45.0109]}'::jsonb, 'Shotover Wetland', 'https://www.queenstownairport.co.nz/explore-queenstown-beyond/zqn-stories/shotover-wetland-project/', 'https://gis.qldc.govt.nz/server/rest/services/Planning/Structure_Plans/MapServer/58/query?where=OBJECTID%3D448&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of QLDC Structure Plans feature 448, Activity 5d - Open Space - Wetland, in WGS84.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_274574833ae9', '{"type":"Point","coordinates":[168.7546,-45.0003]}'::jsonb, 'Quail Rise / Jim’s Way', 'https://wrtqt.org.nz/wp-content/uploads/2025/03/WRT-Impact-Report-2024-final.pdf', 'https://www.google.com/maps/d/kml?mid=1xjcJLd9yNvuMP6KkSce-tRHYfHJWQbQ&forcekml=1', 'Official WRT Spring Planting 2022 KML placemark Quail Rise Community Planting (Jim’s Way): -45.000341,168.7546026. Independently corroborated by QLDC Community_Planting feature1770, native Quail Rise Restoration on Cockerell Lane; feature1771 is an orchard and was not used.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_239cb10508e7', '{"type":"Point","coordinates":[168.7406,-44.9821]}'::jsonb, 'Tucker Beach Wildlife Reserve', 'https://wrtqt.org.nz/community-planting-days/', 'https://www.google.com/maps/d/kml?mid=1xjcJLd9yNvuMP6KkSce-tRHYfHJWQbQ&forcekml=1', 'Official WRT Spring Planting 2022 KML placemark Tucker Beach Wildlife Reserve Community Planting: -44.9820806,168.7406139. Applies to Tucker Beach parcel28 only; the Shotover River parts28A and28B, plus unresolved river records, cannot be located confidently from public evidence.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_beb792d16a75', '{"type":"Point","coordinates":[168.9553,-45.0253]}'::jsonb, 'Gibbston Community Reserve', 'https://queenstowntrails.org.nz/maps-and-trails/all-trails/gibbston-river-wine-trail/', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_VIEWER/MapServer/31/query?where=OBJECTID%3D548&outFields=OBJECTID%2CSITENME&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of QLDC Open_Spaces polygon OBJECTID548, SITENME Gibbston Community Reserve, ROAD Coal Pit Road, WGS84 centroid -45.0252884111,168.9553161222. Ledger explicitly names GIBBSTON RESERVE (COAL PIT ROAD). Important: Xyst Coal Pit Road point -45.0365272,168.9473839 is a road assessment location over1km away and was not used.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_971091b1305e', '{"type":"Point","coordinates":[168.899,-45.009]}'::jsonb, 'Kawarau Gorge Suspension Bridge', 'https://d2rjvl4n5h2b61.cloudfront.net/media/documents/kawarau_gorge_suspension_bridgereport.pdf', 'https://d2rjvl4n5h2b61.cloudfront.net/media/documents/kawarau_gorge_suspension_bridgereport.pdf', 'IPENZ primary engineering heritage report,29March2011,page3 explicitly publishes structure centre latitude -45.009 longitude168.899 and identifies AJ Hackett bungy use. Matches ledger KAWARAU BRIDGE AJ HACKET / parcel18A. Coordinates have only three decimal places in the source. Swiftburn parcel18 is separate and excluded.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_648726b30f8f', '{"type":"Point","coordinates":[168.7562,-44.9973]}'::jsonb, 'Rotary Tucker Beach Trail', 'https://queenstownrotary.co.nz/Stories/rotary-tucker-beach-trail-opening', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_VIEWER/MapServer/57/query?where=OBJECTID%3D6804&outFields=OBJECTID%2CSITENME&outSR=4326&returnGeometry=true&f=pjson', 'QLDC Tracks_and_Trails feature6804,TRAILNME Tucker Beach Trail; southern endpoint -44.9972735172,168.7561901201. Rotary primary source describes a3.2km walk/cycle trail from its restored old Shotover suspension bridge along Tucker Beach Road and subsequent native plantings. This is an endpoint navigation reference, not a planting-area centroid. It is distinct from Tucker Beach Wildlife Reserve’s western WRT event pin.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_45b6da545a95', '{"type":"Point","coordinates":[168.6767,-45.0404]}'::jsonb, 'Kelvin Peninsula / Earnslaw Slipway', 'https://www.qldc.govt.nz/media/3bhfjwza/aa3-chapter-38-open-space-and-recreation-zones-mar-2023.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_VIEWER/MapServer/23/query?where=OBJECTID%3D10516&outFields=OBJECTID%2CSITENME&outSR=4326&returnGeometry=true&f=pjson', 'QLDC Community_Planting feature10516,SITENME Earnslaw Slipway,ROAD Kelvin Peninsula Road. Polygon centroid -45.0404277696,168.6767485104. QLDC Chapter38 section38.4.3 recognises the established native plantings at Kelvin Peninsula Slipway Informal Recreation Reserve. Applies only to historical parcel22A.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_636cf6a9c017', '{"type":"Point","coordinates":[168.6708,-45.043]}'::jsonb, 'Kelvin Peninsula / Queenstown Golf Club', 'https://wrtqt.org.nz/wp-content/uploads/2025/03/WRT-Impact-Report-2024-final.pdf', 'https://www.openstreetmap.org/way/89381653', 'WRT2024impact report names Kelvin Peninsula Golf Course as a supported community planting project; ledger parcel22B says KP-GOLF COURSE / Kelvin Heights Golf Course. Official Queenstown Golf Club address759PeninsulaRoad corroborates identity. OSM Nominatim geocode of named golf_course way89381653: -45.0429512,168.6708062, a broad course reference rather than clubhouse/planting centroid.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_31d742bb1b37', '{"type":"Point","coordinates":[168.3823,-44.8499]}'::jsonb, 'Glenorchy Lagoon Walkway', 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/glenorchy-area/things-to-do/glenorchy-walkway', 'https://scd.landcareresearch.co.nz/Specimen/PDD%20108570', 'Manaaki Whenua/New Zealand Fungarium primary georeferenced specimen PDD108570 records Glenorchy Lagoon Walkway at WGS84 -44.849922,168.382257. DOC confirms the northern town walkway and Mull Street access; Glenorchy Community Association2019planting event identifies start of Lagoon Walkway and WRT support. Point is a published walkway locality, not a recorded WRT planting pin. Applies to lagoon/walkway parcel1 only.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_0b2a1f747c12', '{"type":"Point","coordinates":[168.3815,-44.8515]}'::jsonb, 'Glenorchy Lakefront / Wharf', 'https://www.glenorchycommunity.nz/events/show/206/community-planting/?start=5', 'https://www.openstreetmap.org/way/1289096084', 'Glenorchy Community Association2019planting event says WRT provided200plants for waterfront planting. July2015GCAminutes identify north end of Wharf Shed beside walkway entrance as proposed WRT plantings. OSM named Glenorchy Wharf way1289096084 geocodes -44.8515213,168.3815220. Applies only to separate lakefront parcel1C; lagoon parcel1 is represented separately.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_04a70bfaadcd', '{"type":"Point","coordinates":[168.3965,-44.9227]}'::jsonb, 'Pigeon Island / Wāwāhi Waka', 'https://www.qldc.govt.nz/recreation/parks-and-walkways/pigeon-island', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_VIEWER/MapServer/31/query?where=OBJECTID%3D873&outFields=OBJECTID%2CSITENME&outSR=4326&returnGeometry=true&f=pjson', 'QLDC Open_Spaces polygon873,SITENME Pigeon Island Reserve (MBO); polygon centroid WGS84 -44.9227329907,168.3964913373. QLDC primary page confirms the island north in Lake Whakatipu and privately owned water transport for access. WRT2024impact report corroborates Whakatipu Islands Reforestation Trust support. Applies only to ledger Pigeon Island parcel1E.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_a293592fec45', '{"type":"Point","coordinates":[168.387,-44.8507]}'::jsonb, 'Glenorchy School', 'https://www.glenorchy.school.nz/', 'https://www.openstreetmap.org/way/466602386', 'Official school website confirms71ObanStreet,Glenorchy; Education Counts institution3955 independently confirms identity onObanStreet. OSM named school polygonway466602386 geocodes WGS84 -44.8506749,168.3870099. Applies only to historical GY SCHL parcel1A. This is a grounds reference, not a recorded planting point.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_36cb84556c7f', '{"type":"Point","coordinates":[168.7941,-45.0078]}'::jsonb, 'Widgeon Park', 'https://qldc.serve2.net/assets/Uploads/Your-Views/Annual-Plan-2016/Organisations-G-Q.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D1051&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of official QLDC Open Spaces polygon 1051, Widgeon Park (MBO), in WGS84. This named reserve corresponds to Widgeon Place in parcel 10; it is a broad reference, not the historic planting patch. Excludes parcel 10A (LHE Trail) because no exact trail segment is documented.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_91e17d1e5df6', '{"type":"Point","coordinates":[168.6587,-45.0276]}'::jsonb, 'Queenstown Primary School', 'https://www.queenstown.school.nz/enrolment-information/', 'https://www.openstreetmap.org/way/150605658', 'Nominatim published representative coordinate of OSM school grounds way 150605658 (-45.0276448,168.6587305), rounded to four decimals. Official school site confirms 20 Robins Road. Includes only parcel 4; excludes Queenstown Hill and Kerry Drive Reserve.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_95f1a66f7e02', '{"type":"Point","coordinates":[168.6657,-45.0284]}'::jsonb, 'Kerry Drive Reserve', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D659&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D659&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of official QLDC Open Spaces polygon 659, Kerry Drive Reserve, in WGS84. Native planting by the Kerry Drive and Ballarat Street Restoration Group is also recorded in the Queenstown Lakes Carbon Zero discussion paper. Only parcel 4B is counted; not an exact planting patch.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_8d86aa32530b', '{"type":"Point","coordinates":[168.6571,-45.0274]}'::jsonb, 'Kiwi Park', 'https://kiwibird.co.nz/visit/plan-your-visit/', 'https://www.openstreetmap.org/way/248085277', 'Nominatim published representative coordinate of OSM Kiwi Birdlife Park way 248085277 (-45.0274256,168.6570760), rounded to four decimals. The operator confirms Brecon Street below the gondola; DOC-hosted 2025 consent confirms 51 Brecon Street. A park landmark, not a precise historic planting location.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_d5e66a7cd962', '{"type":"Point","coordinates":[168.799,-45.0036]}'::jsonb, 'Bridesdale Bush / Hayes Creek', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1748&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1748&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid computed after translating polygon vertices to a local origin to avoid floating-point cancellation of official QLDC Community Planting polygon 1748, whose notes say maintained by Bridesdale Bush Trust and planted Spring 2023, in WGS84. QLDC Scuttlebutt June/July 2024 page 13 corroborates WRT support. Ledger Bridesdale records are Autumn/Spring 2025; this is a nearby project reference, not a claim that the 2025 plants occupy the 2023 polygon.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_3002cadb35b5', '{"type":"Point","coordinates":[168.6656,-45.0169]}'::jsonb, 'Matakauri Wetland', 'https://www.orc.govt.nz/environment/water-care/wetlands-and-estuaries/regionally-significant-wetlands/queenstown-lakes-district/matakauri-wetland', 'https://www.orc.govt.nz/environment/water-care/wetlands-and-estuaries/regionally-significant-wetlands/queenstown-lakes-district/matakauri-wetland', 'ORC publishes wetland centre NZTM E1258480 N5006030 (EPSG2193). Projected to WGS84 through ArcGIS GeometryServer yields longitude168.66556001708514, latitude-45.016866953313325; rounded four decimals. Broad wetland reference, not the council Community Planting10517 polygon to the north or the specific 2026 ledger plantings.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_029a83b1f283', '{"type":"Point","coordinates":[168.8548,-44.991]}'::jsonb, 'Arrow River / Morven Ferry Reserve', 'https://www.qldc.govt.nz/media/op0hn2pe/arrowtown-lake_hayes-reserve-management-plan-p2.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D797&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of official QLDC Open Spaces polygon 797, Morven Ferry Reserve on Arrow Junction Road, WGS84. Historic source register alias ARROW RIVER TRACK - ARROW JUNCTION establishes the relevant river/trail locality (docs/discovery/04d_sites_variants.csv). QLDC plan section2.23 confirms the reserve adjoins Arrow River and Queenstown Trail passes its upper terrace. This is an inferred locality reference, not a verified 2015 planting point.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_ac59cc2369f3', '{"type":"Point","coordinates":[168.5415,-45.1034]}'::jsonb, 'Walter Peak — Beach Point', 'https://www.realnz.com/en/conservation/key-conservation-projects/walter-peak-land-restoration-project/', 'https://www.doc.govt.nz/documents/parks-and-recreation/places-to-stay/campsite-information/campsites-otago.pdf', 'DOC campsite guide publishes Beach Point at Walter Peak at latitude -45.10341, longitude 168.54149. RealNZ identifies WRT volunteer planting on adjacent DOC land in September 2017, matching the ledger season; the campsite is a public reference, not the verified planting patch.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_b68a219eff96', '{"type":"Point","coordinates":[168.7699,-45.1419]}'::jsonb, 'Wye Creek — Main Wall area', 'https://queenstownclimbingclub.com/conservation', 'https://www.thecrag.com/en/climbing/new-zealand/queenstown/wye-creek/route/13862503', 'Published climber coordinates for The Mission at Main Wall: -45.14186,168.76992, corroborated by Proud Monkey, Dream Thing and Aratika route records. The club explicitly identifies native restoration around Main Wall. This is a crag reference, not a surveyed planting patch.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_fe7b5a79cfce', '{"type":"Point","coordinates":[168.7649,-45.0958]}'::jsonb, 'Jardines Boulder Field', 'https://qeiinationaltrust.org.nz/places/lake-wakatipu-jardines-boulder-field/', 'https://www.thecrag.com/en/climbing/new-zealand/queenstown/area/1484755365', 'The named Jardines bouldering-area map publishes -45.095774,168.764851. QEII confirms the identity and SH6 access. Used as a broader area landmark, not a planting pin; QEII website embedded map coordinates were rejected because they point far south of the named boulder field.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_a68237f64101', '{"type":"Point","coordinates":[168.5731,-44.9981]}'::jsonb, 'Moke Lake campsite', 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/queenstown-area/things-to-do/moke-lake-campsite/', 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/queenstown-area/things-to-do/moke-lake-campsite/', 'Direct published DOC latitude -44.99811782, longitude168.57308923 (also NZTM E1251305 N5007714). The source ledger says ML CAMP / Moke Lake Camp, matching this public campsite.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_7fb4ddd3a9a8', '{"type":"Point","coordinates":[168.728,-44.9877]}'::jsonb, 'Lower Shotover Conservation Area', 'https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/DOC_Public_Conservation_Land/FeatureServer/0/query?where=NaPALIS_ID%3D2804651&outFields=%2A&outSR=4326&returnGeometry=true&f=geojson', 'https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/DOC_Public_Conservation_Land/FeatureServer/0/query?where=NaPALIS_ID%3D2804651&outFields=%2A&outSR=4326&returnGeometry=true&f=geojson', 'Interior point derived from DOC Public Conservation Land polygon NaPALIS_ID2804651, Conservation Area - Lower Shotover, unitF41048. The area centroid falls outside this narrow winding polygon; used the midpoint of the widest interior segment at centroid latitude -44.98770238, yielding longitude168.72800053. This is a reserve reference, not the unknown 2015 planting patch.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_d912e7cf5c71', '{"type":"Point","coordinates":[168.7279,-45.0177]}'::jsonb, 'KingsView School', 'https://www.kingsview.school.nz/our-school-2/', 'https://www.openstreetmap.org/way/384923492', 'Nominatim representative coordinate of OSM school way 384923492 (-45.0176656, 168.7279115), with school name and 14 Yewlett Crescent address independently confirmed by the school and Education Counts institution 633. Rounded to four decimal places. School landmark, not verified planting boundary.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_67887f8501b8', '{"type":"Point","coordinates":[168.6888,-45.0476]}'::jsonb, 'Jardine Park / Welcome Forest', 'https://www.qldc.govt.nz/media/tbupdms0/jardine-park-cdp-reve-final-lr-4032025.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1778&outFields=*&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of official QLDC Community Planting polygon1778, native plantings by Whakatipu Reforestation Trust, at -45.04757644852401,168.6888288832655. Calculated after translating polygon to local origin to avoid cancellation. March2025 Jardine Park Concept Development Plan section1.1 places Welcome Forest at southernpark; section1.2/p5 identifies its native planting patches west/southwest of nursery. Polygon1778 lies in this area. Approximate patch reference for parcel23B, not a mapped boundary for the full Welcome Forest.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_41a5547589fa', '{"type":"Point","coordinates":[168.6764,-44.9861]}'::jsonb, 'Atley Downs / Atley Road Reserve', 'https://www.arthurspoint.nz/projects/plantings-and-waterways', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D393&outFields=%2A&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of official QLDC Atley Road Reserve polygon OBJECTID 393, calculated with coordinates translated to a local origin to avoid cancellation. Reference for the broader Atley Downs ledger locality, not a verified centroid of the 2015–2019 planting. APCA confirms planting at the end of Atley Road but does not locate these historic records.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_cdd92279130f', '{"type":"Point","coordinates":[168.6721,-44.9876]}'::jsonb, 'Arthurs Point / DOC Office', 'https://www.doc.govt.nz/footer-links/contact-us/office-by-name/south-island/whakatipu-wai-maori-queenstown-office/', 'https://maps.app.goo.gl/EW6RH5P4npyXG5uHA', 'Queenstown Trails publishes this Google Maps link for Canyon Brewing, which occupies the ground floor of the Cavells Building below DOC. DOC concession application confirms the shared building. Resolved place coordinates -44.9875607,168.6721377, rounded to four decimals; building landmark, not planting centroid. Supporting source https://www.doc.govt.nz/globalassets/documents/getting-involved/consultations/2025/4jqt-limited/4jqt-limited-application-form.pdf and link publisher https://www.queenstowntrails.org.nz/trails/arthurs-point-trail', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_687b5c340073', '{"type":"Point","coordinates":[168.8277,-44.9423]}'::jsonb, 'Feehly Hill / Powder Magazine', 'https://www.heritage.org.nz/list-details/2108/Listing', 'https://www.heritage.org.nz/list-details/2108/Listing', 'Heritage New Zealand publishes latitude -44.9422943372709 and longitude 168.82767234528086 in its official listing location data. Rounded to four decimal places. Building landmark for the ledger Magazine locality, not an individual planting bed.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_c5b380ea2d26', '{"type":"Point","coordinates":[168.8203,-44.9388]}'::jsonb, 'Feehly Hill / Manse Road', 'https://www.arrowtownvillage.nz/environment/feehly/', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D745&outFields=%2A&outSR=4326&returnGeometry=true&f=pjson', 'Interior reference point of official QLDC Manse Road Reserve (MBO) polygon OBJECTID 745. At latitude -44.9388, intersected all polygon rings with a horizontal line and selected the midpoint of the widest interior interval (longitude168.82028708091724 to168.8203800823854), then rounded to four decimals and verified the rounded point remains inside. AVA confirms restoration associated with Manse Road and Feehly Hill. This is an interior reserve landmark, not a polygon centroid or verified WRT planting point.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_b5316a236b26', '{"type":"Point","coordinates":[168.8393,-44.9486]}'::jsonb, 'Arrowtown Primary School', 'https://www.arrowtown.school.nz/contact-us', 'https://www.openstreetmap.org/way/133134846', 'Nominatim geocoding of the OSM Arrowtown School grounds polygon returned -44.9486408,168.8393458. Official school contact information confirms 9 Chalmers Place. School grounds reference only, not a verified planting patch.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_92888abb24d9', '{"type":"Point","coordinates":[168.8289,-44.9423]}'::jsonb, 'Derby Street Road Reserve', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1776&outFields=%2A&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1776&outFields=%2A&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of QLDC Community Planting polygon OBJECTID 1776, calculated with coordinates translated to a local origin. Official attributes identify Derby Street Road Reserve and native planting by its restoration group. Exact correspondence between the ledger 2023 allocation and the current council polygon is not verified.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_1179f83f2df8', '{"type":"Point","coordinates":[168.7298,-45.0206]}'::jsonb, 'Frankton Beach / Domain', 'https://www.qldc.govt.nz/2024/february/24-02-26-help-shape-the-future-use-of-frankton-s-riverside-road-reserves', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/32/query?where=OBJECTID%3D1165&outFields=%2A&outSR=4326&returnGeometry=true&f=pjson', 'Interior reference point of QLDC Frankton Domain polygon OBJECTID 1165. At latitude -45.0206, intersected all polygon rings with a horizontal line and selected the midpoint of the widest interior interval (longitude168.72881451297047 to168.73072394409695), then rounded to four decimals and verified the rounded point remains inside. Council describes Frankton Beach beside the Domain and BBQ area off Lake Avenue. This is a broad interior reserve landmark, not a polygon centroid or verified WRT planting point.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_e849f3605fe5', '{"type":"Point","coordinates":[168.7323,-45.0239]}'::jsonb, 'Boyes Crescent residents planting', 'https://wrtqt.org.nz/wp-content/uploads/2025/03/WRT-Impact-Report-2024-final.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1772&outFields=%2A&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of QLDC Community Planting polygon OBJECTID 1772, calculated with coordinates translated to a local origin. Council names Boyes Crescent Residents and native planting by residents; WRT 2024 Impact Report confirms the supported resident restoration project. Polygon reference, not each planted tree.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_da8ea9b64347', '{"type":"Point","coordinates":[168.7765,-45.0059]}'::jsonb, 'Shotover Primary / School grounds', 'https://www.shotover.school.nz/visiting-us', 'https://www.otagocdem.govt.nz/media/1173/shotover-and-lake-hayes-community-response-plan.pdf', 'Official civil-defence community response plan pages 22–23 publishes Shotover Primary School S45°00′21.32″ E168°46′35.45″, converted to -45.0059222,168.7765139 and rounded to four decimals. School building reference for internal-school ledger parcel20B; not the separate wetland parcel20A or exact internal planting beds.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_d3f7dbe2f903', '{"type":"Point","coordinates":[168.8119,-44.988]}'::jsonb, 'Lake Hayes East / Rowing Club', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID+IN+%281749%2C1751%2C1781%2C10001%29&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID+IN+%281749%2C1751%2C1781%2C10001%29&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'Area-weighted centroid of four QLDC Community Planting polygons1749,1751,1781,10001 in WGS84, calculated after translating coordinates to a local origin. They explicitly name Wakatipu Rowing Club;1781 records Spring2024 club planting. Ledger9H names LakeHayesEast(RowingClub etc). Reference for the named club locality, not a verified WRT event pin or historical9H boundary.', '2026-10-07', 'usr_000000000001', 'usr_000000000001'),
  ('loc_a61a678d58b2', '{"type":"Point","coordinates":[168.8041,-44.9758]}'::jsonb, 'Lake Hayes West / Project Gold', 'https://www.qldc.govt.nz/media/4eipwwf2/qldc-scuttlebutt-april19-issue131-web.pdf', 'https://gis.qldc.govt.nz/server/rest/services/OpenSpaces/Parks_and_Open_Spaces_VIEWER/MapServer/40/query?where=OBJECTID%3D1854&outFields=OBJECTID%2CSITENME%2CROAD%2CSUBLOC%2CNOTES&outSR=4326&returnGeometry=true&f=pjson', 'Representative interior point of QLDC Community Planting polygon 1854, the largest of the four western-shore polygons 1851–1854 labelled Project: GOLD community plantings (MBO). Its centroid was calculated with local-origin signed-ring area weighting in WGS84, then the rounded point was verified inside the polygon. Layer SITENME is Lake Hayes South and ROAD Marshall Avenue, so this is a broad named-project/locality anchor, not a verified historical WRT footprint. QLDC April 2019 newsletter independently documents WRT Lake Hayes West planting with DOC; ledger parcel 9 is West PG. Eastern-shore Project Gold polygon 1855 is excluded.', '2026-10-07', 'usr_000000000001', 'usr_000000000001')
on conflict (id) do nothing;

-- 29 sites
insert into public.sites (id, slug, name, description, location_id, created_by, updated_by)
values
  ('sit_3278820a1280', 'slope-hill', 'Slope Hill', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_2d8d2b759e66', 'whitechapel', 'Whitechapel', 'WRT’s historic planting-day location on Whitechapel Road, Arrow Junction, beside the Queenstown Trail. The reserve’s planting areas extend beyond this reference point.', 'loc_ced11353550c', 'usr_000000000001', 'usr_000000000001'),
  ('sit_4a8ea411f0d7', 'lake-hayes', 'Lake Hayes', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_d13b64a3008b', 'jardine-park', 'Jardine Park', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_b86f2aa9c7b8', 'arrowtown-and-bush-creek', 'Arrowtown and Bush Creek', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_84b42eb914e3', 'feehly-hill', 'Feehly Hill', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_6f8810e8a326', 'peace-park-and-frankton', 'Peace Park and Frankton', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_551be2da07e8', 'gorge-road-area', 'Gorge Road Area', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_ad242487a046', 'arthurs-point', 'Arthurs Point', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_a12e4997c07b', 'shotover-primary', 'Shotover Primary', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_37b92b5e3d36', 'quail-rise', 'Quail Rise', 'WRT’s historic planting-day pin for the Jim’s Way community restoration area at Quail Rise. Planting extends along the reserve beyond this point.', 'loc_274574833ae9', 'usr_000000000001', 'usr_000000000001'),
  ('sit_04d44d882cee', 'tucker-beach-and-shotover-river', 'Tucker Beach and Shotover River', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_aaebbd5e58e9', 'gibbston', 'Gibbston', 'The community reserve on Coal Pit Road is the named location in the planting ledger. This marker is a reserve reference point rather than a mapped planting patch.', 'loc_beb792d16a75', 'usr_000000000001', 'usr_000000000001'),
  ('sit_bdee03a5b536', 'swiftburn-and-kawarau-bridge', 'Swiftburn and Kawarau Bridge', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_3163a0d115cc', 'shotover-rotary-track', 'Shotover Rotary Track', 'The start of the Rotary Tucker Beach Trail near the Old Lower Shotover Bridge is a navigation landmark for planting along the trail. The planting history does not identify a particular section of this 3.2 km route.', 'loc_648726b30f8f', 'usr_000000000001', 'usr_000000000001'),
  ('sit_96e44f47c011', 'kelvin-peninsula', 'Kelvin Peninsula', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_a2492fc941ac', 'glenorchy', 'Glenorchy', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_2970d1c696b9', 'lake-hayes-estate', 'Lake Hayes Estate', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_b7bf48e412cd', 'queenstown-hill-and-primary', 'Queenstown Hill and Primary', '', null, 'usr_000000000001', 'usr_000000000001'),
  ('sit_8d86aa32530b', 'kiwi-park', 'Kiwi Park', 'A reference within Kiwi Park, the wildlife sanctuary on Brecon Street below the gondola. It marks the park grounds rather than an individual planting area. Visitor entry is managed by the park.', 'loc_8d86aa32530b', 'usr_000000000001', 'usr_000000000001'),
  ('sit_2ac5b9376fc6', 'bridesdale', 'Bridesdale', 'A reference within a council-mapped Bridesdale Bush Trust planting area on Hayes Creek Road. Council identifies the wider restoration project as supported by WRT. The individual planting patch behind the ledger’s Bridesdale records is not established.', 'loc_d5e66a7cd962', 'usr_000000000001', 'usr_000000000001'),
  ('sit_d51780f5ab66', 'matakauri-wetlands', 'Matakauri Wetlands', 'The published centre of Matakauri Wetland, east of Gorge Road and Industrial Place. It represents the wider wetland; the particular 2026 planting area and an entrance are not established.', 'loc_3002cadb35b5', 'usr_000000000001', 'usr_000000000001'),
  ('sit_bc25947b2f8d', 'arrow-morven', 'Arrow Morven', 'Morven Ferry Reserve is a reference beside the Arrow River and trail at Arrow Junction. The historic register calls this planting group Arrow River Track – Arrow Junction. The exact 2015 planting stretch is not established.', 'loc_029a83b1f283', 'usr_000000000001', 'usr_000000000001'),
  ('sit_41f1c618dc0f', 'walter-peak-station', 'Walter Peak Station', 'Beach Point campsite and public lakeshore walkway are landmarks for the wider Walter Peak restoration area. The historic WRT planting was on adjacent DOC land; this point does not identify the individual planting patch.', 'loc_ac59cc2369f3', 'usr_000000000001', 'usr_000000000001'),
  ('sit_8725f6b32934', 'wye-creek', 'Wye Creek', 'A climbing-area reference near Main Wall, where Queenstown Climbing Club describes its native bush restoration work. Plantings extend around the climbing area; the marker is not a planting boundary or a car park.', 'loc_b68a219eff96', 'usr_000000000001', 'usr_000000000001'),
  ('sit_abd5d5f21ed0', 'jardine-boulders', 'Jardine Boulders', 'A reference for the named boulder field on Remarkables Station, beside SH6. The exact position of the ledger’s native plantings within this area has not been established.', 'loc_fe7b5a79cfce', 'usr_000000000001', 'usr_000000000001'),
  ('sit_b44f1e741f9e', 'moke-lake', 'Moke Lake', 'DOC’s published campsite location corresponds to the ledger’s Moke Lake Camp name. It is a campsite reference rather than the exact position of the historic plantings.', 'loc_a68237f64101', 'usr_000000000001', 'usr_000000000001'),
  ('sit_7fb4ddd3a9a8', 'lower-shotover-conservation-area', 'Lower Shotover Conservation Area', 'A reference point inside the DOC conservation area along the Shotover River east of Arthurs Point. The historic planting patch is unknown; this marker represents the named reserve rather than its planting boundary.', 'loc_7fb4ddd3a9a8', 'usr_000000000001', 'usr_000000000001'),
  ('sit_f53f331e7d05', 'kingsview', 'Kingsview', 'KingsView School at 14 Yewlett Crescent, Frankton, is a reference for the school planting records. The marker identifies the school rather than an individual planting patch.', 'loc_d912e7cf5c71', 'usr_000000000001', 'usr_000000000001')
on conflict (id) do nothing;

-- 95 species
insert into public.species (id, slug, scientific_name, common_name, maori_name, aliases, description, image_url, register_code, register_note, created_by, updated_by)
values
  ('spc_3f9c483142c1', 'coprosma-propinqua', 'Coprosma propinqua', 'Black scrub', 'Mingimingi', ARRAY['Mikimiki']::text[], 'A native shrub or small tree with a dense network of spreading branches. It grows in forest, scrub, wetlands and beside streams throughout much of New Zealand.

Identification: Tiny, narrow dark-green leaves on tangled twigs. Ripe berries are often blue or blue-flecked, although their colour varies.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_propinqua

Reference photo: Coprosma propinqua with fruit at Zealandia, Wellington.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_propinqua_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Coprosma_propinqua_11.JPG/960px-Coprosma_propinqua_11.JPG', 'SP-050', 'Mikimiki is a Kāi Tahu form. These names are shared with several other small-leaved shrubs.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_d9932fde9e4b', 'pittosporum-tenuifolium', 'Pittosporum tenuifolium', 'Black matipo', 'Kōhūhū', ARRAY['Kohukohu', 'Tawhiwhi']::text[], 'An evergreen New Zealand tree that often colonises forest edges and disturbed ground. Its small, dark flowers release their scent in the evening.

Identification: Glossy oval leaves with wavy edges against dark, almost black young stems. Seed capsules split open to reveal sticky black seeds.

References:
Wikipedia: https://en.wikipedia.org/wiki/Pittosporum_tenuifolium

Reference photo: Pittosporum tenuifolium at Governor’s Bush Walk, Aoraki / Mount Cook.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Pittosporum_tenuifolium_in_Aoraki_Mount_Cook_NP_03.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Pittosporum_tenuifolium_in_Aoraki_Mount_Cook_NP_03.jpg/960px-Pittosporum_tenuifolium_in_Aoraki_Mount_Cook_NP_03.jpg', 'SP-134', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_4546d0872413', 'cordyline-australis', 'Cordyline australis', 'Cabbage tree', 'Tī kōuka', ARRAY[]::text[], 'A distinctive native tree found across much of New Zealand. Mature trees develop a stout trunk and branching crowns, and can reach about 20 metres.

Identification: Long, sword-shaped leaves gathered into dense tufts at the ends of branches. Young plants often have one upright stem before branching.

References:
Wikipedia: https://en.wikipedia.org/wiki/Cordyline_australis

Reference photo: Mature Cordyline australis trees on farmland at Kaihoka Lakes, Tasman.
Photo: Jade (CC BY-SA 2.0)
Licence: https://creativecommons.org/licenses/by-sa/2.0
Source: https://commons.wikimedia.org/wiki/File:CabbageTreeKaihoka.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/CabbageTreeKaihoka.jpg/960px-CabbageTreeKaihoka.jpg', 'SP-058', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_4cb0e939dbb0', 'sophora-microphylla', 'Sophora microphylla', 'Small-leaved kōwhai', 'Kōwhai', ARRAY[]::text[], 'A native flowering tree known for its hanging yellow flowers. Nectar-feeding birds, including tūī, help pollinate it.

Identification: Feathery leaves made up of many small leaflets, drooping branches and clusters of yellow flowers. Flowering makes it particularly easy to spot.

References:
Wikipedia: https://en.wikipedia.org/wiki/Sophora_microphylla
Native Plant Monitoring · names: https://monitoring.tanestrees.org.nz/species-information/

Reference photo: Sophora microphylla at Bucklands Crossing, New Zealand.
Photo: John Barkla (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Sophora_microphylla_-_John_Barkla_-_93710499.jpeg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Sophora_microphylla_-_John_Barkla_-_93710499.jpeg/960px-Sophora_microphylla_-_John_Barkla_-_93710499.jpeg', 'SP-152', 'Kōwhai is shared by several Sophora species; the botanical name identifies this one.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_9841b23a94a4', 'plagianthus-regius', 'Plagianthus regius', 'Lowland ribbonwood', 'Mānatu', ARRAY[]::text[], 'One of New Zealand’s largest deciduous native trees. It changes markedly with age: a young plant’s tangled growth develops into a taller tree with larger leaves.

Identification: Small leaves among interlacing juvenile branches, then larger leaves on older growth. Dense clusters of tiny pale flowers appear in spring.

References:
Wikipedia: https://en.wikipedia.org/wiki/Plagianthus_regius

Reference photo: Plagianthus regius at California Park, Upper Hutt.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Plagianthus_regius_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Plagianthus_regius_11.JPG/960px-Plagianthus_regius_11.JPG', 'SP-135', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_2cd6558ee61b', 'fuscospora-cliffortioides', 'Fuscospora cliffortioides', 'Mountain beech', 'Tawhai rauriki', ARRAY[]::text[], 'A native beech associated with mountain forests. It can form tall forest, but becomes much shorter and more twisted near the treeline.

Identification: Small, elongated leaves with pointed tips. Compare the overall tree shape too: exposed mountain trees can look very different from sheltered ones.

References:
Wikipedia: https://en.wikipedia.org/wiki/Nothofagus_cliffortioides

Reference photo: Fuscospora cliffortioides trees in Tongariro National Park.
Photo: Andrewgprout (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Mountain_Beech.jpg', 'https://upload.wikimedia.org/wikipedia/commons/1/12/Mountain_Beech.jpg', 'SP-069', 'WRT records the name Tawairauriki. Wikipedia also uses the botanical name Nothofagus cliffortioides.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_89dbe02fec14', 'olearia-odorata', 'Olearia odorata', 'Scented tree daisy', null, ARRAY[]::text[], 'A South Island shrub, usually around 2–4 metres tall, with densely interwoven branches. Its small flowers and foliage support native moths and other insects.

Identification: A twiggy, tangled outline with small pale-green leaves and many small white flowers in spring.

References:
Wikipedia: https://en.wikipedia.org/wiki/Olearia_odorata

Reference photo: Olearia odorata leaves at Matakauri Park, Queenstown.
Photo: Andre Chalmers (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Olearia-Odorata.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Olearia-Odorata.jpg/960px-Olearia-Odorata.jpg', 'SP-119', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_8250fe366699', 'olearia-lineata', 'Olearia lineata', 'Narrow-leaved tree daisy', null, ARRAY[]::text[], 'A fine-leaved native shrub or small tree of southern grey scrub, grassland and forest margins. It often grows around river terraces, seepages and wetland edges.

Identification: Very narrow leaves with pale, felted undersides and slender drooping branchlets. Small flowers sit on fine stalks.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/shawia-lineata/
Flora of New Zealand: https://www.nzflora.info/factsheet/Taxon/Olearia-lineata.html
WRT planting guide · common name · PDF: https://landcare.org.nz/wp-content/uploads/2024/11/WRT-Planting-Guide-Web.pdf#page=31

Reference photo: Olearia lineata at Auckland Botanic Gardens.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_lineata_in_Auckland_Botanic_Gardens_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Olearia_lineata_in_Auckland_Botanic_Gardens_01.jpg/960px-Olearia_lineata_in_Auckland_Botanic_Gardens_01.jpg', 'SP-116', 'NZPCN now lists this plant as Shawia lineata. WRT’s recorded botanical name is retained here.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_8cc1e9a2d25f', 'olearia-fimbriata', 'Olearia fimbriata', 'Small-leaved tree daisy', null, ARRAY[]::text[], 'A tree daisy of the eastern South Island, including Otago and northern Southland. It grows in grey scrub and open rocky country and supports specialist native moths.

Identification: Opposite pairs of small, dull grey-green leaves, hairy underneath. Fine outer branchlets hang down, and clusters of cream flowers appear in summer.

References:
DOC species factsheet · PDF: https://www.nzpcn.org.nz/site/assets/files/0/13/485/olearia_fimbriata.pdf

Reference photo: Olearia fimbriata at Dunedin Botanic Garden.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_fimbriata_in_Dunedin_Botanic_Garden_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Olearia_fimbriata_in_Dunedin_Botanic_Garden_01.jpg/960px-Olearia_fimbriata_in_Dunedin_Botanic_Garden_01.jpg', 'SP-112', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_c0e0af82b586', 'phormium-tenax', 'Phormium tenax', 'New Zealand flax', 'Harakeke', ARRAY[]::text[], 'An evergreen plant that grows in large clumps. Harakeke is an important fibre plant, with a long history of use in Māori weaving.

Identification: Long, upright strap-like leaves emerging from the base. Tall flowering stalks rise above the foliage with red or yellow flowers.

References:
Wikipedia: https://en.wikipedia.org/wiki/Phormium_tenax

Reference photo: Phormium tenax in flower at Piha, Auckland.
Photo: Kahuroa (Public domain)
Licence: https://commons.wikimedia.org/wiki/Commons:Public_domain
Source: https://commons.wikimedia.org/wiki/File:Phormium_tenax_Piha02.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Phormium_tenax_Piha02.jpg/960px-Phormium_tenax_Piha02.jpg', 'SP-127', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_82e17afcffaa', 'coprosma-rugosa', 'Coprosma rugosa', 'Needle-leaved mountain coprosma', null, ARRAY[]::text[], 'A hardy native shrub of grassland and forest edges, extending into subalpine areas. Birds disperse the seeds from its small berries.

Identification: Very reduced, narrow leaves that give the plant a needle-leaved appearance. Purple-white berries can appear in autumn.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_rugosa

Reference photo: Coprosma rugosa, a reference specimen photographed by Mike Dickison.
Photo: Mike Dickison (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_rugosa_258334218.jpg', 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Coprosma_rugosa_258334218.jpg', 'SP-055', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_5fcf074942da', 'austroderia-richardii', 'Austroderia richardii', 'South Island toetoe', 'Toetoe', ARRAY[]::text[], 'A large native tussock grass with flowering stems rising above its leaves. It is one of New Zealand’s toetoe species and is often confused with introduced pampas grasses.

Identification: Arching, cream to yellowish flower plumes, often drooping to one side. The long leaves have several strong veins as well as a central rib.

References:
Wikipedia: https://en.wikipedia.org/wiki/Austroderia_richardii

Reference photo: Austroderia richardii flower heads, cultivated on the Port Hills near Christchurch.
Photo: Max Tweddell (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Austroderia_richardii_flowers.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Austroderia_richardii_flowers.jpg/960px-Austroderia_richardii_flowers.jpg', 'SP-008', 'Toetoe is shared by several native Austroderia species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_7e2572244e90', 'carex-secta', 'Carex secta', 'Tussock sedge', 'Pūrei', ARRAY['Pukio']::text[], 'A native wetland sedge that thrives with wet roots. Older plants build a raised, trunk-like base from roots and old stems.

Identification: A fountain of long, narrow, drooping green leaves above a chunky tussock base. Its flower and seed stalks also droop.

References:
Wikipedia: https://en.wikipedia.org/wiki/Carex_secta

Reference photo: Carex secta in Queenstown Gardens.
Photo: Andre Chalmers (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Carex_secta.tif', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Carex_secta.tif/lossy-page1-960px-Carex_secta.tif.jpg', 'SP-016', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_59a880e6ebe9', 'coprosma-crassifolia', 'Coprosma crassifolia', 'Thick-leaved coprosma', 'Mingimingi', ARRAY[]::text[], 'A much-branched native shrub found in scrub, forest and coastal country. Its translucent berries attract birds and skinks.

Identification: Small, stiff, rounded leaves in opposite pairs, spaced along the branches. They are glossy dark green above and pale underneath.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_crassifolia
Wikipedia · shared Māori names: https://en.wikipedia.org/wiki/Coprosma_propinqua

Reference photo: Coprosma crassifolia at Whitireia Reserve, Porirua.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_crassifolia_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Coprosma_crassifolia_11.JPG/960px-Coprosma_crassifolia_11.JPG', 'SP-043', 'Mingimingi is shared with other small-leaved shrubs, so it does not uniquely identify this species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_93a863bb120a', 'corokia-cotoneaster', 'Corokia cotoneaster', 'Wire-netting bush', 'Korokio', ARRAY[]::text[], 'A native shrub whose many crossing branches create its distinctive wire-netting shape. Yellow flowers are followed by colourful fruit.

Identification: Grey zigzag twigs, tiny leaves with pale undersides, and small yellow star-shaped flowers when in bloom.

References:
Wikipedia: https://en.wikipedia.org/wiki/Corokia_cotoneaster

Reference photo: Corokia cotoneaster at Christchurch Botanic Gardens.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Corokia_cotoneaster_in_Christchurch_Botanic_Gardens.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Corokia_cotoneaster_in_Christchurch_Botanic_Gardens.jpg/960px-Corokia_cotoneaster_in_Christchurch_Botanic_Gardens.jpg', 'SP-059', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_8e5f2460f5a4', 'griselinia-littoralis', 'Griselinia littoralis', 'New Zealand broadleaf', 'Kāpuka', ARRAY['Pāpāuma']::text[], 'A hardy evergreen native tree with dense foliage. Its small flowers are less conspicuous than its thick, glossy leaves.

Identification: Broad, leathery yellow-green leaves with smooth edges. The leaf base is often slightly uneven on either side of the stalk.

References:
Wikipedia: https://en.wikipedia.org/wiki/Griselinia_littoralis

Reference photo: Griselinia littoralis, a reference specimen photographed by Mike Dickison.
Photo: Mike Dickison (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Griselinia_littoralis_258334503.jpg', 'https://upload.wikimedia.org/wikipedia/commons/1/13/Griselinia_littoralis_258334503.jpg', 'SP-073', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_af07bf16eebf', 'carmichaelia-petriei', 'Carmichaelia petriei', 'Desert broom', 'Mākaka', ARRAY[]::text[], 'An upright native broom with green, largely leafless branchlets. Its small pea-like flowers can be purple, violet and white.

Identification: An open, stout shrub with green to bronze-green stems. Ripe seed pods droop, a useful feature for distinguishing it from other native brooms.

References:
Wikipedia: https://en.wikipedia.org/wiki/Carmichaelia_petriei
NZ Rhizobia · broom names: https://rhizobia.nz/taxonomy/legume

Reference photo: Carmichaelia petriei in Otago.
Photo: Duncan Cunningham (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Carmichaelia_petriei_in_Otago.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Carmichaelia_petriei_in_Otago.jpg/960px-Carmichaelia_petriei_in_Otago.jpg', 'SP-026', 'WRT records Mākaka for this plant. It is a shared name for native brooms; a species-specific Māori name has not been confirmed in the sources checked.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_b1eaf916f213', 'podocarpus-laetus', 'Podocarpus laetus', 'Hall’s tōtara', 'Tōtara kōtukutuku', ARRAY['Tōtara-kiri-kōtukutuku']::text[], 'A native conifer especially associated with mountain forests. Older references may call it Podocarpus hallii or Podocarpus cunninghamii.

Identification: Narrow, pointed leaves and thin, papery bark that flakes away. Its bark is thinner than that of lowland tōtara, and juvenile leaves are longer.

References:
Wikipedia: https://en.wikipedia.org/wiki/Podocarpus_laetus
Ngā Rauropi Whakaoranga · Māori name: https://rauropiwhakaoranga.landcareresearch.co.nz/names/82477563-d51d-4ff7-8b46-2e044c220537
NZPCN: https://www.nzpcn.org.nz/flora/species/podocarpus-laetus/

Reference photo: Podocarpus laetus at Inchbonnie, New Zealand. The Wiki source is already cropped.
Photo: Jenny Saito (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Podocarpus_laetus_-_Jenny_Saito_-_234654772_(cropped).jpeg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Podocarpus_laetus_-_Jenny_Saito_-_234654772_%28cropped%29.jpeg/960px-Podocarpus_laetus_-_Jenny_Saito_-_234654772_%28cropped%29.jpeg', 'SP-138', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_b6343ccf8d1b', 'coprosma-virescens', 'Coprosma virescens', 'Green-fruited coprosma', 'Mikimiki', ARRAY[]::text[], 'A small-leaved native shrub or tree with tangled, slender branches. It occurs in eastern and southern parts of New Zealand.

Identification: Tiny leaves with wavy edges or blunt teeth. The pale, translucent ripe berries can look green because the seeds show through.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_virescens
Nelson Natives · common name: https://www.nelsonnatives.co.nz/coprosma-virescens

Reference photo: Coprosma virescens at Dunedin Botanic Garden.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_virescens.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Coprosma_virescens.jpg/960px-Coprosma_virescens.jpg', 'SP-056', 'Mikimiki is a shared name used for several small-leaved Coprosma species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_059ae36bc2cd', 'olearia-hectorii', 'Olearia hectorii', 'Hector’s tree daisy', null, ARRAY[]::text[], 'A deciduous native tree daisy with reddish young stems and furrowed bark. It supports many native moth species and needs open ground for seedlings to establish.

Identification: Clusters of grey-green leaves arranged opposite one another, with silvery undersides. Its small flower heads contain pale-yellow florets.

References:
Wikipedia: https://en.wikipedia.org/wiki/Olearia_hectorii

Reference photo: Mature Olearia hectorii photographed by John Barkla, Department of Conservation.
Photo: John Barkla, Department of Conservation (New Zealand) (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_hectorii,_mature_tree.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Olearia_hectorii%2C_mature_tree.jpg/960px-Olearia_hectorii%2C_mature_tree.jpg', 'SP-114', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_782494f2e1e2', 'leptospermum-scoparium', 'Leptospermum scoparium', 'New Zealand tea tree', 'Mānuka', ARRAY['Kāhikatoa']::text[], 'A densely branching native shrub or small tree that is often among the first plants to establish on cleared ground. Its flowers provide nectar for bees and other insects.

Identification: Small, pointed, prickly leaves and white, sometimes pink, five-petalled flowers. Woody seed capsules often stay on the branches after flowering.

References:
Wikipedia: https://en.wikipedia.org/wiki/Leptospermum_scoparium

Reference photo: Leptospermum scoparium in Abel Tasman National Park, Tasman Region, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Leptospermum_scoparium_in_Abel_Tasman_NP_(2).jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Leptospermum_scoparium_in_Abel_Tasman_NP_%282%29.jpg/960px-Leptospermum_scoparium_in_Abel_Tasman_NP_%282%29.jpg', 'SP-088', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_64a18b493e4e', 'poa-cita', 'Poa cita', 'Silver tussock', 'Wī', ARRAY['Pātītī']::text[], 'A native tussock grass found across much of New Zealand. Its fine leaves form clumps usually around 30 centimetres to one metre tall, and can hang farther down steep banks.

Identification: A dense tussock of very fine, narrow leaves. Leaf width varies between populations, so compare the whole clump as well as individual blades.

References:
Wikipedia: https://en.wikipedia.org/wiki/Poa_cita
Ngā Rauropi Whakaoranga · Māori names: https://rauropiwhakaoranga.landcareresearch.co.nz/names/b515e066-24a1-4069-9be7-73a0c12a6cdf

Reference photo: Poa cita. Specimen in in Dunedin Botanic Garden - Dunedin, New Zealand.
Photo: Daderot (CC0)
Licence: https://creativecommons.org/publicdomain/zero/1.0/deed.en
Source: https://commons.wikimedia.org/wiki/File:Poa_cita_-_Dunedin_Botanic_Garden_-_Dunedin,_NZ_-_DSC03522.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Poa_cita_-_Dunedin_Botanic_Garden_-_Dunedin%2C_NZ_-_DSC03522.jpg/960px-Poa_cita_-_Dunedin_Botanic_Garden_-_Dunedin%2C_NZ_-_DSC03522.jpg', 'SP-136', 'Wī is documented for this species. Ngā Rauropi Whakaoranga records Pātītī as a possible name in southern districts.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_aed3b846ac69', 'veronica-salicifolia', 'Veronica salicifolia', 'Willow-leaf hebe', 'Koromiko', ARRAY[]::text[], 'An evergreen shrub with a spreading, willow-like appearance. Its long flower spikes provide nectar and pollen for a range of insects.

Identification: Long, narrow leaves in opposite pairs, with drooping spikes of white or pale lilac flowers. Seed capsules also hang down rather than standing upright.

References:
Wikipedia: https://en.wikipedia.org/wiki/Veronica_salicifolia

Reference photo: Veronica salicifolia in Christchurch Botanic Gardens in Christchurch, Canterbury Region, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Veronica_salicifolia_in_Christchurch_Botanic_Gardens_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Veronica_salicifolia_in_Christchurch_Botanic_Gardens_01.jpg/960px-Veronica_salicifolia_in_Christchurch_Botanic_Gardens_01.jpg', 'SP-163', 'Older references use Hebe salicifolia. Koromiko is shared by several native hebe species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_8aba4e71bee3', 'olearia-bullata', 'Olearia bullata', 'Tree daisy', null, ARRAY[]::text[], 'A bushy native shrub with many interlacing reddish twigs. It is associated with wet places in the eastern South Island and can reach around three metres.

Identification: Tiny, wrinkled leaves with rolled edges and white undersides. The brownish-green foliage and dense tangle of twigs give the bush a greyish appearance.

References:
Wikipedia: https://en.wikipedia.org/wiki/Olearia_bullata
NZPCN: https://www.nzpcn.org.nz/flora/species/shawia-bullata/
Ashburton District Council · common name: https://www.ashburtondc.govt.nz/community-facilities/ashburton-district/native-plants-in-our-district

Reference photo: Olearia bullata in Dunedin Botanic Garden, Dunedin, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_bullata_in_Dunedin_Botanic_Garden_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Olearia_bullata_in_Dunedin_Botanic_Garden_01.jpg/960px-Olearia_bullata_in_Dunedin_Botanic_Garden_01.jpg', 'SP-110', 'Tree daisy is a group name used for several species. NZPCN now lists this plant as Shawia bullata; WRT’s recorded name is retained here.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_6fdb9268fc97', 'phormium-cookianum', 'Phormium cookianum', 'Mountain flax', 'Wharariki', ARRAY[]::text[], 'A clump-forming native flax with long leaves growing from fan-shaped bases. It generally has shorter leaves and flowering stalks than harakeke, Phormium tenax.

Identification: Greenish, yellow or orange flowers followed by long, twisted seed capsules that hang down. The drooping capsules are a useful distinction from harakeke.

References:
Wikipedia: https://en.wikipedia.org/wiki/Phormium_colensoi
NZPCN: https://www.nzpcn.org.nz/flora/species/phormium-cookianum-subsp-cookianum/

Reference photo: Phormium cookianum in Dunedin Botanic Garden, Dunedin, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Phormium_cookianum_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Phormium_cookianum_01.jpg/960px-Phormium_cookianum_01.jpg', 'SP-126', 'Wikipedia uses Phormium colensoi and explains the alternative name Phormium cookianum. The database does not specify a subspecies.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_35d9c0c225cb', 'coprosma-rigida', 'Coprosma rigida', '', null, ARRAY[]::text[], 'A bushy native coprosma with widely spreading branches. Its small paired leaves grow in clusters, while older twigs develop a conspicuous orange or reddish colour.

Identification: Tiny oval leaves, often widest near a slightly dented tip, with reddish margins. Young twigs are fuzzy; older ones are shiny orange or red. Fruit is yellow.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/coprosma-rigida/

Reference photo: Coprosma rigida in Dunedin Botanic Garden, Dunedin, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_rigida_1.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Coprosma_rigida_1.jpg/960px-Coprosma_rigida_1.jpg', 'SP-053', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_29853898874d', 'coprosma-dumosa', 'Coprosma dumosa', 'Mingimingi', 'Mingimingi', ARRAY[]::text[], 'A bushy native shrub with a layered branching pattern. It is common in montane forest and shrubland, including wetter regions and parts of the drier South Island.

Identification: Small, thick oval leaves clustered in opposite pairs along short branchlets. Tiny pits occur underneath the leaves. Ripe fruit can be orange, red or translucent white.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/coprosma-dumosa/
Wikipedia · shared Māori name: https://en.wikipedia.org/wiki/Coprosma_propinqua

Reference photo: Coprosma dumosa in Aoraki Mt Cook Village, Canterbury (New Zealand).
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_dumosa_kz1.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/Coprosma_dumosa_kz1.jpg/960px-Coprosma_dumosa_kz1.jpg', 'SP-044', 'Mingimingi is shared with several other small-leaved shrubs and does not uniquely identify this species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_efa653ee8b4f', 'aristotelia-fruticosa', 'Aristotelia fruticosa', 'Mountain wineberry', null, ARRAY[]::text[], 'A densely branching native shrub, usually no more than about two metres tall. Its leaf shape changes with age, so young and mature growth can look quite different.

Identification: Small leaves on reddish-brown branchlets, with prominent veins underneath. Juvenile leaves can be larger and irregularly lobed; small flowers range from white to pink or red.

References:
Wikipedia: https://en.wikipedia.org/wiki/Aristotelia_fruticosa
NZPCN: https://www.nzpcn.org.nz/flora/species/aristotelia-fruticosa/

Reference photo: Aristotelia fruticosa. Taken from Mount Cook National Park. Retrieved March of 2022.
Photo: Morgan Fergus (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Aristotelia_fruticosa_1.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Aristotelia_fruticosa_1.jpg/960px-Aristotelia_fruticosa_1.jpg', 'SP-005', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_e69ddaf64dd9', 'fuscospora-fusca', 'Fuscospora fusca', 'Red beech', 'Tawhai raunui', ARRAY[]::text[], 'A large evergreen native forest tree found in both main islands. It is associated with fertile, well-drained ground on lower hills and inland valley floors.

Identification: Broad oval leaves with conspicuously toothed edges, unlike the small pointed leaves of mountain beech. Mature trees can grow to around 35 metres.

References:
Wikipedia: https://en.wikipedia.org/wiki/Nothofagus_fusca

Reference photo: Fuscospora fusca (labelled Nothofagus fusca by the source) in Queenstown Gardens, Otago Region, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Nothofagus_fusca_in_Queenstown_Gardens_(1).jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Nothofagus_fusca_in_Queenstown_Gardens_%281%29.jpg/960px-Nothofagus_fusca_in_Queenstown_Gardens_%281%29.jpg', 'SP-070', 'WRT records Tawhairaunui. Wikipedia’s article uses Nothofagus fusca and notes the New Zealand name Fuscospora fusca.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_6db2b4a72ea0', 'veronica-odora', 'Veronica odora', 'Boxwood hebe', null, ARRAY[]::text[], 'A compact evergreen native shrub of mountain and subalpine scrub and grassland. Its dense, box-like foliage gives it the common name boxwood hebe.

Identification: Short oval leaves, glossy dark green above and paler below, packed closely on the branches. White flowers cluster near the branch tips.

References:
Wikipedia: https://en.wikipedia.org/wiki/Veronica_odora

Reference photo: Veronica odora in Christchurch Botanic Gardens in Christchurch, Canterbury Region, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Veronica_odora_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Veronica_odora_01.jpg/960px-Veronica_odora_01.jpg', 'SP-158', 'Older references may use Hebe odora or Hebe buxifolia. A species-specific Māori name was not verified in the sources checked.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_c5341c88529f', 'hoheria-glabrata', 'Hoheria glabrata', 'Mountain lacebark', 'Houhere', ARRAY['Houhi', 'Houi']::text[], 'A deciduous native tree of wetter mountain regions. Its green leaves turn yellow before falling in autumn, and white flowers appear in summer.

Identification: Thin leaves with broad bases, pointed tips and irregularly toothed edges. Look for a spreading form, often with several stems arising near the base.

References:
Wikipedia: https://en.wikipedia.org/wiki/Hoheria_glabrata
NZPCN: https://www.nzpcn.org.nz/flora/species/hoheria-glabrata/
Te Papa · shared Māori names: https://collections.tepapa.govt.nz/category/1807

Reference photo: Hoheria glabrata tree.
Photo: Andre Chalmers (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Hoheria-glabrata-tree.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Hoheria-glabrata-tree.jpg/960px-Hoheria-glabrata-tree.jpg', 'SP-079', 'Houhere and Houhi are shared lacebark names; Houi is documented for the mountain lacebarks. WRT records Whauwhau, which was not confirmed for this species in the references checked.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_4907dedb3ffa', 'myrsine-divaricata', 'Myrsine divaricata', 'Weeping matipo', 'Māpou', ARRAY[]::text[], 'A native shrub or small tree with stiff, interlacing branches that curve downwards. It occurs in forest, scrub and forest margins from lowland to mountain areas.

Identification: Small, leathery, often heart-shaped leaves with tiny dots and sometimes a dark blotch near their base. The fine branchlets droop; ripe berries are usually purple.

References:
Wikipedia: https://en.wikipedia.org/wiki/Myrsine_divaricata
NZPCN: https://www.nzpcn.org.nz/flora/species/myrsine-divaricata/

Reference photo: Myrsine divaricata in Whakapapa, Waikato (New Zealand).
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Myrsine_divaricata_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Myrsine_divaricata_01.jpg/960px-Myrsine_divaricata_01.jpg', 'SP-105', 'The references call this plant weeping māpou. Māpou is also used for other Myrsine species; the botanical name distinguishes this one.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_19fcc3f4551d', 'coprosma-lucida', 'Coprosma lucida', 'Shining karamū', 'Karamū', ARRAY['Kāramuramu']::text[], 'A native shrub or small tree with much larger leaves than the twiggy coprosmas. Its bright, glossy foliage can make it look similar to other broad-leaved shrubs.

Identification: Opposite pairs of glossy oval leaves, dark green above and paler below. The central leaf vein is raised on the upper surface, unlike the indented vein of Coprosma robusta.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_lucida

Reference photo: Coprosma lucida in Mount Aspiring National Park, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_lucida_in_Mount_Aspiring_National_Park_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Coprosma_lucida_in_Mount_Aspiring_National_Park_01.jpg/960px-Coprosma_lucida_in_Mount_Aspiring_National_Park_01.jpg', 'SP-048', 'Karamū is shared by several Coprosma species. Shining karamū and the botanical name help distinguish this one.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_4cbc60462d24', 'coprosma-intertexta', 'Coprosma intertexta', '', null, ARRAY[]::text[], 'A twiggy native shrub of the eastern South Island, often found in dry scrub and rocky places. It can spread by suckering to form thickets.

Identification: Very narrow, needle-like leaves, sometimes curved sideways, among reddish, widely branching twigs. Ripe fruit is small and white or pale blue.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_intertexta
NZPCN: https://www.nzpcn.org.nz/flora/species/coprosma-intertexta/

Reference photo: Coprosma intertexta in Dunedin Botanic Garden, Dunedin, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_intertexta_1.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/Coprosma_intertexta_1.jpg/960px-Coprosma_intertexta_1.jpg', 'SP-046', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_ed55615a7af3', 'melicytus-alpinus', 'Melicytus alpinus', 'Porcupine shrub', null, ARRAY[]::text[], 'A dense, rigid native shrub adapted to dry, exposed country. Its tangled branches shelter native lizards, which also eat the fruit and disperse its seeds.

Identification: Stout, tapering grey-speckled branches with sparse clusters of small oval leaves. Inconspicuous flowers sit beneath branches; white berries often have purple patches.

References:
Wikipedia: https://en.wikipedia.org/wiki/Melicytus_alpinus
NZPCN: https://www.nzpcn.org.nz/flora/species/melicytus-alpinus/

Reference photo: Melicytus alpinus. Specimen in Christchurch Botanic Gardens - Christchurch, New Zealand.
Photo: Daderot (CC0)
Licence: https://creativecommons.org/publicdomain/zero/1.0/deed.en
Source: https://commons.wikimedia.org/wiki/File:Melicytus_alpinus_-_Christchurch_Botanic_Gardens_-_Christchurch,_NZ_-_DSC00821.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Melicytus_alpinus_-_Christchurch_Botanic_Gardens_-_Christchurch%2C_NZ_-_DSC00821.jpg/960px-Melicytus_alpinus_-_Christchurch_Botanic_Gardens_-_Christchurch%2C_NZ_-_DSC00821.jpg', 'SP-094', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_2726cfd2e689', 'pseudopanax-ferox', 'Pseudopanax ferox', 'Toothed lancewood', 'Horoeka', ARRAY[]::text[], 'A small New Zealand tree whose appearance changes markedly as it matures. Young plants have a single stem and striking, jagged leaves; adults develop a branching crown and shorter leaves.

Identification: Stiff, narrow juvenile leaves hanging downward, with large, irregular teeth along the edges. Compare these with the less strongly toothed leaves of Pseudopanax crassifolius.

References:
Wikipedia: https://en.wikipedia.org/wiki/Pseudopanax_ferox

Reference photo: Pseudopanax ferox - grove at Ōtari-Wilton''s Bush.
Photo: Marshelec (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Pseudopanax_ferox_-_grove_at_%C5%8Ctari-Wilton%27s_Bush.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Pseudopanax_ferox_-_grove_at_%C5%8Ctari-Wilton%27s_Bush.jpg/960px-Pseudopanax_ferox_-_grove_at_%C5%8Ctari-Wilton%27s_Bush.jpg', 'SP-147', 'Also called fierce lancewood. Horoeka is shared with Pseudopanax crassifolius; the two species remain separate in the database.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_9a1288570193', 'aristotelia-serrata', 'Aristotelia serrata', 'Wineberry', 'Makomako', ARRAY[]::text[], 'A fast-growing native tree that readily establishes on disturbed ground and at forest edges. It may lose some leaves in winter, and its berries provide food for birds.

Identification: Broad, thin leaves with sharp serrations, often on reddish young branches. Small pink-to-red flowers are followed by berries that darken from red to black.

References:
Wikipedia: https://en.wikipedia.org/wiki/Aristotelia_serrata

Reference photo: Aristotelia serrata in Mount Aspiring National Park, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Aristotelia_serrata_in_Mount_Aspiring_National_Park_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Aristotelia_serrata_in_Mount_Aspiring_National_Park_01.jpg/960px-Aristotelia_serrata_in_Mount_Aspiring_National_Park_01.jpg', 'SP-006', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_1f320bbffd15', 'chionochloa-rubra', 'Chionochloa rubra', 'Red tussock', 'Haumata', ARRAY[]::text[], 'A long-lived native tussock grass with fine, arching leaves. Its foliage can range from greenish brown to copper or red, and it forms conspicuous clumps in grassland.

Identification: Tall tufts of very slender leaves, commonly with reddish or bronze colouring. Flowering stems rise within or just above the foliage.

References:
Wikipedia: https://en.wikipedia.org/wiki/Chionochloa_rubra
Manaaki Whenua — Haumata: https://www.landcareresearch.co.nz/about-us/our-locations/te-rauhitanga/the-names-of-our-meeting-rooms/

Reference photo: Chionochloa rubra in Burwood Bush Scientific Reserve in Southland region, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Chionochloa_rubra_in_Burwood_Bush_Scientific_Reserve_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Chionochloa_rubra_in_Burwood_Bush_Scientific_Reserve_01.jpg/960px-Chionochloa_rubra_in_Burwood_Bush_Scientific_Reserve_01.jpg', 'SP-035', 'Haumata is recorded for this species by Manaaki Whenua. The database does not identify a subspecies.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_3b6b7f771e69', 'pittosporum-eugenioides', 'Pittosporum eugenioides', 'Lemonwood', 'Tarata', ARRAY[]::text[], 'An evergreen native tree found at forest margins and beside streams. Young trees have a compact, conical shape, becoming broader and more rounded as they mature.

Identification: Yellow-green leaves with wavy edges and a conspicuous pale midrib. Fragrant cream-to-yellow flower clusters appear in spring; the foliage is known for its lemon scent.

References:
Wikipedia: https://en.wikipedia.org/wiki/Pittosporum_eugenioides

Reference photo: Pittosporum eugenioides in Auckland Botanic Gardens, Manurewa, South Auckland, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Pittosporum_eugenioides_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Pittosporum_eugenioides_01.jpg/960px-Pittosporum_eugenioides_01.jpg', 'SP-132', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_aa3de90bb948', 'ozothamnus-vauvilliersii', 'Ozothamnus vauvilliersii', 'Mountain cottonwood', 'Tauhinu', ARRAY[]::text[], 'A bushy native shrub of open grassland, shrubland and disturbed sites. It has small leaves and dense clusters of white flowers, followed by fluffy seeds.

Identification: Short, narrow-to-oval leaves, yellow-green above and hairy beneath, with white flower heads clustered at the ends of branches.

References:
Wikipedia: https://en.wikipedia.org/wiki/Ozothamnus_vauvilliersii
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/ozothamnus-vauvilliersii/
Kew — vernacular names: https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:236324-1/general-information

Reference photo: Ozothamnus vauvilliersii in Egmont National Park in Taranaki Region, North Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Ozothamnus_vauvilliersii_in_Egmont_NP_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Ozothamnus_vauvilliersii_in_Egmont_NP_01.jpg/960px-Ozothamnus_vauvilliersii_in_Egmont_NP_01.jpg', 'SP-123', 'NZPCN calls this mountain tauhinu; Kew also records mountain cottonwood. Tauhinu is shared with other shrubs. NZPCN discusses its relationship to Ozothamnus leptophyllus; WRT’s contested names remain separate.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_577a8f7d1bc5', 'discaria-toumatou', 'Discaria toumatou', 'Matagouri', 'Tūmatakuru', ARRAY[]::text[], 'A slow-growing, thorny native shrub common in the eastern South Island. It grows in tussock grassland and stony river beds, and bacteria in its roots help it obtain nitrogen.

Identification: A tangled network of stout spines, with tiny green leaves appearing near their bases in spring and early summer. Small, scented white flowers have no true petals.

References:
Wikipedia: https://en.wikipedia.org/wiki/Discaria_toumatou

Reference photo: Discaria toumatou at Governor''s Bush Walk in Aoraki/Mount Cook National Park, Canterbury Region, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Discaria_toumatou_in_Aoraki_Mount_Cook_NP_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Discaria_toumatou_in_Aoraki_Mount_Cook_NP_01.jpg/960px-Discaria_toumatou_in_Aoraki_Mount_Cook_NP_01.jpg', 'SP-063', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_dbb810b9fb48', 'poa-colensoi', 'Poa colensoi', 'Blue tussock', null, ARRAY[]::text[], 'A native grass that forms small, closely packed tussocks. Its foliage varies from blue-green to light green, and it is a familiar component of New Zealand high-country grassland.

Identification: Dense clumps of narrow, stiff leaves. Slender flowering stems often extend above the foliage; use the linked botanical description to distinguish it from similar grasses.

References:
Wikipedia: https://en.wikipedia.org/wiki/Poa_colensoi
Flora of New Zealand: https://www.nzflora.info/factsheet/taxon/Poa-colensoi.html

Reference photo: Poa colensoi in Dunedin Botanic Garden, Dunedin, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Poa_colensoi_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Poa_colensoi_01.jpg/960px-Poa_colensoi_01.jpg', 'SP-137', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_4125948a1a38', 'veronica-cupressoides', 'Veronica cupressoides', 'Cypress hebe', null, ARRAY[]::text[], 'An aromatic, bushy native shrub of eastern South Island grey scrub. Its fine branchlets and tiny scale leaves give it a cypress-like appearance, despite being a flowering shrub.

Identification: Slender blue-green branchlets with widely spaced, triangular scale leaves. Small pale pink, mauve or blue flowers occur near the shoot tips.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/veronica-cupressoides/

Reference photo: Veronica cupressoides at Wellington Botanic Garden.
Photo: Siobhan Leachman (CC0)
Licence: https://creativecommons.org/publicdomain/zero/1.0/deed.en
Source: https://commons.wikimedia.org/wiki/File:Veronica_cupressoides_at_WBG.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Veronica_cupressoides_at_WBG.jpg/960px-Veronica_cupressoides_at_WBG.jpg', 'SP-155', 'Older sources and some image files use Hebe cupressoides. This profile applies only to Veronica cupressoides and does not merge WRT’s disputed names.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_60aebec5449b', 'olearia-avicenniifolia', 'Olearia avicenniifolia', 'Mountain akeake', 'Akeake', ARRAY[]::text[], 'A bushy New Zealand shrub or small tree with leathery leaves and clusters of white daisy-like flowers. Pale hairs on the leaf undersides and young shoots give it a distinctive appearance.

Identification: Narrow, pointed, dark-green leaves with white, felted undersides. The white flower clusters develop into fluffy seeds.

References:
Wikipedia: https://en.wikipedia.org/wiki/Olearia_avicenniifolia
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/shawia-avicenniifolia/
NZOR — Akeake: https://www.nzor.org.nz/names/47ccb479-4148-4a6c-82c5-32c50bea750f

Reference photo: Olearia avicenniifolia in Aoraki Mt Cook Village, Canterbury (New Zealand).
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_avicenniifolia_kz01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Olearia_avicenniifolia_kz01.jpg/960px-Olearia_avicenniifolia_kz01.jpg', 'SP-109', 'NZPCN and Wikipedia now use Shawia avicenniifolia; the database retains Olearia avicenniifolia. Akeake is a shared Māori name used for several trees, including Dodonaea viscosa.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_f8297a64afe6', 'myrsine-australis', 'Myrsine australis', 'Red matipo', 'Māpou', ARRAY['Tīpau', 'Mataira']::text[], 'A native shrub or small tree with a compact crown. It occurs across New Zealand in scrub and forest margins and often establishes during natural regeneration.

Identification: Reddish young stems and leaf stalks, with pale yellow-green, leathery leaves that usually have wavy edges. Small translucent dots may be visible in the leaves.

References:
Wikipedia: https://en.wikipedia.org/wiki/Myrsine_australis

Reference photo: Myrsine australis in Auckland Botanic Gardens, Manurewa, South Auckland, New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Myrsine_australis_in_Auckland_Botanic_Gardens_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Myrsine_australis_in_Auckland_Botanic_Gardens_01.jpg/960px-Myrsine_australis_in_Auckland_Botanic_Gardens_01.jpg', 'SP-104', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_ddd461ba9dab', 'carex-buchananii', 'Carex buchananii', 'Buchanan’s sedge', null, ARRAY[]::text[], 'A densely tufted native sedge known for its reddish-brown foliage. It occurs beside lakes and streams and in other open habitats from coastal areas into the mountains.

Identification: A close-packed tuft of narrow reddish-brown leaves. Its colour alone is not enough to separate it from other brown sedges; check the linked species description.

References:
Wikipedia: https://en.wikipedia.org/wiki/Carex_buchananii

Reference photo: Carex buchananii specimen in the Botanischer Garten München-Nymphenburg, Munich, Germany.
Photo: Daderot (Public domain)
Licence: https://commons.wikimedia.org/wiki/File:Carex_buchananii_-_Botanischer_Garten_M%C3%BCnchen-Nymphenburg_-_DSC07706.JPG#Licensing
Source: https://commons.wikimedia.org/wiki/File:Carex_buchananii_-_Botanischer_Garten_M%C3%BCnchen-Nymphenburg_-_DSC07706.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Carex_buchananii_-_Botanischer_Garten_M%C3%BCnchen-Nymphenburg_-_DSC07706.JPG/960px-Carex_buchananii_-_Botanischer_Garten_M%C3%BCnchen-Nymphenburg_-_DSC07706.JPG', 'SP-012', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_129b4c040cb1', 'carpodetus-serratus', 'Carpodetus serratus', 'Marbleleaf', 'Putaputawētā', ARRAY[]::text[], 'A native tree found at forest margins and along river banks. Young plants have tangled, zig-zagging branches, while mature trees develop a more open tree form.

Identification: Finely toothed leaves with a marbled pattern of green shades. Small white flowers occur in clusters, and the grey bark can be knobbly or marked by insect tunnels.

References:
Wikipedia: https://en.wikipedia.org/wiki/Carpodetus_serratus

Reference photo: Flowering Carpodetus serratus, a tree species endemic to New Zealand.
At Lake Wilkie in the Catlins, New Zealand.
Photo: MurielBendel (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Carpodetus_serratus_Lake_Wilkie_Catlins_1.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Carpodetus_serratus_Lake_Wilkie_Catlins_1.JPG/960px-Carpodetus_serratus_Lake_Wilkie_Catlins_1.JPG', 'SP-029', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_c51d0fc5cdac', 'olearia-fragrantissima', 'Olearia fragrantissima', 'Fragrant tree daisy', null, ARRAY[]::text[], 'A native shrub or small tree of the eastern and southern South Island. Its small flower clusters have a strong, sweet fragrance, particularly at night, and it can lose some or all of its leaves seasonally.

Identification: Reddish-brown, zig-zagging twigs; small leaves that are hairy underneath; and tight clusters of pale yellow flowers. Older bark peels in long strips.

References:
Wikipedia: https://en.wikipedia.org/wiki/Olearia_fragrantissima
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/shawia-fragrantissima/

Reference photo: Olearia fragrantissima in Dunedin Botanic Garden.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_fragrantissima_kz01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Olearia_fragrantissima_kz01.jpg/960px-Olearia_fragrantissima_kz01.jpg', 'SP-113', 'NZPCN now uses Shawia fragrantissima. The profile keeps Olearia fragrantissima to match WRT’s historical species ID.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_d998e447ee1e', 'pseudopanax-crassifolius', 'Pseudopanax crassifolius', 'Lancewood', 'Horoeka', ARRAY[]::text[], 'A native tree with dramatically different juvenile and adult forms. Young plants carry long, downward-pointing leaves on one slender stem; mature trees branch and develop a rounded crown.

Identification: Long, stiff juvenile leaves with a prominent midrib and toothed edges. Adult leaves are much shorter and broader. Pseudopanax ferox has more strongly jagged juvenile leaves.

References:
Wikipedia: https://en.wikipedia.org/wiki/Pseudopanax_crassifolius

Reference photo: Pseudopanax crassifolius at Governor''s Bush Walk in Aoraki/Mount Cook National Park, Canterbury Region, South Island of New Zealand.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Pseudopanax_crassifolius_in_Aoraki_Mount_Cook_NP_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Pseudopanax_crassifolius_in_Aoraki_Mount_Cook_NP_01.jpg/960px-Pseudopanax_crassifolius_in_Aoraki_Mount_Cook_NP_01.jpg', 'SP-146', 'Horoeka is also used for toothed lancewood, Pseudopanax ferox. Their profiles and planting records remain separate.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_cd737884a207', 'coprosma-linariifolia', 'Coprosma linariifolia', 'Yellow wood', 'Mikimiki', ARRAY[]::text[], 'A native shrub or small tree found in forest and scrub from the central North Island southward. Its inner wood is yellow, giving rise to its English common name.

Identification: Pairs of narrow leaves on dark, fuzzy twigs. The leaves are paler underneath, and ripe fruit is white with blue flecks.

References:
Wikipedia: https://en.wikipedia.org/wiki/Coprosma_linariifolia
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/coprosma-linariifolia/

Reference photo: Coprosma linariifolia, at Otari-Wilton''s Bush, Wellington, New Zealand.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_linariifolia_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Coprosma_linariifolia_11.JPG/960px-Coprosma_linariifolia_11.JPG', 'SP-047', 'Mikimiki is a shared name for several small-leaved shrubs; it does not uniquely identify this species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_1aa610040857', 'carex-virgata', 'Carex virgata', 'Swamp sedge', 'Pukio', ARRAY['Toitoi', 'Toetoe']::text[], 'A densely clumped native sedge of wetlands, damp forest and stream margins across New Zealand.

Identification: Narrow light-green leaves form a tussock; stiff upright brown flowering panicles help separate it from drooping Carex secta.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/carex-virgata/

Reference photo: Carex virgata tussock in Auckland Botanic Gardens.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Carex_virgata_kz1.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Carex_virgata_kz1.jpg/960px-Carex_virgata_kz1.jpg', 'SP-018', 'NZPCN treats Carex virgata as a species and lists Carex appressa var. virgata as a synonym; Commons uses that older category. Pukio, toitoi and toetoe follow NZPCN’s spellings and are shared names also used for other sedges or grasses.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_9fe4dd10ce07', 'fuchsia-excorticata', 'Fuchsia excorticata', 'Tree fuchsia', 'Kōtukutuku', ARRAY[]::text[], 'A spreading endemic tree with peeling bark and flowers borne directly on woody branches. It can lose its leaves in southern New Zealand.

Identification: Thin pointed leaves have pale undersides; hanging green-to-purple flowers and flaky orange-brown bark are distinctive.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/fuchsia-excorticata/

Reference photo: Mature Fuchsia excorticata growing in situ.
Photo: Alexeyevitch (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Fuchsia_excorticata_-_mature_specimen.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Fuchsia_excorticata_-_mature_specimen.jpg/960px-Fuchsia_excorticata_-_mature_specimen.jpg', 'SP-068', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_ba91ee61c8bf', 'dacrycarpus-dacrydioides', 'Dacrycarpus dacrydioides', 'White pine', 'Kahikatea', ARRAY[]::text[], 'A tall endemic conifer of lowland forest, especially river flats and poorly drained ground. Mature trees often have buttressed trunks.

Identification: Fine scale-like adult foliage and dark seeds held above orange-red fleshy receptacles; young adult trees have a narrow crown.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/dacrycarpus-dacrydioides/

Reference photo: Young adult Dacrycarpus dacrydioides showing its crown.
Photo: Jacqui Geux (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Dacrycarpus_dacrydioides_young_adult.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Dacrycarpus_dacrydioides_young_adult.jpg/960px-Dacrycarpus_dacrydioides_young_adult.jpg', 'SP-061', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_fc06d0b81319', 'lophozonia-menziesii', 'Lophozonia menziesii', 'Silver beech', 'Tāwhairauriki', ARRAY[]::text[], 'An evergreen endemic forest tree found from lowland to mountain forest, sometimes forming a shrub near the treeline.

Identification: Small leathery nearly round leaves have uneven rounded teeth; young trunks carry silvery-grey bark.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/lophozonia-menziesii/
Flora of New Zealand · names: https://www.nzflora.info/factsheet/taxon/Lophozonia-menziesii.html

Reference photo: Lophozonia menziesii bark and foliage, catalogued as Nothofagus menziesii.
Photo: Kate McAlpine (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Nothofagus_menziesii_bark_and_foliage.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Nothofagus_menziesii_bark_and_foliage.jpg/960px-Nothofagus_menziesii_bark_and_foliage.jpg', 'SP-092', 'NZPCN uses Lophozonia menziesii and lists Nothofagus menziesii as a synonym. The selected Commons images retain the Nothofagus name.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_a4e36c14fe9d', 'prumnopitys-taxifolius', 'Prumnopitys taxifolius', 'Black pine', 'Mataī', ARRAY[]::text[], 'An endemic conifer of lowland forest with a distinctive tangled juvenile stage and tall mature trees.

Identification: Adult leaves are short and flattened; circular bark flakes leave a hammered pattern, and ripe fruits are purple-black.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/prumnopitys-taxifolia/

Reference photo: Mataī tree in Auckland, identified by the source as Prumnopitys taxifolia.
Photo: Kahuroa (Public domain)
Licence: https://commons.wikimedia.org/wiki/Template:PD-self
Source: https://commons.wikimedia.org/wiki/File:MataiTree877.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/MataiTree877.jpg/960px-MataiTree877.jpg', 'SP-142', 'WRT’s database spelling Prumnopitys taxifolius is retained. NZPCN and the photo sources identify mataī as Prumnopitys taxifolia.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_3b7b7507f199', 'hoheria-sexstylosa', 'Hoheria sexstylosa', 'Lacebark', 'Houhere', ARRAY[]::text[], 'A native tree of streamside forest in central New Zealand. Its tangled juvenile growth develops into a taller tree with larger leaves.

Identification: Toothed, pointed adult leaves and grey bark; white flowers are followed by winged dry fruit. Juvenile leaves are smaller and rounder.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/hoheria-sexstylosa/

Reference photo: Hoheria sexstylosa, long-leaved lacebark, on Wright''s Hill, Karori, Wellington.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Hoheria_sexstylosa_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Hoheria_sexstylosa_11.JPG/960px-Hoheria_sexstylosa_11.JPG', 'SP-081', 'Houhere and lacebark are shared by other Hoheria species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_a0f8bb1888eb', 'pseudopanax-colensoi', 'Pseudopanax colensoi', 'Mountain five-finger', 'Orihou', ARRAY[]::text[], 'An endemic shrub or small tree with spreading branches. Its leaves are divided into several broad, leathery leaflets.

Identification: Three to five leaflets radiating from a long stalk, with coarse teeth toward their ends. Small flowers occur in branched umbels and fruit darkens almost to black.

References:
Flora of New Zealand: https://www.nzflora.info/factsheet/Taxon/Pseudopanax-colensoi.html

Reference photo: Pseudopanax colensoi at Governor''s Bush Walk in Aoraki/Mount Cook National Park, Canterbury Region, South Island of New Zealand
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Pseudopanax_colensoi_in_Aoraki_Mount_Cook_NP_03.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Pseudopanax_colensoi_in_Aoraki_Mount_Cook_NP_03.jpg/960px-Pseudopanax_colensoi_in_Aoraki_Mount_Cook_NP_03.jpg', 'SP-145', 'Flora of New Zealand recognises three varieties; no variety is assigned to this database entry. Neopanax colensoi is a synonym.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_d7b3a4384c0a', 'coprosma-rhamnoides', 'Coprosma rhamnoides', 'Twiggy coprosma', null, ARRAY[]::text[], 'An endemic small shrub with a dense tangle of widely spreading twigs. Its small leaves vary considerably in shape.

Identification: Tiny paired leaves clustered on fine branches, often unequal in a pair. Small dark-red berries are a useful seasonal feature.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/coprosma-rhamnoides/
Wikipedia · common names: https://en.wikipedia.org/wiki/Coprosma_rhamnoides

Reference photo: Coprosma rhamnoides, or twiggy coprosma fruiting in Upper Hutt, New Zealand.
Photo: Rudolph89 (CC0)
Licence: https://creativecommons.org/publicdomain/zero/1.0/deed.en
Source: https://commons.wikimedia.org/wiki/File:Coprosma_rhamnoides_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Coprosma_rhamnoides_11.JPG/960px-Coprosma_rhamnoides_11.JPG', 'SP-052', 'No species-specific Māori name was verified in the sources checked.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_c31b60b0e0f4', 'metrosideros-umbellata', 'Metrosideros umbellata', 'Southern rātā', 'Rātā', ARRAY[]::text[], 'An endemic forest tree concentrated in southern and western New Zealand. It can form gnarled trees or remain low in exposed places.

Identification: Leathery opposite leaves taper to sharp tips. Summer flowers have masses of red projecting stamens; mature bark flakes in thin strips.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/metrosideros-umbellata/

Reference photo: Foliage of Metrosideros umbellata
Photo: René Boe Sørensen (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Foliage_of_Metrosideros_umbellata.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Foliage_of_Metrosideros_umbellata.jpg/960px-Foliage_of_Metrosideros_umbellata.jpg', 'SP-098', 'Rātā is a shared name for several Metrosideros species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_a99eaa6ba41e', 'leonohebe-cupressoides', 'Leonohebe cupressoides', 'Cypress hebe', null, ARRAY[]::text[], 'An aromatic native shrub of eastern South Island scrub. Fine branchlets and tiny scale leaves give it a cypress-like outline.

Identification: Slender green to blue-green branchlets with small triangular leaves clasping the stem. Small pale blue or mauve flowers occur near the tips.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/veronica-cupressoides/

Reference photo: Cypress hebe reference under the verified synonym Veronica cupressoides: scale leaves and jointed green branchlets.
Photo: Siobhan Leachman (CC0)
Licence: https://creativecommons.org/publicdomain/zero/1.0/deed.en
Source: https://commons.wikimedia.org/wiki/File:Veronica_cupressoides2_at_WBG.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Veronica_cupressoides2_at_WBG.jpg/960px-Veronica_cupressoides2_at_WBG.jpg', 'SP-086', 'NZPCN lists Leonohebe cupressoides as a synonym of Veronica cupressoides. WRT’s SP-086 and SP-155 remain separate pending its identity ruling; these are synonym-based illustrations, not proof of the identity of recorded plantings.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_6b679bb2b009', 'podocarpus-nivalis', 'Podocarpus nivalis', 'Mountain tōtara', 'Tauhinu', ARRAY[]::text[], 'A spreading New Zealand conifer shrub of mountain scrub, tussock grassland and rocky alpine ground. Its branches often form a low, dense dome.

Identification: Small, closely spaced stiff leaves on densely leafy twigs; green seeds sit above swollen red receptacles.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/podocarpus-nivalis/
Flora of New Zealand: https://www.nzflora.info/factsheet/taxon/Podocarpus-nivalis.html

Reference photo: Mountain tōtara forming a low patch in the Kakanui Mountains.
Photo: John Barkla (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Podocarpus_nivalis_-_John_Barkla_-_1573555.jpeg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Podocarpus_nivalis_-_John_Barkla_-_1573555.jpeg/960px-Podocarpus_nivalis_-_John_Barkla_-_1573555.jpeg', 'SP-139', 'Flora of New Zealand lists Tauhinu for Podocarpus nivalis. Tauhinu is shared with other shrubs; mountain tōtara and snow tōtara are also documented common names, and tōtara occurs in the names of several Podocarpus species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_f8e51088649e', 'lophomyrtus-obcordata', 'Lophomyrtus obcordata', 'Rōhutu', 'Rōhutu', ARRAY[]::text[], 'An endemic bushy shrub or small tree of coastal and lowland forest. It has small firm leaves, white flowers and red to dark berries.

Identification: Opposite leaves with a clear notch at the tip, giving a reversed heart shape; white flowers have many stamens.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/lophomyrtus-obcordata/

Reference photo: Rōhutu foliage and berries at Pati Tapu Bush Scenic Reserve.
Photo: Anna Burrows (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Lophomyrtus_obcordata_at_Pati_Tapu_Bush_Scenic_Reserve.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Lophomyrtus_obcordata_at_Pati_Tapu_Bush_Scenic_Reserve.jpg/960px-Lophomyrtus_obcordata_at_Pati_Tapu_Bush_Scenic_Reserve.jpg', 'SP-091', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_536ab36e4920', 'halocarpus-bidwillii', 'Halocarpus bidwillii', 'Bog pine', null, ARRAY[]::text[], 'A much-branched New Zealand conifer shrub or small tree with different juvenile and adult foliage. Some spreading branches root where they touch the ground.

Identification: Adult twigs have tiny overlapping scale leaves; dark grooved seeds are held in conspicuous waxy white cups.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/halocarpus-bidwillii/

Reference photo: Bog pine shrubs in the Wilderness Reserve.
Photo: Pseudopanax at English Wikipedia (Public domain)
Licence: https://commons.wikimedia.org/wiki/Commons:Public_domain
Source: https://commons.wikimedia.org/wiki/File:Halocarpus_bidwillii_in_Wilderness_Reserve.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Halocarpus_bidwillii_in_Wilderness_Reserve.jpg/960px-Halocarpus_bidwillii_in_Wilderness_Reserve.jpg', 'SP-074', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_eba47e5fd50a', 'melicytus-ramiflorus', 'Melicytus ramiflorus', 'Whitey wood', 'Māhoe', ARRAY['Hinahina']::text[], 'A common native small tree in coastal, lowland and lower mountain forests. Its pale bark and toothed leaves are useful recognition features.

Identification: Light green tapered leaves with toothed edges; tiny flowers cluster along twigs and berries ripen purple.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/melicytus-ramiflorus-subsp-ramiflorus/

Reference photo: Māhoe tapered, toothed foliage.
Photo: Kahuroa (Public domain)
Licence: https://commons.wikimedia.org/wiki/Commons:Public_domain
Source: https://commons.wikimedia.org/wiki/File:Mahoe-foliage.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Mahoe-foliage.jpg/960px-Mahoe-foliage.jpg', 'SP-095', 'The NZPCN factsheet uses Melicytus ramiflorus subsp. ramiflorus for the New Zealand taxon and discusses the treatment of former Pacific subspecies. The WRT species-level name is retained.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_f867f06fed62', 'coprosma-acerosa', 'Coprosma acerosa', 'Sand coprosma', 'Tātaraheke', ARRAY[]::text[], 'A low sprawling shrub endemic to New Zealand coastal sands. Orange-brown interlacing twigs form cushions or trailing patches.

Identification: Narrow small leaves in opposite pairs or clusters; translucent pale blue fruit can have darker flecks.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/coprosma-acerosa/

Reference photo: Sand coprosma on the Petone foreshore.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_acerosa_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Coprosma_acerosa_11.JPG/960px-Coprosma_acerosa_11.JPG', 'SP-038', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_e0d21fa72909', 'helichrysum-lanceolatum', 'Helichrysum lanceolatum', 'Hells bells', 'Niniao', ARRAY[]::text[], 'An endemic, much-branched shrub of open forest, scrub and rocky places. It can reach about three metres.

Identification: Alternate oval-to-rounded leaves have white woolly undersides; small creamy flower heads gather into rounded clusters.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/helichrysum-lanceolatum/
Flora of New Zealand: https://www.nzflora.info/factsheet/Taxon/Helichrysum-lanceolatum.html
DOC · names: https://www.doc.govt.nz/nature/native-plants/canterbury-native-plants/native-plants-natural-to-coastal-areas/

Reference photo: Helichrysum lanceolatum shrub in Dunedin Botanic Garden.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Helichrysum_lanceolatum_kz07.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Helichrysum_lanceolatum_kz07.jpg/960px-Helichrysum_lanceolatum_kz07.jpg', 'SP-077', 'Niniao is documented by DOC and Flora of New Zealand. Helichrysum glomeratum and Helichrysum aggregatum are historical names listed in the botanical references.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_58f5f0463ad8', 'pennantia-corymbosa', 'Pennantia corymbosa', 'Kaikōmako', 'Kaikōmako', ARRAY[]::text[], 'An endemic small tree found across New Zealand. Young plants form a dense mesh of zigzagging twigs before developing a more open adult crown.

Identification: Juvenile leaves are tiny with lobed tips; adult leaves are larger but retain small lobes or teeth near their ends.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/pennantia-corymbosa/

Reference photo: Pennantia corymbosa tree at Ngā Manu Nature Reserve, Waikanae.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Pennantia_corymbosa_tree11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Pennantia_corymbosa_tree11.JPG/960px-Pennantia_corymbosa_tree11.JPG', 'SP-125', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_000f800365a1', 'elaeocarpus-hookerianus', 'Elaeocarpus hookerianus', 'Pōkākā', 'Pōkākā', ARRAY[]::text[], 'An endemic forest tree with sharply different juvenile and adult foliage, found from lowland to mountain forest.

Identification: Young plants have interlacing twigs and variable narrow leaves. Adult leaves are larger; small hanging flowers have finely fringed edges.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/elaeocarpus-hookerianus/

Reference photo: Juvenile Elaeocarpus hookerianus beside the Lake Marian Trail, Southland.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Elaeocarpus_hookerianus_kz6.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Elaeocarpus_hookerianus_kz6.jpg/960px-Elaeocarpus_hookerianus_kz6.jpg', 'SP-066', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_283431067545', 'olearia-arborescens', 'Olearia arborescens', 'Common tree daisy', null, ARRAY[]::text[], 'A bushy endemic shrub or small tree of forest and scrub from lowland to mountain environments.

Identification: Glossy leathery leaves have pale undersides and a few teeth; clusters of white daisy flowers later produce fluffy seeds.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/shawia-arborescens/

Reference photo: Olearia arborescens leafy branch in Whakapapa; NZPCN now uses Shawia arborescens.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_arborescens_kz01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Olearia_arborescens_kz01.jpg/960px-Olearia_arborescens_kz01.jpg', 'SP-108', 'NZPCN now accepts Shawia arborescens and lists Olearia arborescens as a synonym. WRT’s database name and species ID remain separate from that nomenclatural update.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_259e2e6cd76e', 'chionochloa-rigida', 'Chionochloa rigida', 'Narrow-leaved snow tussock', 'Wī kura', ARRAY[]::text[], 'An endemic tall tussock of the South Island, especially eastern and southern hill and mountain grasslands.

Identification: Long narrow golden-green leaves sweep outward from a dense base; tall flowering stems carry open branched panicles.

References:
Flora of New Zealand: https://www.nzflora.info/factsheet/taxon/Chionochloa-rigida.html
Wikipedia · names: https://en.wikipedia.org/wiki/Chionochloa_rigida
Dunedin City Council · planting schedule: https://www.dunedin.govt.nz/resources/documents/council/central-city-plan/previuous-documents/george-street/developed-design-report.pdf

Reference photo: Chionochloa rigida on Flagstaff, Dunedin.
Photo: John Barkla (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Chionochloa_rigida_in_Flagstaff.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Chionochloa_rigida_in_Flagstaff.jpg/960px-Chionochloa_rigida_in_Flagstaff.jpg', 'SP-034', 'Wī kura is documented by Wikipedia and a Dunedin City Council planting schedule. WRT’s Hunangamoho was not confirmed for this species; NZPCN applies that shared name to Chionochloa conspicua. Flora recognises two subspecies; this profile does not assign WRT stock to either.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_310f90139a4c', 'olearia-nummularifolia', 'Olearia nummularifolia', '', null, ARRAY[]::text[], 'A bushy native shrub of subalpine country. Its compact, leathery leaves have pale undersides.

Identification: Small yellow-green oval leaves with rolled-under edges and white undersides. Sticky yellow twigs bear small clusters of white daisy flowers.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/shawia-nummulariifolia/

Reference photo: Olearia nummulariifolia in Dunedin Botanic Garden, Dunedin, New Zealand Reference for the verified Shawia nummulariifolia synonym; database spelling retained.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Olearia_nummulariifolia_in_Dunedin_Botanic_Garden_10.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Olearia_nummulariifolia_in_Dunedin_Botanic_Garden_10.jpg/960px-Olearia_nummulariifolia_in_Dunedin_Botanic_Garden_10.jpg', 'SP-117', 'NZPCN now uses Shawia nummulariifolia, with Olearia nummulariifolia as a synonym. WRT’s recorded spelling Olearia nummularifolia is retained. Its separate cymbifolia line remains for WRT to resolve; no quantities or IDs are merged.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_013cc84d906c', 'ozothamnus-leptophyllus', 'Ozothamnus leptophyllus', 'Tauhinu', 'Tauhinu', ARRAY[]::text[], 'A variable native shrub found from coastal scrub to subalpine country throughout New Zealand. Its foliage may look grey, yellow-green or green.

Identification: Very small narrow leaves, pale and woolly underneath, on slender branchlets. Small flower heads form flat-topped clusters at the tips; mature seeds have fluffy hairs.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/ozothamnus-leptophyllus/

Reference photo: Ozothamnus leptophyllus, tauhinu
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Ozothamnus_leptophyllus_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Ozothamnus_leptophyllus_11.JPG/960px-Ozothamnus_leptophyllus_11.JPG', 'SP-122', 'Tauhinu is shared with other shrubs. NZPCN lists Cassinia leptophylla as a synonym and discusses a broad, variable species concept. WRT’s separate leptophyllus, vauvilliersii and fulvida lines remain unresolved and are not merged here.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_4ff97b13e727', 'pseudopanax-arboreus', 'Pseudopanax arboreus', 'Five finger', 'Whauwhaupaku', ARRAY[]::text[], 'An endemic small tree of moist forest, stream margins and regenerating bush. It is widespread through both main islands, though uncommon in Central Otago.

Identification: Glossy toothed leaflets radiate from long stalks, usually in groups of five. Dark purple-black fruit forms conspicuous branched clusters.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/pseudopanax-arboreus/

Reference photo: A five finger tree (Pseudopanax arboreus). Brookfield Stream Reserve, Albany, Auckland, New Zealand.
Photo: Bjankuloski06 (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Five_finger_tree,_Brookfield_Stream_Reserve.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Five_finger_tree%2C_Brookfield_Stream_Reserve.jpg/960px-Five_finger_tree%2C_Brookfield_Stream_Reserve.jpg', 'SP-143', 'Five finger is shared with other Pseudopanax species. Some sources use Neopanax arboreus; WRT’s recorded name is retained.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_8612ba0969f3', 'veronica-hectorii', 'Veronica hectorii', 'Whipcord hebe', null, ARRAY[]::text[], 'An endemic compact shrub of mountain grassland and scrub in the South and Stewart islands. Its tightly pressed scale leaves make the shoots look like cords.

Identification: Short upright shoots sheathed in overlapping pairs of glossy green or olive scale leaves. Small white flowers crowd the branch tips.

References:
Flora of New Zealand: https://www.nzflora.info/factsheet/Taxon/Veronica-hectorii.html

Reference photo: Veronica hectorii in Christchurch Botanic Gardens in Christchurch, Canterbury Region, New Zealand
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Veronica_hectorii_in_Christchurch_Botanic_Gardens_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Veronica_hectorii_in_Christchurch_Botanic_Gardens_01.jpg/960px-Veronica_hectorii_in_Christchurch_Botanic_Gardens_01.jpg', 'SP-156', 'Whipcord hebe is shared with several species. Flora of New Zealand recognises three subspecies and lists Hebe hectorii and Leonohebe hectorii as synonyms. No subspecies is assigned here, and WRT’s disputed separate demissa line remains unresolved.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_26f68cad6f10', 'muehlenbeckia-complexa', 'Muehlenbeckia complexa', 'Wire vine', 'Pōhuehue', ARRAY['Pōhue', 'Pōpōhue', 'Tororaro', 'Waekāhu']::text[], 'A native climbing or sprawling plant with many interlacing stems. It grows over other vegetation and can form dense tangled masses.

Identification: Small rounded or broadly oval leaves on wiry stems. Tiny pale flowers occur along the shoots, followed by dark seeds surrounded by pale fleshy flower parts.

References:
Flora of New Zealand: https://www.nzflora.info/factsheet/Taxon/Muehlenbeckia-complexa.html
NZPCN · names for the typical variety: https://www.nzpcn.org.nz/flora/species/muehlenbeckia-complexa-var-complexa/
Wikipedia · shared name: https://en.wikipedia.org/wiki/Muehlenbeckia_complexa

Reference photo: Muehlenbeckia complexa foliage and small pale flowers at Waikanae Beach, New Zealand.
Photo: Stuart Yeates (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Muehlenbeckia_complexawith_flowers.jpeg', 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Muehlenbeckia_complexawith_flowers.jpeg', 'SP-103', 'Flora of New Zealand records these vernacular names. Pōhuehue is shared with other climbers, including Muehlenbeckia australis; Tororaro is also used for other Muehlenbeckia species. NZPCN recognises varieties; this species-level profile does not assign a variety to WRT’s records.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_05251bbe36ec', 'phyllocladus-alpinus', 'Phyllocladus alpinus', 'Mountain celery pine', 'Toatoa', ARRAY[]::text[], 'An endemic conifer shrub or small tree chiefly found in subalpine scrub and low alpine habitats, also occurring on low-elevation frost flats.

Identification: Flattened grey-green leaf-like stems, called phylloclades, with lobed or toothed margins; seeds develop on red fleshy scales.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/phyllocladus-alpinus/

Reference photo: Mountain celery pine with red cone structures at Tongariro.
Photo: Matt Berger (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Mountain_Toatoa_(Phyllocladus_alpinus).jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Mountain_Toatoa_%28Phyllocladus_alpinus%29.jpg/960px-Mountain_Toatoa_%28Phyllocladus_alpinus%29.jpg', 'SP-128', 'NZPCN lists mountain toatoa; toatoa is shared with other celery pines. Its factsheet excludes the distinct unnamed yellow-foliaged P. aff. alpinus entity.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_e097a702b9ae', 'coprosma-rotundifolia', 'Coprosma rotundifolia', '', null, ARRAY[]::text[], 'An endemic shrub or small tree of streamside forest and shrubland. Slender spreading branches carry rounded leaves that may be blotched brown or purple.

Identification: Opposite rounded leaves with fine hairs and a visible vein network; wide-angled twigs and red or sometimes white berries.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/coprosma-rotundifolia/

Reference photo: Coprosma rotundifolia rounded foliage at Harcourt Park.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_rotundifolia_11.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Coprosma_rotundifolia_11.jpg/960px-Coprosma_rotundifolia_11.jpg', 'SP-054', null, 'usr_000000000001', 'usr_000000000001'),
  ('spc_843d5bed7906', 'juncus-edgariae', 'Juncus edgariae', 'Edgar’s rush', 'Wiwi', ARRAY[]::text[], 'A widespread endemic rush forming clumps of erect wiry stems. It grows beside wetlands, in seasonally damp places and in open shrubland or pasture.

Identification: Smooth shining leafless stems with branching flower clusters appearing off to one side; species separation can require checking stem pith and capsules.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/juncus-edgariae/

Reference photo: Edgar’s rush clump at Auckland Botanic Gardens.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Juncus_edgariae_kz1.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Juncus_edgariae_kz1.jpg/960px-Juncus_edgariae_kz1.jpg', 'SP-082', 'Wiwi is a shared rush name. NZPCN distinguishes this species from Juncus continuus and the Australian J. gregiflorus, with which it was formerly confused.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_1e4e1e228d3c', 'weinmania-racemosa', 'Weinmania racemosa', 'Kāmahi', 'Kāmahi', ARRAY['Tawheo', 'Tawhero', 'Tawherowhero']::text[], 'An endemic forest tree found from coastal areas to subalpine habitats. It can be common in disturbed forest and dominate some higher mountain forests.

Identification: Adult leaves usually simple with deeply toothed margins; white or pink flowers gather in narrow spike-like clusters.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/pterophylla-racemosa/

Reference photo: Kāmahi young foliage, labelled Weinmannia racemosa at source.
Photo: Kahuroa (Public domain)
Licence: https://commons.wikimedia.org/wiki/Commons:Public_domain
Source: https://commons.wikimedia.org/wiki/File:KamahiFoliage.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/KamahiFoliage.jpg/960px-KamahiFoliage.jpg', 'SP-164', 'The database spelling Weinmania racemosa is retained. Botanical references spell the former name Weinmannia racemosa; NZPCN now accepts Pterophylla racemosa and lists Weinmannia racemosa as its synonym. Tawhero is shared with other trees.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_1465204950ac', 'veronica-rakaiensis', 'Veronica rakaiensis', 'Hebe', null, ARRAY[]::text[], 'A bushy South Island shrub often found in upland stream valleys. It usually forms a rounded plant with short narrow leaves and white flower spikes.

Identification: Pairs of small glossy leaves widest toward the tip; white flower clusters and minute hairs on leaf margins and capsules.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/veronica-rakaiensis/

Reference photo: Veronica rakaiensis leaf pairs and woody branches.
Photo: Krzysztof Golik (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Veronica_rakaiensis_01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Veronica_rakaiensis_01.jpg/960px-Veronica_rakaiensis_01.jpg', 'SP-162', 'Hebe is a shared common name. NZPCN lists Hebe rakaiensis as a synonym of Veronica rakaiensis; source photographs using Hebe retain that labelling in captions.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_4bbdc5b61bce', 'carex-maorica', 'Carex maorica', 'Māori sedge', null, ARRAY[]::text[], 'An endemic tufted sedge of freshwater wetlands, streambanks, lake margins and damp forest. Its long pale green leaves surround stems carrying several crowded flowering spikes.

Identification: Look for long folded leaves and several short female spikes clustered close to the base of a terminal male spike. Confirm flowering material before distinguishing similar sedges.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/carex-maorica/

Reference photo: Carex maorica living tuft in habitat.
Photo: Ewen Cameron / Auckland Museum (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Carex_maorica_Hamlin_(AM_AK294597).jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Carex_maorica_Hamlin_%28AM_AK294597%29.jpg/960px-Carex_maorica_Hamlin_%28AM_AK294597%29.jpg', 'SP-015', 'NZPCN recognises Carex maorica as a distinct species and does not list Carex secta as its synonym. WRT nursery identity remains unresolved; these species-specific references do not resolve which stock a historic record represented. Keep SP-015 and SP-016 separate. No verified Māori vernacular name was found; Māori sedge is the documented common name.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_961320a2359a', 'streblus-heterophyllus', 'Streblus heterophyllus', 'Small-leaved milk tree', 'Tūrepo', ARRAY[]::text[], 'An endemic forest tree with a marked change between its wiry, small-leaved juvenile form and broader adult foliage. Small red fruits develop along the branches.

Identification: Young plants have slender interlacing twigs and tiny irregularly lobed leaves. Adult leaves are small and oval with shallow teeth and visible veins; fruit is red.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/paratrophis-microphylla/

Reference photo: Tūrepo / small-leaved milk tree, adult form.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Streblus_heterophyllus_12.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Streblus_heterophyllus_12.JPG/960px-Streblus_heterophyllus_12.JPG', 'SP-153', 'The database spelling Streblus heterophyllus is retained. NZPCN currently accepts Paratrophis microphylla and explicitly lists Streblus heterophyllus as a synonym. These source names refer to this taxon, not a merged database record.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_d37deb8c6052', 'coprosma-cheesemanii', 'Coprosma cheesemanii', '', null, ARRAY[]::text[], 'An endemic low shrub of upland grassland and rocky places. It forms an intricate network of short branches with tiny glossy leaves and orange to reddish fruit.

Identification: Look for branches that spread in a flattened pattern, with many short side twigs at near-right angles. Small pointed leaves occur in pairs or tight clusters; fine hairs are present on the young twigs.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/coprosma-cheesemanii/

Reference photo: Coprosma cheesemanii shrub in habitat.
Photo: Richard Littauer (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Coprosma_cheesemanii_-_Richard_Littauer_-_465283741.jpeg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Coprosma_cheesemanii_-_Richard_Littauer_-_465283741.jpeg/960px-Coprosma_cheesemanii_-_Richard_Littauer_-_465283741.jpeg', 'SP-041', 'No common or Māori name was documented in the checked NZPCN species account. The database scientific name is retained.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_c6e60a4d49e4', 'muehlenbeckia-axillaris', 'Muehlenbeckia axillaris', 'Creeping pōhuehue', 'Pōhuehue', ARRAY[]::text[], 'A native creeping shrub that spreads by wiry stems rooting at their nodes. Its mats carry very small round or oval leaves; the fruit has a black seed surrounded by fleshy white flower parts.

Identification: Look for a close ground-covering mat of thin reddish-brown stems and tiny rounded leaves. Pale star-like flowers occur in leaf axils; white fleshy fruit surrounds a dark triangular centre.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/muehlenbeckia-axillaris/
Flora of New Zealand: https://www.nzflora.info/factsheet/taxon/Muehlenbeckia-axillaris.html

Reference photo: Creeping pōhuehue mat.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Muehlenbeckia_axillaris_kz01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Muehlenbeckia_axillaris_kz01.jpg/960px-Muehlenbeckia_axillaris_kz01.jpg', 'SP-100', 'Pōhuehue is a shared Māori name used for more than one Muehlenbeckia species. Creeping pōhuehue and the scientific name distinguish this low-growing species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_e5d9304c087c', 'veronica-propinqua', 'Veronica propinqua', 'Whipcord hebe', null, ARRAY[]::text[], 'An endemic low, spreading whipcord hebe of Otago and Southland mountain grassland and scrub. Its narrow green branchlets carry closely pressed scale leaves, with small groups of white flowers at the tips.

Identification: Look for upright or ascending cord-like shoots with overlapping rounded green scales and visible joints between them. Similar whipcord hebes need careful comparison of scales, branchlets and flowers.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/veronica-propinqua/

Reference photo: Veronica propinqua spreading whipcord shoots.
Photo: Matt Scott (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0/
Source: https://www.inaturalist.org/photos/456964574', 'https://inaturalist-open-data.s3.amazonaws.com/photos/456964574/large.jpg', 'SP-161', 'Whipcord hebe is a shared common name for several species. NZPCN accepts Veronica propinqua and lists Hebe propinqua as a synonym. No Māori name was documented in the checked species account.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_9818e8e4175e', 'melicope-simplex', 'Melicope simplex', 'Poataniwha', 'Poataniwha', ARRAY[]::text[], 'An endemic shrub with widely spreading branches and small rounded leaves. Young plants can have leaves divided into three leaflets.

Identification: Small thick leaves with finely roughened margins and a joint where each blade meets its flattened stalk. Cream star-shaped flowers are followed by dry fruit divided into several parts.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/melicope-simplex/

Reference photo: Melicope simplex, poataniwha, foliage at Pinehaven Reserve, Wellington, New Zealand.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Melicope_simplex_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Melicope_simplex_11.JPG/960px-Melicope_simplex_11.JPG', 'SP-093', 'Poataniwha is recorded by NZPCN for this species. No additional Māori spelling or name has been inferred from WRT’s register.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_5194d826cc3f', 'carmichaelia-crassicaulis', 'Carmichaelia crassicaulis', 'Coral broom', null, ARRAY[]::text[], 'An endemic broom with rigid branching stems and few visible leaves. Its yellowish branchlets are grooved, and small cream to pale pink pea flowers form clusters along them.

Identification: Stout grooved branchlets and tightly grouped pea flowers, often with purple markings. Small dry pods follow flowering; subspecies identification needs closer botanical examination.

References:
Flora of New Zealand: https://www.nzflora.info/factsheet/taxon/Carmichaelia-crassicaulis.html
NZPCN · typical subspecies reference: https://www.nzpcn.org.nz/flora/species/carmichaelia-crassicaulis-subsp-crassicaulis/
Otago Regional Council · species common name: https://www.orc.govt.nz/environment/biosecurity-and-pests/plant-pests/gorse-and-broom

Reference photo: Carmichaelia crassicaulis flowers in a species-labelled reference photographed by Joe Dillon; no subspecies is assigned to WRT’s record.
Photo: Joe Dillon (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Carmichaelia_crassicaulis_463247951.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Carmichaelia_crassicaulis_463247951.jpg/960px-Carmichaelia_crassicaulis_463247951.jpg', 'SP-022', 'Flora of New Zealand recognises subsp. crassicaulis and subsp. racemosa; this species-level entry does not assign either. Corallospartium crassicaule is an older synonym. WRT’s disputed identity remains unresolved, and subspecies threat assessments are not applied to its planting records.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_5c1fee5c6434', 'pseudowintera-colorata', 'Pseudowintera colorata', 'Mountain horopito', 'Horopito', ARRAY[]::text[], 'An endemic shrub of forest edges and scrub through the North, South and Stewart islands. Its leaf colouring becomes especially conspicuous in exposed places.

Identification: Matte green to yellow-green oval leaves often blotched red, with pale whitish undersides. Dark branchlets bear small yellow-green flowers and dark red or black berries.

References:
NZPCN: https://www.nzpcn.org.nz/flora/species/pseudowintera-colorata/

Reference photo: Pseudowintera colorata
Photo: Szilas (Public domain)
Licence: https://commons.wikimedia.org/wiki/Commons:Public_domain
Source: https://commons.wikimedia.org/wiki/File:Christchurch_Botanic_Gardens,_New_Zealand_section,_pseudowintera_colorata_2016-02-04.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Christchurch_Botanic_Gardens%2C_New_Zealand_section%2C_pseudowintera_colorata_2016-02-04.jpg/960px-Christchurch_Botanic_Gardens%2C_New_Zealand_section%2C_pseudowintera_colorata_2016-02-04.jpg', 'SP-148', 'Horopito is shared with other Pseudowintera species; NZPCN calls this one red or mountain horopito.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_26d7355f2866', 'podocarpus-totara', 'Podocarpus totara', 'Tōtara', 'Tōtara', ARRAY['Amoka']::text[], 'An endemic conifer that can become a large forest tree. Mature trees have thick stringy bark and a broad spreading crown.

Identification: Stiff narrow pointed leaves on woody branchlets. Older trunks show deep furrows and long fibrous bark strips.

References:
Flora of New Zealand: https://www.nzflora.info/factsheet/Taxon/Podocarpus-totara.html

Reference photo: Giant lowland totara tree (31 metres tall, 8.4 metres around the trunk, 1000 years old), Peel Forest, Canterbury, New Zealand
Photo: Tomas Sobek (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Giant_lowland_totara.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Giant_lowland_totara.jpg/960px-Giant_lowland_totara.jpg', 'SP-140', 'Flora of New Zealand records Tōtara and Amoka. Tōtara also occurs in names of other Podocarpus species; no variety is assigned to this species-level record.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_50ce735329eb', 'cyathoides-juniperina', 'Cyathoides juniperina', '', null, ARRAY[]::text[], 'This recorded botanical name remains unverified. A possible spelling correction points to an older name for Leptecophylla juniperina, but WRT must confirm the intended identity before botanical traits or reference photos are assigned.

Identification: Confirm the intended botanical identity against WRT’s original records or a verified specimen before using identification features.

References:
NZOR · Cyathodes synonym record: https://nzor.org.nz/names/4f5ed3ff-b4cb-4074-8182-2c5768a04e72
Kew · Leptecophylla juniperina: https://powo.science.kew.org/taxon/1012580-1', '', 'SP-060', 'The recorded spelling Cyathoides juniperina was not verified. NZOR and Kew confirm Cyathodes juniperina as a synonym of Leptecophylla juniperina, but that does not establish what WRT’s SP-060 record represents. Keep it separate from SP-087 until WRT confirms the intended name.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_08377eaa62b8', 'veronica-biggarii', 'Veronica biggarii', 'Biggar’s hebe', null, ARRAY[]::text[], 'A small Southland alpine shrub restricted to the Eyre and Thomson mountains and Mid Dome. It grows on rocky outcrops and in open snow-tussock grassland.

Identification: Pairs of fleshy oval leaves often edged red; flower spikes on noticeable stalks, with bright pink young buds or developing capsules.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/veronica-biggarii/

Reference photo: Biggar’s hebe flowers and red-margined leaves in Dunedin.
Photo: John Barkla (CC BY 4.0)
Licence: https://creativecommons.org/licenses/by/4.0
Source: https://commons.wikimedia.org/wiki/File:Veronica_biggarii_-_John_Barkla_-_1228975.jpeg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Veronica_biggarii_-_John_Barkla_-_1228975.jpeg/960px-Veronica_biggarii_-_John_Barkla_-_1228975.jpeg', 'SP-154', 'NZPCN lists Hebe biggarii as a synonym and describes this range-restricted species as Naturally Uncommon. No Māori name was verified.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_00dfd9b8fa35', 'dracophyllum-rosmarinifolium', 'Dracophyllum rosmarinifolium', 'Common grass tree', 'Inaka', ARRAY[]::text[], 'An endemic mountain shrub with several woody stems and dense narrow leaves. It occurs in scrub, tussock grassland, rocky alpine ground and mountain bogs.

Identification: Very narrow pointed leaves stand out from twigs and sheath them at the base; solitary white tubular flowers finish short side branches.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/dracophyllum-rosmarinifolium/

Reference photo: Dracophyllum rosmarinifolium narrow foliage and flowers at Cardrona.
Photo: Krzysztof Ziarnek, Kenraiz (CC BY-SA 4.0)
Licence: https://creativecommons.org/licenses/by-sa/4.0
Source: https://commons.wikimedia.org/wiki/File:Dracophyllum_rosmarinifolium_kz01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Dracophyllum_rosmarinifolium_kz01.jpg/960px-Dracophyllum_rosmarinifolium_kz01.jpg', 'SP-065', 'Inaka is a shared Dracophyllum name; NZPCN explicitly lists it for this species. NZPCN lists Dracophyllum uniflorum as a synonym.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_7912a33ff4f0', 'scheflera-digitata', 'Scheflera digitata', 'Seven-finger', 'Patatē', ARRAY['Patē']::text[], 'An endemic small tree of lowland and mountain forest. Its large thin divided leaves give it a distinctive fan-like crown.

Identification: Usually seven finely toothed leaflets radiate from one point on a long stalk; cream flower sprays are followed by dark purple fruit.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/schefflera-digitata/
Flora of New Zealand: https://www.nzflora.info/factsheet/taxon/Schefflera-digitata.html

Reference photo: Seven-finger young divided leaf at Mangemangeroa Reserve.
Photo: Kahuroa (Public domain)
Licence: https://commons.wikimedia.org/wiki/Commons:Public_domain
Source: https://commons.wikimedia.org/wiki/File:ScheffleraDigitataLeaf.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/ScheffleraDigitataLeaf.jpg/960px-ScheffleraDigitataLeaf.jpg', 'SP-150', 'The database spelling Scheflera digitata is retained. NZPCN and Flora of New Zealand verify Schefflera digitata, with a double f; those sources distinguish it from Pseudopanax five-finger.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_ca1c43d3e99e', 'parsonia-heterophylla', 'Parsonia heterophylla', 'New Zealand jasmine', 'Kaihua', ARRAY[]::text[], 'An endemic woody climber that twines through shrubs and forest margins. Its leaves vary markedly in shape, especially on young plants.

Identification: Twining stems, clusters of fragrant pale tubular flowers and long thin pods that split to release tufted seeds.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/parsonsia-heterophylla/
Flora of New Zealand: https://nzflora.info/factsheet/Taxon/Parsonsia-heterophylla.html

Reference photo: New Zealand jasmine flowering vine at Redwood Bush.
Photo: Rudolph89 (CC BY-SA 3.0)
Licence: https://creativecommons.org/licenses/by-sa/3.0
Source: https://commons.wikimedia.org/wiki/File:Parsonsia_heterophylla_11.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Parsonsia_heterophylla_11.JPG/960px-Parsonsia_heterophylla_11.JPG', 'SP-124', 'The database spelling Parsonia heterophylla is retained; NZPCN and Flora of New Zealand verify Parsonsia heterophylla. Kaihua is documented by Flora of New Zealand. New Zealand jasmine is shared with other Parsonsia species.', 'usr_000000000001', 'usr_000000000001'),
  ('spc_d221a29065e9', 'leptecophylla-juniperina', 'Leptecophylla juniperina', 'Prickly mingimingi', 'Mingimingi', ARRAY[]::text[], 'A native prickly shrub of scrub and forest. Narrow stiff leaves and rounded fruit varying from white to red are useful recognition features.

Identification: Sharp-tipped narrow leaves with pale undersides; small cream flowers and white, pink or red berries.

References:
New Zealand Plant Conservation Network: https://www.nzpcn.org.nz/flora/species/leptecophylla-juniperina-subsp-juniperina/

Reference photo: Prickly mingimingi with red berries in Upper Hutt.
Photo: Rudolph89 (CC0)
Licence: https://creativecommons.org/publicdomain/zero/1.0/deed.en
Source: https://commons.wikimedia.org/wiki/File:Leptecophylla_juniperina_11.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Leptecophylla_juniperina_11.jpg/960px-Leptecophylla_juniperina_11.jpg', 'SP-087', 'Mingimingi is shared with several shrubs. NZPCN treats the New Zealand plant as Leptecophylla juniperina subsp. juniperina and lists Cyathodes juniperina as a synonym. The database Cyathoides juniperina spelling and its SP-060 relationship to SP-087 still need a WRT ruling. This profile illustrates the source taxon; it does not merge IDs, assign a nursery line to a subspecies or change SP-087’s zero recorded quantity.', 'usr_000000000001', 'usr_000000000001')
on conflict (id) do nothing;

-- 50 planting_areas
insert into public.planting_areas (id, site_id, slug, name, description, wrt_number, location_id, created_by, updated_by)
values
  ('are_2fb6390a72bf', 'sit_3278820a1280', 'slope-hill-riparian', 'Slope Hill riparian site', 'A historic WRT planting-day location beside the creek and cycle trail, accessed from Speargrass Flat Road along Slope Hill Road. Its count covers the Road planting part; the separate Coronation and HGF areas remain unlocated.', '11', 'loc_b077067125d4', 'usr_000000000001', 'usr_000000000001'),
  ('are_59fdf0233192', 'sit_4a8ea411f0d7', 'lake-hayes-south-wetland', 'Lake Hayes South planting area', 'A reference within the council-mapped Lake Hayes South planting area beside the highway. The council identifies it as a WRT keystone site. This current footprint does not define the historical planting boundary.', '9A', 'loc_181c3557c2c8', 'usr_000000000001', 'usr_000000000001'),
  ('are_1c0b2de6c353', 'sit_4a8ea411f0d7', 'lake-hayes-pavilion', 'Lake Hayes Pavilion planting area', 'A reference within a council-mapped WRT planting area below Lake Hayes Pavilion. The council records first planting here in spring 2023. The current footprint does not define the full historical planting boundary.', '9G', 'loc_0a9322eb8970', 'usr_000000000001', 'usr_000000000001'),
  ('are_d466c7978dcc', 'sit_d13b64a3008b', 'jardine-park-nursery', 'Jardine Park / Nursery Reference Gardens', 'Jean Malpas Community Nursery on Poplar Drive is a navigation reference for the surrounding native Reference Gardens. The marker identifies the nursery venue, rather than the boundary of the planted gardens.', '23', 'loc_5262ef178a5e', 'usr_000000000001', 'usr_000000000001'),
  ('are_e71be06f15bf', 'sit_b86f2aa9c7b8', 'bush-creek-event', 'Bush Creek', 'A historic WRT planting-day location near Arrowtown’s Chinese Settlement. The group also includes separate school and reserve locations.', '13C', 'loc_3e0d15e1777e', 'usr_000000000001', 'usr_000000000001'),
  ('are_02f78a576749', 'sit_84b42eb914e3', 'feehly-cemetery', 'Feehly Hill / Arrowtown Cemetery', 'The cemetery is a landmark for WRT plantings on the hillside behind it. Additional planting areas lie near Manse Road and the Powder Magazine.', '12A', 'loc_29289e96524b', 'usr_000000000001', 'usr_000000000001'),
  ('are_8f9cf43d70ad', 'sit_6f8810e8a326', 'peace-park', 'Peace Park', 'A council-mapped WRT restoration area on the Frankton foreshore. This reference point does not include the separate Frankton Beach and Boyes Crescent areas.', '21', 'loc_f7a364e6197b', 'usr_000000000001', 'usr_000000000001'),
  ('are_11807861410c', 'sit_551be2da07e8', 'harvest-gardens', 'Harvest Gardens', 'The gardens at 201 Gorge Road have native planting along their southern fence. The marker shows a nearby address reference.', '5B', 'loc_7538d9581346', 'usr_000000000001', 'usr_000000000001'),
  ('are_6b55e82a0836', 'sit_551be2da07e8', 'alpine-retreat', 'Alpine Retreat', 'A road reference within the Alpine Retreat community, accessed via Moke Lake Road. Restoration extends onto shared common land nearby.', '5D', 'loc_30e400eb2628', 'usr_000000000001', 'usr_000000000001'),
  ('are_a74b4b9acb65', 'sit_551be2da07e8', 'ziptrek-course', 'Ziptrek / Bob’s Peak', 'A reference point within Ziptrek’s tour area above Queenstown, where WRT-supported restoration has taken place. Individual planting patches are not shown.', '5E', 'loc_7f79e6572577', 'usr_000000000001', 'usr_000000000001'),
  ('are_fda517b48b72', 'sit_551be2da07e8', 'rees-lakefront', 'The Rees lakefront', 'A council-mapped community planting area on the Frankton Track below The Rees Hotel. This is one of several separate places grouped under Gorge Road area.', '5F', 'loc_b84d9d0ae80e', 'usr_000000000001', 'usr_000000000001'),
  ('are_2b8c28f5cd78', 'sit_ad242487a046', 'morning-star-reserve', 'Morning Star Reserve', 'A broad reference for Morning Star Beach Recreation Reserve beside the Shotover River. WRT-supported planting occupies a plateau within the reserve; this point does not mark the plateau or an entrance.', '6B', 'loc_8c37edca720e', 'usr_000000000001', 'usr_000000000001'),
  ('are_4e1eddb2b130', 'sit_a12e4997c07b', 'shotover-wetland', 'Shotover Wetland', 'A reference within the council’s wetland and recreation zone east of the Shotover–Kawarau confluence. Most Shotover Primary records relate to this wetland, with separate planting on school grounds.', '20A', 'loc_58e8ee6a8b74', 'usr_000000000001', 'usr_000000000001'),
  ('are_9350ca467717', 'sit_04d44d882cee', 'tucker-beach-wildlife-reserve', 'Tucker Beach Wildlife Reserve', 'WRT’s historic community planting-day location within Tucker Beach Wildlife Reserve. Separate Shotover River ledger parts have not been assigned to this marker.', '28', 'loc_239cb10508e7', 'usr_000000000001', 'usr_000000000001'),
  ('are_cac0eb817ffe', 'sit_bdee03a5b536', 'kawarau-gorge-suspension-bridge', 'Kawarau Gorge Suspension Bridge', 'The historic AJ Hackett bungy bridge is the landmark named in the Kawarau Bridge records. Swiftburn plantings are a separate ledger part and are not counted at this marker.', '18A', 'loc_971091b1305e', 'usr_000000000001', 'usr_000000000001'),
  ('are_8db6fe6ee910', 'sit_96e44f47c011', 'kelvin-earnslaw-slipway', 'Kelvin Peninsula / Earnslaw Slipway', 'The Earnslaw Slipway reserve is the named landmark for the Slipway / Project Crimson planting records. This reference point covers that part of the ledger only.', '22A', 'loc_45b6da545a95', 'usr_000000000001', 'usr_000000000001'),
  ('are_69df07d4733d', 'sit_96e44f47c011', 'kelvin-queenstown-golf-course', 'Kelvin Peninsula / Queenstown Golf Club', 'Queenstown Golf Club occupies the head of Kelvin Peninsula. This is a broad course reference for the golf-course planting records; it does not identify which hole or planting area.', '22B', 'loc_636cf6a9c017', 'usr_000000000001', 'usr_000000000001'),
  ('are_8464222b34fe', 'sit_a2492fc941ac', 'glenorchy-lagoon-walkway', 'Glenorchy Lagoon Walkway', 'A public reference point on the lagoon walkway near Glenorchy’s waterfront. Historical lagoon and walkway planting extends around the wetlands beyond this point.', '1', 'loc_31d742bb1b37', 'usr_000000000001', 'usr_000000000001'),
  ('are_2a3c82d94930', 'sit_a2492fc941ac', 'glenorchy-lakefront-wharf', 'Glenorchy Lakefront / Wharf', 'The wharf is a landmark beside Glenorchy’s lakefront planting area. The marker shows the wharf and does not map individual shoreline planting patches.', '1C', 'loc_0b2a1f747c12', 'usr_000000000001', 'usr_000000000001'),
  ('are_fbc226df4310', 'sit_a2492fc941ac', 'glenorchy-pigeon-island', 'Pigeon Island / Wāwāhi Waka', 'The island in northern Lake Whakatipu is a separate part of the Glenorchy planting history. This broad island reference does not show the restoration plots or landing points.', '1E', 'loc_04a70bfaadcd', 'usr_000000000001', 'usr_000000000001'),
  ('are_8aae93ca1a76', 'sit_a2492fc941ac', 'glenorchy-school', 'Glenorchy School', 'The school on Oban Street is a separate part of Glenorchy’s planting history. This marker locates the school grounds rather than its planting patch.', '1A', 'loc_a293592fec45', 'usr_000000000001', 'usr_000000000001'),
  ('are_e5f4e0058f86', 'sit_2970d1c696b9', 'lake-hayes-estate-widgeon', 'Widgeon Park', 'A reference within Widgeon Park below Lake Hayes Estate. Native planting at the base of Widgeon Place is documented by the residents association. The separate Lake Hayes Estate Trail records are not located by this marker.', '10', 'loc_36cb84556c7f', 'usr_000000000001', 'usr_000000000001'),
  ('are_dff9bcdf6be6', 'sit_b7bf48e412cd', 'queenstown-primary-school', 'Queenstown Primary School', 'The school at 20 Robins Road is a reference for the school-ground planting records. The marker does not locate individual school planting patches. Visit arrangements belong to the school.', '4', 'loc_91e17d1e5df6', 'usr_000000000001', 'usr_000000000001'),
  ('are_131f6772c74f', 'sit_b7bf48e412cd', 'kerry-drive-reserve', 'Kerry Drive Reserve', 'A reference within the council-mapped Kerry Drive Reserve. This marker covers the Kerry Drive records; Queenstown Hill and the primary school are separate parts of the ledger group.', '4B', 'loc_95f1a66f7e02', 'usr_000000000001', 'usr_000000000001'),
  ('are_6b2924ab08ab', 'sit_d13b64a3008b', 'jardine-welcome-forest', 'Jardine Park / Welcome Forest', 'A council-mapped WRT native planting area in the southern part of Jardine Park. The council development plan identifies Welcome Forest plantings here. This point represents one planting patch, rather than the full forest boundary.', '23B', 'loc_67887f8501b8', 'usr_000000000001', 'usr_000000000001'),
  ('are_e965a0ab8610', 'sit_ad242487a046', 'atley-downs-reserve', 'Atley Downs / Atley Road Reserve', 'A public reserve reference in the Atley Downs area. The historic planting records do not identify the individual planting patch.', '6', 'loc_41a5547589fa', 'usr_000000000001', 'usr_000000000001'),
  ('are_f78d91b14337', 'sit_ad242487a046', 'arthurs-point-doc-office', 'Arthurs Point / DOC Office', 'The Cavells Building at 1 Arthurs Point Road is a landmark for the DOC Office planting records. It does not locate individual planting beds.', '6A', 'loc_cdd92279130f', 'usr_000000000001', 'usr_000000000001'),
  ('are_769e8ef4f762', 'sit_84b42eb914e3', 'feehly-powder-magazine', 'Feehly Hill / Powder Magazine', 'The historic Powder Magazine beside Malaghans Road is a landmark for the Magazine planting area at the foot of Feehly Hill.', '12', 'loc_687b5c340073', 'usr_000000000001', 'usr_000000000001'),
  ('are_e5034c74a979', 'sit_84b42eb914e3', 'feehly-manse-road', 'Feehly Hill / Manse Road', 'Manse Road Reserve is a reference on the western side of Feehly Hill. The exact historical planting patches remain unconfirmed.', '12B', 'loc_c5b380ea2d26', 'usr_000000000001', 'usr_000000000001'),
  ('are_a480f089dda9', 'sit_b86f2aa9c7b8', 'arrowtown-primary-school', 'Arrowtown Primary School', 'School grounds at 9 Chalmers Place provide a reference for the Arrowtown Primary records. The individual planting beds are not documented.', '13B', 'loc_b5316a236b26', 'usr_000000000001', 'usr_000000000001'),
  ('are_57f647f441c4', 'sit_b86f2aa9c7b8', 'derby-street-reserve', 'Derby Street Road Reserve', 'The council-mapped native planting area maintained by the Derby Street Reserve Restoration Group. Historical records are assigned to the Derby Street sub-site.', '13D', 'loc_92888abb24d9', 'usr_000000000001', 'usr_000000000001'),
  ('are_8f283a2d8daa', 'sit_6f8810e8a326', 'frankton-beach', 'Frankton Beach / Domain', 'A broad reference within Frankton Domain beside the beach. The Frankton Beach planting records do not identify individual shoreline planting patches.', '21A', 'loc_1179f83f2df8', 'usr_000000000001', 'usr_000000000001'),
  ('are_8bad52cefe16', 'sit_6f8810e8a326', 'boyes-crescent-residents', 'Boyes Crescent residents planting', 'The council-mapped native planting area cared for by Boyes Crescent residents, separate from the Peace Park planting area.', '21B', 'loc_e849f3605fe5', 'usr_000000000001', 'usr_000000000001'),
  ('are_12eead5d83bf', 'sit_a12e4997c07b', 'shotover-primary-internal-school', 'Shotover Primary / School grounds', 'The school at 57 Stalker Road is a reference for internal school planting records. The separate Shotover Wetland marker covers wetland planting.', '20B', 'loc_da8ea9b64347', 'usr_000000000001', 'usr_000000000001'),
  ('are_0dacb5589c9e', 'sit_4a8ea411f0d7', 'lake-hayes-rowing-club', 'Lake Hayes East / Rowing Club', 'A reference among the council-mapped planting areas beside Whakatipu Rowing Club on the eastern shore. The current mapped areas are a landmark for this ledger part, rather than its historical planting boundary.', '9H', 'loc_d3f7dbe2f903', 'usr_000000000001', 'usr_000000000001'),
  ('are_fb10af4c0ae1', 'sit_4a8ea411f0d7', 'lake-hayes-west-project-gold', 'Lake Hayes West / Project Gold', 'A reference within a current council-mapped Project Gold planting area on the western Lake Hayes trail. The historical West PG planting boundary is not verified.', '9', 'loc_a61a678d58b2', 'usr_000000000001', 'usr_000000000001'),
  ('are_3a7aea14bd00', 'sit_2d8d2b759e66', 'whitechapel', 'Whitechapel', 'WRT’s historic planting-day location on Whitechapel Road, Arrow Junction, beside the Queenstown Trail. The reserve’s planting areas extend beyond this reference point.', null, 'loc_ced11353550c', 'usr_000000000001', 'usr_000000000001'),
  ('are_c49da19b3ba4', 'sit_37b92b5e3d36', 'quail-rise', 'Quail Rise', 'WRT’s historic planting-day pin for the Jim’s Way community restoration area at Quail Rise. Planting extends along the reserve beyond this point.', null, 'loc_274574833ae9', 'usr_000000000001', 'usr_000000000001'),
  ('are_0891087a3538', 'sit_aaebbd5e58e9', 'gibbston', 'Gibbston', 'The community reserve on Coal Pit Road is the named location in the planting ledger. This marker is a reserve reference point rather than a mapped planting patch.', null, 'loc_beb792d16a75', 'usr_000000000001', 'usr_000000000001'),
  ('are_23d752efe389', 'sit_3163a0d115cc', 'shotover-rotary-track', 'Shotover Rotary Track', 'The start of the Rotary Tucker Beach Trail near the Old Lower Shotover Bridge is a navigation landmark for planting along the trail. The planting history does not identify a particular section of this 3.2 km route.', null, 'loc_648726b30f8f', 'usr_000000000001', 'usr_000000000001'),
  ('are_4ac3340eaded', 'sit_8d86aa32530b', 'kiwi-park', 'Kiwi Park', 'A reference within Kiwi Park, the wildlife sanctuary on Brecon Street below the gondola. It marks the park grounds rather than an individual planting area. Visitor entry is managed by the park.', null, 'loc_8d86aa32530b', 'usr_000000000001', 'usr_000000000001'),
  ('are_794d69d9c49c', 'sit_2ac5b9376fc6', 'bridesdale', 'Bridesdale', 'A reference within a council-mapped Bridesdale Bush Trust planting area on Hayes Creek Road. Council identifies the wider restoration project as supported by WRT. The individual planting patch behind the ledger’s Bridesdale records is not established.', null, 'loc_d5e66a7cd962', 'usr_000000000001', 'usr_000000000001'),
  ('are_be0ee304bc66', 'sit_d51780f5ab66', 'matakauri-wetlands', 'Matakauri Wetlands', 'The published centre of Matakauri Wetland, east of Gorge Road and Industrial Place. It represents the wider wetland; the particular 2026 planting area and an entrance are not established.', null, 'loc_3002cadb35b5', 'usr_000000000001', 'usr_000000000001'),
  ('are_bb0e616cda63', 'sit_bc25947b2f8d', 'arrow-morven', 'Arrow Morven', 'Morven Ferry Reserve is a reference beside the Arrow River and trail at Arrow Junction. The historic register calls this planting group Arrow River Track – Arrow Junction. The exact 2015 planting stretch is not established.', null, 'loc_029a83b1f283', 'usr_000000000001', 'usr_000000000001'),
  ('are_30ac3789e800', 'sit_41f1c618dc0f', 'walter-peak-station', 'Walter Peak Station', 'Beach Point campsite and public lakeshore walkway are landmarks for the wider Walter Peak restoration area. The historic WRT planting was on adjacent DOC land; this point does not identify the individual planting patch.', null, 'loc_ac59cc2369f3', 'usr_000000000001', 'usr_000000000001'),
  ('are_e7d38544ed4f', 'sit_8725f6b32934', 'wye-creek', 'Wye Creek', 'A climbing-area reference near Main Wall, where Queenstown Climbing Club describes its native bush restoration work. Plantings extend around the climbing area; the marker is not a planting boundary or a car park.', null, 'loc_b68a219eff96', 'usr_000000000001', 'usr_000000000001'),
  ('are_dbbc68975a5f', 'sit_abd5d5f21ed0', 'jardine-boulders', 'Jardine Boulders', 'A reference for the named boulder field on Remarkables Station, beside SH6. The exact position of the ledger’s native plantings within this area has not been established.', null, 'loc_fe7b5a79cfce', 'usr_000000000001', 'usr_000000000001'),
  ('are_7c81be12cfa9', 'sit_b44f1e741f9e', 'moke-lake', 'Moke Lake', 'DOC’s published campsite location corresponds to the ledger’s Moke Lake Camp name. It is a campsite reference rather than the exact position of the historic plantings.', null, 'loc_a68237f64101', 'usr_000000000001', 'usr_000000000001'),
  ('are_f09ae3b175af', 'sit_7fb4ddd3a9a8', 'lower-shotover-conservation-area', 'Lower Shotover Conservation Area', 'A reference point inside the DOC conservation area along the Shotover River east of Arthurs Point. The historic planting patch is unknown; this marker represents the named reserve rather than its planting boundary.', null, 'loc_7fb4ddd3a9a8', 'usr_000000000001', 'usr_000000000001'),
  ('are_f68f6b33bb58', 'sit_f53f331e7d05', 'kingsview', 'Kingsview', 'KingsView School at 14 Yewlett Crescent, Frankton, is a reference for the school planting records. The marker identifies the school rather than an individual planting patch.', null, 'loc_d912e7cf5c71', 'usr_000000000001', 'usr_000000000001')
on conflict (id) do nothing;

-- 23 unique seasons from docs/planning/prototype/planting_history.csv.
-- Catalogue only: no planting events, dates or quantities are inferred.
insert into public.seasons (id, name, created_by, updated_by)
values
  ('sea_f7f9e3aa07d4', 'Autumn 2015', 'usr_000000000001', 'usr_000000000001'),
  ('sea_63e4f6b7af5a', 'Spring 2015', 'usr_000000000001', 'usr_000000000001'),
  ('sea_df5e5e19ef5b', 'Autumn 2016', 'usr_000000000001', 'usr_000000000001'),
  ('sea_0dbef3b59b2d', 'Spring 2016', 'usr_000000000001', 'usr_000000000001'),
  ('sea_648be51bba18', 'Autumn 2017', 'usr_000000000001', 'usr_000000000001'),
  ('sea_3b6b0ca0557c', 'Spring 2017', 'usr_000000000001', 'usr_000000000001'),
  ('sea_d6dfe375759f', 'Autumn 2018', 'usr_000000000001', 'usr_000000000001'),
  ('sea_7c29af9739c7', 'Spring 2018', 'usr_000000000001', 'usr_000000000001'),
  ('sea_4b4e5bc21008', 'Autumn 2019', 'usr_000000000001', 'usr_000000000001'),
  ('sea_09e236346995', 'Spring 2019', 'usr_000000000001', 'usr_000000000001'),
  ('sea_bd3a49d6808a', 'Autumn 2020', 'usr_000000000001', 'usr_000000000001'),
  ('sea_69d0cba69eb9', 'Spring 2020', 'usr_000000000001', 'usr_000000000001'),
  ('sea_2560fb8125e0', 'Autumn 2021', 'usr_000000000001', 'usr_000000000001'),
  ('sea_b05e9d883e01', 'Spring 2021', 'usr_000000000001', 'usr_000000000001'),
  ('sea_a549c7e73ca7', 'Autumn 2022', 'usr_000000000001', 'usr_000000000001'),
  ('sea_64470f86d555', 'Spring 2022', 'usr_000000000001', 'usr_000000000001'),
  ('sea_da40171338bf', 'Autumn 2023', 'usr_000000000001', 'usr_000000000001'),
  ('sea_492adf374353', 'Spring 2023', 'usr_000000000001', 'usr_000000000001'),
  ('sea_1c4ab1ba64c0', 'Autumn 2024', 'usr_000000000001', 'usr_000000000001'),
  ('sea_6b0685b152a3', 'Spring 2024', 'usr_000000000001', 'usr_000000000001'),
  ('sea_5d954893dc5d', 'Autumn 2025', 'usr_000000000001', 'usr_000000000001'),
  ('sea_12195323be6d', 'Spring 2025', 'usr_000000000001', 'usr_000000000001'),
  ('sea_db75b23a2aae', 'Autumn 2026', 'usr_000000000001', 'usr_000000000001')
on conflict do nothing;

commit;
