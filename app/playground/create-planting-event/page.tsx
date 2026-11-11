import type { Metadata, Viewport } from "next";
import type { PlantTotals } from "@/components/wrt/events/map-event-form";
import { revalidatePath, updateTag } from "next/cache";
import { connection } from "next/server";
import { CreatePlantingEvent } from "@/components/wrt/create-planting-event";
import { SUPABASE_TAG } from "@/db/cache";
import { isAuthenticated } from "@/db/queries/access";
import { createPlantingEvent, createPlantingLines, listSeasons, readSeason } from "@/db/queries/plantings";
import { createPlantingArea, listPlantingAreaPins, listPlantingAreas, listPlantingAreaTotals, listSiteTotals } from "@/db/queries/sites";
import { wholeSiteAreaSlug } from "@/lib/wrt/areas/whole-site";
import { listSpeciesForPlanting } from "@/db/queries/species";
import type { PlantingEventSubmitResult } from "@/db/types";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { siteSpeciesSuggestions } from "@/lib/wrt/events/site-suggestions";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { validateEventInput } from "@/lib/wrt/events/validate";

/**
 * /playground/create-planting-event — concept for recording a planting on site. The
 * map fills the screen with a pin for every site, and the planting-event form
 * (one page: where and when, then what was planted) opens over it: a panel on the left on
 * wide screens, a drawer from the bottom on phones. `?site=<slug>` starts at
 * that site, `&part=<wrt number>` at that part of it, and `&season=autumn-2025` with that past season open; the address follows all three, for bookmarks. Not linked from the nav.
 */
export const metadata: Metadata = {
  title: "Create planting event playground",
  robots: { index: false, follow: false },
};

// The status bar in the header's green (the bottom bar takes the page's white); on Android the
// keyboard shrinks the page instead of covering it.
export const viewport: Viewport = { themeColor: "#15261c", interactiveWidget: "resizes-content" };

