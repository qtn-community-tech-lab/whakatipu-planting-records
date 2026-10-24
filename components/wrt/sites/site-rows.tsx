/**
 * Sites (or parts of a site) as rows: name and a line of facts, the split bar, the total, and the
 * few most recorded species. Used on the Sites page and on each season page;
 * the full species list for a site lives on that site's page.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { SiteSpecies } from "@/lib/wrt/queries";
import type { Quantity, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar } from "@/components/wrt/shared/quantity";
import { SpeciesAvatar } from "@/components/wrt/shared/species-avatar";

const TOP_PER_SITE = 3;

/** Address of one part (parcel) of a site, by its readable name. */
export function partHref(placeSlug: string, areaSlug: string) {
  return `/sites/${placeSlug}/parts/${encodeURIComponent(areaSlug)}`;
}

export interface SiteRowData {
  key: string;
  name: string;
  /** Where the name links: the site or part page. */
  href: string;
  isScheme?: boolean;
  split: Quantity;
  species: SiteSpecies[];
  /** Small facts under the name: class badges, seasons, parcels. */
  meta?: ReactNode;
  /** Where the total links: the records behind it. */
  totalHref: string;
  /** Where "+N more" links: the site page, or its year view. */
  moreHref: string;
  speciesHref: (s: Species) => string;
}

export function SiteRows({ rows, max, top: perSite = TOP_PER_SITE }: { rows: SiteRowData[]; max: number; top?: number }) {
  return (
    <div className="wrt-sitesp">
      {rows.map((r) => {
        const top = r.species.slice(0, perSite);
        const more = r.species.length - top.length;
        return (
          <div key={r.key} className="wrt-sitesp__site">
            <div className="wrt-sitesp__head">
              <span className="wrt-sitesp__title">
                <Link href={r.href} className="wrt-sitesp__name">{r.name}</Link>
                <span className="wrt-sitesp__meta">
                  {r.meta ?? <>{r.species.length} species</>}
                  {r.isScheme && " · order scheme, not a place"}
                </span>
              </span>
              <SplitBar split={r.split} max={max} size="sm" className="wrt-sitesp__bar" />
              <Link href={r.totalHref} className="wrt-sitesp__total">
                <b className="tabular-nums">{formatNumber(r.split.total)}</b>
                {r.split.unknown > 0 && <span>{r.split.unknown} unknown counts</span>}
              </Link>
            </div>
            {top.length > 0 && (
              <p className="wrt-sitesp__top">
                <span className="wrt-sitesp__label">Most recorded</span>
                {top.map((s) => (
                  <Link
                    key={s.species.slug}
                    href={r.speciesHref(s.species)}
                    className="wrt-mini"
                  >
                    <SpeciesAvatar species={s.species} />
                    <span className={s.species.displayIsScientific ? "italic" : undefined}>{s.species.displayName}</span>
                    <b className="tabular-nums">{formatNumber(s.split.total)}</b>
                  </Link>
                ))}
                {more > 0 && (
                  <Link href={r.moreHref} className="wrt-sitesp__more">
                    +{more} more at {r.name} →
                  </Link>
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
