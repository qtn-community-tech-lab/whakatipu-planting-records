import Image from "next/image";
import Link from "next/link";
import type { SpeciesSummary } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { hrefs } from "@/components/wrt/names";
import { SplitBar } from "@/components/wrt/quantity";
import { NavGlyph } from "@/components/wrt/shell/nav-icons";
import { getSpeciesPhotos, type SpeciesPhoto } from "@/lib/wrt/species-photos";
import { SpeciesMarkers } from "./species-meta";
import { SpeciesProfilePreview } from "./species-profile-preview";

const TILE_TONES = 4;

function toneFor(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % TILE_TONES;
}

/**
 * Stand-in for species without a reference photo: the initial over a ring for
 * every season the species was recorded in, like the sidebar's tree rings.
 */
function RingTile({ row }: { row: SpeciesSummary }) {
  const { item: sp, span } = row;
  const seasons = Math.max(1, span.seasonsActive);
  const initial = (sp.displayIsScientific ? sp.scientificName : sp.displayName).trim().charAt(0).toUpperCase();
  const step = 46 / Math.max(seasons, 1);
  return (
    <div className="wrt-scard__tile" data-tone={toneFor(sp.slug)}>
      <svg className="wrt-scard__rings" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {Array.from({ length: seasons }, (_, i) => (
          <circle key={i} cx="50" cy="50" r={6 + step * (i + 1)} />
        ))}
      </svg>
      <span className={sp.displayIsScientific ? "wrt-scard__initial italic" : "wrt-scard__initial"} aria-hidden="true">
        {initial}
      </span>
    </div>
  );
}

function PhotoMedia({ photo, name }: { photo: SpeciesPhoto; name: string }) {
  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 300px"
      style={{ objectPosition: photo.focalPoint }}
      alt={`Reference photo of ${name}: ${photo.caption}`}
      className="wrt-scard__img"
      unoptimized
    />
  );
}

/** One species in the field guide, as a specimen card. The whole card opens the species. */
export function SpeciesCard({ row, max, rank }: { row: SpeciesSummary; max: number; rank: number }) {
  const { item: sp, split, span, placeCount } = row;
  const photos = getSpeciesPhotos(sp.id);
  const photo = photos[0];
  const years = span.first.year === span.last.year ? `${span.first.year}` : `${span.first.year}–${span.last.year}`;
  const name = sp.displayName;

  return (
    <li className="wrt-scard" data-photo={photo ? true : undefined}>
      <div className="wrt-scard__media">
        {photo ? <PhotoMedia photo={photo} name={name} /> : <RingTile row={row} />}
        <span className="wrt-scard__rank" title={`Number ${rank} by recorded plants`}>
          <span className="sr-only">Rank </span>
          {rank}
        </span>
        {photo ? (
          <Link href={`${hrefs.species(sp.slug)}#photos`} className="wrt-scard__chip wrt-scard__above">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </Link>
        ) : (
          <span className="wrt-scard__chip wrt-scard__chip--quiet">
            {span.seasonsActive === 1 ? "1 season, 1 ring" : `${span.seasonsActive} seasons, one ring each`}
          </span>
        )}
        <div className="wrt-scard__marks">
          <SpeciesMarkers species={sp} />
        </div>
      </div>

      <div className="wrt-scard__body">
        <h3 className="wrt-scard__name">
          <Link href={hrefs.species(sp.slug)} className="wrt-scard__link">
            <span className={sp.displayIsScientific ? "wrt-scard__common italic" : "wrt-scard__common"}>{name}</span>
          </Link>
          {!sp.displayIsScientific && <span className="wrt-scard__latin">{sp.scientificName}</span>}
        </h3>

        <SpeciesProfilePreview speciesId={sp.id} slug={sp.slug} />

        <div className="wrt-scard__stats">
          <div className="wrt-scard__figure">
            <span className="wrt-scard__value tabular-nums">{formatNumber(split.total)}</span>
            <span className="wrt-scard__unit">recorded plants</span>
          </div>
          <SplitBar split={split} max={max} size="sm" />
          <span className={split.needsReview > 0 ? "wrt-scard__review tabular-nums" : "wrt-scard__review is-clear"}>
            {split.needsReview > 0 ? `${formatNumber(split.needsReview)} need review` : "None need review"}
          </span>
          <div className="wrt-scard__meta">
            <span className="wrt-scard__fact">
              <NavGlyph name="sites" />
              {formatNumber(placeCount)} site{placeCount === 1 ? "" : "s"}
            </span>
            <span
              className="wrt-scard__fact"
              title={`${span.seasonsActive} season${span.seasonsActive === 1 ? "" : "s"} with records, ${span.seasonsActive === 1 ? span.first.label : `${span.first.label} → ${span.last.label}`}`}
            >
              <NavGlyph name="seasons" />
              {years}
            </span>
          </div>
        </div>

        {photo && (
          <p className="wrt-scard__credit wrt-scard__above">
            Photo: {photo.author} · <a href={photo.licenseUrl}>{photo.license}</a> ·{" "}
            <a href={photo.sourceUrl}>{photo.sourceName === "iNaturalist" ? "iNaturalist" : "Wiki"} source</a>
          </p>
        )}
      </div>
    </li>
  );
}
