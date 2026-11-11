"use server";
/**
 * What a site, or one part of it, has had planted, for the planting event page's overview:
 * its most planted trees and its most recent seasons, from the site_area_species and
 * site_area_seasons views; one season's planting events there, for its details; and saving one
 * of those events once edited.
 */
import { revalidatePath, updateTag } from "next/cache";
import { SUPABASE_TAG } from "@/db/cache";
import { isAuthenticated } from "@/db/queries/access";
import {
  createPlantingLines, deactivatePlantingLines, listPlantingEventNotes, listPlantingEventLines, listSiteSeasonPlantingLines,
  readPlantingEventSeason, updatePlantingEvent, updatePlantingLine,
} from "@/db/queries/plantings";
import { listPlantedAreasBySeason, listSiteSeasons, listSiteSpecies } from "@/db/queries/sites";
import { listSpecies, listSpeciesForPlanting } from "@/db/queries/species";
import { plantingEventEditSchema, type PlantingEventEditResult } from "@/db/types";
import { plantedOnProblem, todayInNz } from "@/lib/wrt/events/season";
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
const valid = (slug: string, parcelId: string | null) => SLUG.test(slug) && (parcelId === null || parcelId.length <= 80);
const toSeason = (x: { season: string | null; season_label: string | null; plants: number | null }, parts?: Map<string, number>) =>
  ({ slug: x.season ?? "", label: x.season_label ?? "", plants: x.plants ?? 0, parts: parts?.get(x.season ?? "") ?? 1 });

/** How many of a site's parts had plants in each season, by season slug. */
async function partsPerSeason(slug: string) {
  const out = new Map<string, number>();
  for (const x of await listPlantedAreasBySeason(slug)) if (x.season) out.set(x.season, (out.get(x.season) ?? 0) + 1);
  return out;
}

/** `parcelId` is the part's WRT number, as in the form's parts. */
export async function loadSiteOverview(slug: string, parcelId: string | null): Promise<SitePlantings | null> {
  if (!valid(slug, parcelId)) return null;
  const read = (part: string | null) => Promise.all([listSiteSpecies(slug, part, TREES_SHOWN), listSiteSeasons(slug, part, SEASONS_SHOWN)]);
  const [register, [first, firstSeasons], parts] = await Promise.all([listSpecies(), read(parcelId), partsPerSeason(slug)]);
  let [species, seasons] = [first, firstSeasons];
  const wholeSite = !parcelId || species.length === 0;
  if (parcelId && wholeSite) [species, seasons] = await read(null);

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
export async function loadSeasonPlantingEvents(slug: string, season: string, parcelId: string | null): Promise<SeasonPlantingEvents | null> {
  if (!valid(slug, parcelId) || !/^[a-z]+-\d{4}$/.test(season)) return null;
  const [register, lines] = await Promise.all([listSpecies(), listSiteSeasonPlantingLines(slug, season, parcelId)]);
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

const NOT_SAVED = "The planting event could not be saved. Your changes are still here. Please try again.";

/**
 * Save an edited past planting event: its date and notes, then its lines (quantities changed,
 * species added, species taken off, which are deactivated). These are separate writes, not one
 * transaction, so a failure part way says some changes were saved; saving again finishes the rest.
 */
export async function savePlantingEventEdit(id: number, raw: unknown): Promise<PlantingEventEditResult> {
  if (!(await isAuthenticated())) return { error: "Sign in to edit planting events." };
  // Trust boundary: the id and values come from the browser.
  if (!(Number.isSafeInteger(id) && id > 0)) return { error: NOT_SAVED };
  const parsed = plantingEventEditSchema.safeParse(raw);
  if (!parsed.success)
    return { issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) };
  const edit = parsed.data;

  let saved = false;
  try {
    const [season, current, species] = await Promise.all([readPlantingEventSeason(id), listPlantingEventLines(id), listSpeciesForPlanting()]);
    if (!season) return { error: NOT_SAVED };
    const problem = edit.plantedOn ? plantedOnProblem(edit.plantedOn, season, todayInNz()) : undefined;
    if (problem) return { issues: [{ path: "plantedOn", message: problem }] };
    // Only this event's own active lines can be changed.
    const byId = new Map(current.map((l) => [l.id, l]));
    if (edit.lines.some((l) => l.id !== null && !byId.has(l.id))) return { error: NOT_SAVED };
    // A species added is one in the active register; the form's id is its register code, or its slug.
    const slugOf = new Map(species.map((x) => [x.register_code ?? x.slug, x.slug]));
    const unknown = edit.lines.findIndex((l) => l.id === null && !slugOf.has(l.species));
    if (unknown >= 0) return { issues: [{ path: `lines.${unknown}.species`, message: "Choose a species from the list." }] };
    // A species added that already has a line here (sent again after a save that stopped part way) keeps that line.
    const named = new Set(edit.lines.map((l) => l.id));
    const lines = edit.lines.map((l) => {
      const slug = l.id === null ? slugOf.get(l.species)! : byId.get(l.id)!.species; // both checked above
      return { id: l.id ?? current.find((c) => c.species === slug && !named.has(c.id))?.id ?? null, species: slug, quantity: l.quantity };
    });
    const kept = new Set(lines.map((l) => l.id));

    const event = await updatePlantingEvent(id, { planted_on: edit.plantedOn, notes: edit.notes });
    if (event.error) return failed(event.error, false);
    saved = true;
    for (const line of lines) {
      if (line.id === null || byId.get(line.id)?.quantity === line.quantity) continue;
      const { error } = await updatePlantingLine(id, line.id, { quantity: line.quantity });
      if (error) return failed(error, true);
    }
    const removed = current.filter((c) => !kept.has(c.id)).map((c) => c.id);
    if (removed.length) {
      const { error } = await deactivatePlantingLines(id, removed);
      if (error) return failed(error, true);
    }
    const added = lines.filter((l) => l.id === null).map((l) => ({ species: l.species, quantity: l.quantity }));
    if (added.length) {
      const { error } = await createPlantingLines(id, added);
      if (error) return failed(error, true);
    }
  } catch (error) {
    return failed(error, saved);
  }
  refresh();
  return {};
}

/** After a write: every page reading the planting data reads it again. */
function refresh() {
  updateTag(SUPABASE_TAG);
  revalidatePath("/", "layout");
}

function failed(error: unknown, someSaved: boolean): PlantingEventEditResult {
  console.error("Failed to save planting event:", error);
  if (someSaved) refresh();
  if (error && typeof error === "object" && "code" in error && error.code === "42501")
    return { error: "You need to sign in with a staff account to edit planting events." };
  return { error: someSaved ? "Some changes were saved, but not all. Your changes are still here. Please save again." : NOT_SAVED };
}
