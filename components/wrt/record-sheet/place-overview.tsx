"use client";
/**
 * What the panel shows before an event is started. With no site chosen, SiteIndex: every site and
 * how much has been planted there, to pick from. With a site, PlaceOverview: its (or the chosen
 * part's) most planted trees and its last few seasons, kept short. "Add new planting event" then opens the form.
 */
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { placePlantings, type PlacePlantings } from "@/app/playground/record-sheet/actions";
import { partHref } from "@/components/wrt/sites/site-rows";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { formatNumber } from "@/lib/wrt/text";
import type { PlantTotals } from "@/components/wrt/events/map-event-form";
// The form's frame, so the button sits where the form's Next does.
import f from "@/components/wrt/events/map-event-form.module.css";
import s from "./record-sheet.module.css";

export function PlaceOverview({ slug, parcelId, partName, onStart }: {
  slug: string;
  /** The chosen part: its own trees and seasons, when it has any recorded. */
  parcelId: string | null;
  partName?: string;
  onStart: () => void;
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
    <div className={f.form}>
      <div className={f.scroll} aria-busy={o === undefined}>
        {o === undefined ? <p className={f.empty}>Loading what&apos;s been planted here…</p> : !o || o.trees.length === 0 ? (
          <p className={f.empty}>Nothing recorded here yet.</p>
        ) : (
          <>
            {fellBack && <p className={f.context}>Nothing recorded at {partName} yet, so this is the whole site.</p>}
            <section className={s.ov} aria-label="Most planted here">
              <h3 className={f.groupTitle}>Most planted here</h3>
              <ul className={s.ovList}>
                {o.trees.map((t) => (
                  <li key={t.id}>
                    <span className={s.ovPhoto} aria-hidden="true">
                      {t.photo
                        ? <Image src={t.photo.src} alt="" fill sizes="32px" unoptimized style={{ objectFit: "cover", objectPosition: t.photo.focalPoint }} />
                        : t.name.charAt(0)}
                    </span>
                    <span className={s.ovName}>{t.italic ? <i>{t.name}</i> : t.name}</span>
                    <b>{formatNumber(t.here)}</b>
                  </li>
                ))}
              </ul>
            </section>
            <section className={s.ov} aria-label="Recent seasons">
              <h3 className={f.groupTitle}>Recent seasons</h3>
              <ul className={s.ovList}>
                {o.seasons.map((p) => (
                  <li key={p.slug}><span className={s.ovName}>{p.label}</span><b>{formatNumber(p.plants)}</b></li>
                ))}
              </ul>
              <Link href={parcelId && partName && !o.wholeSite ? partHref(slug, partName) : `/sites/${slug}`} target="_blank" className={s.ovMore}>
                Every season on the {parcelId && !o.wholeSite ? "part" : "site"} page<ArrowUpRight size={14} strokeWidth={2.4} />
              </Link>
            </section>
          </>
        )}
      </div>
      <footer className={f.foot}>
        <button type="button" className={f.next} onClick={onStart}>Add new planting event<ArrowRight size={18} strokeWidth={2.2} /></button>
      </footer>
    </div>
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
    <div className={f.form}>
      <div className={f.scroll}>
        <section className={s.ov} aria-label="Sites">
          <h3 className={f.groupTitle}>{sites.length} sites · {formatNumber(all)} plants</h3>
          <ul className={s.ovList}>
            {sorted.map((x) => (
              <li key={x.slug}>
                <button type="button" onClick={() => onChoose(x.slug)}>
                  <span className={s.ovName}>
                    {x.name}
                    {x.parts.length > 1 && <small>{x.parts.length} parts</small>}
                  </span>
                  <b>{formatNumber(plants(x.slug))}</b>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <footer className={f.foot}>
        <button type="button" className={f.next} onClick={onStart}>Add new planting event<ArrowRight size={18} strokeWidth={2.2} /></button>
      </footer>
    </div>
  );
}
