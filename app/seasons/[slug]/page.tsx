import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listSeasonPlantingLines, listSeasons } from "@/db/queries/plantings";
import { listSpecies } from "@/db/queries/species";
import { toSeasonDetail, toSeasonSummary } from "@/db/records";
import { formatNumber } from "@/lib/wrt/text";
import { SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { PageHead, Card, CardLink, Rule } from "@/components/wrt/shared/page";
import { QuantityFigure, SplitKey, plants } from "@/components/wrt/shared/quantity";
import { RankedBars, SeasonColumns } from "@/components/wrt/shared/charts";
import { hrefs } from "@/components/wrt/shared/names";
import { Button, buttonVariants } from "@/components/ui/button";
import { ReconBadge, reconSentence } from "@/components/wrt/seasons/season-parts";
import { SeasonSiteSpecies, SeasonSpeciesGrid } from "@/components/wrt/seasons/season-species";
import { isAuthenticated } from "@/db/queries/auth";

type Props = Readonly<PageProps<"/seasons/[slug]">>;

/** The season's lines and every season's totals, from Supabase. Seasons are those with lines. */
async function loadSeason(slug: string) {
  const [rows, lines, species] = await Promise.all([listSeasons(), listSeasonPlantingLines(slug), listSpecies()]);
  const all = rows.filter((r) => (r.lines ?? 0) > 0).map((r) => toSeasonSummary(r));
  return { all, d: toSeasonDetail(slug, all, lines, new Map(species.map((row) => [row.slug, row]))) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { d } = await loadSeason(slug);
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
  const [{ d, all }, authenticated] = await Promise.all([loadSeason(slug), isAuthenticated()]);
  if (!d) notFound();

  const { season, split, reconciliation: recon } = d;
  const siteCount = d.places.length;
  const speciesCount = d.species.length;
  const recordsHref = hrefs.records({ year: season.year, season: season.name });
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
      {authenticated && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="secondary"><Link href={hrefs.newEvent()}>Add planting event</Link></Button>
        </div>
      )}
      <PageHead
        back={{ href: "/seasons", label: "All seasons" }}
        eyebrow={`What went in during ${season.label}?`}
        title={
          <>
            {formatNumber(split.total)} recorded plants in {season.label} across {formatNumber(siteCount)} site{siteCount === 1 ? "" : "s"}
          </>
        }
        lead={
          <>
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
        <Card title={season.label} action={<SplitKey />}>
          <QuantityFigure split={split} />
          <div className="flex flex-col gap-2 pt-1">
            <div className="wrt-pills items-center">
              <ReconBadge recon={recon} />
            </div>
            {recon && (
              <p className="wrt-rule m-0" title={reconSentence(recon)}>
                {recon.difference === 0
                  ? <>Matches the workbook&rsquo;s own total (<code>{recon.statedCell}</code>): {formatNumber(recon.generated)} generated, {formatNumber(recon.stated)} stated.</>
                  : <>Generated {formatNumber(recon.generated)}, but the workbook states {formatNumber(recon.stated)} (<code>{recon.statedCell}</code>). The difference is {formatNumber(Math.abs(recon.difference))}.</>}
                {recon.cause ? ` ${recon.cause}` : ""}
              </p>
            )}
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
        action={<SplitKey />}
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

      <Rule><Link className="cn-link" href={recordsHref}>See all {formatNumber(split.records)} records →</Link></Rule>
    </>
  );
}
