/**
 * Supabase's JSON representation of the migration in supabase/migrations/.
 * Keep this independent of form types: PostgreSQL allows undated history, while
 * the planting-day form requires a date. Required insert fields are checked here.
 * Replace with `supabase gen types typescript --local` after provisioning.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { plantingEventTypes } from "./enums";
import type { ReviewDecision } from "./usecases/answer-review-question/types";
import type { PlantingDay } from "./usecases/record-planting-day/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type SiteClass = "keystone" | "community" | "school" | null;
type Audit = {
  id: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  deactivated_at: string | null;
};
type Table<
  Row,
  RequiredKeys extends keyof Row = never,
  GeneratedKeys extends keyof Row = never,
> = {
  Row: Row;
  Insert: Pick<Row, RequiredKeys> &
    Partial<Omit<Row, RequiredKeys | GeneratedKeys>>;
  Update: Partial<Omit<Row, GeneratedKeys>>;
  Relationships: [];
};
type View<Row> = { Row: Row; Relationships: [] };
type Split = {
  plants: number;
  plants_resolved: number;
  plants_needs_review: number;
};

type SpeciesRow = Audit & {
  slug: string;
  scientific_name: string;
  common_name: string;
  aliases: string[];
  description: string;
  image_url: string;
  is_public: boolean;
  maori_name: string | null;
  suggested_spelling: string | null;
  status: "core" | "appended" | "contested" | "seedlog_only" | null;
  over_5m: boolean | null;
  threatened: boolean | null;
  threatened_te_kakano: boolean;
  register_note: string | null;
  register_code: string | null;
  contested_group: string | null;
};
type SiteRow = Audit & {
  slug: string;
  name: string;
  description: string;
  location_id: string | null;
  is_scheme: boolean;
  is_public: boolean;
};
type AreaRow = Audit & {
  site_id: string;
  slug: string;
  name: string;
  description: string;
  wrt_number: string | null;
  site_class: SiteClass;
  aliases: string[];
  location_id: string | null;
  is_public: boolean;
};
type LocationRow = Audit & {
  geometry: { type: "Point"; coordinates: [number, number] };
  radius_m: number | null;
  label: string;
  source_url: string | null;
  coordinate_source_url: string | null;
  coordinate_method: string | null;
  checked_on: string | null;
};
type SeasonRow = Audit & {
  slug: string;
  year: number;
  name: "Autumn" | "Spring";
  label: string;
  sort_order: number;
  workbook_total: number | null;
  workbook_cell: string | null;
};
export type PlantingEventRow = Audit & {
  site_id: string;
  planting_area_id: string | null;
  season_id: string;
  /** Unknown for historic backfill. New planting-day forms require a date. */
  planting_date: string | null;
  event_type: Database["public"]["Enums"]["planting_event_type"] | null;
  season: string;
  source: "app" | "workbook";
  notes: string;
  image_url: string;
  is_public: boolean;
};
type PlantingEventSpeciesRow = Audit & {
  planting_event_id: string;
  species_id: string;
  quantity: number | null;
  legacy_code: string | null;
  precision: "site" | "subsite" | "area" | "scheme" | "unknown" | null;
  confidence: "high" | "medium" | "low" | null;
  provenance: Json;
};
type ReviewTopicRow = Audit & {
  slug: string;
  label: string;
  question: string;
  decision: string | null;
  decided_on: string | null;
  decided_by: string | null;
};
type LineNoteRow = Audit & {
  line_id: string;
  topic_id: string;
  kind: "ruling" | "confirm" | "fyi";
  text: string;
  raw: string | null;
  resolved_at: string | null;
};

export type LineDetails = {
  line_id: string;
  event_id: string;
  legacy_code: string | null;
  season: string;
  season_label: string;
  season_order: number;
  year: number;
  planting_date: string | null;
  site: string;
  site_name: string;
  area: string | null;
  area_name: string | null;
  species: string;
  scientific_name: string;
  maori_name: string | null;
  quantity: number | null;
  needs_review: boolean;
};

export type Database = {
  public: {
    Tables: {
      users: Table<
        Audit & {
          email: string;
          display_name: string;
          auth_user_id: string | null;
          is_staff: boolean;
        },
        "email" | "display_name" | "created_by" | "updated_by"
      >;
      locations: Table<LocationRow, "geometry">;
      sites: Table<SiteRow, "slug" | "name">;
      planting_areas: Table<AreaRow, "site_id" | "slug" | "name">;
      species: Table<SpeciesRow, "slug" | "scientific_name">;
      seasons: Table<
        SeasonRow,
        "slug" | "year" | "name",
        "label" | "sort_order"
      >;
      planting_events: Table<PlantingEventRow, "site_id" | "season_id">;
      planting_event_species: Table<
        PlantingEventSpeciesRow,
        "planting_event_id" | "species_id"
      >;
      review_topics: Table<ReviewTopicRow, "slug" | "label" | "question">;
      line_notes: Table<LineNoteRow, "line_id" | "topic_id" | "kind" | "text">;
    };
    Views: {
      line_details: View<LineDetails>;
      totals_by_site: View<
        Split & { site: string; site_name: string; species: number }
      >;
      totals_by_species: View<
        Split & {
          species: string;
          scientific_name: string;
          maori_name: string | null;
          sites: number;
        }
      >;
      totals_by_season: View<
        Split & {
          season: string;
          season_label: string;
          season_order: number;
          sites: number;
          species: number;
        }
      >;
      area_list: View<{
        area: string;
        area_name: string;
        wrt_number: string | null;
        site_class: SiteClass;
        site: string;
        site_name: string;
        is_scheme: boolean;
        latitude: number | null;
        longitude: number | null;
        radius_m: number | null;
      }>;
      /** Topic rows overlap when a line has more than one unresolved question. */
      totals_by_review_topic: View<{
        topic: string;
        label: string;
        question: string;
        decision: string | null;
        plants_needs_review: number;
        lines_needs_review: number;
      }>;
    };
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
      save_planting_day: { Args: { day: PlantingDay }; Returns: string };
      answer_review_question: {
        Args: { topic: string; decision: ReviewDecision };
        Returns: number | null;
      };
    };
    Enums: {
      planting_event_type: (typeof plantingEventTypes)[number];
    };
  };
};

export type Db = SupabaseClient<Database>;

/** Retiring twice is prevented by the write's filter and preserves the first date. */
export const retired = () => ({ deactivated_at: new Date().toISOString() });
