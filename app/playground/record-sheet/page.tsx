import type { Metadata } from "next";
import { connection } from "next/server";
import { RecordSheet } from "@/components/wrt/record-sheet";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { siteSpeciesSuggestions } from "@/lib/wrt/events/site-suggestions";

/**
 * /playground/record-sheet — concept for recording a planting on site. The
 * map fills the screen with a pin for every site, and the planting-event form
 * (the same three steps as /events/new) opens over it: a panel on the left on
 * wide screens, a drawer from the bottom on phones. `?site=<slug>` flies in to
 * that site first. Not linked from the nav.
 */
export const metadata: Metadata = {
  title: "Record sheet playground",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ site?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  await connection(); // "today" is per request
  const [options, suggestions, { site }] = await Promise.all([eventFormOptions(), siteSpeciesSuggestions(), searchParams]);
  // Only a site the form knows; anything else starts with every site in view.
  const initialSite = options.sites.some((x) => x.slug === site) ? String(site) : "";
  return (
    <RecordSheet
      initialSite={initialSite} options={options} today={todayInNz()} exitHref="/events/new" suggestions={suggestions}
    />
  );
}
