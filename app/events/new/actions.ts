"use server";
/**
 * What a site, or one part of it, has had planted, for the planting event page's overview:
 * its most planted trees and its most recent seasons, from the site_area_species and
 * site_area_seasons views; one season's planting events there, for its details; saving a new
 * planting event; and saving one of those events once edited.
 */
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { SUPABASE_TAG } from "@/db/cache";
import {
  createPlantingEvent, createPlantingLines, listPlantingEvents, listPlantingEventLines, listPlantingEventLocations,
  listSiteSeasonPlantingLines, readPlantingEventSeason, readSeason, updatePlantingEvent, deactivatePlantingEvent, readPlantingEvent,
} from "@/db/queries/plantings";
import { listPlantingAreaSeasons, listPlantingAreas, listSiteSeasons, listSiteSpecies, updatePlantingAreaBoundary } from "@/db/queries/sites";
import { listSpecies, listSpeciesForPlanting } from "@/db/queries/species";
import {
  plantingEventEditSchema, savePlantingAreaBoundarySchema,
  type PlantingAreaBoundarySubmitResult, type PlantingEventEditResult, type PlantingEventSubmitResult,
} from "@/db/types";
import { wholeSiteAreaSlug } from "@/lib/wrt/areas/whole-site";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { plantedOnProblem, todayInNz } from "@/lib/wrt/events/season";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { validateEventInput } from "@/lib/wrt/events/validate";
import { SLUG } from "@/lib/wrt/text";
import { isAuthenticated, requireAuthenticated } from "@/db/queries/auth";

const TREES_SHOWN = 5;
const SEASONS_SHOWN = 6;

export interface SitePlantings {
  trees: { id: string; name: string; italic: boolean; second: string; here: number; photo: { src: string } | null }[];
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
        id: x.species ?? "", name: x.scientific_name ?? "", italic: true,
        second: [...new Set([x.maori_name, x.common_name])].filter((n) => n && n !== x.scientific_name).join(" · "),
        here: x.plants ?? 0,
        photo: p ? { src: p.src } : null,
      };
    }),
    seasons: seasons.map((x) => toSeason(x, wholeSite ? parts : undefined)),
    wholeSite,
  };
}


export interface SeasonPlantingEvents {
  locations: Awaited<ReturnType<typeof listPlantingEventLocations>>;
  /** The season's slug, e.g. "autumn-2021": every event's here. */
  season: string;
  events: {
    id: number; area: string; plantedOn: string | null; notes: string;
    site: string; siteName: string; areaSlug: string | null; updatedAt: string;
    type: "establishment" | "infill" | "replacement" | null;
    deactivatedAt?: string | null;
    /** Bound on the server to this event, and supplied only to approved staff. */
    onDeactivate?: (() => Promise<PlantingEventEditResult>) | undefined;
    /** Imported from the planting workbook, not entered in the app. */
    workbook: boolean;
    /** `id` is the planting line's id; `species` the event form's species id (register code, or slug). */
    lines: {
      id: string; species: string; name: string; italic: boolean;
      /** Supporting Māori and common names, when different from the scientific name. */
      second: string | null; secondItalic: boolean;
      photo: { src: string } | null; quantity: number;
    }[];
  }[];
}

