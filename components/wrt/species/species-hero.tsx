import Link from "next/link";
import { ThreatenedBadge } from "@/components/wrt/shared/names";
import { Tag } from "@/components/ui/tag";
import type { QuantitySplit, Species } from "@/lib/wrt/types";
import type { SeasonPoint, Span } from "@/lib/wrt/queries";
import type { SpeciesPhoto } from "@/lib/wrt/species-photos";
import { PhotoMedia } from "./photo-media";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar } from "@/components/wrt/shared/quantity";
import { NavGlyph } from "@/components/wrt/shell/nav-icons";
import { GrowthRings, type RingSeason } from "@/components/wrt/shell/growth-rings";

function Mosaic({ photos, name }: { photos: readonly SpeciesPhoto[]; name: string }) {
  const shown = photos.slice(0, 3);
  return (
    <div className="wrt-shero__mosaic" data-count={shown.length}>
      {shown.map((photo, i) => (
        <PhotoMedia
          key={photo.src} photo={photo} name={name} variant="hero"
          sizes={i === 0 ? "(max-width: 960px) 100vw, 40vw" : "(max-width: 960px) 50vw, 20vw"}
          preload={i === 0}
        />
      ))}
    </div>
  );
}

/**
 * Species page header: the plant itself up front. Name, markers and the
 * headline numbers sit on the canopy green; reference photos (or the
 * species' own tree rings when there are none) fill the right side.
 */
export function SpeciesHero({
  species: sp, split, span, seasons, siteCount, rank, rankOf, photos, otherNames,
}: {
  species: Species;
  split: QuantitySplit;
  span: Span | null;
  seasons: SeasonPoint[];
  siteCount: number;
  rank: number;
  rankOf: number;
  photos: readonly SpeciesPhoto[];
  otherNames: string[];
}) {
  const rings: RingSeason[] = seasons.map((p) => ({
    slug: p.season.slug,
    label: p.season.label,
    autumn: p.season.name === "Autumn",
    total: p.split.total,
  }));
  const firstPhoto = photos[0];

  return (
    <section className="wrt-shero" data-photos={!!firstPhoto || undefined} aria-labelledby="species-title">
      <div className="wrt-shero__text">
        <Link href="/species" className="wrt-shero__back">← All species</Link>

        <div className="wrt-shero__tags">
          <Tag className="text-[var(--cn-lime-300)]" title="Ranked by recorded plants">No. {rank} of {rankOf}</Tag>
          <Tag>Native</Tag>
          {sp.over5m === true && <Tag>Over 5 m</Tag>}
          <ThreatenedBadge species={sp} />
        </div>

        <div className="wrt-shero__names">
          <h1 id="species-title" className={sp.displayIsScientific ? "wrt-shero__title italic" : "wrt-shero__title"}>
            {sp.displayName}
          </h1>
          {!sp.displayIsScientific && <p className="wrt-shero__latin">{sp.scientificName}</p>}
          {sp.suggestedSpelling && (
            <p className="wrt-shero__aside">
              Usual spelling: <i>{sp.suggestedSpelling}</i>. WRT’s lists use <i>{sp.scientificName}</i>.
            </p>
          )}
          {otherNames.length > 0 && <p className="wrt-shero__aside">Also recorded as {otherNames.join(" · ")}</p>}
        </div>

        <div className="wrt-shero__figure">
          <div className="wrt-shero__value">
            <span className="tabular-nums">{formatNumber(split.total)}</span>
            <span className="wrt-shero__unit">recorded plants</span>
          </div>
          <SplitBar split={split} className="cn-bar--on-dark wrt-shero__bar" />
          <p className="wrt-shero__split">
            {formatNumber(split.records)} records
          </p>
        </div>

        <dl className="wrt-shero__stats">
          <div className="wrt-shero__stat">
            <dt><NavGlyph name="sites" /> Sites</dt>
            <dd className="tabular-nums">{formatNumber(siteCount)}</dd>
          </div>
          <div className="wrt-shero__stat">
            <dt><NavGlyph name="seasons" /> Seasons</dt>
            <dd className="tabular-nums">
              {span?.seasonsActive ?? 0}
              <span className="wrt-shero__of"> of {seasons.length}</span>
            </dd>
          </div>
          <div className="wrt-shero__stat">
            <dt><NavGlyph name="records" /> Records</dt>
            <dd className="tabular-nums">{formatNumber(split.records)}</dd>
          </div>
        </dl>
        <p className="wrt-shero__span">
          {!span ? "No planting records yet." : span.seasonsActive === 1 ? `Recorded in ${span.first.label} only.` : `${span.first.label} → ${span.last.label}`}
        </p>
      </div>

      <div className="wrt-shero__media" id="photos">
        {firstPhoto ? (
          <>
            <Mosaic photos={photos} name={sp.displayName} />
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
