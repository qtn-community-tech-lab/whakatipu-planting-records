"use client";
/**
 * What the panel shows at a chosen site before an event is started: its (or the chosen part's)
 * last few seasons of plantings, then its most planted species, kept short. "Add new planting event" then opens the form.
 * With no site chosen the panel is the site chooser instead.
 */
import { ArrowRight, ArrowUpRight, MapPinned } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { sitePlantings } from "@/app/playground/create-planting-event/actions";
import { partHref } from "@/components/wrt/sites/site-rows";
import { formatNumber } from "@/lib/wrt/text";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { Skeleton } from "@/components/ui/skeleton";
// The form's own frame and Next button, so the overview sits exactly where the form will.
import f from "@/components/wrt/events/map-event-form.module.css";
import { SeasonList } from "@/components/wrt/shared/season-list";
import { useLoad } from "@/components/wrt/shared/use-load";
import s from "./site-overview.module.css";

export function SiteOverview({ slug, parcelId, partName, today, partPicker, onStart, onOpenSeason, pinMoved, onMovePin, onUndoPin }: {
  slug: string;
  /** First, on phones: a menu to switch to one of the site's parts (the page supplies it). */
  partPicker?: ReactNode;
  /** NZ today, "YYYY-MM-DD": how long ago each season was. */
  today: string;
  /** The chosen part: its own trees and seasons, when it has any recorded. */
  parcelId: string | null;
  partName?: string | undefined;
  onStart: () => void;
  /** A season's row: open its planting events. `wholeSite` when the seasons shown are the whole site's (the part has none). */
  onOpenSeason?: ((season: { slug: string; label: string }, wholeSite: boolean) => void) | undefined;
  /** The site's pin is in the wrong spot: move it here, first, before an event is started there. Not saved yet. */
  pinMoved?: boolean | undefined;
  onMovePin?: (() => void) | undefined;
  onUndoPin?: (() => void) | undefined;
}) {
  // The history couldn't be read: it says so (an event can still be added), and Try again asks once more.
  const { loading, failed, data: o, reload: retry } = useLoad(`${slug}/${parcelId ?? ""}`, () => sitePlantings(slug, parcelId));
  // The header already names the part; only say so when it falls back to the whole site.
  const fellBack = !!parcelId && !!partName && !!o?.wholeSite;

  return (
    <Frame onStart={onStart} busy={loading}>
      {partPicker}
      {onMovePin && pinMoved && (
        <p className={s.pinMoved} role="status">
          <span>Pin moved, not saved yet.</span>
          <button type="button" onClick={onMovePin}>Move again</button>
          <button type="button" onClick={onUndoPin}>Undo</button>
        </p>
      )}
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
          <p className={f.empty}>Nothing recorded here yet.</p>
        ) : (
          <>
            {fellBack && <p className={f.context}>Nothing recorded at {partName} yet, so this is the whole site.</p>}
            {/* Past plantings first: what went in, when, and a way into each season. */}
            <SeasonList
              seasons={o.seasons} today={today} summary={`Latest ${o.seasons.length === 1 ? "season" : `${o.seasons.length} seasons`}`}
              onOpen={onOpenSeason && ((x) => onOpenSeason(x, o.wholeSite))}
            >
              <Link href={parcelId && partName && !o.wholeSite ? partHref(slug, partName) : `/sites/${slug}`} target="_blank" className={s.more}>
                Every season on the {parcelId && !o.wholeSite ? "part" : "site"} page<ArrowUpRight size={14} strokeWidth={2.4} />
              </Link>
            </SeasonList>
            <hr className={s.divider} />
            <FigureList
              title="Most planted species"
              rows={o.trees.map((x) => ({ key: x.id, name: x.name, italic: x.italic, photo: x.photo, figure: formatNumber(x.here) }))}
            />
          </>
        )}
      {/* Last and quiet: rarely needed, and it changes more than this event. */}
      {onMovePin && !pinMoved && (
        <>
          <hr className={s.divider} />
          <button type="button" className={s.movePin} onClick={onMovePin}>
            <MapPinned size={15} strokeWidth={2.2} aria-hidden="true" />Pin in the wrong spot? Move it
          </button>
        </>
      )}
    </Frame>
  );
}

/** The form's frame, with "Add new planting event" where the form's Next sits. */
function Frame({ children, onStart, busy }: { children: ReactNode; onStart: () => void; busy?: boolean | undefined }) {
  return (
    <div className={f.form}>
      <div className={f.scroll} aria-busy={busy}>{children}</div>
      <footer className={f.foot}>
        <button type="button" className={f.next} onClick={onStart}>Add new planting event<ArrowRight size={18} strokeWidth={2.2} /></button>
      </footer>
    </div>
  );
}
