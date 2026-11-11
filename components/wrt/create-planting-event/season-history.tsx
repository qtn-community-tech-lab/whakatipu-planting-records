"use client";
/**
 * The form's Where step, at a chosen site: every season planted there (or at the chosen part),
 * newest first, with the plants in each and a total, so you can see what's gone in before.
 */
import { loadSiteSeasonHistory } from "@/app/playground/create-planting-event/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/wrt/text";
import f from "@/components/wrt/events/map-event-form.module.css";
import { SeasonList } from "@/components/wrt/shared/season-list";
import { useLoad } from "@/components/wrt/shared/use-load";


export function SeasonHistory({ slug, parcelId, partName, today, onOpenSeason }: {
  slug: string; parcelId: string | null; partName?: string | undefined;
  /** NZ today, "YYYY-MM-DD": how long ago each season was. */
  today: string;
  /** A season's row: open its planting events. `wholeSite` when the seasons shown are the whole site's (the part has none). */
  onOpenSeason?: ((season: { slug: string; label: string }, wholeSite: boolean) => void) | undefined;
}) {
  const { loading, failed, data: o } = useLoad(`${slug}/${parcelId ?? ""}`, () => loadSiteSeasonHistory(slug, parcelId));

  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="sr-only">Loading past plantings</span>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
      </div>
    );
  }
  if (failed) return <p className={f.quiet} role="alert">Couldn&apos;t load past plantings here.</p>;
  if (!o || o.seasons.length === 0) return <p className={f.quiet}>Nothing planted here before.</p>;
  return (
    <>
      {parcelId && partName && o.wholeSite && <p className={f.context}>Nothing recorded at {partName} yet, so this is the whole site.</p>}
      <SeasonList
        seasons={o.seasons} today={today} onOpen={onOpenSeason && ((x) => onOpenSeason(x, o.wholeSite))}
        summary={`${o.seasons.length} ${o.seasons.length === 1 ? "season" : "seasons"} · ${formatNumber(o.seasons.reduce((n, x) => n + x.plants, 0))} plants`}
      />
    </>
  );
}