/** One season's planting events at a site, or at one part of it: area by area, each one's plants most planted first. */
export async function loadSeasonPlantingEvents(slug: string, season: string, partId: string | null, focusedId?: number): Promise<SeasonPlantingEvents | null> {
  if (!valid(slug, partId) || !/^[a-z]+-\d{4}$/.test(season)) return null;
  if (focusedId !== undefined && !(Number.isSafeInteger(focusedId) && focusedId > 0)) return null;
  const [register, activeLines, locations, authenticated, focused] = await Promise.all([
    listSpecies(), listSiteSeasonPlantingLines(slug, season, partId), listPlantingEventLocations(), isAuthenticated(),
    focusedId ? readPlantingEvent(focusedId) : null,
  ]);
  const lines = [...activeLines];
  // Only an explicitly opened deactivated event is shown for traceability. Normal lists stay active-only.
  if (focused?.deactivated_at && focused.areas?.site === slug && focused.seasons?.slug === season
    && (!partId || partId === (focused.areas.wrt_number ?? focused.areas.slug))) {
    for (const line of await listPlantingEventLines(focused.id)) lines.push({
      line_id: line.id, planting_id: focused.id, area_name: focused.areas.name, wrt_number: focused.areas.wrt_number,
      planted_on: focused.planted_on, source: focused.source, species: line.species, quantity: line.quantity,
      register_code: line.species_info?.register_code ?? null, scientific_name: line.species_info?.scientific_name ?? null,
      common_name: line.species_info?.common_name ?? null, maori_name: line.species_info?.maori_name ?? null,
    });
  }
  const ids = [...new Set(lines.map((l) => l.planting_id ?? 0))];
  const details = new Map((ids.length ? await listPlantingEvents(ids) : []).map((n) => [n.id, n]));
  const photos = new Map(register.map((s) => [s.slug, s.photos[0]]));
  // The lines come area by area and most planted first, so each event's keep that order.
  const events = new Map<number, SeasonPlantingEvents["events"][number]>();
  for (const l of lines) {
    const id = l.planting_id ?? 0;
    let event = events.get(id);
    if (!event) {
      const detail = details.get(id);
      event = {
        id, area: l.area_name ?? "", plantedOn: l.planted_on, notes: detail?.notes ?? "", workbook: l.source === "workbook", lines: [],
        site: detail?.areas?.site ?? slug, siteName: detail?.areas?.sites?.name ?? slug,
        areaSlug: detail?.areas?.slug === wholeSiteAreaSlug(slug) ? null : detail?.areas?.slug ?? null,
        updatedAt: detail?.updated_at ?? "", type: detail?.type ?? null,
        deactivatedAt: detail?.deactivated_at ?? null,
        onDeactivate: authenticated && !detail?.deactivated_at ? deactivatePlantingEventAction.bind(null, id) : undefined,
      };
      events.set(id, event);
    }
    const p = photos.get(l.species ?? "");
    const name = l.scientific_name ?? "";
    event.lines.push({
      id: String(l.line_id), species: l.register_code ?? l.species ?? "", name, italic: true,
      second: [...new Set([l.maori_name, l.common_name])].filter((n) => n && n !== name).join(" · ") || null, secondItalic: false,
      photo: p ? { src: p.src } : null, quantity: l.quantity ?? 0,
    });
  }
  return { season, events: [...events.values()], locations };
}

const NOT_RECORDED = "The planting event could not be saved. Please try again.";
const NO_PLANTS = "The planting event was saved but its plants were not. Your entries are still here; please try again.";

/** Save the shared outline independently of the planting event and any plants entered for it. */
export async function savePlantingAreaBoundary(raw: unknown): Promise<PlantingAreaBoundarySubmitResult> {
  if (!(await isAuthenticated())) return { error: "Sign in as staff to save an area boundary." };
  const parsed = savePlantingAreaBoundarySchema.safeParse(raw);
  if (!parsed.success) {
    return { issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) };
  }
  const { site, area, boundary, editing } = parsed.data;
  if (area === wholeSiteAreaSlug(site)) return { error: "Choose a named area to save a boundary." };

  const failure = { error: "The boundary could not be saved. Your drawing is still here. Please try again." };
  try {
    const { data, error } = await updatePlantingAreaBoundary(site, area, boundary, editing);
    if (error?.code === "42501") return { error: "Sign in as staff to save an area boundary." };
    if (error || !data) return failure;
  } catch {
    return failure;
  }
  refresh();
  return {};
}

/**
 * Save a new planting event and its plants (not drawn areas, new locations or moved pins): the event, then all its lines in one insert. They're separate writes, so
 * if the lines fail the event's id comes back as `savedPlantingEvent`; the form sends it on retry and only the lines go in.
 */
export async function savePlantingEvent(raw: PlantingEventInput, savedPlantingEvent?: number): Promise<PlantingEventSubmitResult> {
  await requireAuthenticated("/events/new");
  // Trust boundary: the values and the retry id come from the browser.
  if (savedPlantingEvent !== undefined && !(Number.isSafeInteger(savedPlantingEvent) && savedPlantingEvent > 0)) return { error: NOT_RECORDED };
  const options = await eventFormOptions();
  const places = options.sites.map((x) => ({ slug: x.slug, parcels: x.parts }));
  const checked = validateEventInput(raw, { places, species: options.species }, todayInNz());
  if (!checked.ok) return { issues: Object.entries(checked.errors).map(([path, message]) => ({ path, message })) };
  const event = checked.value;

  let id = savedPlantingEvent;
  try {
    // The seasons table has Autumn and Spring only, so Summer and Winter find nothing.
    const [areas, season, slugOf] = await Promise.all([
      listPlantingAreas(event.siteSlug), readSeason(`${event.season.toLowerCase()}-${event.seasonYear}`), speciesSlugs(),
    ]);
    if (!season) return { issues: [{ path: "season", message: "Only Autumn and Spring seasons can be saved for now." }] };
    const area = areas.find((entry) => (entry.wrt_number ?? entry.slug) === event.partId)?.slug;
    if (!area) return { issues: [{ path: "partId", message: "Choose where at this site these were planted." }] };
    // Drawn areas aren't saved, so the same species in several areas is added together (each checked against the register above).
    const quantities = new Map<string, number>();
    for (const line of event.species) {
      const slug = slugOf.get(line.speciesId)!;
      quantities.set(slug, (quantities.get(slug) ?? 0) + line.quantity);
    }

    if (id === undefined) {
      const { data, error } = await createPlantingEvent({ area, season: season.id, planted_on: event.plantedOn, notes: event.notes ?? "" });
      if (error) throw error;
      id = data.id;
    }
    const { error } = await createPlantingLines(id, [...quantities].map(([species, quantity]) => ({ species, quantity })));
    if (error) throw error;
  } catch (error) {
    console.error("Failed to save planting event:", error);
    return id === undefined ? { error: NOT_RECORDED } : { savedPlantingEvent: id, error: NO_PLANTS };
  }
  refresh();
  return { savedPlantingEvent: id };
}

