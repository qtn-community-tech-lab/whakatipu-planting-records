/** Aggregated cells for charts. A cell can represent many planting records. */
import type { Parcel, Place, QuantitySplit, Season, Species } from "./types";
import { splitOf, type Ranked, type RecordView } from "./queries";

export interface HistoryCell {
  area: string | null;
  place: Place;
  parcel: Parcel | null;
  species: Species | null;
  season: Season | null;
  split: QuantitySplit;
}

export interface SpeciesTileRow {
  species: Species;
  split: QuantitySplit;
  spread: number;
}

/** Adapter for the unchanged staff Records explorer's timeline. */
export function cellsFromRecords(records: RecordView[]): HistoryCell[] {
  return records.map((view) => ({ area: null, place: view.place, species: view.species, season: view.season,
    parcel: view.place.parcels.find((parcel) => parcel.id === view.record.parcelId) ?? null,
    split: splitOf([view.record]) }));
}

export function addSplits(target: QuantitySplit, source: QuantitySplit) {
  for (const key of Object.keys(target) as (keyof QuantitySplit)[]) target[key] += source[key];
  return target;
}

export function sumSplits(rows: readonly { split: QuantitySplit }[]): QuantitySplit {
  return rows.reduce((sum, row) => addSplits(sum, row.split), { total: 0, resolved: 0, needsReview: 0, records: 0, recordsNeedingReview: 0 });
}

export function tileRows(cells: readonly HistoryCell[], spread: "sites" | "seasons"): SpeciesTileRow[] {
  const rows = new Map<string, { species: Species; split: QuantitySplit; spread: Set<string> }>();
  for (const cell of cells) {
    if (!cell.species) continue;
    const row = rows.get(cell.species.slug) ?? { species: cell.species, split: sumSplits([]), spread: new Set<string>() };
    addSplits(row.split, cell.split);
    const key = spread === "sites" ? cell.place.slug : cell.season?.slug;
    if (key) row.spread.add(key);
    rows.set(cell.species.slug, row);
  }
  return [...rows.values()].map((row) => ({ ...row, spread: row.spread.size })).sort((a, b) => b.split.total - a.split.total);
}

export function speciesAtPlaces(cells: readonly HistoryCell[]) {
  const rows = new Map<string, { place: Place; split: QuantitySplit; species: Map<string, Ranked<Species>> }>();
  for (const cell of cells) {
    const row = rows.get(cell.place.slug) ?? { place: cell.place, split: sumSplits([]), species: new Map() };
    addSplits(row.split, cell.split);
    if (cell.species) {
      const species = row.species.get(cell.species.slug) ?? { item: cell.species, split: sumSplits([]) };
      addSplits(species.split, cell.split);
      row.species.set(cell.species.slug, species);
    }
    rows.set(cell.place.slug, row);
  }
  return new Map([...rows].map(([slug, row]) => [slug, { place: row.place, split: row.split,
    species: [...row.species.values()].sort((a, b) => b.split.total - a.split.total).map(({ item, split }) => ({ species: item, split })) }]));
}
