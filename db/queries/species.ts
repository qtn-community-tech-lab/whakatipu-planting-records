/** Species: the register and one species page. */
import { db } from "@/db/client";
import { lines, speciesTotals } from "./views";

/** The register, A to Z, history or not. Retired species are left out. */
export async function listSpecies() {
  const { data } = await (await db())
    .from("species")
    .select("slug, scientific_name, common_name, maori_name, status, threatened")
    .is("retired_at", null)
    .order("scientific_name")
    .throwOnError();
  return data;
}

/** Species with planting history, most recorded first. */
export async function rankSpecies() {
  const { data } = await speciesTotals(await db())
    .throwOnError();
  return data;
}

/** One species page: the species, its totals and every line it appears on. Null when there is no such species. */
export async function getSpecies(slug: string) {
  const client = await db();
  const [species, totals, history] = await Promise.all([
    client
      .from("species")
      .select("slug, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m, threatened, threatened_te_kakano, contested_group, register_note, profile, photos, retired_at")
      .eq("slug", slug)
      .maybeSingle()
      .throwOnError(),
    speciesTotals(client)
      .eq("species", slug)
      .maybeSingle()
      .throwOnError(),
    // Unpaged: the largest species has 279 lines. Page it like findLines if one passes 1,000.
    lines(client)
      .eq("species", slug)
      .throwOnError(),
  ]);
  if (!species.data) return null;
  return { species: species.data, totals: totals.data, history: history.data };
}
