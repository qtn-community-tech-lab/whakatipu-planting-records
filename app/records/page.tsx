import type { AppRoute } from "@/lib/wrt/routes";
import type { Metadata } from "next";
import { hrefs } from "@/lib/wrt/routes";
import { first } from "@/lib/wrt/params";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createRecordsQueries } from "@/db/queries/records";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, EmptyState } from "@/components/wrt/shared/page";
import { SplitBar, SplitLine } from "@/components/wrt/shared/quantity";
import { RecordsTable } from "@/components/wrt/shared/records";
import { partHref } from "@/components/wrt/sites/site-rows";
import { RecordsInsights } from "@/components/wrt/explore/records-insights";
import {
  PAGE_SIZE,
  PARAM_KEYS,
  type RecordsView,
  hasFilters,
  parseRecordParams,
  recordsHref,
} from "@/components/wrt/explore/filters";
import { RecordsFilter } from "@/components/wrt/explore/records-filter";
import { ActiveFilters } from "@/components/wrt/explore/active-filters";
import { RecordsPager } from "@/components/wrt/explore/records-pager";
import { SortLinks } from "@/components/wrt/explore/sort-links";
import { recordsHeadline } from "@/components/wrt/explore/records-headline";
import { requireAuthenticated } from "@/db/queries/auth";

type Props = Readonly<PageProps<"/records">>;

export const metadata: Metadata = { title: "Records" };

export default async function RecordsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const next = hrefs.records(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, first(value)])));
  await requireAuthenticated(next);
  const queries = createRecordsQueries();
  const { lookups, places } = await queries.context();

  // A GET form sends empty fields (?place=&year=…). Redirect to the clean URL so the link is shareable.
  if (PARAM_KEYS.some((k) => first(raw[k]) === "")) {
    const v = parseRecordParams(raw, lookups);
    redirect(recordsHref(v));
  }

  const parsed = parseRecordParams(raw, lookups);
  const filter = parsed.filter;
  const result = await queries.summary(filter);
  const { split } = result;

  const total = split.records;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsed.page, pageCount);
  const view: RecordsView = { ...parsed, page };
  const pageRows = total > 0 ? await queries.page(filter, page, view.sort) : [];
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  const speciesCount = result.speciesCount;
  const siteCount = result.siteCount;
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

  const returnTo = recordsHref(view);
  const context = { site: filter.place, part: filter.parcel, season: filter.year && filter.season ? `${filter.season.toLowerCase()}-${filter.year}` : undefined, returnTo };
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
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <Link className="cn-btn cn-btn--soft" href={hrefs.events(context)}>
              View on map
            </Link>
            <Link className="cn-btn cn-btn--primary" href={hrefs.newEvent(context)}>
              Record a planting
            </Link>
          </div>
        }
      />

      {total > 0 && (
        <div className="wrt-rhead">
          <div className="wrt-rhead__figure">
            <SplitBar split={split} className="wrt-rhead__bar" />
            <SplitLine split={split} />
            <p className="wrt-muted m-0">
              {formatNumber(total)} record{total === 1 ? "" : "s"} · {formatNumber(speciesCount)} species · {formatNumber(siteCount)} site{siteCount === 1 ? "" : "s"}
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

      <section className="rx-bar" aria-label="Filters">
        <div className="rx-bar__chips">
          {filtered ? (
            <ActiveFilters view={view} lookups={lookups} />
          ) : (
            <span className="rx-bar__none">All {formatNumber(total)} records<span className="rx-bar__hint"> · select anything below to narrow them</span></span>
          )}
        </div>

        <details className="rx-bar__more">
          <summary>{filtered ? "Change filters" : "Filter"}</summary>
          <div className="rx-bar__form">
            <RecordsFilter view={view} lookups={lookups} places={places} />
            <p className="wrt-rule m-0">Every filter is in the page address, so any view can be copied and shared.</p>
          </div>
        </details>
      </section>

      {total === 0 ? (
        <EmptyState title="No records match these filters">
          {filtered
            ? "Try removing one of the filters above, or clear them all. Names are matched without macrons, so “manuka” finds Mānuka."
            : "There are no records to show."}
        </EmptyState>
      ) : (
        <>
          <RecordsInsights summary={result} view={view} lookups={lookups} />

          <Card
            id="records"
            title={<span className="rx-records-title">Records <small>{formatNumber(total)} · {from}–{to} shown</small></span>}
            variant="table"
            foot="Open Source on any row to see the original spreadsheet cell and the words as typed."
          >
            <div className="px-2.5 pb-2">
              <SortLinks view={view} />
            </div>
            <RecordsTable returnTo={returnTo}
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
                hrefFor={(p) => `${recordsHref(view, { page: p > 1 ? p : undefined })}#records`}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
