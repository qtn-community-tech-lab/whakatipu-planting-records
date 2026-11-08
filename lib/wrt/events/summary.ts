/**
 * What a checked planting event says, in words: the summary on "Check and
 * submit" and on the "Not saved" preview. Names only, never ids, as
 * everywhere else in the app.
 */
import type { EventFormOptions } from "./form-options";
import { formatPlantedOn } from "./season";
import type { PlantingEventInput } from "./types";

export interface EventSummary {
  site: string;
  part: string;
  date: string;
  season: string;
  /** With `area` when the event has drawn areas: the record sheet's area id. */
  species: { name: string; quantity: number; area?: number }[];
  total: number;
  notes: string | null;
}

export const WHOLE_SITE = "The site as a whole";

export function describeEvent(input: PlantingEventInput, options: EventFormOptions): EventSummary {
  const site = options.sites.find((s) => s.slug === input.placeSlug);
  const part = input.parcelId === null ? null : site?.parts.find((p) => p.id === input.parcelId);
  const speciesName = new Map(options.species.map((s) => [s.id, s.name]));

  return {
    site: site?.name ?? "Unknown site",
    part: input.parcelId === null ? WHOLE_SITE : part?.name ?? "Unknown part",
    date: formatPlantedOn(input.plantedOn),
    season: `${input.season} ${input.seasonYear}`,
    species: input.species.map((l) => ({ name: speciesName.get(l.speciesId) ?? "Unknown species", quantity: l.quantity, area: l.area })),
    total: input.species.reduce((sum, l) => sum + l.quantity, 0),
    notes: input.notes,
  };
}
