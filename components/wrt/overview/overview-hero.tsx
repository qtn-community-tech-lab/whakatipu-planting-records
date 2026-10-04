import Image from "next/image";
import Link from "next/link";
import type { QuantitySplit, Species } from "@/lib/wrt/types";
import type { Ranked } from "@/lib/wrt/queries";
import { formatNumber, formatShare } from "@/lib/wrt/text";
import { getSpeciesPhoto } from "@/lib/wrt/species-photos";
import { SplitBar } from "@/components/wrt/quantity";
import { NavGlyph } from "@/components/wrt/shell/nav-icons";
import type { NavIcon } from "@/components/wrt/shell/nav";
import { hrefs } from "@/components/wrt/names";

interface Stat {
  href: string;
  icon: NavIcon;
  label: string;
  value: string;
}

/**
 * Home page header on the canopy green: the headline number with its split,
 * jump-off tiles for each section, and the two most recorded species in
 * reference photos.
 */
export function OverviewHero({
  split, eyebrow, placeCount, speciesCount, seasonCount, topSpecies,
}: {
  split: QuantitySplit;
  eyebrow: string;
  placeCount: number;
  speciesCount: number;
  seasonCount: number;
  topSpecies: Ranked<Species>[];
}) {
  const stats: Stat[] = [
    { href: "/sites", icon: "sites", label: "Sites", value: formatNumber(placeCount) },
    { href: "/species", icon: "species", label: "Species", value: formatNumber(speciesCount) },
    { href: "/seasons", icon: "seasons", label: "Seasons", value: formatNumber(seasonCount) },
    { href: "/records", icon: "records", label: "Records", value: formatNumber(split.records) },
  ];
  const pictured = topSpecies
    .map((s, i) => ({ s, rank: i + 1, photo: getSpeciesPhoto(s.item.id) }))
    .filter((x) => x.photo)
    .slice(0, 2);

  return (
    <section className="wrt-ohero" aria-labelledby="overview-title">
      <div className="wrt-ohero__text">
        <span className="wrt-ohero__eyebrow">{eyebrow}</span>
        <h1 id="overview-title" className="wrt-ohero__title">
          <span className="wrt-ohero__big tabular-nums">{formatNumber(split.total)}</span>
          <span className="wrt-ohero__line">recorded plants</span>
          <span className="wrt-ohero__sub">
            across {formatNumber(placeCount)} sites and {formatNumber(speciesCount)} species
          </span>
        </h1>
        <p className="wrt-ohero__lead">
          WRT’s planting history in one place for the first time. Every figure is a recorded plant from the allocation
          sheets, not a verified planting.
        </p>

        <div className="wrt-ohero__figure">
          <SplitBar split={split} className="cn-bar--on-dark wrt-shero__bar" />
          <p className="wrt-ohero__split">
            {formatNumber(split.resolved)} resolved ·{" "}
            <Link href={hrefs.records({ review: "needs-review" })} className="wrt-shero__amber wrt-ohero__review">
              {formatNumber(split.needsReview)} ({formatShare(split.needsReview, split.total)}) on{" "}
              {formatNumber(split.recordsNeedingReview)} records WRT still has to rule on →
            </Link>
          </p>
        </div>

        <nav className="wrt-ohero__stats" aria-label="Explore">
          {stats.map((s) => (
            <Link key={s.href} href={s.href} className="wrt-ohero__stat">
              <span className="wrt-ohero__stat-label">
                <NavGlyph name={s.icon} /> {s.label}
              </span>
              <span className="wrt-ohero__stat-value tabular-nums">{s.value}</span>
              <span className="wrt-ohero__stat-go" aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </div>

      {pictured.length > 0 && (
        <div className="wrt-ohero__media">
          <div className="wrt-ohero__media-head">
            <span>Most recorded species</span>
            <Link href="/species">All {formatNumber(speciesCount)} →</Link>
          </div>
          <ul className="wrt-ohero__grid">
            {pictured.map(({ s, rank, photo }) => (
              <li key={s.item.slug} className="wrt-ohero__tile">
                <Image
                  src={photo!.src}
                  width={photo!.width}
                  height={photo!.height}
                  sizes="(max-width: 960px) 50vw, 18vw"
                  style={{ objectPosition: photo!.focalPoint }}
                  alt=""
                  className="wrt-ohero__img"
                  unoptimized
                  priority={rank <= 2}
                />
                <span className="wrt-ohero__rank">{rank}</span>
                <Link href={hrefs.species(s.item.slug)} className="wrt-ohero__tile-link">
                  <span className={s.item.displayIsScientific ? "wrt-ohero__tile-name italic" : "wrt-ohero__tile-name"}>
                    {s.item.displayName}
                  </span>
                  <span className="wrt-ohero__tile-count tabular-nums">{formatNumber(s.split.total)} recorded</span>
                </Link>
                <span className="wrt-ohero__tile-credit">
                  {photo!.author} · <a href={photo!.licenseUrl}>{photo!.license}</a>
                </span>
              </li>
            ))}
          </ul>
          <p className="wrt-ohero__note">Reference photos from other places, not WRT sites.</p>
        </div>
      )}
    </section>
  );
}

/** Small round picture for a species in a ranked list: its photo, or its initial. */
export function SpeciesAvatar({ species }: { species: Species }) {
  const photo = getSpeciesPhoto(species.id);
  const initial = (species.displayIsScientific ? species.scientificName : species.displayName).charAt(0).toUpperCase();
  return (
    <span className="wrt-avatar" aria-hidden="true">
      {photo ? (
        <Image src={photo.src} width={photo.width} height={photo.height} alt="" sizes="40px" style={{ objectPosition: photo.focalPoint }} unoptimized />
      ) : (
        <span className="wrt-avatar__initial">{initial}</span>
      )}
    </span>
  );
}

/** Leaderboard label: rank chip in front of whatever names the row. */
export function RankLabel({ rank, children }: { rank: number; children: React.ReactNode }) {
  return (
    <span className="wrt-lb">
      <span className="wrt-lb__rank" data-top={rank <= 3 || undefined}>{rank}</span>
      {children}
    </span>
  );
}
