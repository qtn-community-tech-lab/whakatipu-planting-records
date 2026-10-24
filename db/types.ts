/**
 * Supabase's JSON representation of the migration in supabase/migrations/.
 * Keep this independent of form types: PostgreSQL allows undated history, while
 * the planting-day form requires a date. Required insert fields are checked here.
 * Replace with `supabase gen types typescript --local` after provisioning.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { plantingEventTypes } from "./enums";
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
  Relationships extends { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }[] = [],
> = {
  Row: Row;
  Insert: Pick<Row, RequiredKeys> &
    Partial<Omit<Row, RequiredKeys | GeneratedKeys>>;
  Update: Partial<Omit<Row, GeneratedKeys>>;
  Relationships: Relationships;
};
type View<Row> = { Row: Row; Relationships: [] };
type SpeciesRow = Audit & {
  slug: string;
  scientific_name: string;
  common_name: string;
  aliases: string[];
  description: string;
  image_url: string;
  maori_name: string | null;
  over_5m: boolean | null;
  threatened: boolean | null;
  threatened_te_kakano: boolean;
  register_note: string | null;
  register_code: string | null;
};
type SiteRow = Audit & {
  slug: string;
  name: string;
  description: string;
  location_id: string | null;
  is_scheme: boolean;
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
export type PlantingEventRow = Audit & {
  site_id: string;
  planting_area_id: string | null;
  /** Unknown for historic backfill. New planting-day forms require a date. */
  planting_date: string | null;
  event_type: Database["public"]["Enums"]["planting_event_type"] | null;
  season: string;
  source: "app" | "workbook";
  notes: string;
  image_url: string;
};
type PlantingEventSpeciesRow = Audit & {
  planting_event_id: string;
  species_id: string;
  quantity: number | null;
  legacy_code: string | null;
  precision: "site" | "subsite" | "area" | "scheme" | "unknown" | null;
  provenance: Json;
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
      seasons: Table<Audit & { name: string }, "name">;
      planting_events: Table<PlantingEventRow, "site_id", never, [
        { foreignKeyName: "planting_events_site_id_fkey"; columns: ["site_id"]; isOneToOne: false; referencedRelation: "sites"; referencedColumns: ["id"] },
        { foreignKeyName: "planting_events_planting_area_id_site_id_fkey"; columns: ["planting_area_id", "site_id"]; isOneToOne: false; referencedRelation: "planting_areas"; referencedColumns: ["id", "site_id"] },
      ]>;
      planting_event_species: Table<
        PlantingEventSpeciesRow,
        "planting_event_id" | "species_id",
        never,
        [
          { foreignKeyName: "planting_event_species_planting_event_id_fkey"; columns: ["planting_event_id"]; isOneToOne: false; referencedRelation: "planting_events"; referencedColumns: ["id"] },
          { foreignKeyName: "planting_event_species_species_id_fkey"; columns: ["species_id"]; isOneToOne: false; referencedRelation: "species"; referencedColumns: ["id"] },
        ]
      >;
    };
    Views: {
      totals_by_site: View<
        { plants: number; site: string; site_name: string; species: number }
      >;
      totals_by_species: View<
        {
          plants: number;
          species: string;
          scientific_name: string;
          maori_name: string | null;
          sites: number;
        }
      >;
      totals_by_season: View<
        {
          plants: number;
          season: string;
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
    };
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
      save_planting_day: { Args: { day: PlantingDay }; Returns: string };
    };
    Enums: {
      planting_event_type: (typeof plantingEventTypes)[number];
    };
  };
};

export type Db = SupabaseClient<Database>;

/** Retiring twice is prevented by the write's filter and preserves the first date. */
export const retired = () => ({ deactivated_at: new Date().toISOString() });
