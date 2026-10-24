import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber, seasonLabelFromPath } from "@/lib/wrt/text";
import { SITE_CLASS_LABELS } from "@/lib/wrt/labels";
import { PageHead, Card, CardLink } from "@/components/wrt/shared/page";
import { QuantityFigure, plants } from "@/components/wrt/shared/quantity";
import { RankedBars, SeasonColumns } from "@/components/wrt/shared/charts";
import { hrefs } from "@/components/wrt/shared/names";
import { buttonVariants } from "@/components/ui/button";
import { SeasonSiteSpecies, SeasonSpeciesGrid } from "@/components/wrt/seasons/season-species";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = seasonLabelFromPath(slug);
  const d = label === null ? null : await getWrt().season(label);
  if (!d) return { title: "Season not found" };
  return {
    title: `${d.season.label}: ${formatNumber(d.split.total)} recorded plants`,
    description: `${plants(d.split.total)} in ${d.season.label} across ${d.places.length} sites and ${d.species.length} species.`,
  };
}

function list(items: string[]) {
  return items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export default async function SeasonPage({ params }: Props) {
  const { slug } = await params;
  const wrt = getWrt();
  const label = seasonLabelFromPath(slug);
  if (label === null) notFound();
  const [d, all] = await Promise.all([wrt.season(label), wrt.seasons()]);
  if (!d) notFound();

  const { season, split } = d;
  const siteCount = d.places.length;
  const speciesCount = d.species.length;
  const recordsHref = hrefs.records({ season: season.name });

  // The answer to "What went in during <season>?" in one sentence.
  const topSites = d.places.slice(0, 3).map((p) => `${p.item.name} (${formatNumber(p.split.total)})`);
  const topSpecies = d.species.slice(0, 3).map((s) => `${s.item.displayName} (${formatNumber(s.split.total)})`);

  const points = all.map(({ season: s, split: sp }) => ({ season: s, split: sp }));

  const navLink = (target: typeof d.previous, dir: "previous" | "next") =>
    target ? (
      <Link
        href={hrefs.season(target.slug)}
        className={buttonVariants({ variant: "secondary", size: "md" })}
        aria-label={`${dir === "previous" ? "Previous" : "Next"} season: ${target.label}`}
      >
        {dir === "previous" ? `← ${target.label}` : `${target.label} →`}
      </Link>
    ) : null;

  return (
    <>
      <PageHead
        back={{ href: "/seasons", label: "All seasons" }}
        eyebrow={`What went in during ${season.label}?`}
        title={
          <>
            {formatNumber(split.total)} recorded plants in {season.label} across {formatNumber(siteCount)} site{siteCount === 1 ? "" : "s"}
          </>
        }
        lead={
          split.records === 0 ? "No planting records have been saved for this season yet." : <>
            {formatNumber(speciesCount)} species on {formatNumber(split.records)} records. Largest sites:{" "}
            {list(topSites)}. Most recorded species: {list(topSpecies)}.
          </>
        }
        aside={
          <>
            {navLink(d.previous, "previous")}
            {navLink(d.next, "next")}
          </>
        }
      />

      <div className="wrt-grid wrt-grid--main-rail items-start">
        <Card title={season.label} >
          <QuantityFigure split={split} />
          <div className="flex flex-col gap-2 pt-1">
            <div className="wrt-pills items-center">

            </div>

          </div>
        </Card>

        <Card title="Where this season sits" foot={`${season.label} is the dark column. Select another to open it.`}>
          <SeasonColumns points={points} currentSlug={season.slug} size="sm" />
        </Card>
      </div>

      <Card
        title={`Trees recorded in ${season.label} (${formatNumber(speciesCount)} species)`}
        action={<CardLink href={recordsHref}>All {formatNumber(split.records)} records</CardLink>}
        foot={`Largest first. Select a species name for its records this season. Bars are relative to the largest species this season.`}
      >
        <SeasonSpeciesGrid season={season} records={d.records} />
      </Card>

      <Card
        title={`Sites this season (${formatNumber(siteCount)})`}

        foot="Each site with its three most recorded species this season. Open a site for every species recorded there."
      >
        <SeasonSiteSpecies season={season} records={d.records} />
      </Card>

      <Card title="By site class" foot="Keystone, community and school sites, as WRT classes them.">
        <RankedBars
          items={d.byClass.map((c) => ({
            key: c.item,
            label: <span className="cn-row__title">{SITE_CLASS_LABELS[c.item]}</span>,
            split: c.split,
          }))}
        />
      </Card>

    </>
  );
}
