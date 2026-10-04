import Image from "next/image";
import Link from "next/link";
import type { SpeciesSummary } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { hrefs } from "@/components/wrt/names";
import { getSpeciesPhotos, type SpeciesPhoto } from "@/lib/wrt/species-photos";
import { getSpeciesProfile } from "@/lib/wrt/species-profiles";
import { SpeciesMarkers } from "./species-meta";
import { SpeciesReferenceStatus } from "./species-reference-status";
import { SpeciesProfileSources } from "./species-profile-preview";

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

function PhotoMedia({ photo, name, sizes }: { photo: SpeciesPhoto; name: string; sizes: string }) {
  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      style={{ objectPosition: photo.focalPoint }}
      alt={`Reference photo of ${name}: ${photo.caption}`}
      className="wrt-scard__img"
      unoptimized
    />
  );
}

/**
 * One species in the field guide, as a full-width row, in the order people meet a plant:
 * what it looks like (photos, right), what it's called and what kind of plant it is, how to recognise it,
 * then how much of it the Trust has recorded. Review status stays quiet: a note only when most of it is unconfirmed.
 * The whole row opens the species.
 */
export function SpeciesCard({ row, rank, tile = false }: { row: SpeciesSummary; rank: number; tile?: boolean }) {
  const { item: sp, split, span, placeCount } = row;
  const photos = getSpeciesPhotos(sp.id);
  const photo = photos[0];
  const profile = getSpeciesProfile(sp.id);
  const name = sp.displayName;
  const years = span.first.year === span.last.year ? `${span.first.year}` : `${span.first.year}–${span.last.year}`;
  // Every other name it goes by: common name and Māori names, minus the one shown as the title.
  const also = [...new Set([profile?.commonName ?? sp.commonName, ...(profile?.maoriNames ?? [sp.maoriName])])]
    .filter((x): x is string => !!x && x !== name);

  // Grid view: the photo, its rank, the name, and how much went in where. The whole card opens the species.
  if (tile) {
    return (
      <li className="wrt-scard" data-photo={photo ? true : undefined}>
        <div className="wrt-scard__media">
          {photo ? <PhotoMedia photo={photo} name={name} sizes="(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 300px" /> : <RingTile row={row} />}
          <span className="wrt-scard__rank" title={`Number ${rank} by recorded plants`}>
            <span className="sr-only">Rank </span>
            {rank}
          </span>
        </div>
        <h3 className="wrt-scard__name">
          <Link href={hrefs.species(sp.slug)} className="wrt-scard__link">
            <span className={sp.displayIsScientific ? "wrt-scard__common italic" : "wrt-scard__common"}>{name}</span>
          </Link>
          {!sp.displayIsScientific && <span className="wrt-scard__latin">{sp.scientificName}</span>}
        </h3>
        <p className="wrt-scard__tilefacts">
          <span><b className="tabular-nums">{formatNumber(split.total)}</b> recorded</span>
          <span><b className="tabular-nums">{formatNumber(placeCount)}</b> {placeCount === 1 ? "site" : "sites"}</span>
          {split.needsReview * 2 > split.total && <span className="wrt-scard__unsure">mostly unconfirmed</span>}
        </p>
      </li>
    );
  }

  return (
    <li className="wrt-scard" data-photo={photo ? true : undefined}>
      <div className="wrt-scard__body">
        <div className="wrt-scard__title">
          <h3 className="wrt-scard__name">
            <Link href={hrefs.species(sp.slug)} className="wrt-scard__link">
              <span className={sp.displayIsScientific ? "wrt-scard__common italic" : "wrt-scard__common"}>{name}</span>
            </Link>
            {!sp.displayIsScientific && <span className="wrt-scard__latin">{sp.scientificName}</span>}
          </h3>
          <SpeciesMarkers species={sp} />
        </div>

        {profile?.summary && <p className="wrt-scard__summary">{profile.summary}</p>}
        {profile?.lookFor && <p className="wrt-scard__look"><b>Look for</b> {profile.lookFor}</p>}
        <SpeciesReferenceStatus speciesId={sp.id} />
        <SpeciesProfileSources speciesId={sp.id} slug={sp.slug} includeLookFor={false} />

        <dl className="wrt-scard__facts">
          <div>
            <dt>Recorded</dt>
            <dd className="tabular-nums">
              {formatNumber(split.total)}
              {split.needsReview * 2 > split.total && (
                <span className="wrt-scard__unsure" title={`${formatNumber(split.needsReview)} still need a WRT ruling`}>mostly unconfirmed</span>
              )}
            </dd>
          </div>
          <div><dt>Sites</dt><dd>{formatNumber(placeCount)}</dd></div>
          <div title={`${span.seasonsActive} seasons with records`}><dt>Seasons</dt><dd>{years}</dd></div>
          {also.length > 0 && <div className="wrt-scard__also"><dt>Also called</dt><dd>{also.join(" · ")}</dd></div>}
        </dl>
      </div>

      <div className="wrt-scard__media" data-count={Math.min(photos.length, 3) || undefined}>
        {photo
          ? photos.slice(0, 3).map((p, i) => (
              <PhotoMedia key={p.src} photo={p} name={name} sizes={i === 0 ? "(max-width: 760px) 66vw, 380px" : "(max-width: 760px) 33vw, 190px"} />
            ))
          : <RingTile row={row} />}
        <span className="wrt-scard__rank" title={`Number ${rank} by recorded plants`}>
          <span className="sr-only">Rank </span>
          {rank}
        </span>
        {photo && photos.length > 1 && (
          <Link href={`${hrefs.species(sp.slug)}#photos`} className="wrt-scard__chip wrt-scard__above">{photos.length} photos</Link>
        )}
        {photo && (
          // Shown on hover or focus, so the credit stays with the photos without crowding the row.
          <p className="wrt-scard__credit wrt-scard__above">
            Photo: {photo.author} · <a href={photo.licenseUrl}>{photo.license}</a> ·{" "}
            <a href={photo.sourceUrl}>{photo.sourceName === "iNaturalist" ? "iNaturalist" : "Wiki"} source</a>
          </p>
        )}
      </div>
    </li>
  );
}
