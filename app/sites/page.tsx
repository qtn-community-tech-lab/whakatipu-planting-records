import type { Metadata } from "next";
import { first } from "@/lib/wrt/params";
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
import { listSites } from "@/db/queries/sites";
import { isAuthenticated } from "@/db/queries/access";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sites",
  description: "Explore sites by seasons active, species and recorded plants.",
};

const CLASSES = ["keystone", "community", "school"] as const;
type ClassFilter = (typeof CLASSES)[number];
const SORTS = [
  { key: "plants", label: "Most recorded plants" },
  { key: "recent", label: "Most recent" },
  { key: "name", label: "Name A–Z" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];
type ListedSite = Omit<PlaceSummary, "span"> & { span: PlaceSummary["span"] | null };

function href(cls: ClassFilter | undefined, sort: SortKey, state: "active" | "deactivated"): `/sites${"" | `?${string}`}` {
  const sp = new URLSearchParams();
  if (state === "deactivated") sp.set("state", state);
  if (cls) sp.set("class", cls);
  if (sort !== "plants") sp.set("sort", sort);
  const s = sp.toString();
  return s ? `/sites?${s}` : "/sites";
}

function sortSites(list: ListedSite[], sort: SortKey) {
  const out = [...list];
  if (sort === "name") out.sort((a, b) => a.item.name.localeCompare(b.item.name, "en-NZ"));
  else if (sort === "recent")
    out.sort((a, b) => (b.span?.last.order ?? -1) - (a.span?.last.order ?? -1) || b.split.total - a.split.total || a.item.name.localeCompare(b.item.name, "en-NZ"));
  else out.sort(byTotalDesc);
  return out;
}

export default async function SitesPage({ searchParams }: Readonly<PageProps<"/sites">>) {
  const sp = await searchParams;
  const state = first(sp.state) === "deactivated" ? "deactivated" : "active";
  const classParam = first(sp.class);
  const cls = CLASSES.find((c) => c === classParam);
  const sortParam = first(sp.sort);
  const sort: SortKey = SORTS.find((s) => s.key === sortParam)?.key ?? "plants";

  const [register, history, overview, records, authenticated] = await Promise.all([
    listSites(state), getWrt().places(), getWrt().overview(), getWrt().records(), isAuthenticated(),
  ]);
  const historyBySlug = new Map(history.map((site) => [site.item.slug, site]));
  const all: ListedSite[] = register.map((site) => {
    const summary = historyBySlug.get(site.slug);
    return {
      item: { ...summary?.item, slug: site.slug, name: site.name, isScheme: site.is_scheme,
        siteClasses: summary?.item.siteClasses ?? [], parcels: summary?.item.parcels ?? [], searchKeys: summary?.item.searchKeys ?? [] },
      split: summary?.split ?? emptySplit(), span: summary?.span ?? null, speciesCount: summary?.speciesCount ?? 0,
    };
  });
  const bySite = speciesBySite(records.rows);
  const realSites = all.filter((p) => !p.item.isScheme);
  const schemes = all.filter((p) => p.item.isScheme);

  const filtered = cls
    ? all.filter((p) => !p.item.isScheme && p.item.siteClasses.includes(cls))
    : all;
  const rows = sortSites(filtered, sort);
  const max = Math.max(1, ...all.map((p) => p.split.total));
  const shown = emptySplit();
  for (const p of rows) for (const k of Object.keys(shown) as (keyof typeof shown)[]) shown[k] += p.split[k];

  const countFor = (c: ClassFilter) =>
    realSites.filter((p) => p.item.siteClasses.includes(c)).length;

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
        title={`${realSites.length} ${state === "deactivated" ? "deactivated " : ""}site${realSites.length === 1 ? "" : "s"}${schemeNote}`}
        aside={authenticated ? <Button asChild><Link href="/sites/new">Create site</Link></Button> : undefined}
        lead={
          <>
            {state === "deactivated" ? "Deactivated sites retain their historical records and quantities. Planting history" : "Active registered sites, with planting history"} since {overview.firstSeason.label} where available.
            {lead && <> {lead}</>}
          </>
        }
      />

      <nav aria-label="Site lifecycle" className="wrt-stool__show">
        <Link href={href(cls, sort, "active")} className="wrt-stool__opt" aria-current={state === "active" ? "true" : undefined}>Active</Link>
        <Link href={href(cls, sort, "deactivated")} className="wrt-stool__opt" aria-current={state === "deactivated" ? "true" : undefined}>Deactivated</Link>
      </nav>

      <LocationCard sites={rows.filter((p) => !p.item.isScheme).map((p) => p.item)} records={records.rows.map((row) => row.record)} />

      <Card
        foot={
          <>
            A site is the place people know. A parcel is one of WRT’s registered sub-sites inside it.
            Recorded plants are kept against parcels and added up to the site.
          </>
        }
      >
        <div className="wrt-stool">
          <form method="get" action="/sites" className="wrt-stool__form">
            {state === "deactivated" && <input type="hidden" name="state" value="deactivated" />}
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
            <Link href={href(undefined, sort, state)} className="wrt-stool__opt" aria-current={!cls ? "true" : undefined}>
              All <span className="wrt-stool__n">{all.length}</span>
            </Link>
            {CLASSES.map((c) => (
              <Link key={c} href={href(c, sort, state)} className="wrt-stool__opt" aria-current={cls === c ? "true" : undefined}>
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
          <EmptyState title={state === "deactivated" ? "No deactivated sites" : "No active sites"}>No site matches this filter.</EmptyState>
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
                    {p.span ? <>{spanLabel(p.span)} · {p.span.seasonsActive} {p.span.seasonsActive === 1 ? "season" : "seasons"} · {p.speciesCount} species</> : "No planting records yet"}
                    {p.item.parcels.length > 1 && <> · {p.item.parcels.length} parcels</>}
                  </>
                ),
                totalHref: p.span ? hrefs.records({ place: p.item.slug }) : hrefs.place(p.item.slug),
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
