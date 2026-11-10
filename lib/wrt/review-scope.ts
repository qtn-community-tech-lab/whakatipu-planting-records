/**
 * Confirmed-only view of a repository: records still waiting on a WRT ruling
 * are left out, so every total, chart and list built on top counts resolved
 * records alone.
 */
import type { WrtRepository } from "./repository";
import type { PlantingRecord } from "./types";

/** Cookie holding the reader's choice. Absent means every record, review ones included. */
export const REVIEW_COOKIE = "wrt-review";
export const REVIEW_HIDDEN = "hide";

export function confirmedOnly(repo: WrtRepository): WrtRepository {
  let records: Promise<PlantingRecord[]> | null = null;
  return {
    listSeasons: () => repo.listSeasons(),
    listSpecies: () => repo.listSpecies(),
    listPlaces: () => repo.listPlaces(),
    listRecords: () => (records ??= repo.listRecords().then((all) => all.filter((r) => !r.needsReview))),
    // The workbook's totals include the records left out here, so there is nothing to check against.
    listReconciliation: async () => [],
    getSourceInfo: () => repo.getSourceInfo(),
  };
}
