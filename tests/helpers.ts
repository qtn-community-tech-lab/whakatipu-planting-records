import { CsvWrtRepository } from "@/lib/wrt/csv/csv-repository";
import { createQueries } from "@/lib/wrt/queries";
import { slugify } from "@/lib/wrt/text";
import type { ExplorerData, Quantity } from "@/lib/wrt/types";

/** Source-artifact tests keep validating the original files; runtime never imports this. */
export const repo = new CsvWrtRepository();
export async function historicalFixture(): Promise<ExplorerData> {
  const [species, places, records] = await Promise.all([repo.listSpecies(), repo.listPlaces(), repo.listRecords()]);
  const seasonLabels = new Map((await repo.listSeasons()).map((s) => [s.slug, s.label]));
  return {
    seasons: [...seasonLabels.values()],
    species: species.filter((s) => records.some((r) => r.speciesId === s.id)).map((s) => ({ ...s, description: "", imageUrl: "" })),
    places: places.map((p) => ({ ...p, description: "", location: null, parcels: p.parcels.map((a) => ({ ...a, slug: `${slugify(a.name)}-${slugify(a.id)}`, description: "", location: null })) })),
    records: records.map((r) => ({ ...r, seasonSlug: seasonLabels.get(r.seasonSlug)!, seasonName: seasonLabels.get(r.seasonSlug)!, quantity: r.hasQuantity ? r.quantity : null, year: null, plantingDate: null, notes: "", source: "workbook" })),
  };
}
export const q = createQueries(historicalFixture);
export function expectCoherentSplit(s: Quantity) {
  if (!Number.isSafeInteger(s.total) || s.total < 0 || s.records < s.unknown) throw new Error("Invalid aggregate");
}
