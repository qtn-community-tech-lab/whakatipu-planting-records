import type { Metadata } from "next";
import type { PlantTotals } from "@/components/wrt/events/map-event-form";
import { connection } from "next/server";
import { RecordSheet } from "@/components/wrt/create-planting-event";
import { listPlantingAreaPins, listPlantingAreaTotals, listSiteTotals } from "@/db/queries/sites";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { siteSpeciesSuggestions } from "@/lib/wrt/events/site-suggestions";

/**
 * /playground/record-sheet — concept for recording a planting on site. The
 * map fills the screen with a pin for every site, and the planting-event form
 * (the same three steps as /events/new) opens over it: a panel on the left on
 * wide screens, a drawer from the bottom on phones. `?site=<slug>` starts at
 * that site. Not linked from the nav.
 */
export const metadata: Metadata = {
  title: "Record sheet playground",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ site?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  await connection(); // "today" is per request
  const [options, suggestions, sites, areas, pins, { site }] = await Promise.all([
    eventFormOptions(), siteSpeciesSuggestions(), listSiteTotals(), listPlantingAreaTotals(), listPlantingAreaPins(), searchParams,
  ]);
  // Plants and species recorded at each site ("slug") and each part ("slug/wrt number"), for the site chooser.
  const totals: PlantTotals = {};
  for (const x of sites ?? []) if (x.site) totals[x.site] = { plants: x.plants ?? 0, species: x.species ?? 0 };
  for (const x of areas ?? []) if (x.site && x.wrt_number) totals[`${x.site}/${x.wrt_number}`] = { plants: x.plants ?? 0, species: x.species ?? 0 };
  // Only a site the form knows; anything else starts with every site in view.
  const initialSite = options.sites.some((x) => x.slug === site) ? String(site) : "";
  return (
    <RecordSheet
      initialSite={initialSite} options={options} today={todayInNz()} exitHref="/events/new" suggestions={suggestions} totals={totals} areas={pins ?? []}
    />
  );
}
