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
import type { PlantingDay } from "./usecases/record-planting-day/types";

export type SiteClass = "keystone" | "community" | "school";
export type SpeciesStatus = "core" | "appended" | "contested" | "seedlog_only";
/** What kind of planting. Unknown (null) for every event from the workbook. */
export type EventType = "establishment" | "infill" | "replacement";
/** Where an event came from: built from the legacy workbook, or recorded in the app. */
export type EventSource = "workbook" | "app";
/** How a pin was placed. "surveyed" is for pins staff place on site. */
export type LocationAccuracy = "historic-event" | "landmark" | "surveyed";

/** Who created and last changed a row, and whether it is retired. Rows are never deleted. */
type EditTrail = {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deactivated_at: string | null;
};

export type Species = EditTrail & {
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
};

/** A map pin, with a radius wide enough to cover private land. One per site, or one per area. */
export type SiteLocation = EditTrail & {
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
};

/** How many of one species went in on one event. quantity null = unknown, never 0. */
export type PlantingLine = EditTrail & {
  id: number;
  event_id: number;
  species_id: number;
  quantity: number | null;
  needs_review: boolean;
  legacy_code: string | null;
};

/** A question WRT needs to answer once, and the answer when it comes. */
export type ReviewTopic = EditTrail & {
  id: number;
  slug: string;
  label: string;
  question: string;
  decision: string | null;
  decided_on: string | null;
  decided_by: string | null;
};

/** Every total keeps the split the app insists on: plants = resolved + needs review. */
type Split = {
  plants: number;
  plants_resolved: number;
  plants_needs_review: number;
  lines: number;
  lines_needs_review: number;
};

/** One row per active line, with its event, season, site, area and species joined in. */
export type LineDetails = {
  line_id: number; event_id: number; legacy_code: string | null; source: EventSource;
  season: string; season_label: string; year: number; season_order: number; planting_date: string | null;
  site: string; site_name: string; is_scheme: boolean;
  area: string; area_name: string; wrt_number: string | null; site_class: SiteClass | null;
  species: string; scientific_name: string; common_name: string | null; maori_name: string | null;
  over_5m: boolean | null; threatened: boolean | null; contested_group: string | null;
  quantity: number | null; needs_review: boolean;
};

export type TotalsBySite = Split & {
  site: string; site_name: string; is_scheme: boolean; species: number;
  first_season_order: number; last_season_order: number;
};

export type TotalsBySpecies = Split & {
  species: string; scientific_name: string; common_name: string | null; maori_name: string | null; sites: number;
};

export type TotalsBySeason = Split & {
  season: string; season_label: string; season_order: number; sites: number; species: number;
};

/** Every active area with its site and its own pin, one flat row each. */
export type AreaList = {
  area: string; area_name: string; wrt_number: string | null; site_class: SiteClass | null;
  site: string; site_name: string; is_scheme: boolean;
  latitude: number | null; longitude: number | null; radius_m: number | null;
};

/** What is waiting on WRT, by question. A line can sit under two topics: rows overlap, don't add them. */
export type TotalsByReviewTopic = {
  topic: string; label: string; question: string; decision: string | null;
  plants_needs_review: number; lines_needs_review: number;
};

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type View<Row> = { Row: Row; Relationships: [] };

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
      /** Saves an event and its lines together, from the form as it is. Returns the new event's id. */
      save_planting_day: { Args: { day: PlantingDay }; Returns: number };
    };
  };
};

/** The Supabase client every query and use case takes. Made in lib/supabase/server.ts or browser.ts. */
export type Db = SupabaseClient<Database>;
