import type { AppRoute } from "@/lib/wrt/routes";
/**
 * The explore view above the records list: what these records add up to, in
 * pictures you can click through. Every item narrows the current filter (the
 * URL changes, so any view can be shared); a small arrow opens the full page.
 */
import Link from "next/link";
import { Pin } from "@/components/wrt/shared/pin";
import type { ReactNode } from "react";
import type { Lookups, SeasonPoint } from "@/lib/wrt/queries";
import type { QuantitySplit } from "@/lib/wrt/types";
import type { RecordsSummary } from "@/db/queries/records";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import { spanLabel, formatNumber, formatShare } from "@/lib/wrt/text";
import { hrefs } from "@/components/wrt/shared/names";
import { SplitBar, SplitKey } from "@/components/wrt/shared/quantity";
import { SeasonColumns } from "@/components/wrt/shared/charts";
import { SpeciesAvatar } from "@/components/wrt/shared/species-avatar";
import { PlantingTimeline } from "@/components/wrt/sites/planting-timeline";
import { partHref } from "@/components/wrt/sites/site-rows";
import { type RecordsView, recordsHref } from "./filters";

const TOP = 8;

interface Item {
  key: string;
  name: string;
  sub?: string | undefined;
  italic?: boolean;
  avatar: ReactNode;
  split: QuantitySplit;
  /** Narrow the records to this item. */
  href: AppRoute;
  /** The item's own page. */
  page?: AppRoute;
}


/** A ranked, clickable list: picture, name, bar, number. */
function RankedList({ items, total, unit }: { items: Item[]; total: number; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.split.total));
  return (
    <div className="rx-list">
      <ol className="rx-list__items">
        {items.map((it, i) => (
          <li key={it.key} className="rx-item">
            <Link href={it.href} className="rx-item__main" title={`Show only ${it.name}`}>
              <span className="rx-item__rank">{i + 1}</span>
              {it.avatar}
              <span className="rx-item__names">
                <span className={it.italic ? "rx-item__name italic" : "rx-item__name"}>{it.name}</span>
                {it.sub && <span className="rx-item__sub">{it.sub}</span>}
              </span>
              <span className="rx-item__bar"><SplitBar split={it.split} max={max} size="sm" /></span>
              <span className="rx-item__num">
                <b className="tabular-nums">{formatNumber(it.split.total)}</b>
                {it.split.needsReview > 0 && <span className="tabular-nums">{formatNumber(it.split.needsReview)} review</span>}
              </span>
            </Link>
            {it.page && (
              <Link href={it.page} className="rx-item__page" aria-label={`Open the ${it.name} page`} title={`Open the ${it.name} page`}>
                →
              </Link>
            )}
          </li>
        ))}
      </ol>
      {total > items.length && (
        <p className="rx-list__more">
          Top {items.length} of {formatNumber(total)} {unit}. Select one to narrow the records; the arrow opens its page.
        </p>
      )}
    </div>
  );
}

