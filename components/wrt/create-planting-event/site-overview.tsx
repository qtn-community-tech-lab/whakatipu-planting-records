"use client";
/**
 * What the panel shows before an event is started. With no site chosen, SiteIndex: every site and
 * how much has been planted there, to pick from. With a site, PlaceOverview: its (or the chosen
 * part's) most planted trees and its last few seasons, kept short. "Add new planting event" then opens the form.
 */
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { placePlantings, type PlacePlantings } from "@/app/playground/create-planting-event/actions";
import { partHref } from "@/components/wrt/sites/site-rows";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { formatNumber } from "@/lib/wrt/text";
import type { PlantTotals } from "@/components/wrt/events/map-event-form";
import { FigureList } from "@/components/wrt/shared/figure-list";
// The form's own frame and Next button, so the overview sits exactly where the form will.
import f from "@/components/wrt/events/map-event-form.module.css";
import s from "./site-overview.module.css";

export function PlaceOverview({ slug, parcelId, partName, onStart, onBack }: {
  slug: string;
  /** The chosen part: its own trees and seasons, when it has any recorded. */
  parcelId: string | null;
  partName?: string;
  onStart: () => void;
  /** Back to the index of every site. */
  onBack: () => void;
}) {
  const key = `${slug}/${parcelId ?? ""}`;
  const [loaded, setLoaded] = useState<{ key: string; data: PlacePlantings | null } | null>(null);
  useEffect(() => {
    let live = true;
    placePlantings(slug, parcelId).then((data) => { if (live) setLoaded({ key, data }); });
    return () => { live = false; };
  }, [slug, parcelId, key]);
  const o = loaded?.key === key ? loaded.data : undefined;
  // The header already names the part; only say so when it falls back to the whole site.
  const fellBack = !!parcelId && !!partName && !!o?.wholeSite;

  return (
    <Frame onStart={onStart} busy={o === undefined}>
      <button type="button" className={s.back} onClick={onBack}><ArrowLeft size={16} strokeWidth={2.4} />All locations</button>
        {o === undefined ? <p className={f.empty}>Loading what&apos;s been planted here…</p> : !o || o.trees.length === 0 ? (
          <p className={f.empty}>Nothing recorded here yet.</p>
        ) : (
          <>
            {fellBack && <p className={f.context}>Nothing recorded at {partName} yet, so this is the whole site.</p>}
            <FigureList
              title="Most planted here"
              rows={o.trees.map((x) => ({ key: x.id, name: x.name, italic: x.italic, photo: x.photo, figure: formatNumber(x.here) }))}
            />
            <FigureList title="Recent seasons" rows={o.seasons.map((x) => ({ key: x.slug, name: x.label, figure: formatNumber(x.plants) }))}>
              <Link href={parcelId && partName && !o.wholeSite ? partHref(slug, partName) : `/sites/${slug}`} target="_blank" className={s.more}>
                Every season on the {parcelId && !o.wholeSite ? "part" : "site"} page<ArrowUpRight size={14} strokeWidth={2.4} />
              </Link>
            </FigureList>
          </>
        )}
    </Frame>
  );
}

/** Every site, most planted first, with a count line on top: an index to pick a site from (or tap its pin). */
export function SiteIndex({ sites, totals, onChoose, onStart }: {
  sites: readonly SiteOption[];
  totals: PlantTotals;
  onChoose: (slug: string) => void;
  onStart: () => void;
}) {
  const plants = (slug: string) => totals[slug]?.plants ?? 0;
  const sorted = [...sites].sort((a, b) => plants(b.slug) - plants(a.slug));
  const all = sorted.reduce((sum, x) => sum + plants(x.slug), 0);
  return (
    <Frame onStart={onStart}>
      <FigureList
        title={`${sites.length} sites · ${formatNumber(all)} plants`}
        rows={sorted.map((x) => ({
          key: x.slug, name: x.name, sub: x.parts.length > 1 ? `${x.parts.length} parts` : undefined,
          figure: formatNumber(plants(x.slug)), onClick: () => onChoose(x.slug),
        }))}
      />
    </Frame>
  );
}

/** The form's frame, with "Add new planting event" where the form's Next sits. */
function Frame({ children, onStart, busy }: { children: ReactNode; onStart: () => void; busy?: boolean }) {
  return (
    <div className={f.form}>
      <div className={f.scroll} aria-busy={busy}>{children}</div>
      <footer className={f.foot}>
        <button type="button" className={f.next} onClick={onStart}>Add new planting event<ArrowRight size={18} strokeWidth={2.2} /></button>
      </footer>
    </div>
  );
}
