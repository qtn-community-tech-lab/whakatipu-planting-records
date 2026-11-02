import type { Metadata } from "next";
import { type RawParams, first } from "@/lib/wrt/params";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import type { PlaceSummary } from "@/lib/wrt/queries";
import { speciesBySite, byTotalDesc, emptySplit } from "@/lib/wrt/queries";
import type { SiteClass } from "@/lib/wrt/types";
import { SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { spanLabel, formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, Rule, EmptyState } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { SplitLine, SplitKey } from "@/components/wrt/shared/quantity";
import { AutoSubmit } from "@/components/wrt/explore/auto-submit";
import { SiteRows } from "@/components/wrt/sites/site-rows";
import { LocationCard } from "@/components/wrt/sites/location-card";

export const metadata: Metadata = {
  title: "Sites",
  description: "Every site with recorded plants since Autumn 2015, with seasons active, species and recorded plants.",
};

const CLASSES = ["keystone", "community", "school"] as const;
type ClassFilter = (typeof CLASSES)[number];
const SORTS = [
  { key: "plants", label: "Most recorded plants" },
  { key: "recent", label: "Most recent" },
  { key: "name", label: "Name A–Z" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function href(cls: ClassFilter | undefined, sort: SortKey) {
  const sp = new URLSearchParams();
  if (cls) sp.set("class", cls);
  if (sort !== "plants") sp.set("sort", sort);
  const s = sp.toString();
  return s ? `/sites?${s}` : "/sites";
}

function sortSites(list: PlaceSummary[], sort: SortKey) {
  const out = [...list];
  if (sort === "name") out.sort((a, b) => a.item.name.localeCompare(b.item.name, "en-NZ"));
  else if (sort === "recent")
    out.sort((a, b) => b.span.last.order - a.span.last.order || b.split.total - a.split.total);
  else out.sort(byTotalDesc);
  return out;
}

export default async function SitesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const classParam = first(sp.class);
  const cls = CLASSES.find((c) => c === classParam);
  const sortParam = first(sp.sort);
  const sort: SortKey = SORTS.find((s) => s.key === sortParam)?.key ?? "plants";

  const [all, overview, records] = await Promise.all([getWrt().places(), getWrt().overview(), getWrt().records()]);
  const bySite = speciesBySite(records.rows);
  const realSites = all.filter((p) => !p.item.isScheme);
  const schemes = all.filter((p) => p.item.isScheme);

  const filtered = cls
    ? all.filter((p) => !p.item.isScheme && p.item.siteClasses.includes(cls as SiteClass))
    : all;
  const rows = sortSites(filtered, sort);
  const max = Math.max(1, ...all.map((p) => p.split.total));
  const shown = emptySplit();
  for (const p of rows) for (const k of Object.keys(shown) as (keyof typeof shown)[]) shown[k] += p.split[k];

  const countFor = (c: ClassFilter) =>
    realSites.filter((p) => p.item.siteClasses.includes(c as SiteClass)).length;

  const schemeNote =
    schemes.length > 0
      ? ` and ${schemes.length} order scheme${schemes.length === 1 ? "" : "s"}`
      : "";
  const lead =
    schemes.length > 0
      ? `${schemes.map((s) => s.item.name).join(", ")} ${schemes.length === 1 ? "is" : "are"} an order scheme, not a place, so ${schemes.length === 1 ? "it is" : "they are"} listed here but not counted as a site.`
      : undefined;

  const CLASS_NOTE: Record<SiteClass, string> = { keystone: "Keystone", community: "Community", school: "School", unknown: "" };

  return (
    <>
      <PageHead
        title={`${realSites.length} sites${schemeNote}`}
        lead={
          <>
            Every place with recorded plants since {overview.firstSeason.label}, with its most recorded species.
            {lead && <> {lead}</>}
          </>
        }
      />

      <LocationCard sites={rows.filter((p) => !p.item.isScheme).map((p) => p.item)} records={records.rows.map((row) => row.record)} />

      <Card
        foot={
          <>
            A site is the place people know, such as Lake Hayes. A parcel is one of WRT’s registered sub-sites inside it,
            such as Lake Hayes Pavilion. Recorded plants are kept against parcels and added up to the site. Bars are scaled to
            the largest site.
            {rows.some((r) => r.item.slug === "slope-hill") &&
              " Slope Hill’s bar is long because of its 2024 restoration: 22,000 trees funded by the Hilton Global Foundation and 7,000 donated by Trees That Count for the coronation."}
          </>
        }
      >
        <div className="wrt-stool">
          <form method="get" action="/sites" className="wrt-stool__form">
            {cls && <input type="hidden" name="class" value={cls} />}
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

          <nav aria-label="Filter by site class" className="wrt-stool__show">
            <Link href={href(undefined, sort)} className="wrt-stool__opt" aria-current={!cls ? "true" : undefined}>
              All <span className="wrt-stool__n">{all.length}</span>
            </Link>
            {CLASSES.map((c) => (
              <Link key={c} href={href(c, sort)} className="wrt-stool__opt" aria-current={cls === c ? "true" : undefined}>
                {SITE_CLASS_LABELS[c]} <span className="wrt-stool__n">{countFor(c)}</span>
              </Link>
            ))}
          </nav>

          <p className="wrt-stool__result" aria-live="polite">
            <span>
              <b>{rows.length}</b> listed · {formatNumber(shown.total)} recorded plants · <SplitLine split={shown} />
            </span>
            <SplitKey />
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No sites in this class">No site with recorded plants matches this filter.</EmptyState>
        ) : (
          <SiteRows
            max={max}
            rows={rows.map((p) => {
              const g = bySite.get(p.item.slug);
              const classes = p.item.isScheme ? "" : p.item.siteClasses.map((c) => CLASS_NOTE[c]).filter(Boolean).join(" and ");
              return {
                key: p.item.slug,
                name: p.item.name,
                href: hrefs.place(p.item.slug),
                isScheme: p.item.isScheme,
                split: p.split,
                species: g?.species ?? [],
                meta: (
                  <>
                    {classes && <>{classes} · </>}
                    {spanLabel(p.span)} · {p.span.seasonsActive} {p.span.seasonsActive === 1 ? "season" : "seasons"} · {p.speciesCount} species
                    {p.item.parcels.length > 1 && <> · {p.item.parcels.length} parcels</>}
                  </>
                ),
                totalHref: hrefs.records({ place: p.item.slug }),
                moreHref: hrefs.place(p.item.slug),
                speciesHref: (s) => hrefs.records({ place: p.item.slug, species: s.slug }),
              };
            })}
          />
        )}
      </Card>

      <Rule>
        Looking for one season instead? <Link href="/seasons" className="cn-link">See every season →</Link>
      </Rule>
    </>
  );
}
