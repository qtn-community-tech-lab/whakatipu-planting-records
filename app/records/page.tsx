import type { AppRoute } from "@/lib/wrt/routes";
import type { Metadata } from "next";
import { first } from "@/lib/wrt/params";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getWrt, reviewShown } from "@/lib/wrt/server";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, EmptyState } from "@/components/wrt/shared/page";
import { SplitBar, SplitLine } from "@/components/wrt/shared/quantity";
import { RecordsTable } from "@/components/wrt/shared/records";
import { partHref } from "@/components/wrt/sites/site-rows";
import { RecordsInsights } from "@/components/wrt/explore/records-insights";
import {
  PAGE_SIZE, PARAM_KEYS, type RecordsView, exportHref, hasFilters, parseRecordParams, recordsHref,
} from "@/components/wrt/explore/filters";
import { RecordsFilter } from "@/components/wrt/explore/records-filter";
import { ActiveFilters } from "@/components/wrt/explore/active-filters";
import { RecordsPager } from "@/components/wrt/explore/records-pager";
import { SortLinks } from "@/components/wrt/explore/sort-links";
import { recordsHeadline } from "@/components/wrt/explore/records-headline";
import type { RecordView } from "@/lib/wrt/queries";

type Props = Readonly<PageProps<"/records">>;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const wrt = getWrt();
  const view = parseRecordParams(await searchParams, await wrt.lookups());
  const f = view.filter;
  const bits: string[] = [];
  if (f.place) bits.push((await wrt.lookups()).places.find((p) => p.slug === f.place)?.name ?? "");
  if (f.parcel) bits.push((await wrt.lookups()).places.find((p) => p.slug === f.place)?.parcels.find((p) => p.id === f.parcel)?.name ?? "");
  if (f.year) bits.push(String(f.year));
  return { title: bits.filter(Boolean).length ? `Records · ${bits.filter(Boolean).join(" · ")}` : "Records" };
}

function sortRows(rows: RecordView[], sort: RecordsView["sort"]): RecordView[] {
  const bySeason = (a: RecordView, b: RecordView) => a.season.order - b.season.order;
  const byPlants = (a: RecordView, b: RecordView) => b.record.quantity - a.record.quantity;
  const bySite = (a: RecordView, b: RecordView) =>
    a.place.name.localeCompare(b.place.name) || a.record.parcelName.localeCompare(b.record.parcelName);
  const bySpecies = (a: RecordView, b: RecordView) => a.species.displayName.localeCompare(b.species.displayName);
  const orders = {
    season: [bySeason, bySite, byPlants],
    plants: [byPlants, bySeason, bySite],
    site: [bySite, bySeason, bySpecies],
    species: [bySpecies, bySeason, bySite],
  }[sort];
  return [...rows].sort((a, b) => {
    for (const cmp of orders) {
      const d = cmp(a, b);
      if (d) return d;
    }
    return 0;
  });
}

