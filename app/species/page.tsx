import type { Metadata } from "next";
import { first } from "@/lib/wrt/params";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber, foldMacrons, matchScore } from "@/lib/wrt/text";
import type { SpeciesSummary } from "@/lib/wrt/queries";
import { byTotalDesc, splitOf } from "@/lib/wrt/queries";
import { EmptyState, PageHead, Rule } from "@/components/wrt/shared/page";
import { AutoSubmit } from "@/components/wrt/explore/auto-submit";
import { SpeciesCard } from "@/components/wrt/species/species-card";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";
import {
  SHOWS, SORTS, type ShowKey, type SortKey,
} from "@/components/wrt/species/species-meta";

export const metadata: Metadata = { title: "Species" };


function pick<T extends { key: string }>(list: readonly T[], v: string | undefined, fallback: T["key"]): T["key"] {
  return list.find((o) => o.key === v)?.key ?? fallback;
}

function matches(show: ShowKey, r: SpeciesSummary) {
  const s = r.item;
  if (show === "over5m") return s.over5m === true;
  if (show === "threatened") return s.threatenedMarks.plantsOutMaster || s.threatenedMarks.teKakano;
  if (show === "contested") return s.needsDecision;
  return true;
}

const nameKey = (s: string) => foldMacrons(s).toLowerCase();

function sortRows(rows: SpeciesSummary[], sort: SortKey) {
  const out = [...rows];
  if (sort === "plants") out.sort(byTotalDesc);
  if (sort === "sites") out.sort((a, b) => b.placeCount - a.placeCount || b.split.total - a.split.total);
  if (sort === "name") out.sort((a, b) => nameKey(a.item.displayName).localeCompare(nameKey(b.item.displayName)));
  if (sort === "botanical") out.sort((a, b) => nameKey(a.item.scientificName).localeCompare(nameKey(b.item.scientificName)));
  return out;
}

/** Two ways to browse: full-width rows (list) or photo cards four to a row (grid). */
type View = "list" | "grid";

function href(sort: SortKey, show: ShowKey, q = "", view: View = "list"): `/species${"" | `?${string}`}` {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (show !== "all") sp.set("show", show);
  if (sort !== "plants") sp.set("sort", sort);
  if (view !== "list") sp.set("view", view);
  const s = sp.toString();
  return s ? `/species?${s}` : "/species";
}

const SHORT: Record<ShowKey, string> = {
  all: "All",
  over5m: "Over 5 m",
  threatened: "Marked threatened",
  contested: "Name needs a ruling",
};

export default async function SpeciesPage({ searchParams }: Readonly<PageProps<"/species">>) {
  const sp = await searchParams;
  const sort = pick(SORTS, first(sp.sort), "plants");
  const show = pick(SHOWS, first(sp.show), "all");
  const view: View = first(sp.view) === "grid" ? "grid" : "list";

  const all = await getWrt().speciesList();
  const guideCount = all.filter((r) => r.item.photos[0] && r.item.profile).length;
  const referenceGapCount = all.filter((r) => {
    const review = getSpeciesReferenceReview(r.item.id);
    return review && review.status !== "confirmed";
  }).length;
  const allSplit = splitOf([]);
  for (const r of all) for (const k of Object.keys(allSplit) as (keyof typeof allSplit)[]) allSplit[k] += r.split[k];

  const q = (first(sp.q) ?? "").trim();
  const byName = (r: SpeciesSummary) => !q || matchScore(q, r.item.searchKeys) > 0;
  const shown = sortRows(all.filter((r) => matches(show, r) && byName(r)), sort);
  const shownSplit = splitOf([]);
  for (const r of shown) for (const k of Object.keys(shownSplit) as (keyof typeof shownSplit)[]) shownSplit[k] += r.split[k];
  const rankOf = new Map(
    [...all].sort((a, b) => b.split.total - a.split.total || a.item.scientificName.localeCompare(b.item.scientificName)).map((r, i) => [r.item.slug, i + 1]),
  );
  const counts = {
    all: all.length,
    over5m: all.filter((r) => matches("over5m", r)).length,
    threatened: all.filter((r) => matches("threatened", r)).length,
    contested: all.filter((r) => matches("contested", r)).length,
  } satisfies Record<ShowKey, number>;
  const contested = counts.contested;
  const filtered = show !== "all" || !!q;

  return (
    <>
      <PageHead
        title={`${formatNumber(all.length)} species`}
        lead={
          <>
            {formatNumber(allSplit.total)} recorded plants across the planting history.
            {" "}{guideCount} species have reference photos and identification notes.
            {referenceGapCount > 0 && <> {referenceGapCount} reference sets have gaps or unresolved identities.</>}
            {contested > 0 && (
              <>
                {" "}
                <Link href={href(sort, "contested", "", view)} className="cn-link">
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

      {/* No card around the list: filters and rows sit straight on the page. */}
      <section className="wrt-species" aria-label="Species">
        <div className="wrt-stool">
          <form method="get" action="/species" className="wrt-stool__form" role="search">
            {show !== "all" && <input type="hidden" name="show" value={show} />}
            {view !== "list" && <input type="hidden" name="view" value={view} />}
            <label className="wrt-stool__search">
              <span className="sr-only">Find a species</span>
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="7" cy="7" r="4.6" /><path d="m10.5 10.5 3.2 3.2" />
              </svg>
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
                href={href(sort, o.key, q, view)}
                className="wrt-stool__opt"
                aria-current={show === o.key ? "true" : undefined}
              >
                {SHORT[o.key]} <span className="wrt-stool__n">{counts[o.key]}</span>
              </Link>
            ))}
          </nav>

          <nav aria-label="View" className="wrt-stool__show wrt-stool__view">
            {(["list", "grid"] as const).map((v) => (
              <Link
                key={v} href={href(sort, show, q, v)} className="wrt-stool__opt" title={v === "list" ? "List: one plant per row" : "Grid: photo cards"}
                aria-current={view === v ? "true" : undefined}
              >
                <span className="sr-only">{v === "list" ? "List view" : "Grid view"}</span>
                {v === "list" ? (
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 4h8M6 8h8M6 12h8" /><path d="M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeWidth="2.4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <rect x="2" y="2" width="5" height="5" rx="1.3" /><rect x="9" y="2" width="5" height="5" rx="1.3" />
                    <rect x="2" y="9" width="5" height="5" rx="1.3" /><rect x="9" y="9" width="5" height="5" rx="1.3" />
                  </svg>
                )}
              </Link>
            ))}
          </nav>

          <p className="wrt-stool__result" aria-live="polite">
            <span>
              <b>{formatNumber(shown.length)}</b> {shown.length === 1 ? "species" : "species"}
              {q && <> matching “{q}”</>}
              {" · "}
              {formatNumber(shownSplit.total)} recorded
            </span>
            {filtered && <Link href={href(sort, "all", "", view)} className="wrt-stool__clear">Clear filters</Link>}
          </p>
        </div>

        {shown.length ? (
          <ul className={view === "grid" ? "wrt-stiles" : "wrt-sgrid"}>
            {shown.map((r) => (
              <SpeciesCard key={r.item.slug} row={r} rank={rankOf.get(r.item.slug) ?? 0} tile={view === "grid"} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No species match">
            <Link href="/species" className="cn-link">Show all species →</Link>
          </EmptyState>
        )}
      </section>
      <Rule>
        Species are listed as WRT typed them, with te reo Māori names shown with macrons. Two names that may be the same species
        are kept apart until WRT rules. Photos are Wiki references from other places; they do not confirm plants at a WRT site.
        Species without a photo show one ring per season they were recorded in.
      </Rule>
    </>
  );
}
