/**
 * The shape of the planting database as the app sees it: the tables it writes,
 * the views it reads and the one function it calls. Column names are checked
 * against this in every query and use case.
 *
 * Hand-written for the demo. Once the Supabase project exists, replace this file
 * with `npx supabase gen types typescript --project-id <ref>` and nothing else changes.
 * The rules the database keeps (checks, access rules, edit trail) are in README.md.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type SiteClass = "keystone" | "community" | "school";
export type SpeciesStatus = "core" | "appended" | "contested" | "seedlog_only";
/** What kind of planting. Unknown (null) for every event from the workbook. */
export type EventType = "establishment" | "infill" | "replacement";
/** Where an event came from: built from the legacy workbook, or recorded in the app. */
export type EventSource = "workbook" | "app";
/** How a pin was placed. "surveyed" is for pins staff place on site. */
export type LocationAccuracy = "historic-event" | "landmark" | "surveyed";

/** Who created and last changed a row, and whether it is retired. Rows are never deleted. */
interface EditTrail {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deactivated_at: string | null;
}

export interface Species extends EditTrail {
  id: number;
  slug: string;
  scientific_name: string;
  suggested_spelling: string | null;
  common_name: string | null;
  maori_name: string | null;
  status: SpeciesStatus | null;
  over_5m: boolean | null;
  threatened: boolean | null;
  threatened_te_kakano: boolean;
  contested_group: string | null;
  needs_decision: boolean;
  register_note: string | null;
  register_code: string | null;
}

/** A map pin, with a radius wide enough to cover private land. One per site, or one per area. */
export interface SiteLocation extends EditTrail {
  id: number;
  slug: string;
  site_id: number;
  site_area_id: number | null;
  label: string;
  latitude: number;
  longitude: number;
  radius_m: number | null;
  accuracy: LocationAccuracy;
  description: string;
  source_label: string | null;
  source_url: string | null;
  coordinate_source_url: string | null;
  coordinate_method: string | null;
  checked_on: string | null;
}

/** How many of one species went in on one event. quantity null = unknown, never 0. */
export interface PlantingLine extends EditTrail {
  id: number;
  event_id: number;
  species_id: number;
  quantity: number | null;
  needs_review: boolean;
  legacy_code: string | null;
}

/** A question WRT needs to answer once, and the answer when it comes. */
export interface ReviewTopic extends EditTrail {
  id: number;
  slug: string;
  label: string;
  question: string;
  decision: string | null;
  decided_on: string | null;
  decided_by: string | null;
}

/** Every total keeps the split the app insists on: plants = resolved + needs review. */
interface Split {
  plants: number;
  plants_resolved: number;
  plants_needs_review: number;
  lines: number;
  lines_needs_review: number;
}

/** One row per active line, with its event, season, site, area and species joined in. */
export interface LineDetails {
  line_id: number; event_id: number; legacy_code: string | null; source: EventSource;
  season: string; season_label: string; year: number; season_order: number; planting_date: string | null;
  site: string; site_name: string; is_scheme: boolean;
  area: string; area_name: string; wrt_number: string | null; site_class: SiteClass | null;
  species: string; scientific_name: string; common_name: string | null; maori_name: string | null;
  over_5m: boolean | null; threatened: boolean | null; contested_group: string | null;
  quantity: number | null; needs_review: boolean;
}

export interface TotalsBySite extends Split {
  site: string; site_name: string; is_scheme: boolean; species: number;
  first_season_order: number; last_season_order: number;
}

export interface TotalsBySpecies extends Split {
  species: string; scientific_name: string; common_name: string | null; maori_name: string | null; sites: number;
}

export interface TotalsBySeason extends Split {
  season: string; season_label: string; season_order: number; sites: number; species: number;
}

/** Every active area with its site and its own pin, one flat row each. */
export interface AreaList {
  area: string; area_name: string; wrt_number: string | null; site_class: SiteClass | null;
  site: string; site_name: string; is_scheme: boolean;
  latitude: number | null; longitude: number | null; radius_m: number | null;
}

/** What is waiting on WRT, by question. A line can sit under two topics: rows overlap, don't add them. */
export interface TotalsByReviewTopic {
  topic: string; label: string; question: string; decision: string | null;
  plants_needs_review: number; lines_needs_review: number;
}

// supabase-js wants plain object types, not interfaces: a mapped copy gives each row an index signature.
type Plain<T> = { [K in keyof T]: T[K] };
type Table<Row> = { Row: Plain<Row>; Insert: Partial<Plain<Row>>; Update: Partial<Plain<Row>>; Relationships: [] };
type View<Row> = { Row: Plain<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      species: Table<Species>;
      site_locations: Table<SiteLocation>;
      planting_lines: Table<PlantingLine>;
      review_topics: Table<ReviewTopic>;
    };
    Views: {
      line_details: View<LineDetails>;
      totals_by_site: View<TotalsBySite>;
      totals_by_species: View<TotalsBySpecies>;
      totals_by_season: View<TotalsBySeason>;
      area_list: View<AreaList>;
      totals_by_review_topic: View<TotalsByReviewTopic>;
    };
    Functions: {
      /** Saves an event and its lines together. Returns the new event's id. */
      save_planting_day: {
        Args: {
          p_site_area_id: number; p_season_id: number; p_planting_date: string; p_event_type: EventType | null;
          p_notes: string; p_is_public: boolean; p_lines: { species_id: number; quantity: number | null }[];
        };
        Returns: number;
      };
    };
    Enums: { site_class: SiteClass; species_status: SpeciesStatus; event_type: EventType; event_source: EventSource; location_accuracy: LocationAccuracy };
    CompositeTypes: Record<string, never>;
  };
};

/** The Supabase client every query and use case takes. Made in lib/supabase/server.ts or browser.ts. */
export type Db = SupabaseClient<Database>;
