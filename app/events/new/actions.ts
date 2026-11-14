"use server";
/**
 * What a site, or one part of it, has had planted, for the planting event page's overview:
 * its most planted trees and its most recent seasons, from the site_area_species and
 * site_area_seasons views; and one season's planting events there, for its details.
 */
import { listPlantingEventNotes, listSiteSeasonPlantingLines } from "@/db/queries/plantings";
import { listPlantingAreaSeasons, listSiteSeasons, listSiteSpecies } from "@/db/queries/sites";
import { listSpecies } from "@/db/queries/species";
import { SLUG } from "@/lib/wrt/text";

const TREES_SHOWN = 5;
const SEASONS_SHOWN = 6;

export interface SitePlantings {
  trees: { id: string; name: string; italic: boolean; here: number; photo: { src: string } | null }[];
  /** `parts`: how many of the site's parts had plants that season (the whole site's seasons only; 1 for a part's). */
  seasons: { slug: string; label: string; plants: number; parts: number }[];
  /** A part with nothing recorded shows the whole site's instead. */
  wholeSite: boolean;
}

// Trust boundary: server actions are public endpoints.
const valid = (slug: string, partId: string | null) => SLUG.test(slug) && (partId === null || partId.length <= 80);
const toSeason = (x: { season: string | null; season_label: string | null; plants: number | null }, parts?: Map<string, number>) =>
  ({ slug: x.season ?? "", label: x.season_label ?? "", plants: x.plants ?? 0, parts: parts?.get(x.season ?? "") ?? 1 });

/** How many of a site's parts had plants in each season, by season slug. */
async function partsPerSeason(slug: string) {
  const out = new Map<string, number>();
  for (const x of await listPlantingAreaSeasons(slug)) if (x.season) out.set(x.season, (out.get(x.season) ?? 0) + 1);
  return out;
}

/** `partId` is the part's WRT number, as in the form's parts. */
export async function loadSiteOverview(slug: string, partId: string | null): Promise<SitePlantings | null> {
  if (!valid(slug, partId)) return null;
  const read = (part: string | null) => Promise.all([listSiteSpecies(slug, part, TREES_SHOWN), listSiteSeasons(slug, part, SEASONS_SHOWN)]);
  const [register, [first, firstSeasons], parts] = await Promise.all([listSpecies(), read(partId), partsPerSeason(slug)]);
  let [species, seasons] = [first, firstSeasons];
  const wholeSite = !partId || species.length === 0;
  if (partId && wholeSite) [species, seasons] = await read(null);

  const photos = new Map(register.map((s) => [s.slug, s.photos[0]]));
  return {
    trees: species.map((x) => {
      const p = photos.get(x.species ?? "");
      return {
        id: x.species ?? "", name: x.common_name ?? x.scientific_name ?? "", italic: !x.common_name, here: x.plants ?? 0,
        photo: p ? { src: p.src } : null,
      };
    }),
    seasons: seasons.map((x) => toSeason(x, wholeSite ? parts : undefined)),
    wholeSite,
  };
}


export interface SeasonPlantingEvents {
  /** The season's slug, e.g. "autumn-2021": every event's here. */
  season: string;
  events: {
    id: number; area: string; plantedOn: string | null; notes: string;
    /** Imported from the planting workbook, not entered in the app. */
    workbook: boolean;
    /** `id` is the planting line's id; `species` the event form's species id (register code, or slug). */
    lines: {
      id: string; species: string; name: string; italic: boolean;
      /** Under the name: the Māori name when it's another, else the scientific name when the name is a common one. */
      second: string | null; secondItalic: boolean;
      photo: { src: string } | null; quantity: number;
    }[];
  }[];
}

/** One season's planting events at a site, or at one part of it: area by area, each one's plants most planted first. */
export async function loadSeasonPlantingEvents(slug: string, season: string, partId: string | null): Promise<SeasonPlantingEvents | null> {
  if (!valid(slug, partId) || !/^[a-z]+-\d{4}$/.test(season)) return null;
  const [register, lines] = await Promise.all([listSpecies(), listSiteSeasonPlantingLines(slug, season, partId)]);
  const ids = [...new Set(lines.map((l) => l.planting_id ?? 0))];
  const notes = new Map((ids.length ? await listPlantingEventNotes(ids) : []).map((n) => [n.id, n.notes.trim()]));
  const photos = new Map(register.map((s) => [s.slug, s.photos[0]]));
  // The lines come area by area and most planted first, so each event's keep that order.
  const events = new Map<number, SeasonPlantingEvents["events"][number]>();
  for (const l of lines) {
    const id = l.planting_id ?? 0;
    let event = events.get(id);
    if (!event) {
      event = { id, area: l.area_name ?? "", plantedOn: l.planted_on, notes: notes.get(id) ?? "", workbook: l.source === "workbook", lines: [] };
      events.set(id, event);
    }
    const p = photos.get(l.species ?? "");
    const name = l.common_name ?? l.scientific_name ?? "";
    const maori = l.maori_name && l.maori_name !== name ? l.maori_name : null;
    event.lines.push({
      id: String(l.line_id), species: l.register_code ?? l.species ?? "", name, italic: !l.common_name,
      second: maori ?? (l.common_name ? l.scientific_name : null), secondItalic: !maori,
      photo: p ? { src: p.src } : null, quantity: l.quantity ?? 0,
    });
  }
  return { season, events: [...events.values()] };
}
