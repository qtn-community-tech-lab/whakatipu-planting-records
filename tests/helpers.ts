import { places, records, seasons, species } from "./fixtures/planting";
import type { WrtRepository } from "@/lib/wrt/repository";
import { createQueries } from "@/lib/wrt/queries";
import type { QuantitySplit } from "@/lib/wrt/types";

/** Small in-memory fixture; no source files or live database required. */
export const repo: WrtRepository = {
  listSeasons: async () => seasons,
  listSpecies: async () => species,
  listPlaces: async () => places,
  listRecords: async () => records,
  listReconciliation: async () => [],
  getSourceInfo: async () => ({
    description: "Synthetic planting fixture.",
    tables: [
      { name: "seasons", rows: seasons.length },
      { name: "species", rows: species.length },
      { name: "sites", rows: places.length },
      { name: "planting lines", rows: records.length },
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
