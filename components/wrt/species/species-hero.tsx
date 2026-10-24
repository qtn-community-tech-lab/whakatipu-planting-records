import Image from "next/image";
import Link from "next/link";
import { THREATENED_HREF, THREATENED_TITLE, threatenedState } from "@/components/wrt/shared/names";
import type { SeasonPoint, Span } from "@/lib/wrt/queries";
import { GrowthRings, type RingSeason } from "@/components/wrt/shell/growth-rings";
import type { Quantity, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar, SplitLine } from "@/components/wrt/shared/quantity";
import { NavGlyph } from "@/components/wrt/shell/nav-icons";

function Mosaic({ imageUrl, name }: { imageUrl: string; name: string }) {
  return <div className="wrt-shero__mosaic" data-count={1}>
    <figure className="wrt-shero__photo">
      <a href={imageUrl} target="_blank" rel="noreferrer" aria-label={`Open reference photo of ${name}`}>
        <Image src={imageUrl} width={1200} height={900} sizes="(max-width: 960px) 100vw, 40vw" alt={name} className="wrt-shero__img" unoptimized priority />
      </a>
      <figcaption className="wrt-shero__credit"><a href="#about-species">Photo credits and sources in the species description</a></figcaption>
    </figure>
  </div>;
}

/**
 * Species page header: the plant itself up front. Name, markers and the
 * headline numbers sit on the canopy green; reference photos (or the
 * species' own tree rings when there are none) fill the right side.
 */
export function SpeciesHero({
  species: sp, split, span, seasons, siteCount, rank, rankOf, otherNames,
}: {
  species: Species;
  split: Quantity;
  span: Span | null;
  seasons: SeasonPoint[];
  siteCount: number;
  rank: number;
  rankOf: number;
  otherNames: string[];
}) {
  const rings: RingSeason[] = seasons.map((p) => ({ slug: p.season.slug, label: p.season.label, total: p.split.total }));
  const hasPhotos = !!sp.imageUrl;

  return (
    <section className="wrt-shero" data-photos={hasPhotos || undefined} aria-labelledby="species-title">
      <div className="wrt-shero__text">
        <Link href="/species" className="wrt-shero__back">← All species</Link>

        <div className="wrt-shero__tags">
          <span className="wrt-shero__tag wrt-shero__tag--rank" title="Ranked by recorded plants">
            No. {rank} of {rankOf}
          </span>
          <span className="wrt-shero__tag">Native</span>
          {sp.over5m === true && <span className="wrt-shero__tag">Over 5 m</span>}
          {threatenedState(sp) && (
            <Link
              href={THREATENED_HREF}
              title={THREATENED_TITLE}
              className={`wrt-shero__tag ${threatenedState(sp) === "both" ? "wrt-shero__tag--risk" : "wrt-shero__tag--review"} !no-underline`}
            >
              {threatenedState(sp) === "both" ? "Marked threatened · basis unknown" : "Marked threatened in one WRT list"}
            </Link>
          )}

        </div>

        <div className="wrt-shero__names">
          <h1 id="species-title" className={sp.displayIsScientific ? "wrt-shero__title italic" : "wrt-shero__title"}>
            {sp.displayName}
          </h1>
          {!sp.displayIsScientific && <p className="wrt-shero__latin">{sp.scientificName}</p>}

          {otherNames.length > 0 && <p className="wrt-shero__aside">Also recorded as {otherNames.join(" · ")}</p>}
        </div>

        <div className="wrt-shero__figure">
          <div className="wrt-shero__value">
            <span className="tabular-nums">{formatNumber(split.total)}</span>
            <span className="wrt-shero__unit">recorded plants</span>
          </div>
          <SplitBar split={split} className="cn-bar--on-dark wrt-shero__bar" />
          <p className="wrt-shero__split">
            <SplitLine split={split} />

          </p>
        </div>

        <dl className="wrt-shero__stats">
          <div className="wrt-shero__stat">
            <dt><NavGlyph name="sites" /> Sites</dt>
            <dd className="tabular-nums">{formatNumber(siteCount)}</dd>
          </div>
          <div className="wrt-shero__stat">
            <dt><NavGlyph name="seasons" /> Seasons</dt>
            <dd className="tabular-nums">{span?.seasonsActive ?? 0}<span className="wrt-shero__of"> of {seasons.length}</span></dd>
          </div>
          <div className="wrt-shero__stat">
            <dt><NavGlyph name="records" /> Records</dt>
            <dd className="tabular-nums">{formatNumber(split.records)}</dd>
          </div>
        </dl>
        <p className="wrt-shero__span">{span ? `${span.seasonsActive} saved season labels` : "No planting history yet"}</p>

      </div>

      <div className="wrt-shero__media" id="photos">
        {hasPhotos ? (
          <>
            <Mosaic imageUrl={sp.imageUrl} name={sp.displayName} />
            <p className="wrt-shero__note">
              Reference photos from other places, not WRT sites. Young plants may look different.{" "}
              <Link href="/species/photos">Species reference guide</Link>
            </p>
          </>
        ) : (
          <div className="wrt-shero__rings">
            <GrowthRings seasons={rings} />
          </div>
        )}
      </div>
    </section>
  );
}
