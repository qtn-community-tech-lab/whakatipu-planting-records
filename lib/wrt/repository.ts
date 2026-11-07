/** The interface the query layer uses to read planting history from Supabase. */
import type {
  PlantingRecord, Place, ReconciliationRow, Season, Species,
} from "./types";

export interface SourceInfo {
  /** Human description of where the data came from. */
  description: string;
  /** Database tables read, with row counts. */
  tables: { name: string; rows: number }[];
}

export interface WrtRepository {
  listSeasons(): Promise<Season[]>;
  listSpecies(): Promise<Species[]>;
  listPlaces(): Promise<Place[]>;
  /** All planting records, chronological. */
  listRecords(): Promise<PlantingRecord[]>;
  listReconciliation(): Promise<ReconciliationRow[]>;
  getSourceInfo(): Promise<SourceInfo>;
}
