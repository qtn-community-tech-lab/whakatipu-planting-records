/**
 * The planting event page's figures from the CSV files, for when WRT_DATA_SOURCE is "csv"
 * and there is no Supabase to ask. Same answers as the queries in db/queries/sites.ts.
 */
import "server-only";
import type { PlantTotals } from "@/components/wrt/events/map-event-form";
import { getWrtAll } from "@/lib/wrt/server";

/** Plants and species recorded at each site ("slug") and each part ("slug/wrt number"). */
export async function csvPlantTotals(): Promise<PlantTotals> {
  const { rows } = await getWrtAll().records({});
  const seen = new Map<string, { plants: number; species: Set<string> }>();
  for (const { record, place, species } of rows) {
    for (const key of [place.slug, `${place.slug}/${record.parcelId}`]) {
      const t = seen.get(key) ?? { plants: 0, species: new Set() };
      t.plants += record.quantity;
      t.species.add(species.slug);
      seen.set(key, t);
    }
  }
  return Object.fromEntries([...seen].map(([key, t]) => [key, { plants: t.plants, species: t.species.size }]));
}

/** A site's most planted species and most recent seasons with plants, or one part's. */
export async function csvSitePlantings(site: string, parcelId: string | null, trees: number, seasonLimit: number) {
  const { rows } = await getWrtAll().records({});
  const here = rows.filter((v) => v.place.slug === site && (!parcelId || v.record.parcelId === parcelId));
  const species = new Map<string, { species: string; register_code: string; scientific_name: string; common_name: string | null; plants: number }>();
  const seasons = new Map<string, { season: string; season_label: string; order: number; plants: number }>();
  for (const v of here) {
    const s = species.get(v.species.slug)
      ?? { species: v.species.slug, register_code: v.species.id, scientific_name: v.species.scientificName, common_name: v.species.commonName, plants: 0 };
    s.plants += v.record.quantity;
    species.set(s.species, s);
    const t = seasons.get(v.season.slug) ?? { season: v.season.slug, season_label: v.season.label, order: v.season.order, plants: 0 };
    t.plants += v.record.quantity;
    seasons.set(t.season, t);
  }
  return [
    [...species.values()].sort((a, b) => b.plants - a.plants).slice(0, trees),
    [...seasons.values()].filter((x) => x.plants > 0).sort((a, b) => b.order - a.order).slice(0, seasonLimit),
  ] as const;
}