type Props = { searchParams: Promise<{ site?: string | string[]; part?: string | string[]; season?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  await connection(); // "today" is per request
  const [options, suggestions, sites, areas, pins, { site, part, season }, authenticated, seasons] = await Promise.all([
    eventFormOptions(), siteSpeciesSuggestions(), listSiteTotals(), listPlantingAreaTotals(), listPlantingAreaPins(), searchParams, isAuthenticated(), listSeasons(),
  ]);
  // Plants and species recorded at each site ("slug") and each part ("slug/wrt number"), for the site chooser.
  const totals: PlantTotals = {};
  // Each site's latest season, by its place in planting order ("Autumn 2025"), for the chooser's rows and its Recent sort.
  const seasonLabel = new Map(seasons.map((x) => [x.season_order, x.season_label]));
  for (const x of sites ?? []) if (x.site) totals[x.site] = { plants: x.plants ?? 0, species: x.species ?? 0, last: seasonLabel.get(x.last_season) ?? undefined, lastOrder: x.last_season ?? undefined };
  for (const x of areas ?? []) if (x.site && x.wrt_number) totals[`${x.site}/${x.wrt_number}`] = { plants: x.plants ?? 0, species: x.species ?? 0 };
  // Only a site the form knows; anything else starts with every site in view.
  const initialSite = options.sites.some((x) => x.slug === site) ? String(site) : "";
  // Only one of that site's parts; anything else starts at the site as a whole.
  const initialPart = typeof part === "string" && options.sites.find((x) => x.slug === initialSite)?.parts.some((p) => p.id === part) ? part : undefined;
  // "autumn-2025" → Autumn 2025, at a site only.
  const m = initialSite && typeof season === "string" ? /^(summer|autumn|winter|spring)-(\d{4})$/.exec(season) : null;
  const initialSeason = m ? { slug: m[0], label: `${m[1]!.charAt(0).toUpperCase()}${m[1]!.slice(1)} ${m[2]}` } : undefined;
  return (
    <CreatePlantingEvent
      initialSite={initialSite} initialPart={initialPart} initialSeason={initialSeason} options={options} today={todayInNz()} exitHref="/events/new" onSave={authenticated ? onSave : undefined} canEdit={authenticated} suggestions={suggestions} totals={totals} areas={pins ?? []}
    />
  );
}

/**
 * Save a planting event and its plants (not drawn areas, new locations or moved pins). The
 * event goes in first, then all its lines in one insert. If the lines fail, the event's id comes
 * back as `savedPlantingEvent`; the form sends it on retry and only the lines are inserted.
 */
async function onSave(raw: PlantingEventInput, savedPlantingEvent?: number): Promise<PlantingEventSubmitResult> {
  "use server";
  if (!(await isAuthenticated())) return { error: "Sign in to save planting events." };
  // Trust boundary: the retry id comes from the browser.
  if (savedPlantingEvent !== undefined && !(Number.isSafeInteger(savedPlantingEvent) && savedPlantingEvent > 0))
    return { error: "The planting event could not be saved. Please try again." };
  const options = await eventFormOptions();
  const checked = validateEventInput(raw, {
    places: options.sites.map((x) => ({ slug: x.slug, isScheme: false, parcels: x.parts })),
    species: options.species,
  }, todayInNz());
  if (!checked.ok) return { issues: Object.entries(checked.errors).map(([path, message]) => ({ path, message })) };
  const event = checked.value;

  let id = savedPlantingEvent;
  try {
    const [areas, season, species] = await Promise.all([
      listPlantingAreas(event.placeSlug),
      // The seasons table has Autumn and Spring only, so Summer and Winter find nothing.
      readSeason(`${event.season.toLowerCase()}-${event.seasonYear}`),
      listSpeciesForPlanting(),
    ]);
    if (!season) return { issues: [{ path: "season", message: "Only Autumn and Spring seasons can be saved for now." }] };
    // The form's part id is the area's WRT number, or its slug when it has none. The site as a whole is its
    // only area, or at a site with several (or none yet), its site-wide area, made the first time it's needed.
    const wholeSite = wholeSiteAreaSlug(event.placeSlug);
    let area = event.parcelId === null
      ? (areas.find((a) => a.slug === wholeSite) ?? (areas.length === 1 ? areas[0] : undefined))?.slug
      : areas.find((a) => (a.wrt_number ?? a.slug) === event.parcelId)?.slug;
    if (!area && event.parcelId === null && areas.length !== 1 && id === undefined) {
      const name = `${options.sites.find((x) => x.slug === event.placeSlug)?.name ?? event.placeSlug}, whole site`;
      const { error } = await createPlantingArea({ slug: wholeSite, site: event.placeSlug, name });
      // 23505: another save made it just now, so it's there to use.
      if (error && error.code !== "23505") {
        console.error("Failed to create the site-wide area:", error);
        if (error.code === "42501") return { error: "You need to sign in with a staff account to save planting events." };
        return { error: "The planting event could not be saved. Please try again." };
      }
      area = wholeSite;
    }
    if (!area) return { issues: [{ path: "parcelId", message: "Choose where at this site these were planted." }] };
    // The form's species id is the register code, or the slug when it has none. Drawn areas are not
    // saved, so the same species in several areas is added together.
    const slugOf = new Map(species.map((x) => [x.register_code ?? x.slug, x.slug]));
    const quantities = new Map<string, number>();
    for (const line of event.species) {
      const slug = slugOf.get(line.speciesId)!; // checked against the same register above
      quantities.set(slug, (quantities.get(slug) ?? 0) + line.quantity);
    }

    if (id === undefined) {
      const { data, error } = await createPlantingEvent({ area, season: season.id, planted_on: event.plantedOn, notes: event.notes ?? "" });
      if (error) {
        console.error("Failed to create planting event:", error);
        if (error.code === "42501") return { error: "You need to sign in with a staff account to save planting events." };
        return { error: "The planting event could not be saved. Please try again." };
      }
      id = data.id;
    }
    const { error } = await createPlantingLines(id, [...quantities].map(([slug, quantity]) => ({ species: slug, quantity })));
    if (error) throw error; // the catch below keeps the saved event's id for the retry
  } catch (error) {
    console.error("Failed to save planting event:", error);
    if (id !== undefined)
      return { savedPlantingEvent: id, error: "The planting event was saved but its plants were not. Your entries are still here; please try again." };
    return { error: "The planting event could not be saved. Please try again." };
  }
  updateTag(SUPABASE_TAG);
  revalidatePath("/", "layout");
  return { savedPlantingEvent: id };
}
