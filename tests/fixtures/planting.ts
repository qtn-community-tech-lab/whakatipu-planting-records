import type { Parcel, Place, PlantingRecord, Season, Species } from "@/lib/wrt/types";
import { searchKey, slugify } from "@/lib/wrt/text";

// Invented quantities and identities for behaviour tests, not a snapshot of client data.
export const seasons: Season[] = [
  [2015, "Autumn"], [2016, "Spring"], [2019, "Autumn"], [2019, "Spring"],
  [2024, "Autumn"], [2024, "Spring"], [2025, "Spring"], [2026, "Autumn"],
].map(([year, name], order) => ({
  year: Number(year), name: name as Season["name"], label: `${name} ${year}`,
  slug: `${String(name).toLowerCase()}-${year}`, order,
}));

export const species: Species[] = [
  ["Leptospermum scoparium", "Mānuka"], ["Sophora microphylla", "Kōwhai"],
  ["Kunzea robusta", "Kānuka"], ["Carex secta", "Pūrei"],
  ["Olearia bullata", null], ["Austroderia richardii", "Toetoe"],
  ["Phormium tenax", "Harakeke"], ["Carex maorica", null],
  ["Pittosporum tenuifolium", "Kōhūhū"], // No planting history.
].map(([scientificName, maoriName], index) => ({
  id: `SP-${index + 1}`, slug: slugify(scientificName!), scientificName: scientificName!,
  suggestedSpelling: null, commonName: null, maoriName: maoriName ?? null,
  displayName: maoriName ?? scientificName!, displayIsScientific: !maoriName,
  status: "core", over5m: null, threatened: index === 1 || index === 2,
  threatenedMarks: { plantsOutMaster: index === 1 || index === 2, teKakano: index === 0 || index === 1 },
  needsDecision: false, contestedWith: [], aliases: [],
  searchKeys: [scientificName!, maoriName ?? ""].filter(Boolean).map(searchKey),
  note: null, photos: [], profile: null, deactivatedAt: null,
}));

function place(name: string, parts: [string, string][], isScheme = false): Place {
  const slug = slugify(name);
  const parcels: Parcel[] = parts.map(([id, name]) => ({
    id, name, placeSlug: slug, siteClass: isScheme ? "unknown" : "keystone", aliases: [],
  }));
  return { slug, name, isScheme, parcels, siteClasses: [isScheme ? "unknown" : "keystone"],
    searchKeys: [name, ...parcels.map((p) => p.name), ...(slug === "whitechapel" ? ["wcr"] : [])].map(searchKey) };
}

export const places = [
  place("Whitechapel", [["whitechapel-north", "Whitechapel North"], ["whitechapel-south", "Whitechapel South"]]),
  place("Lake Hayes", [["9A", "Lake Hayes South"], ["9G", "Lake Hayes Pavilion"]]),
  place("Gorge Road area", [["wetlands", "Gorge Rd Wetlands"], ["5B", "Harvest Gardens"]]),
  place("Slope Hill", [["11", "Slope Hill Road"]]),
  place("Paper4Trees", [["scheme", "Paper4Trees"]], true),
];

function record(site: number, part: number, speciesIndex: number, seasonIndex: number, quantity: number,
  overrides: Partial<PlantingRecord> = {}): PlantingRecord {
  const place = places[site]!;
  const parcel = place.parcels[part]!;
  const season = seasons[seasonIndex]!;
  return {
    id: `test-${site}-${part}-${speciesIndex}-${seasonIndex}`, placeSlug: place.slug,
    parcelId: parcel.id, parcelName: parcel.name, siteClass: parcel.siteClass,
    speciesId: species[speciesIndex]!.id, seasonSlug: season.slug, year: season.year, seasonName: season.name,
    quantity, hasQuantity: true, precision: place.isScheme ? "scheme" : "site", confidence: "high",
    needsReview: false, notes: [], provenance: { sourceFile: "fixture.xlsx", sourceSheet: "Test",
      sourceCell: "A1", seasonLabelOriginal: season.label, siteOriginal: place.name,
      speciesOriginal: species[speciesIndex]!.scientificName }, ...overrides,
  };
}

export const records: PlantingRecord[] = [
  record(1, 0, 0, 0, 10), record(1, 1, 1, 1, 20),
  record(0, 0, 0, 2, 30), record(0, 1, 1, 2, 40),
  record(0, 0, 2, 3, 50), record(0, 1, 7, 3, 60),
  ...[13, 7, 8, 7].map((quantity, index) => record(2, 0, index + 3, 1, quantity, {
    needsReview: true, notes: [{ kind: "confirm", theme: "site-identity", text: "Location needs confirmation", raw: "Location needs confirmation" }],
  })),
  record(2, 1, 0, 4, 15),
  record(3, 0, 0, 4, 25, { notes: [{ kind: "fyi", theme: "other", text: "Planting confirmed", raw: "Planting confirmed" }] }),
  record(3, 0, 1, 5, 35),
  record(4, 0, 0, 5, 45, { needsReview: true, notes: [{
    kind: "ruling", theme: "order-scheme", text: "Order scheme needs a ruling", raw: "Order scheme needs a ruling",
  }] }),
  record(0, 0, 0, 6, 0, { hasQuantity: false, needsReview: true, notes: [{
    kind: "confirm", theme: "not-a-number", text: "Quantity to be confirmed", raw: "Quantity to be confirmed",
  }] }),
  record(0, 0, 1, 7, 5),
];
