/**
 * Species: read, change, retire. Each call is one flat query to Supabase.
 * Who may change a row is the access rules' job; who changed it is the edit-trail trigger's.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** The register, A to Z. */
export async function listSpecies(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("species")
    .select("slug, scientific_name, common_name, maori_name, status, threatened")
    .order("scientific_name")
    .throwOnError();
  return data;
}

/** Species with planting history, most recorded first, with the needs-review split. */
export async function speciesTotals(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("totals_by_species")
    .select("species, maori_name, scientific_name, plants, plants_resolved, plants_needs_review, sites")
    .order("plants", { ascending: false })
    .throwOnError();
  return data;
}

/** One species page: the species, its totals and every line it appears on. Null when there is no such species. */
export async function getSpecies(supabase: SupabaseClient, slug: string) {
  const [species, totals, history] = await Promise.all([
    supabase.from("species").select("*").eq("slug", slug).maybeSingle().throwOnError(),
    supabase.from("totals_by_species")
      .select("plants, plants_resolved, plants_needs_review, sites")
      .eq("species", slug).maybeSingle().throwOnError(),
    supabase.from("line_details")
      .select("event_id, season_label, site_name, area_name, quantity, needs_review")
      .eq("species", slug).order("season_order", { ascending: false }).throwOnError(),
  ]);
  if (!species.data) return null;
  return { species: species.data, totals: totals.data, history: history.data };
}

/** The columns staff may change on a species. */
export interface SpeciesChanges {
  common_name?: string | null;
  maori_name?: string | null;
  suggested_spelling?: string | null;
  over_5m?: boolean | null;
  threatened?: boolean | null;
  threatened_te_kakano?: boolean;
  register_note?: string | null;
}

/** Save changes. Returns the saved row, or null when the species is missing or not the caller's to change. */
export async function updateSpecies(supabase: SupabaseClient, slug: string, changes: SpeciesChanges) {
  const { data } = await supabase
    .from("species")
    .update(changes)
    .eq("slug", slug)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a species. Nothing is ever deleted; its history stays. */
export async function retireSpecies(supabase: SupabaseClient, slug: string) {
  await supabase
    .from("species")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("slug", slug)
    .throwOnError();
}
