/**
 * Planting events joined to names, for the list page, the map labels and the
 * CSV export. One place to turn ids into what people read.
 */
import "server-only";
import type { ExistingArea } from "@/components/wrt/events/use-event-form";
import { eventFormOptions } from "./form-options";
import { getEventStore } from "./server";
import { polygonAreaM2 } from "./geo";
import { formatPlantedOn } from "./season";
import type { PlantingEvent } from "./types";

export interface EventView {
  event: PlantingEvent;
  siteName: string;
  /** Part-of-site name, or null for the site as a whole. */
  partName: string | null;
  /** "Autumn 2026". */
  seasonLabel: string;
  /** "Wed 7 Oct 2026". */
  dateLabel: string;
  species: { id: string; name: string; scientific: string; isScientific: boolean; quantity: number }[];
  totalPlants: number;
  areaM2: number;
}

export async function eventViews(events: PlantingEvent[]): Promise<EventView[]> {
  const { sites, species } = await eventFormOptions();
  const siteBySlug = new Map(sites.map((s) => [s.slug, s]));
  const speciesById = new Map(species.map((s) => [s.id, s]));
  return events.map((event) => {
    const site = siteBySlug.get(event.placeSlug);
    return {
      event,
      // A site or species removed from the register later still shows something readable.
      siteName: site?.name ?? "Unknown site",
      partName: event.parcelId ? site?.parts.find((p) => p.id === event.parcelId)?.name ?? "Unknown part" : null,
      seasonLabel: `${event.season} ${event.seasonYear}`,
      dateLabel: formatPlantedOn(event.plantedOn),
      species: event.species.map((line) => {
        const s = speciesById.get(line.speciesId);
        return {
          id: line.speciesId,
          name: s?.name ?? "Unknown species",
          scientific: s?.scientific ?? "",
          isScientific: s?.isScientific ?? false,
          quantity: line.quantity,
        };
      }),
      totalPlants: event.species.reduce((s, l) => s + l.quantity, 0),
      areaM2: polygonAreaM2(event.polygon),
    };
  });
}

/** Every saved area, labelled for the map; the form shows the ones at the chosen site. */
export async function savedAreas(): Promise<ExistingArea[]> {
  const views = await eventViews(await getEventStore().list());
  return views.map((v) => ({
    id: v.event.id,
    placeSlug: v.event.placeSlug,
    label: `${v.seasonLabel} · ${v.dateLabel}`,
    polygon: v.event.polygon,
  }));
}
