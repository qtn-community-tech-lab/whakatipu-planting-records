import { DEFAULT_DATA_DIR, loadFromDirectory } from "@/scripts/workbook/load";
import type { WrtRepository } from "@/lib/wrt/repository";
import { createQueries } from "@/lib/wrt/queries";
import type { QuantitySplit } from "@/lib/wrt/types";

/** Offline fixture from the same validated data used by the one-off workbook import. */
export const workbook = loadFromDirectory(DEFAULT_DATA_DIR);
export const repo: WrtRepository = {
  listSeasons: async () => workbook.seasons,
  listSpecies: async () => workbook.species,
  listPlaces: async () => workbook.places,
  listRecords: async () => workbook.records,
  listReconciliation: async () => workbook.reconciliation.filter((r) => r.kind === "season"),
  getSourceInfo: async () => ({
    description: "Offline workbook import fixture.",
    tables: [
      { name: "seasons", rows: workbook.seasons.length },
      { name: "species", rows: workbook.species.length },
      { name: "sites", rows: workbook.places.length },
      { name: "planting lines", rows: workbook.records.length },
    ],
  }),
};
export const q = createQueries(repo);

/** A split must always add up. */
export function expectCoherentSplit(s: QuantitySplit, where = "split") {
  if (s.total !== s.resolved + s.needsReview) {
    throw new Error(`${where}: total ${s.total} !== resolved ${s.resolved} + needsReview ${s.needsReview}`);
  }
  if (s.records < s.recordsNeedingReview) {
    throw new Error(`${where}: records ${s.records} < recordsNeedingReview ${s.recordsNeedingReview}`);
  }
  for (const k of Object.keys(s) as (keyof QuantitySplit)[]) {
    if (!Number.isFinite(s[k]) || s[k] < 0) throw new Error(`${where}: ${k} is ${s[k]}`);
  }
}
