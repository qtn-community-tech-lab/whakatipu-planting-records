import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, EmptyState } from "@/components/wrt/page";
import { SplitBar, SplitLine } from "@/components/wrt/quantity";
import { RecordsTable } from "@/components/wrt/records";
import {
  PAGE_SIZE, PARAM_KEYS, type RawParams, type RecordsView, exportHref, hasFilters, parseRecordParams, recordsHref,
} from "@/components/wrt/explore/filters";
import { RecordsFilter } from "@/components/wrt/explore/records-filter";
import { ActiveFilters } from "@/components/wrt/explore/active-filters";
import { SpeciesSummary, seasonsIn } from "@/components/wrt/explore/species-summary";
import { RecordsPager } from "@/components/wrt/explore/records-pager";
import { SortLinks } from "@/components/wrt/explore/sort-links";
import { recordsHeadline } from "@/components/wrt/explore/records-headline";
import type { RecordView } from "@/lib/wrt/queries";

type Props = { searchParams: Promise<RawParams> };

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
  if (PARAM_KEYS.some((k) => raw[k] === "" || (Array.isArray(raw[k]) && (raw[k] as string[])[0] === ""))) {
    const wrt0 = getWrt();
    const v = parseRecordParams(raw, await wrt0.lookups());
    redirect(recordsHref(v));
  }

  const wrt = getWrt();
  const [lookups, places] = await Promise.all([wrt.lookups(), wrt.places()]);
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
  const seasons = seasonsIn(result.rows);
  const showSummary = total > 0 && (seasons.length <= 2 || !!filter.parcel) && speciesCount > 1;
  const summarySeasons = seasons.length <= 2 ? seasons : [];
  const selectedPlace = lookups.places.find((p) => p.slug === filter.place);

  const hide: ("season" | "site" | "species")[] = [];
  if (filter.place) hide.push("site");
  if (filter.species) hide.push("species");
  if (filter.year && filter.season) hide.push("season");

  const filtered = hasFilters(filter);

  return (
    <>
      <PageHead
        back={selectedPlace ? { href: `/sites/${selectedPlace.slug}`, label: selectedPlace.name } : undefined}
        eyebrow="Records"
        title={recordsHeadline(filter, split, lookups)}
      />

      {total > 0 && (
        <div className="flex flex-col gap-2.5 -mt-2">
          <SplitBar split={split} className="max-w-[520px]" />
          <SplitLine split={split} />
          <p className="wrt-muted m-0">
            {formatNumber(total)} record{total === 1 ? "" : "s"} · {formatNumber(speciesCount)} species · {formatNumber(siteCount)} site{siteCount === 1 ? "" : "s"}
            {schemeCount > 0 && ` · ${schemeCount} order scheme`}
          </p>
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

      <Card title="Filter records" foot="Every filter is in the page address, so any view can be copied and shared.">
        <RecordsFilter view={view} lookups={lookups} places={places} />
        <ActiveFilters view={view} lookups={lookups} />
      </Card>

      {total === 0 ? (
        <EmptyState title="No records match these filters">
          {filtered
            ? "Try removing one of the filters above, or clear them all. Names are matched without macrons, so “manuka” finds Mānuka."
            : "There are no records to show."}
        </EmptyState>
      ) : (
        <>
          {showSummary && (
            <Card
              title="By species"
              variant="table"
              foot={
                filter.review === "needs-review" || filter.theme
                  ? "Only records needing review are counted here."
                  : "Totals include records still needing review; the amber figure is that part."
              }
            >
              <SpeciesSummary rows={result.rows} seasons={summarySeasons} />
            </Card>
          )}

          <Card
            title="Records"
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
              caption={`Records ${from} to ${to} of ${total}, sorted by ${view.sort}`}
            />
            <div className="px-2.5">
              <RecordsPager
                page={page}
                pageCount={pageCount}
                from={from}
                to={to}
                total={total}
                hrefFor={(p) => recordsHref(view, { page: p > 1 ? p : undefined })}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
