/** Species: the register and one species page. */
import type { Db } from "@/db/types";
import { lines, speciesTotals } from "./views";

/** The register, A to Z, history or not. */
export async function listSpecies(db: Db) {
  const { data } = await db
    .from("species")
    .select("slug, scientific_name, common_name, maori_name, status, threatened")
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

/** One species page: the species, its totals and every line it appears on. Null when there is no such species. */
export async function getSpecies(db: Db, slug: string) {
  const [species, totals, history] = await Promise.all([
    db
      .from("species")
      .select("slug, scientific_name, common_name, maori_name, suggested_spelling, status, over_5m, threatened, threatened_te_kakano, register_note")
      .eq("slug", slug)
      .maybeSingle()
      .throwOnError(),
    speciesTotals(db)
      .eq("species", slug)
      .maybeSingle()
      .throwOnError(),
    // shortcut: unpaged, the largest species has 279 lines; page it like findLines if one passes 1,000.
    lines(db)
      .eq("species", slug)
      .throwOnError(),
  ]);
  if (!species.data) return null;
  return { species: species.data, totals: totals.data, history: history.data };
}
