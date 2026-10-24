/** Client-facing values mapped from the saved database rows. */
export type SeasonName = string;
export type Precision = "site" | "subsite" | "area" | "scheme" | "unknown";
export type SiteClass = "keystone" | "community" | "school" | "unknown";

export interface Quantity {
  total: number;
  records: number;
  unknown: number;
}
export interface Season { slug: string; name: string; label: string; order: number }
export interface Species {
  id: string;
  slug: string;
  scientificName: string;
  commonName: string | null;
  maoriName: string | null;
  displayName: string;
  displayIsScientific: boolean;
  description: string;
  imageUrl: string;
  over5m: boolean | null;
  threatened: boolean | null;
  threatenedMarks: { plantsOutMaster: boolean; teKakano: boolean };
  aliases: string[];
  searchKeys: string[];
  note: string | null;
}
export interface Location {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusM: number | null;
  sourceUrl: string | null;
  coordinateSourceUrl: string | null;
  coordinateMethod: string | null;
  checkedOn: string | null;
}
export interface Parcel {
  id: string;
  slug: string;
  name: string;
  description: string;
  placeSlug: string;
  siteClass: SiteClass;
  aliases: string[];
  location: Location | null;
}
export interface Place {
  slug: string;
  name: string;
  description: string;
  location: Location | null;
  siteClasses: SiteClass[];
  isScheme: boolean;
  parcels: Parcel[];
  searchKeys: string[];
}
export interface Provenance {
  sourceFile?: string;
  sourceSheet?: string;
  sourceCell?: string;
  seasonLabelOriginal?: string;
  siteOriginal?: string;
  speciesOriginal?: string;
}
export interface PlantingRecord {
  id: string;
  seasonSlug: string;
  seasonName: string;
  year: number | null;
  plantingDate: string | null;
  placeSlug: string;
  parcelId: string | null;
  parcelName: string;
  siteClass: SiteClass;
  speciesId: string;
  quantity: number | null;
  precision: Precision;
  notes: string;
  source: "app" | "workbook";
  provenance: Provenance;
}
export interface ExplorerData {
  seasons: string[];
  species: Species[];
  places: Place[];
  records: PlantingRecord[];
}
