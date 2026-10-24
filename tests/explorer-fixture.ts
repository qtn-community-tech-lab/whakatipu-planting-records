import type { ExplorerData, Location, PlantingRecord } from "@/lib/wrt/types";

export const pin: Location = { id: "pin", label: "Site pin", longitude: 168.8, latitude: -45, radiusM: null, sourceUrl: null, coordinateSourceUrl: null, coordinateMethod: null, checkedOn: null };
export function fixture(): ExplorerData {
  return {
    seasons: [],
    species: [{ id: "species", slug: "manuka", scientificName: "Leptospermum scoparium", commonName: "Tea tree", maoriName: "Mānuka", displayName: "Mānuka", displayIsScientific: false, aliases: [], searchKeys: ["manuka", "leptospermum scoparium"], description: "Saved description", imageUrl: "https://example.invalid/photo.jpg", note: null, over5m: null, threatened: null, threatenedMarks: { plantsOutMaster: false, teKakano: false } }],
    places: [{ slug: "reserve", name: "Reserve", description: "Saved site", location: pin, siteClasses: ["unknown"], isScheme: false, searchKeys: ["reserve"], parcels: [{ id: "area", slug: "upper", name: "Upper reserve", description: "Saved area", placeSlug: "reserve", siteClass: "unknown", aliases: [], location: null }] }],
    records: [],
  };
}
export function record(changes: Partial<PlantingRecord> = {}): PlantingRecord {
  return { id: "line", placeSlug: "reserve", parcelId: "area", parcelName: "Upper reserve", speciesId: "species", seasonSlug: "summer", seasonName: "summer", year: 2026, plantingDate: "2026-01-12", quantity: 10, precision: "area", siteClass: "unknown", notes: "Saved notes", source: "app", provenance: {}, ...changes };
}
