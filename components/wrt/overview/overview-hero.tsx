import Image from "next/image";
import Link from "next/link";
import type { Quantity, Species } from "@/lib/wrt/types";
import type { Ranked } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar, SplitLine } from "@/components/wrt/shared/quantity";
import { NavGlyph } from "@/components/wrt/shell/nav-icons";
import type { NavIcon } from "@/components/wrt/shell/nav";
import { hrefs } from "@/components/wrt/shared/names";

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
  split: Quantity;
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
    .map((s, i) => ({ s, rank: i + 1, photo: s.item.imageUrl }))
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
          WRT’s sites, species and planting history in one place. Figures reflect the saved planting records.
        </p>

        <div className="wrt-ohero__figure">
          <SplitBar split={split} className="cn-bar--on-dark wrt-shero__bar" />
          <p className="wrt-ohero__split">
            <SplitLine split={split} />

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
                  src={photo}
                  width={640}
                  height={480}
                  sizes="(max-width: 960px) 50vw, 18vw"
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
                  <Link href={`${hrefs.species(s.item.slug)}#about-species`}>Photo credits &amp; sources</Link>
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
