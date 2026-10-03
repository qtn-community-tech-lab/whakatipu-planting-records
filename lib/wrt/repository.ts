/**
 * The seam between storage and the rest of the app.
 *
 * V0: CsvWrtRepository reads the transformed CSVs in docs/planning/prototype.
 * Later: a database repository implements this same interface and nothing
 * above it changes. Pages and components never import a repository directly;
 * they call the query layer in lib/wrt/queries.ts.
 */
import type {
  DataIssue, PlantingRecord, Place, ReconciliationRow, Season, Species,
} from "./types";

export interface SourceInfo {
  /** Human description of where the data came from. */
  description: string;
  /** Files read, with row counts. */
  files: { name: string; rows: number }[];
  loadedAt: string;
}

export interface WrtRepository {
  listSeasons(): Promise<Season[]>;
  listSpecies(): Promise<Species[]>;
  listPlaces(): Promise<Place[]>;
  /** All planting records, chronological. */
  listRecords(): Promise<PlantingRecord[]>;
  listReconciliation(): Promise<ReconciliationRow[]>;
  listDataIssues(): Promise<DataIssue[]>;
  getSourceInfo(): Promise<SourceInfo>;
}
