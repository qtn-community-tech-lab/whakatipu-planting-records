/** Species: the register and one species page. */
import { db } from "@/db/client";
import type { Species } from "@/lib/wrt/types";
import { lines, speciesTotals } from "./views";
import type { SpeciesInput } from "@/db/types";

/** The register, A to Z, history or not. Deactivated species are left out. */
export async function listSpecies() {
  const { data } = await (await db())
    .from("species")
    .select(
      "slug, scientific_name, common_name, maori_name, status, threatened, photos",
    )
    .is("deactivated_at", null)
    .order("scientific_name")
    .throwOnError();
  return data.map((species) => ({ ...species, photos: species.photos as unknown as Species["photos"] }));
}

/** Species with planting history, most recorded first. */
export async function listSpeciesTotals() {
  const { data } = await speciesTotals(await db()).throwOnError();
  return data;
}

/** One species page: the species, its totals and every line it appears on. Null when there is no such species. */
export async function readSpecies(slug: string) {
  const client = await db();
  const [species, totals, history] = await Promise.all([
    client
      .from("species")
      .select(
        "slug, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m, threatened, threatened_te_kakano, contested_group, register_note, profile, photos, deactivated_at",
      )
      .eq("slug", slug)
      .maybeSingle()
      .throwOnError(),
    speciesTotals(client).eq("species", slug).maybeSingle().throwOnError(),
    // Unpaged: the largest species has 279 lines. Page it like findPlantingLines if one passes 1,000.
    lines(client).eq("species", slug).throwOnError(),
  ]);
  if (!species.data) return null;
  return { species: species.data, totals: totals.data, history: history.data };
}

/** The editor reads the row directly, without fetching planting history. */
export async function readSpeciesForEdit(slug: string) {
  const { data } = await (await db())
    .from("species")
    .select(
      "slug, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m, threatened, threatened_te_kakano, needs_decision, contested_group, register_note, photos, updated_at",
    )
    .eq("slug", slug)
    .is("deactivated_at", null)
    .maybeSingle()
    .throwOnError();
  return data;
}

export async function createSpecies(values: SpeciesInput) {
  return (await db()).from("species").insert(values).select("slug").single();
}

/** Preserve the existing slug. The database touch trigger sets updated_at. */
export async function updateSpecies(slug: string, values: SpeciesInput) {
  return (await db())
    .from("species")
    .update({ ...values, slug })
    .eq("slug", slug)
    .select("slug")
    .single();
}

/** Deactivate the species without changing its key or any planting line. */
export async function deactivateSpecies(slug: string) {
  return (await db())
    .from("species")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("slug")
    .single();
}
