/** Sites, areas and pins. The area_list view does the joining, so every read is flat. */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Every area with its site and pin. For the map and the sites list. */
export async function listAreas(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("area_list")
    .select("area, area_name, wrt_number, site_class, site, site_name, is_scheme, latitude, longitude, radius_m")
    .order("site_name")
    .order("area_name")
    .throwOnError();
  return data;
}

/** The areas of one site. */
export async function areasOfSite(supabase: SupabaseClient, site: string) {
  const { data } = await supabase
    .from("area_list")
    .select("area, area_name, wrt_number, site_class, latitude, longitude, radius_m")
    .eq("site", site)
    .order("area_name")
    .throwOnError();
  return data;
}

/** Sites with the most recorded plants, with the needs-review split. */
export async function topSites(supabase: SupabaseClient, limit = 5) {
  const { data } = await supabase
    .from("totals_by_site")
    .select("site, site_name, plants, plants_resolved, plants_needs_review, species")
    .order("plants", { ascending: false })
    .limit(limit)
    .throwOnError();
  return data;
}

/** Move a pin, or set its radius. */
export async function updatePin(
  supabase: SupabaseClient,
  slug: string,
  changes: { latitude?: number; longitude?: number; radius_m?: number | null },
) {
  const { data } = await supabase
    .from("site_locations")
    .update(changes)
    .eq("slug", slug)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a pin. Nothing is ever deleted. */
export async function retirePin(supabase: SupabaseClient, slug: string) {
  await supabase
    .from("site_locations")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("slug", slug)
    .throwOnError();
}