/** The register's species slugs by the form's species id: the register code, or the slug when it has none. */
async function speciesSlugs() {
  return new Map((await listSpeciesForPlanting()).map((x) => [x.register_code ?? x.slug, x.slug]));
}

const NOT_SAVED = "The planting event could not be saved. Your changes are still here. Please try again.";

/** Validate browser values, then replace the event and its lines in one transaction. */
export async function savePlantingEventEdit(id: number, raw: unknown): Promise<PlantingEventEditResult> {
  await requireAuthenticated("/events");
  if (!(Number.isSafeInteger(id) && id > 0)) return { error: NOT_SAVED };
  const parsed = plantingEventEditSchema.safeParse(raw);
  if (!parsed.success)
    return { issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) };
  const edit = parsed.data;

  let savedId: number;
  try {
    const [stored, current, slugOf] = await Promise.all([readPlantingEventSeason(id), listPlantingEventLines(id), speciesSlugs()]);
    if (!stored) return { error: NOT_SAVED };
    const problem = edit.plantedOn && edit.plantedOn !== stored.plantedOn ? plantedOnProblem(edit.plantedOn, stored.season, todayInNz()) : undefined;
    if (problem) return { issues: [{ path: "plantedOn", message: problem }] };
    const byId = new Map(current.map((l) => [l.id, l]));
    // Retained lines keep their species and provenance, including deactivated species.
    if (edit.lines.some((l) => l.id !== null && !byId.has(l.id))) return { error: NOT_SAVED };
    const unknown = edit.lines.findIndex((l) => l.id === null && !slugOf.has(l.species));
    if (unknown >= 0) return { issues: [{ path: `lines.${unknown}.species`, message: "Choose a species from the list." }] };
    const lines = edit.lines.map((l) => ({
      ...l, species: l.id === null ? slugOf.get(l.species)! : byId.get(l.id)!.species,
    }));
    // Register codes and slugs can name the same species. Check after resolving both.
    if (new Set(lines.map((l) => l.species)).size !== lines.length)
      return { issues: [{ path: "lines", message: "Each species can only be listed once." }] };
    const { data, error } = await updatePlantingEvent(id, { ...edit, lines });
    if (error) {
      if (error.code === "22023" && ["site", "area", "lines"].includes(error.details))
        return { issues: [{ path: error.details, message: error.message }] };
      if (error.code === "23505") return { issues: [{ path: "area", message: "An imported event already exists in this area and season. Choose another area." }] };
      throw error;
    }
    savedId = data.id;
  } catch (error) {
    console.error("Failed to save planting event:", error);
    return { error: NOT_SAVED };
  }
  refresh();
  redirect(`/events?event=${savedId}&saved=1`);
}

/** Deactivate the captured event; all actual totals are derived from active history. */
export async function deactivatePlantingEventAction(id: number): Promise<PlantingEventEditResult> {
  if (!(await isAuthenticated())) return { error: "Sign in to deactivate planting events." };
  const failure = { error: "The planting event could not be deactivated. Please try again." };
  if (!(Number.isSafeInteger(id) && id > 0)) return failure;
  let savedId: number;
  try {
    const { data, error } = await deactivatePlantingEvent(id);
    if (error) return failure;
    savedId = data.id;
  } catch {
    return failure;
  }
  refresh();
  redirect(`/events?event=${savedId}`);
}

/** After a write: every page reading the planting data reads it again. */
function refresh() {
  updateTag(SUPABASE_TAG);
  revalidatePath("/", "layout");
}
