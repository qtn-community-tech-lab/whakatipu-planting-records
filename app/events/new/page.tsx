import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { CreatePlantingEvent, type PlantTotals } from "@/components/wrt/create-planting-event";
import { listSeasons } from "@/db/queries/plantings";
import { listPlantingAreaPins, listPlantingAreaTotals, listSiteTotals } from "@/db/queries/sites";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";

/**
 * /events/new — the planting event page. The map fills the screen with a pin for every
 * site, and a panel over it lists the sites and shows the chosen one's plantings: on the
 * left on wide screens, a drawer from the bottom on phones. `?site=<slug>` starts at
 * that site and `&part=<wrt number>` at that part of it; the address follows both, for bookmarks.
 * Other pages link here with `hrefs.newEvent` (lib/wrt/routes.ts).
 */
export const metadata: Metadata = {
  title: "New planting event",
  description: "Every site on a map, with what has been planted at each.",
};

// The status bar in the header's green (the bottom bar takes the page's white); on Android the
// keyboard shrinks the page instead of covering it.
export const viewport: Viewport = { themeColor: "#15261c", interactiveWidget: "resizes-content" };

type Props = { searchParams: Promise<{ site?: string | string[]; part?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  await connection(); // "today" is per request
  const [options, sites, areas, pins, { site, part }, seasons] = await Promise.all([
    eventFormOptions(), listSiteTotals(), listPlantingAreaTotals(), listPlantingAreaPins(), searchParams, listSeasons(),
  ]);
  // Plants and species recorded at each site ("slug") and each part ("slug/wrt number"), for the site chooser.
  const totals: PlantTotals = {};
  // Each site's latest season, by its place in planting order ("Autumn 2025"), for the chooser's rows and its Recent sort.
  const seasonLabel = new Map(seasons.map((x) => [x.season_order, x.season_label]));
  for (const x of sites ?? []) if (x.site) totals[x.site] = { plants: x.plants ?? 0, species: x.species ?? 0, last: seasonLabel.get(x.last_season) ?? undefined, lastOrder: x.last_season ?? undefined };
  // A part's id is its WRT number, or its slug when it has none (Slope Hill HGF).
  for (const x of areas ?? []) if (x.site && (x.wrt_number ?? x.area)) totals[`${x.site}/${x.wrt_number ?? x.area}`] = { plants: x.plants ?? 0, species: x.species ?? 0 };
  // Only a site the form knows; anything else starts with every site in view.
  const initialSite = options.sites.some((x) => x.slug === site) ? String(site) : "";
  // Only one of that site's parts; anything else starts at the site as a whole.
  const initialPart = typeof part === "string" && options.sites.find((x) => x.slug === initialSite)?.parts.some((p) => p.id === part) ? part : undefined;
  return (
    <CreatePlantingEvent
      initialSite={initialSite} initialPart={initialPart} options={options} today={todayInNz()} exitHref="/sites" totals={totals} areas={pins ?? []}
    />
  );
}
