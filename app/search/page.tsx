import type { Metadata } from "next";
import { type RawParams, first } from "@/lib/wrt/params";
import Link from "next/link";
import type { ReactNode } from "react";
import { getWrt } from "@/lib/wrt/server";
import type { QuantitySplit } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, EmptyState } from "@/components/wrt/shared/page";
import { QuantityCell, SplitBar } from "@/components/wrt/shared/quantity";
import { PlaceName, SpeciesName, hrefs } from "@/components/wrt/shared/names";

type Props = { searchParams: Promise<RawParams> };

function queryOf(raw: RawParams) {
  const v = first(raw.q);
  return (v ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = queryOf(await searchParams);
  return { title: q ? `Search: ${q}` : "Search" };
}

function Result({ href, children, split, note }: { href: string; children: ReactNode; split: QuantitySplit; note: string }) {
  return (
    <Link href={href} className="exp-result">
      <span className="exp-result__main">
        {children}
        <SplitBar split={split} size="sm" className="max-w-[320px]" />
        <span className="wrt-muted">{note}</span>
      </span>
      <QuantityCell split={split} />
    </Link>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form method="get" action="/search" className="exp-searchform" role="search">
      <label htmlFor="search-q" className="sr-only">Search sites, species and seasons</label>
      <input id="search-q" name="q" type="search" defaultValue={q} className="cn-search" placeholder="Search sites, species, seasons" autoComplete="off" />
      <button type="submit" className="cn-btn cn-btn--primary cn-btn--md">Search</button>
    </form>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const q = queryOf(await searchParams);
  if (!q) {
    return (
      <>
        <PageHead eyebrow="Search" title="Search sites, species and seasons" />
        <Card>
          <SearchForm q="" />
          <p className="wrt-muted m-0">Search by site name, species name, or season and year. Spellings are matched without macrons.</p>
        </Card>
      </>
    );
  }

  const r = await getWrt().search(q, 20);
  const count = r.species.length + r.places.length + r.seasons.length;
  const recordsLink = (
    <Link href={hrefs.records({ q })} className="cn-link">Records mentioning “{q}” →</Link>
  );

  return (
    <>
      <PageHead
        eyebrow="Search"
        title={count ? `${formatNumber(count)} match${count === 1 ? "" : "es"} for “${q}”` : `Nothing matches “${q}”`}
      />
      <Card>
        <SearchForm q={q} />
        <p className="m-0">{recordsLink}</p>
      </Card>

      {count === 0 && (
        <EmptyState title="No site, species or season matches">
          Spellings are matched without macrons, so “manuka” finds Mānuka, and small typos are forgiven. Try fewer letters or a different name,
          or look for the words in the <Link href={hrefs.records({ q })} className="cn-link">records themselves</Link>.
        </EmptyState>
      )}

      {r.species.length > 0 && (
        <Card title="Species" variant="table" foot="Recorded plants across all sites and seasons.">
          <div className="exp-results">
            {r.species.map(({ item: s, split }) => (
              <Result key={s.slug} href={hrefs.species(s.slug)} split={split} note={`${formatNumber(split.records)} records`}>
                <SpeciesName species={s} size="lg" />
              </Result>
            ))}
          </div>
        </Card>
      )}

      {r.places.length > 0 && (
        <Card title="Sites" variant="table">
          <div className="exp-results">
            {r.places.map(({ item: p, split }) => (
              <Result key={p.slug} href={hrefs.place(p.slug)} split={split} note={`${formatNumber(split.records)} records · ${p.parcels.length} parcel${p.parcels.length === 1 ? "" : "s"}`}>
                <PlaceName place={p} />
              </Result>
            ))}
          </div>
        </Card>
      )}

      {r.seasons.length > 0 && (
        <Card title="Seasons" variant="table">
          <div className="exp-results">
            {r.seasons.map(({ season, split }) => (
              <Result key={season.slug} href={hrefs.season(season.slug)} split={split} note={`${formatNumber(split.records)} records`}>
                <span className="cn-species__common text-[17px]">{season.label}</span>
              </Result>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
