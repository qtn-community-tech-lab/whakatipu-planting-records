"use client";
/**
 * What the panel shows at a chosen site before an event is started: its (or the chosen part's) last few seasons
 * of plantings, then its most planted species.
 */
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { loadSiteOverview } from "@/app/events/new/actions";
import { partHref } from "@/components/wrt/sites/site-rows";
import { formatNumber } from "@/lib/wrt/text";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { Skeleton } from "@/components/ui/skeleton";
// The form's own frame and Next button, so the overview sits exactly where the form will.
import * as panel from "../panel-classes";
import { SeasonList } from "@/components/wrt/shared/season-list";
import { StatTiles } from "@/components/wrt/shared/stat-tiles";
import type { PlantTotals } from "../map/sites";
import { useLoad } from "@/components/wrt/shared/use-load";
import s from "./site-overview.module.css";

export function SiteOverview({ slug, partId, partName, today, totals, map, places = [], onPlace, onStart, startLabel = "Add new planting event" }: {
  slug: string;
  /** A picture of where it is (the host's mini map): first on the page, and it scrolls up with it. */
  map?: ReactNode;
  /** NZ today, "YYYY-MM-DD": how long ago each season was. */
  today: string;
  /** The chosen part: its own trees and seasons, when it has any recorded. */
  partId: string | null;
  partName?: string | undefined;
  /** Plants and species by site and by `site/part`: the tiles at the top. */
  totals: PlantTotals;
  /** The site's places (its parts), listed under the tiles; `onPlace` opens one's page. */
  places?: readonly { id: string; name: string }[] | undefined;
  onPlace?: ((id: string) => void) | undefined;
  onStart: () => void;
  /** The start button's words: "Back to your planting event" when one with entries is waiting. */
  startLabel?: string | undefined;
}) {
  // The history couldn't be read: it says so (an event can still be added), and Try again asks once more.
  const { loading, failed, data: o, reload: retry } = useLoad(`${slug}/${partId ?? ""}`, () => loadSiteOverview(slug, partId));
  // The header already names the part; only say so when it falls back to the whole site.
  const fellBack = !!partId && !!partName && !!o?.wholeSite;

  return (
    <Frame onStart={onStart} label={startLabel} busy={loading}>
      {map}
        {loading ? (
          <div className={s.loading}>
            <span className="sr-only">Loading what&apos;s been planted here</span>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : failed ? (
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            Couldn&apos;t load what&apos;s been planted here. You can still add a planting event.{" "}
            <button type="button" className="cn-btn cn-btn--soft cn-btn--sm" onClick={retry}>Try again</button>
          </div>
        ) : !o || o.trees.length === 0 ? (
          <p className={panel.empty}>Nothing recorded here yet.</p>
        ) : (
          <>
            {fellBack && <p className={panel.context}>Nothing recorded at {partName} yet, so this is the whole site.</p>}
            <StatTiles stats={tiles(totals, slug, o.wholeSite ? null : partId, places.length)} />
          </>
        )}
        {/* Right under the tiles (or with nothing recorded yet): the site's places, each a way to its page. */}
        {places.length > 0 && (
          <FigureList
            title="Places"
            rows={places.map((p) => ({ key: p.id, name: p.name, figure: formatNumber(totals[`${slug}/${p.id}`]?.plants ?? 0), onClick: onPlace && (() => onPlace(p.id)) }))}
          />
        )}
        {o && o.trees.length > 0 && (
          <>
            {/* Past plantings first: what went in, and when. */}
            <SeasonList seasons={o.seasons} today={today} summary={`Latest ${o.seasons.length === 1 ? "season" : `${o.seasons.length} seasons`}`}>
              <Link href={partId && partName && !o.wholeSite ? partHref(slug, partName) : `/sites/${slug}`} target="_blank" className={s.more}>
                Every season on the {partId && !o.wholeSite ? "place" : "site"} page<ArrowUpRight size={14} strokeWidth={2.4} />
              </Link>
            </SeasonList>
            <hr className={s.divider} />
            <FigureList
              title="Most planted species"
              rows={o.trees.map((x) => ({ key: x.id, name: x.name, italic: x.italic, photo: x.photo, figure: formatNumber(x.here) }))}
            />
          </>
        )}
    </Frame>
  );
}

/** Plants and species, as on a season; for the whole site, also how many places it has (as listed under them). */
function tiles(totals: PlantTotals, slug: string, partId: string | null, places: number) {
  const x = totals[partId ? `${slug}/${partId}` : slug];
  const parts = partId ? 0 : places;
  return [
    { label: "Plants", value: formatNumber(x?.plants ?? 0) },
    { label: "Species", value: String(x?.species ?? 0) },
    ...(parts > 0 ? [{ label: "Places", value: String(parts) }] : []),
  ];
}

/** The form's frame, with "Add new planting event" where the form's Next sits. */
function Frame({ children, onStart, label, busy }: { children: ReactNode; onStart: () => void; label: string; busy?: boolean | undefined }) {
  return (
    <div className={panel.form}>
      <div className={panel.scroll} aria-busy={busy}>{children}</div>
      <footer className={panel.foot}>
        <button type="button" className={panel.next} onClick={onStart}>{label}<ArrowRight size={18} strokeWidth={2.2} /></button>
      </footer>
    </div>
  );
}
