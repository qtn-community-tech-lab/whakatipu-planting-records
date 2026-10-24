/** Species: the register and one species page. */
import type { Db } from "@/db/types";
import { lines, speciesTotals } from "./views";

/** The register, A to Z, history or not. Retired species are left out. */
export async function listSpecies(db: Db) {
  const { data } = await db
    .from("species")
    .select("slug, scientific_name, common_name, maori_name, threatened")
    .is("deactivated_at", null)
    .order("scientific_name")
    .throwOnError();
  return data;
}

/** Species with planting history, most recorded first. */
export async function rankSpecies(db: Db) {
  const { data } = await speciesTotals(db)
    .throwOnError();
  return data;
}

/** One species page: the species, its totals and every line it appears on. A retired species still opens, with deactivated_at set, so staff can see it. Null when there is no such species. */
export async function getSpecies(db: Db, slug: string) {
  const [species, totals, history] = await Promise.all([
    db
      .from("species")
      .select("slug, scientific_name, common_name, maori_name, over_5m, threatened, threatened_te_kakano, register_note, deactivated_at")
      .eq("slug", slug)
      .maybeSingle()
      .throwOnError(),
    speciesTotals(db)
      .eq("species", slug)
      .maybeSingle()
      .throwOnError(),
    // shortcut: unpaged, the largest species has 279 lines; page it like findLines if one passes 1,000.
    lines(db)
      .eq("species.slug", slug)
      .throwOnError(),
  ]);
  if (!species.data) return null;
  return { species: species.data, totals: totals.data, history: history.data };
}
