/**
 * The columns the app reads and writes, so the Supabase client checks every name.
 * Writable columns come from each use case's types.ts. Hand-written for the demo;
 * `npx supabase gen types typescript --project-id <ref>` replaces this file later.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewDecision } from "./usecases/answer-review-question/types";
import type { SpeciesChanges } from "./usecases/edit-species/types";
import type { PinChanges } from "./usecases/place-pin/types";
import type { PlantingDay, PlantingLine } from "./usecases/record-planting-day/types";

type SiteClass = "keystone" | "community" | "school" | null;
/** Rows are never deleted; retiring sets this. */
type Retired = { deactivated_at: string | null };
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
      species: Table<Required<SpeciesChanges> & Retired & {
        slug: string; scientific_name: string; status: "core" | "appended" | "contested" | "seedlog_only" | null;
      }>;
      site_locations: Table<Required<PinChanges> & Retired & { slug: string }>;
      planting_lines: Table<PlantingLine & Retired & { id: number; event_id: number }>;
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
    Functions: {
      /** Saves an event and its lines together. Returns the new event's id. */
      save_planting_day: { Args: { day: PlantingDay }; Returns: number };
      /**
       * Writes WRT's ruling on a question and resolves that question's notes, in one go.
       * A line leaves review only when no other question on it is still open.
       * Returns how many lines left review, or null when there is no such question.
       */
      answer_review_question: { Args: { topic: string; decision: ReviewDecision }; Returns: number | null };
    };
  };
};

/** The client every query and use case takes, from lib/supabase/server.ts or browser.ts. */
export type Db = SupabaseClient<Database>;

/** The update that retires a row. Nothing is ever deleted. */
export const retired = () => ({ deactivated_at: new Date().toISOString() });
