/**
 * Domain types for the WRT historical restoration explorer.
 *
 * These shapes are shared by Supabase reads, the query layer and import tooling.
 *
 * Vocabulary
 * - "Recorded plants": every quantity in the history. The historical MASTER was
 *   filled from allocation sheets, so a recorded plant is NOT a verified planting.
 * - "Needs review": a record WRT still has to rule on or confirm once.
 * - Place: what people call a site ("Whitechapel", "Lake Hayes").
 * - Parcel: a registered site or sub-site inside a place (WRT's own 9A, 9G…).
 */

import type { SpeciesPhoto } from "./species-photos";
import type { SpeciesProfile } from "./species-profiles";

export type SeasonName = "Autumn" | "Spring";
export type Confidence = "high" | "medium" | "low";
export type Precision = "site" | "subsite" | "area" | "scheme" | "unknown";
export type SiteClass = "keystone" | "community" | "school" | "unknown";

/**
 * Every aggregate in the app carries this split. Never show a bare total:
 * `total` is always `resolved + needsReview`.
 */
export interface QuantitySplit {
  /** All recorded plants (resolved + needs review). */
  total: number;
  /** Plants on records that need no WRT ruling. */
  resolved: number;
  /** Plants on records that still need a WRT ruling or confirmation. */
  needsReview: number;
  /** Number of records (species × site × season rows). */
  records: number;
  /** Records flagged for review. */
  recordsNeedingReview: number;
}

export interface Season {
  /** URL slug, e.g. "autumn-2024". */
  slug: string;
  year: number;
  name: SeasonName;
  /** "Autumn 2024". */
  label: string;
  /** Chronological index, 0 = earliest season in the data. */
  order: number;
}

export interface Species {
  /** Join key only. Never shown to users. */
  id: string;
  /** URL slug from the scientific name, e.g. "leptospermum-scoparium". */
  slug: string;
  /** The register's spelling (WRT's own), e.g. "Weinmania racemosa". */
  scientificName: string;
  /** Usual botanical spelling where the register differs, e.g. "Weinmannia racemosa". */
  suggestedSpelling: string | null;
  /** Common name with macrons applied for display, or null. */
  commonName: string | null;
  /** Māori name with macrons applied for display, or null. */
  maoriName: string | null;
  /** What people should see first: Māori name, then common name, then scientific. */
  displayName: string;
  /** True when displayName is the scientific name (render it in italics). */
  displayIsScientific: boolean;
  status: "core" | "appended" | "contested" | "seedlog_only" | "unknown";
  /** Trees That Count over-5 m flag, null when not stated. */
  over5m: boolean | null;
  /**
   * WRT's threatened mark in the Plants Out Master (`Master Plant List` column B = "T").
   * Which threat list or year it follows is not recorded anywhere: show it as
   * "marked threatened by WRT", never as an established conservation status.
   */
  threatened: boolean | null;
  /** Where WRT marks this species threatened. The two lists disagree; see About the data. */
  threatenedMarks: ThreatenedMarks;
  /** True when WRT still has to rule on this species (contested pair etc.). */
  needsDecision: boolean;
  /** Species ids this one is contested with (join keys). */
  contestedWith: string[];
  /** Every raw spelling seen for this species in the source folder. */
  aliases: string[];
  /** Macron-free, lower-case keys used for search. */
  searchKeys: string[];
  note: string | null;
  photos: readonly SpeciesPhoto[];
  profile: SpeciesProfile | null;
  /** Deactivated from new selections; historical records still reference this species. */
  deactivatedAt: string | null;
}

/** WRT's two threatened-species marks, kept separately because they disagree. */
export interface ThreatenedMarks {
  /** "T" in Plants Out Master › Master Plant List, column B (13 species). */
  plantsOutMaster: boolean;
  /** "#" before the name in the Te Kakano restoration plant species list. */
  teKakano: boolean;
}

/** A registered site or sub-site. */
export interface Parcel {
  /** Join key only (WRT site number or provisional id). Never shown as a label. */
  id: string;
  /** "Lake Hayes Pavilion". */
  name: string;
  placeSlug: string;
  siteClass: SiteClass;
  /** Deactivated from new planting selections; visible in historical detail pages. */
  deactivatedAt?: string | null;
  /** Every header spelling seen for this parcel in the MASTER grid. */
  aliases: string[];
}

/** What people call a site: a group of parcels. */
export interface Place {
  slug: string;
  /** "Lake Hayes". */
  name: string;
  /** Available when the site itself is read, rather than a planting-line summary. */
  description?: string;
  /** Deactivated from the public register, while its history remains readable. */
  deactivatedAt?: string | null;
  /** Distinct site classes of the parcels in this place, most plants first. */
  siteClasses: SiteClass[];
  /** True for order schemes (Paper4Trees) that are not a physical place. */
  isScheme: boolean;
  parcels: Parcel[];
  searchKeys: string[];
}

export type ReviewNoteKind = "ruling" | "confirm" | "fyi";

/** Themes group review notes into questions WRT can answer once. */
export type ReviewTheme =
  | "contested-species"
  | "order-scheme"
  | "site-number-mismatch"
  | "slope-hill-2024"
  | "new-site"
  | "site-identity"
  | "header-cleaned"
  | "not-a-number"
  | "other";

export interface ReviewNote {
  /** ruling = WRT decides; confirm = one-time check; fyi = how it was mapped, no action. */
  kind: ReviewNoteKind;
  theme: ReviewTheme;
  /** Readable note for display: species IDs replaced by names, internal codes removed. */
  text: string;
  /** The note exactly as the transformation wrote it (audit trail; may contain join keys). */
  raw: string;
}

/** Where a record came from: the audit trail back to one spreadsheet cell. */
export interface Provenance {
  sourceFile: string;
  sourceSheet: string;
  sourceCell: string;
  seasonLabelOriginal: string;
  siteOriginal: string;
  speciesOriginal: string;
}

/** One species × one site × one season. */
export interface PlantingRecord {
  /** Stable record id from the transformation, e.g. "PH-2019A-FK12". */
  id: string;
  seasonSlug: string;
  year: number;
  seasonName: SeasonName;
  placeSlug: string;
  /** Parcel join key (Parcel.id). Never shown as a label. */
  parcelId: string;
  parcelName: string;
  siteClass: SiteClass;
  speciesId: string;
  /** Recorded plants. 0 when the source cell held text (see reviewReasons). */
  quantity: number;
  /** False when the source cell was not a number (e.g. "TBC"). */
  hasQuantity: boolean;
  precision: Precision;
  confidence: Confidence;
  needsReview: boolean;
  /** Rulings, confirmations and FYI notes from the source review_reason. */
  notes: ReviewNote[];
  provenance: Provenance;
}

/** Recorded totals compared with the workbook’s stated totals. */
export interface ReconciliationRow {
  kind: "season" | "grand" | "exception";
  label: string;
  generated: number;
  stated: number;
  difference: number;
  statedCell: string;
  records: number;
  cause: string | null;
}
