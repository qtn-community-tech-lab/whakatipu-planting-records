/**
 * Planting events: new plantings recorded in the app, one polygon each.
 *
 * WHY THIS IS SEPARATE FROM PlantingRecord (lib/wrt/types.ts)
 * The historical ledger is one row per species × site × season, transformed
 * from WRT's spreadsheets, with two seasons a year (Autumn/Spring) and no dates
 * or shapes. A planting event is captured at the time: a real date, a drawn
 * area, and four possible seasons. The two are deliberately kept apart until
 * WRT decides how Summer and Winter plantings roll up into the Autumn/Spring
 * reporting. Until then events are exported (CSV + GeoJSON) and are NOT added
 * to any historical total.
 */
import type * as GeoJSON from "geojson";

/** All four seasons. The historical SeasonName ("Autumn" | "Spring") is unchanged. */
export const EVENT_SEASONS = ["Summer", "Autumn", "Winter", "Spring"] as const;
export type EventSeason = (typeof EVENT_SEASONS)[number];

/** One species line on an event. */
export interface EventSpecies {
  /** Species.id from the species register (join key; never shown to readers). */
  speciesId: string;
  /** Plants of this species planted at the event. Whole number, > 0. */
  quantity: number;
}

/** What the form submits, and what create/update accept. */
export interface PlantingEventInput {
  /** Place.slug, e.g. "lake-hayes". */
  placeSlug: string;
  /** Parcel.id inside that place, or null for "the site as a whole". */
  parcelId: string | null;
  /** Planting date, ISO "YYYY-MM-DD" (a calendar day, no time zone). */
  plantedOn: string;
  /** Suggested from plantedOn (see season.ts) but the user can override it. */
  season: EventSeason;
  /** The year the season belongs to (December counts toward the next year's Summer). */
  seasonYear: number;
  /** Exactly one polygon per event, WGS84 longitude/latitude. Overlaps with other events are allowed. */
  polygon: GeoJSON.Polygon;
  species: EventSpecies[];
  notes: string | null;
}

/** A stored event. */
export interface PlantingEvent extends PlantingEventInput {
  /** UUID, generated on create. */
  id: string;
  /**
   * Always null for now: photo upload is disabled until Supabase Storage is
   * connected. Kept in the shape so the Supabase store and the CSV export
   * do not need to change when it arrives.
   */
  photoUrl: string | null;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}
