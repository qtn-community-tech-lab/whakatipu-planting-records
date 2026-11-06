/**
 * The columns the app reads, so the Supabase client checks every name.
 * Hand-written for the demo; `npx supabase gen types typescript --project-id <ref>`
 * replaces this file later. Writes come in their own pull request.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type SiteClass = "keystone" | "community" | "school" | null;
/** Rows are never deleted; deactivating sets this. */
type Deactivated = { deactivated_at: string | null };
/** Every total keeps its split: plants = resolved + needing review. */
type Split = { plants: number; plants_resolved: number; plants_needs_review: number };

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type View<Row> = { Row: Row; Relationships: [] };

export type LineDetails = {
  line_id: number; event_id: number; legacy_code: string | null;
  season: string; season_label: string; season_order: number; year: number; planting_date: string | null;
  site: string; site_name: string; area: string; area_name: string;
  species: string; scientific_name: string; maori_name: string | null;
  /** Worked out in the view: true while any ruling or confirm note on the line is unresolved. */
  quantity: number | null; needs_review: boolean;
};

export type Database = {
  public: {
    Tables: {
      species: Table<Deactivated & {
        slug: string; scientific_name: string; status: "core" | "appended" | "contested" | "seedlog_only" | null;
        common_name: string | null; maori_name: string | null; suggested_spelling: string | null;
        over_5m: boolean | null; threatened: boolean | null; threatened_te_kakano: boolean; register_note: string | null;
      }>;
      site_locations: Table<Deactivated & { slug: string; latitude: number; longitude: number; radius_m: number | null }>;
      planting_lines: Table<Deactivated & { id: number; event_id: number; species_id: number; quantity: number | null }>;
    };
    Views: {
      line_details: View<LineDetails>;
      totals_by_site: View<Split & { site: string; site_name: string; species: number }>;
      totals_by_species: View<Split & { species: string; scientific_name: string; maori_name: string | null; sites: number }>;
      totals_by_season: View<Split & { season: string; season_label: string; season_order: number; sites: number; species: number }>;
      area_list: View<{
        area: string; area_name: string; wrt_number: string | null; site_class: SiteClass;
        site: string; site_name: string; is_scheme: boolean;
        latitude: number | null; longitude: number | null; radius_m: number | null;
      }>;
      /** A line can sit under two topics: rows overlap, don't add them up. */
      totals_by_review_topic: View<{
        topic: string; label: string; question: string; decision: string | null;
        plants_needs_review: number; lines_needs_review: number;
      }>;
    };
    Functions: Record<string, never>;
  };
};

/** The client every query takes, from lib/supabase/server.ts or browser.ts. */
export type Db = SupabaseClient<Database>;

