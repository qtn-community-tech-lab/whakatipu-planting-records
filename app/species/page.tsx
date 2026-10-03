import type { Metadata } from "next";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber, foldMacrons } from "@/lib/wrt/text";
import type { SpeciesSummary } from "@/lib/wrt/queries";
import { splitOf } from "@/lib/wrt/queries";
import { Card, CardLink, EmptyState, PageHead, Rule } from "@/components/wrt/page";
import { SplitLine } from "@/components/wrt/quantity";
import { SpeciesRow } from "@/components/wrt/species/species-row";
import {
  SHOWS, SORTS, type ShowKey, type SortKey,
} from "@/components/wrt/species/species-meta";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Species" };

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function pick<T extends { key: string }>(list: readonly T[], v: string | undefined, fallback: T["key"]): T["key"] {
  return list.some((o) => o.key === v) ? (v as T["key"]) : fallback;
}

function matches(show: ShowKey, r: SpeciesSummary) {
  const s = r.item;
  if (show === "over5m") return s.over5m === true;
  if (show === "threatened") return s.threatened === true;
  if (show === "contested") return s.needsDecision;
  return true;
}

const nameKey = (s: string) => foldMacrons(s).toLowerCase();

function sortRows(rows: SpeciesSummary[], sort: SortKey) {
  const out = [...rows];
  if (sort === "plants") out.sort((a, b) => b.split.total - a.split.total);
  if (sort === "sites") out.sort((a, b) => b.placeCount - a.placeCount || b.split.total - a.split.total);
  if (sort === "name") out.sort((a, b) => nameKey(a.item.displayName).localeCompare(nameKey(b.item.displayName)));
  if (sort === "botanical") out.sort((a, b) => nameKey(a.item.scientificName).localeCompare(nameKey(b.item.scientificName)));
  return out;
}

function href(sort: SortKey, show: ShowKey) {
  const sp = new URLSearchParams();
  if (sort !== "plants") sp.set("sort", sort);
  if (show !== "all") sp.set("show", show);
  const s = sp.toString();
  return s ? `/species?${s}` : "/species";
}

const chipClass =
  "cn-chip no-underline hover:bg-[var(--surface-soft)] aria-[current=true]:!bg-[var(--action-primary)] aria-[current=true]:!border-[var(--action-primary)] aria-[current=true]:!text-white";

export default async function SpeciesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = pick(SORTS, one(sp.sort), "plants") as SortKey;
  const show = pick(SHOWS, one(sp.show), "all") as ShowKey;

  const all = await getWrt().speciesList();
  const allSplit = splitOf([]);
  for (const r of all) for (const k of Object.keys(allSplit) as (keyof typeof allSplit)[]) allSplit[k] += r.split[k];

  const shown = sortRows(all.filter((r) => matches(show, r)), sort);
  const shownSplit = splitOf([]);
  for (const r of shown) for (const k of Object.keys(shownSplit) as (keyof typeof shownSplit)[]) shownSplit[k] += r.split[k];
  const max = Math.max(1, ...shown.map((r) => r.split.total));
  const counts = Object.fromEntries(SHOWS.map((o) => [o.key, all.filter((r) => matches(o.key, r)).length]));

  const contested = counts.contested;
  const filtered = show !== "all";

  return (
    <>
      <PageHead
        aside={<CardLink href="/species/photos">Top 20 photo guide</CardLink>}
        eyebrow="Species"
        title={`${formatNumber(all.length)} species, ${formatNumber(allSplit.total)} recorded plants`}
        lead={
          <>
            Every species with at least one record since Autumn 2015, with where and when it went in. Reference photos are available for the 20 most planted species.
            {contested > 0 && (
              <> {formatNumber(contested)} {contested === 1 ? "name needs" : "names need"} a WRT ruling before the records can be merged.</>
            )}
          </>
        }
      />

      <Card
        title={
          filtered
            ? `${formatNumber(shown.length)} of ${formatNumber(all.length)} species · ${SHOWS.find((o) => o.key === show)!.label.toLowerCase()}`
            : "All species"
        }
        action={
          filtered ? <span className="wrt-split-line"><SplitLine split={shownSplit} /></span> : <SplitLine split={allSplit} />
        }
        foot="Bars show recorded plants for each species, relative to the largest in this list. Amber is the part on records that still need a WRT ruling or confirmation. Photos are Wiki references from other locations; they do not confirm plants growing at a WRT site."
      >
        <div className="mb-2 flex flex-col gap-3">
          <nav aria-label="Show" className="flex flex-wrap items-center gap-2">
            <span className="cn-tile__label mr-1">Show</span>
            {SHOWS.map((o) => (
              <Link
                key={o.key}
                href={href(sort, o.key)}
                className={cn(chipClass)}
                aria-current={show === o.key ? "true" : undefined}
              >
                {o.label} <span className="cn-chip__count">{counts[o.key]}</span>
              </Link>
            ))}
          </nav>
          <nav aria-label="Sort" className="flex flex-wrap items-center gap-2">
            <span className="cn-tile__label mr-1">Sort</span>
            {SORTS.map((o) => (
              <Link
                key={o.key}
                href={href(o.key, show)}
                className={cn(chipClass)}
                aria-current={sort === o.key ? "true" : undefined}
              >
                {o.label}
              </Link>
            ))}
          </nav>
        </div>

        {shown.length ? (
          <ul className="m-0 mt-2 list-none p-0">
            {shown.map((r) => (
              <SpeciesRow key={r.item.slug} row={r} max={max} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No species match this filter">
            <Link href="/species" className="cn-link">Show all species →</Link>
          </EmptyState>
        )}
      </Card>
      <Rule>
        Species are listed as WRT typed them, with te reo Māori names shown with macrons. Two names that may be the same species
        are kept apart until WRT rules.
      </Rule>
    </>
  );
}
