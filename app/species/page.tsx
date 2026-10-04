import type { Metadata } from "next";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber, foldMacrons, matchScore } from "@/lib/wrt/text";
import type { SpeciesSummary } from "@/lib/wrt/queries";
import { splitOf } from "@/lib/wrt/queries";
import { Card, EmptyState, PageHead, Rule } from "@/components/wrt/page";
import { AutoSubmit } from "@/components/wrt/explore/auto-submit";
import { SplitLine } from "@/components/wrt/quantity";
import { SpeciesCard } from "@/components/wrt/species/species-card";
import { getSpeciesPhoto } from "@/lib/wrt/species-photos";
import { getSpeciesProfile } from "@/lib/wrt/species-profiles";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";
import {
  SHOWS, SORTS, type ShowKey, type SortKey,
} from "@/components/wrt/species/species-meta";

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

function href(sort: SortKey, show: ShowKey, q = "") {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (show !== "all") sp.set("show", show);
  if (sort !== "plants") sp.set("sort", sort);
  const s = sp.toString();
  return s ? `/species?${s}` : "/species";
}

const SHORT: Record<ShowKey, string> = {
  all: "All",
  over5m: "Over 5 m",
  threatened: "Threatened",
  contested: "Name needs a ruling",
};

export default async function SpeciesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = pick(SORTS, one(sp.sort), "plants") as SortKey;
  const show = pick(SHOWS, one(sp.show), "all") as ShowKey;

  const all = await getWrt().speciesList();
  const guideCount = all.filter((r) => getSpeciesPhoto(r.item.id) && getSpeciesProfile(r.item.id)).length;
  const referenceGapCount = all.filter((r) => {
    const review = getSpeciesReferenceReview(r.item.id);
    return review && review.status !== "confirmed";
  }).length;
  const allSplit = splitOf([]);
  for (const r of all) for (const k of Object.keys(allSplit) as (keyof typeof allSplit)[]) allSplit[k] += r.split[k];

  const q = (one(sp.q) ?? "").trim();
  const byName = (r: SpeciesSummary) => !q || matchScore(q, r.item.searchKeys) > 0;
  const shown = sortRows(all.filter((r) => matches(show, r) && byName(r)), sort);
  const shownSplit = splitOf([]);
  for (const r of shown) for (const k of Object.keys(shownSplit) as (keyof typeof shownSplit)[]) shownSplit[k] += r.split[k];
  const max = Math.max(1, ...all.map((r) => r.split.total));
  const rankOf = new Map(
    [...all].sort((a, b) => b.split.total - a.split.total || a.item.scientificName.localeCompare(b.item.scientificName)).map((r, i) => [r.item.slug, i + 1]),
  );
  const counts = Object.fromEntries(SHOWS.map((o) => [o.key, all.filter((r) => matches(o.key, r)).length]));
  const contested = counts.contested;
  const filtered = show !== "all" || !!q;

  return (
    <>
      <PageHead
        title={`${formatNumber(all.length)} species`}
        lead={
          <>
            {formatNumber(allSplit.total)} recorded plants since Autumn 2015.
            {" "}{guideCount} species have reference photos and identification notes.
            {referenceGapCount > 0 && <> {referenceGapCount} reference sets have gaps or unresolved identities.</>}
            {contested > 0 && (
              <>
                {" "}
                <Link href={href(sort, "contested")} className="cn-link">
                  {formatNumber(contested)} {contested === 1 ? "name needs" : "names need"} a WRT ruling
                </Link>{" "}
                before their records can be merged.
              </>
            )}
          </>
        }
        aside={
          <Link href="/species/photos" className="cn-btn cn-btn--soft cn-btn--sm !no-underline">
            Species reference guide →
          </Link>
        }
      />

      <Card
        foot="Bars compare each species with the most recorded one. Amber still needs a WRT ruling. Photos are Wiki references from other places; they do not confirm plants at a WRT site. Species without a photo show one ring per season they were recorded in."
      >
        <div className="wrt-stool">
          <form method="get" action="/species" className="wrt-stool__form" role="search">
            {show !== "all" && <input type="hidden" name="show" value={show} />}
            <label className="wrt-stool__search">
              <span className="sr-only">Find a species</span>
              <input type="search" name="q" defaultValue={q} placeholder="Find a species by any name" className="cn-input" />
            </label>
            <label className="wrt-stool__sort">
              <span className="wrt-stool__label">Sort</span>
              <select name="sort" defaultValue={sort} className="wrt-select">
                {SORTS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>
            <noscript>
              <button type="submit" className="cn-btn cn-btn--primary cn-btn--sm">Apply</button>
            </noscript>
            <AutoSubmit />
          </form>

          <nav aria-label="Show" className="wrt-stool__show">
            {SHOWS.map((o) => (
              <Link
                key={o.key}
                href={href(sort, o.key, q)}
                className="wrt-stool__opt"
                aria-current={show === o.key ? "true" : undefined}
              >
                {SHORT[o.key]} <span className="wrt-stool__n">{counts[o.key]}</span>
              </Link>
            ))}
          </nav>

          <p className="wrt-stool__result" aria-live="polite">
            <span>
              <b>{formatNumber(shown.length)}</b> {shown.length === 1 ? "species" : "species"}
              {q && <> matching “{q}”</>}
              {" · "}
              <SplitLine split={shownSplit} />
            </span>
            {filtered && <Link href={href(sort, "all")} className="wrt-stool__clear">Clear filters</Link>}
          </p>
        </div>

        {shown.length ? (
          <ul className="wrt-sgrid">
            {shown.map((r) => (
              <SpeciesCard key={r.item.slug} row={r} max={max} rank={rankOf.get(r.item.slug) ?? 0} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No species match">
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