function Panel({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `rx-panel ${className}` : "rx-panel"}>
      <header className="rx-panel__head">
        <h2 className="rx-panel__title">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function RecordsInsights({
  summary, view, lookups,
}: {
  summary: RecordsSummary;
  view: RecordsView;
  lookups: Lookups;
}) {
  const f = view.filter;
  const place = f.place ? lookups.places.find((p) => p.slug === f.place) : undefined;

  // ---- over time
  const points = summary.seasons;
  const seasons = points.map((point) => point.season);
  const activePoints = points.filter((p) => p.split.records > 0);
  const busiest = activePoints.reduce<SeasonPoint | null>((a, b) => (!a || b.split.total > a.split.total ? b : a), null);
  const first = activePoints[0]?.season;
  const last = activePoints[activePoints.length - 1]?.season;
  const singleSeason = !!(f.year && f.season);

  // ---- where
  const showParts = !!place && place.parcels.length > 1 && !f.parcel;
  const showSites = !f.place;
  let sites: Item[] = showSites
    ? summary.sites.map(({ place: meta, split }) => ({
        key: meta.slug,
        name: meta.name,
        avatar: <Pin className="rx-pin" />,
        split,
        href: recordsHref(view, { place: meta.slug }),
        page: hrefs.place(meta.slug),
      }))
    : showParts
      ? summary.sites.map(({ parcel: meta, split }) => ({
          key: meta!.id,
          name: meta!.name,
          avatar: <Pin className="rx-pin" />,
          split,
          href: recordsHref(view, { parcel: meta!.id }),
          page: partHref(place!.slug, meta!.slug),
        }))
      : [];
  if (showParts && sites.length < 2) sites = [];

  // ---- what
  const showTrees = !f.species;
  const trees = showTrees
    ? summary.species.map(({ item: meta, split }) => ({
        key: meta.slug,
        name: meta.displayName,
        sub: meta.displayIsScientific ? undefined : meta.scientificName,
        italic: meta.displayIsScientific,
        avatar: <SpeciesAvatar species={meta} />,
        split,
        href: recordsHref(view, { species: meta.slug }),
        page: hrefs.species(meta.slug),
      }))
    : [];

  // ---- open questions in these records
  const themeRows = (f.theme ? [] : summary.themes.map((row) => [row.theme, row.split] as const))
    .sort((a, b) => b[1].needsReview - a[1].needsReview);
  const themeMax = Math.max(1, ...themeRows.map(([, s]) => s.needsReview));

  // ---- timeline rows: sites, else parts, else species
  const tlBy = summary.rowsBy;
  const tlUseful = !singleSeason && activePoints.length > 1 && (tlBy !== "species" || trees.length > 1);

  const narrowSeason = (s: SeasonPoint["season"]) => recordsHref(view, { year: s.year, season: s.name });

  return (
    <div className="rx">
      {!singleSeason && activePoints.length > 0 && (
        <Panel title="Over time" action={<SplitKey spring />} className="rx-panel--wide">
          <div className="rx-facts">
            {busiest && (
              <Link href={narrowSeason(busiest.season)} className="rx-fact">
                <span className="rx-fact__k">Busiest season</span>
                <b>{busiest.season.label}</b>
                <span className="tabular-nums">{formatNumber(busiest.split.total)} recorded</span>
              </Link>
            )}
            <div className="rx-fact">
              <span className="rx-fact__k">Seasons with records</span>
              <b className="tabular-nums">
                {activePoints.length} <span className="rx-fact__of">of {seasons.length}</span>
              </b>
              <span>{first && last ? spanLabel({ first, last }) : ""}</span>
            </div>
            <div className="rx-fact rx-fact--review">
              <span className="rx-fact__k">Needs review</span>
              <b className="tabular-nums rx-fact__amber">{formatShare(summary.split.needsReview, summary.split.total)}</b>
              <span>of recorded plants here</span>
            </div>
          </div>
          <SeasonColumns
            points={points}
            hrefFor={(p) => narrowSeason(p.season)}
            caption="Recorded plants by season. Select a column to narrow the records to that season."
          />
        </Panel>
      )}

      {(sites.length > 0 || trees.length > 0) && (
        <div className={sites.length > 0 && trees.length > 0 ? "rx-two" : "rx-one"}>
          {sites.length > 0 && (
            <Panel
              title={showParts ? `Parts of ${place!.name}` : "Top sites"}
              action={showParts ? <Link className="rx-panel__link" href={hrefs.place(place!.slug)}>Site page →</Link> : <Link className="rx-panel__link" href="/sites">All sites →</Link>}
            >
              <RankedList items={sites.slice(0, TOP)} total={sites.length} unit={showParts ? "parts" : "sites"} />
            </Panel>
          )}
          {trees.length > 0 && (
            <Panel title="Top trees" action={<Link className="rx-panel__link" href="/species">All species →</Link>}>
              <RankedList items={trees.slice(0, TOP)} total={trees.length} unit="species" />
            </Panel>
          )}
        </div>
      )}

      {tlUseful && (
        <Panel
          title={tlBy === "site" ? "Which sites, and when" : tlBy === "part" ? "Which parts, and when" : "What went in, and when"}
          className="rx-panel--wide"
        >
          <PlantingTimeline
            cells={summary.cells}
            seasons={seasons}
            rowsBy={tlBy}
            cap={12}
            rowHref={(r) =>
              r.placeSlug
                ? recordsHref(view, { place: r.placeSlug })
                : r.parcelId
                  ? recordsHref(view, { parcel: r.parcelId })
                  : r.species
                    ? recordsHref(view, { species: r.species.slug })
                    : recordsHref(view)
            }
            hrefFor={(r, s) =>
              recordsHref(view, {
                year: s.year,
                season: s.name,
                ...(r.placeSlug ? { place: r.placeSlug } : {}),
                ...(r.parcelId ? { parcel: r.parcelId } : {}),
                ...(r.species ? { species: r.species.slug } : {}),
              })
            }
          />
        </Panel>
      )}

      {themeRows.length > 0 && (
        <Panel
          title="Open questions in these records"
          action={<Link className="rx-panel__link" href={recordsHref(view, { review: "needs-review" })}>Only records needing review →</Link>}
          className="rx-panel--wide"
        >
          <ul className="rx-qs">
            {themeRows.map(([theme, s]) => (
              <li key={theme}>
                <Link href={recordsHref(view, { review: "needs-review", theme })} className="rx-q">
                  <span className="rx-q__title">{REVIEW_THEMES[theme].label}</span>
                  <span className="rx-q__text">{REVIEW_THEMES[theme].question}</span>
                  <span className="rx-q__bar"><i style={{ width: `${Math.max(3, (s.needsReview / themeMax) * 100)}%` }} /></span>
                  <span className="rx-q__n tabular-nums">
                    {formatNumber(s.needsReview)} plants · {formatNumber(s.recordsNeedingReview)} record{s.recordsNeedingReview === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
