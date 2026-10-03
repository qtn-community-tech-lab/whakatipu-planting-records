import type { Metadata } from "next";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import type { PlaceSummary } from "@/lib/wrt/queries";
import { emptySplit } from "@/lib/wrt/queries";
import type { SiteClass } from "@/lib/wrt/types";
import { SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, Rule, EmptyState } from "@/components/wrt/page";
import { PlaceName, SiteClassBadge } from "@/components/wrt/names";
import { QuantityCell, SplitBar, SplitLine, SplitKey } from "@/components/wrt/quantity";
import { ChipLinks } from "@/components/wrt/sites/filter-chips";

export const metadata: Metadata = {
  title: "Sites",
  description: "Every site with recorded plants since Autumn 2015, with seasons active, species and recorded plants.",
};

type SP = Record<string, string | string[] | undefined>;
const CLASSES = ["keystone", "community", "school"] as const;
type ClassFilter = (typeof CLASSES)[number];
const SORTS = [
  { key: "plants", label: "Most recorded plants" },
  { key: "recent", label: "Most recent" },
  { key: "name", label: "Name A–Z" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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
  else out.sort((a, b) => b.split.total - a.split.total);
  return out;
}

function spanLabel(p: PlaceSummary) {
  const { first, last } = p.span;
  return first.slug === last.slug ? first.label : `${first.label} → ${last.label}`;
}

export default async function SitesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const classParam = first(sp.class);
  const cls = CLASSES.find((c) => c === classParam);
  const sortParam = first(sp.sort);
  const sort: SortKey = SORTS.find((s) => s.key === sortParam)?.key ?? "plants";

  const [all, overview] = await Promise.all([getWrt().places(), getWrt().overview()]);
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

  return (
    <>
      <PageHead
        eyebrow="Sites"
        title={`${realSites.length} sites${schemeNote} have recorded plants since ${overview.firstSeason.label}`}
        lead={lead}
      />

      <Card
        title={cls ? `${SITE_CLASS_LABELS[cls]} sites` : "All sites"}
        action={<SplitKey />}
        foot={
          <>
            A site is the place people know, such as Lake Hayes. A parcel is one of WRT’s registered sub-sites inside it,
            such as Lake Hayes Pavilion. Recorded plants are kept against parcels and added up to the site. Bars are scaled to
            the largest site.
            {rows.some((r) => r.item.slug === "slope-hill") &&
              " Slope Hill’s bar is mostly amber: 29,000 recorded plants in Autumn and Spring 2024 (7,000 Coronation, 22,000 HGF) are flagged by WRT (decision 4) and not yet ruled on."}
          </>
        }
      >
        <div className="flex flex-col gap-3 pb-4">
          <ChipLinks
            label="Filter by site class"
            chips={[
              { key: "all", label: "All", href: href(undefined, sort), active: !cls, count: all.length },
              ...CLASSES.map((c) => ({
                key: c,
                label: SITE_CLASS_LABELS[c],
                href: href(c, sort),
                active: cls === c,
                count: countFor(c),
              })),
            ]}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="wrt-muted">Sort by</span>
            <ChipLinks
              label="Sort sites"
              chips={SORTS.map((s) => ({ key: s.key, label: s.label, href: href(cls, s.key), active: sort === s.key }))}
            />
          </div>
          <p className="m-0 flex flex-wrap gap-x-2 gap-y-1 wrt-muted" aria-live="polite">
            <span>
              Listed: {rows.length} · {formatNumber(shown.total)} recorded plants together
            </span>
            <SplitLine split={shown} />
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No sites in this class">No site with recorded plants matches this filter.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            <li
              aria-hidden="true"
              className="hidden border-b border-[var(--border-row)] pb-2 wrt-rule lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.5fr)] lg:gap-6"
            >
              <span>Site</span>
              <span>First → last season</span>
              <span>Recorded plants</span>
            </li>
            {rows.map((p) => (
              <li
                key={p.item.slug}
                className="grid gap-x-6 gap-y-2 border-t border-[var(--border-row)] py-3.5 first:border-t-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.5fr)] lg:items-center"
              >
                <div className="flex min-w-0 flex-col gap-2">
                  <PlaceName place={p.item} link />
                  <div className="wrt-pills items-center">
                    {p.item.isScheme ? null : p.item.siteClasses.map((c) => <SiteClassBadge key={c} siteClass={c} />)}
                    {p.item.parcels.length > 1 && (
                      <span className="wrt-muted">{p.item.parcels.length} parcels</span>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold text-[var(--text-strong)] [font-size:13.5px]">{spanLabel(p)}</span>
                  <span className="wrt-muted">
                    {p.span.seasonsActive} {p.span.seasonsActive === 1 ? "season" : "seasons"} active ·{" "}
                    {p.speciesCount} species
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <SplitBar split={p.split} max={max} size="sm" />
                  <QuantityCell split={p.split} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Rule>
        Looking for one season instead? <Link href="/seasons" className="cn-link">See every season →</Link>
      </Rule>
    </>
  );
}
