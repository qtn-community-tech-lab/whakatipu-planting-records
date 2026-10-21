/** Species reads. Each call is one flat query to Supabase. Changes: db/usecases/edit-species. */
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