export default async function RecordsPage({ searchParams }: Props) {
  const raw = await searchParams;

  // A GET form sends empty fields (?place=&year=…). Redirect to the clean URL so the link is shareable.
  if (PARAM_KEYS.some((k) => first(raw[k]) === "")) {
    const wrt0 = getWrt();
    const v = parseRecordParams(raw, await wrt0.lookups());
    redirect(recordsHref(v));
  }

  const wrt = getWrt();
  const [lookups, places, allSeasons, showReview] = await Promise.all([wrt.lookups(), wrt.places(), wrt.seasons(), reviewShown()]);
  const parsed = parseRecordParams(raw, lookups);
  const result = await wrt.records(parsed.filter);
  const { filter, split } = result;

  const total = result.rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsed.page, pageCount);
  const view: RecordsView = { ...parsed, page };
  const sorted = sortRows(result.rows, view.sort);
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  const speciesCount = new Set(result.rows.map((v) => v.species.id)).size;
  const siteCount = new Set(result.rows.filter((v) => !v.place.isScheme).map((v) => v.place.slug)).size;
  const schemeCount = new Set(result.rows.filter((v) => v.place.isScheme).map((v) => v.place.slug)).size;
  const filtered = hasFilters(filter);
  const selectedPlace = lookups.places.find((p) => p.slug === filter.place);
  const selectedPart = filter.parcel && selectedPlace && selectedPlace.parcels.length > 1
    ? selectedPlace.parcels.find((p) => p.id === filter.parcel)
    : undefined;

  const hide: ("season" | "site" | "species")[] = [];
  if (filter.place) hide.push("site");
  if (filter.species) hide.push("species");
  if (filter.year && filter.season) hide.push("season");


  // Pages that tell the bigger story behind this filter.
  const contextLinks: { href: AppRoute; kind: string; label: string }[] = [];
  if (selectedPart && selectedPlace) contextLinks.push({ href: partHref(selectedPlace.slug, selectedPart.slug), kind: "Part of site", label: selectedPart.name });
  if (selectedPlace) contextLinks.push({ href: `/sites/${selectedPlace.slug}${filter.year ? `?year=${filter.year}#year-view` : ""}`, kind: "Site", label: selectedPlace.name });
  if (filter.year && filter.season) contextLinks.push({ href: `/seasons/${filter.season.toLowerCase()}-${filter.year}`, kind: "Season", label: `${filter.season} ${filter.year}` });
  const selectedSpecies = filter.species ? lookups.species.find((s) => s.slug === filter.species) : undefined;
  if (selectedSpecies) contextLinks.push({ href: `/species/${selectedSpecies.slug}`, kind: "Species", label: selectedSpecies.displayName });

  return (
    <>
      <PageHead
        back={
          selectedPart && selectedPlace
            ? { href: partHref(selectedPlace.slug, selectedPart.slug), label: selectedPart.name }
            : selectedPlace
              ? { href: `/sites/${selectedPlace.slug}`, label: selectedPlace.name }
              : undefined
        }
        eyebrow="Records"
        title={recordsHeadline(filter, split, lookups)}
      />

      {total > 0 && (
        <div className="wrt-rhead">
          <div className="wrt-rhead__figure">
            <SplitBar split={split} className="wrt-rhead__bar" />
            <SplitLine split={split} />
            <p className="wrt-muted m-0">
              {formatNumber(total)} record{total === 1 ? "" : "s"} · {formatNumber(speciesCount)} species · {formatNumber(siteCount)} site{siteCount === 1 ? "" : "s"}
              {schemeCount > 0 && ` · ${schemeCount} order scheme`}
            </p>
          </div>
          {contextLinks.length > 0 && (
            <nav className="wrt-rhead__links" aria-label="Related pages">
              {contextLinks.map((l) => (
                <Link key={l.href} href={l.href} className="wrt-rhead__link">
                  <span className="wrt-rhead__kind">{l.kind}</span>
                  <span>{l.label} →</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}

      {parsed.ignored.length > 0 && (
        <p className="cn-callout cn-callout--risk cn-callout--sm m-0" role="alert">
          <span>
            <b>Some filters in this link were not recognised and are not applied:</b>{" "}
            {parsed.ignored.map((i) => `${i.param} “${i.value}”`).join(", ")}. The figures below are for the remaining filters.
          </span>
        </p>
      )}

      {filter.theme && (
        <p className="cn-callout cn-callout--note cn-callout--sm m-0">
          <span><b>{REVIEW_THEMES[filter.theme].label}.</b> {REVIEW_THEMES[filter.theme].question}</span>
        </p>
      )}

      <section className="rx-bar" aria-label="Filters">
        <div className="rx-bar__chips">
          {filtered ? (
            <ActiveFilters view={view} lookups={lookups} />
          ) : (
            <span className="rx-bar__none">All {formatNumber(total)} records<span className="rx-bar__hint"> · select anything below to narrow them</span></span>
          )}
        </div>
        {showReview && <nav className="rx-bar__review" aria-label="Review status">
          {([
            ["all", "All", undefined],
            ["needs-review", "Needs review", "needs-review"],
            ["resolved", "Resolved", "resolved"],
          ] as const).map(([key, label, value]) => (
            <Link
              key={key}
              href={recordsHref(view, { review: value, ...(value !== "needs-review" ? { theme: undefined } : {}) })}
              className="rx-bar__opt"
              aria-current={(filter.review ?? "all") === key ? "true" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>}
        <details className="rx-bar__more">
          <summary>{filtered ? "Change filters" : "Filter"}</summary>
          <div className="rx-bar__form">
            <RecordsFilter view={view} lookups={lookups} places={places} showReview={showReview} />
            <p className="wrt-rule m-0">Every filter is in the page address, so any view can be copied and shared.</p>
          </div>
        </details>
      </section>

      {total === 0 ? (
        <EmptyState title="No records match these filters">
          {!showReview && (filter.theme || filter.review === "needs-review")
            ? "Records needing review are switched off. Turn on “Needs review” in the top bar to see them."
            : filtered
            ? "Try removing one of the filters above, or clear them all. Names are matched without macrons, so “manuka” finds Mānuka."
            : "There are no records to show."}
        </EmptyState>
      ) : (
        <>
          <RecordsInsights rows={result.rows} view={view} lookups={lookups} seasons={allSeasons.map((x) => x.season)} />

          <Card
            id="records"
            title={<span className="rx-records-title">Records <small>{formatNumber(total)} · {from}–{to} shown</small></span>}
            variant="table"
            action={
              <a href={exportHref(view)} className="cn-btn cn-btn--soft cn-btn--sm !no-underline" download>
                Download these records (CSV)
              </a>
            }
            foot="Open Source on any row to see the original spreadsheet cell and the words as typed."
          >
            <div className="px-2.5 pb-2">
              <SortLinks view={view} />
            </div>
            <RecordsTable
              rows={pageRows}
              hide={hide}
              focusTheme={filter.theme}
              caption={`Records ${from} to ${to} of ${total}, sorted by ${view.sort}`}
            />
            <div className="px-2.5">
              <RecordsPager
                page={page}
                pageCount={pageCount}
                from={from}
                to={to}
                total={total}
                hrefFor={(p) => `${recordsHref(view, { page: p > 1 ? p : undefined })}#records`}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
