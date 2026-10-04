/**
 * What went in, and when: rows (species, or parts of a site) against seasons.
 * Each dot is sized by recorded plants in that season; amber means some or
 * all of it still needs a WRT ruling. Every dot links to its records.
 */
import Link from "next/link";
import type { RecordView } from "@/lib/wrt/queries";
import type { QuantitySplit, Season, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { SpeciesAvatar } from "@/components/wrt/overview/overview-hero";
import { addRecord, emptySplit } from "@/components/wrt/species/species-tiles";

interface Row {
  key: string;
  name: string;
  species?: Species;
  /** Part id when rows are parts. */
  parcelId?: string;
  total: QuantitySplit;
  bySeason: Map<string, QuantitySplit>;
}

function buildRows(records: RecordView[], rowsBy: "species" | "part"): Row[] {
  const rows = new Map<string, Row>();
  for (const v of records) {
    const key = rowsBy === "species" ? v.species.slug : v.record.parcelId;
    const row =
      rows.get(key) ??
      ({
        key,
        name: rowsBy === "species" ? v.species.displayName : v.record.parcelName,
        species: rowsBy === "species" ? v.species : undefined,
        parcelId: rowsBy === "part" ? v.record.parcelId : undefined,
        total: emptySplit(),
        bySeason: new Map(),
      } satisfies Row);
    addRecord(row.total, v);
    const cell = row.bySeason.get(v.season.slug) ?? emptySplit();
    addRecord(cell, v);
    row.bySeason.set(v.season.slug, cell);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.total.total - a.total.total);
}

export function PlantingTimeline({
  records, seasons, rowsBy, hrefFor, cap = 20, rowHref,
}: {
  records: RecordView[];
  /** Every season, in order. Columns are trimmed to the first and last with records. */
  seasons: Season[];
  rowsBy: "species" | "part";
  /** Link for one dot: the records behind it. */
  hrefFor: (row: { species?: Species; parcelId?: string }, season: Season) => string;
  /** Link for a row name. */
  rowHref?: (row: { species?: Species; parcelId?: string; name: string }) => string;
  cap?: number;
}) {
  const rows = buildRows(records, rowsBy);
  if (!rows.length) return null;
  const active = new Set(records.map((v) => v.season.slug));
  const firstIdx = seasons.findIndex((s) => active.has(s.slug));
  let lastIdx = -1;
  seasons.forEach((s, i) => {
    if (active.has(s.slug)) lastIdx = i;
  });
  const cols = seasons.slice(firstIdx, lastIdx + 1);
  const max = Math.max(1, ...rows.flatMap((r) => [...r.bySeason.values()].map((c) => c.total)));

  // Year bands over the columns.
  const years: { year: number; span: number }[] = [];
  for (const s of cols) {
    const last = years[years.length - 1];
    if (last && last.year === s.year) last.span += 1;
    else years.push({ year: s.year, span: 1 });
  }

  const style = { "--cols": cols.length } as React.CSSProperties;

  const renderRow = (r: Row) => (
    <div key={r.key} className="wrt-tl__row" role="row">
      <div className="wrt-tl__name" role="rowheader">
        {r.species ? (
          <SpeciesAvatar species={r.species} />
        ) : (
          <span className="wrt-srow__pin" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z" />
              <circle cx="12" cy="9.8" r="2.3" />
            </svg>
          </span>
        )}
        {rowHref ? (
          <Link href={rowHref(r)} className={r.species?.displayIsScientific ? "wrt-tl__label italic" : "wrt-tl__label"}>
            {r.name}
          </Link>
        ) : (
          <span className={r.species?.displayIsScientific ? "wrt-tl__label italic" : "wrt-tl__label"}>{r.name}</span>
        )}
      </div>
      {cols.map((s) => {
        const c = r.bySeason.get(s.slug);
        if (!c || c.records === 0) return <div key={s.slug} className="wrt-tl__cell" role="cell" data-autumn={s.name === "Autumn" || undefined} />;
        const d = Math.round(8 + 20 * Math.sqrt(c.total / max));
        const review = c.needsReview === 0 ? undefined : c.needsReview === c.total ? "all" : "some";
        const label = `${r.name}, ${s.label}: ${formatNumber(c.total)} recorded${c.needsReview ? `, ${formatNumber(c.needsReview)} need review` : ""}`;
        return (
          <div key={s.slug} className="wrt-tl__cell" role="cell" data-autumn={s.name === "Autumn" || undefined}>
            <Link
              href={hrefFor(r, s)}
              className="wrt-tl__dot"
              data-season={s.name === "Autumn" ? "autumn" : "spring"}
              data-review={review}
              style={{ width: d, height: d }}
              title={label}
              aria-label={label}
            />
          </div>
        );
      })}
      <div className="wrt-tl__total" role="cell">
        <b className="tabular-nums">{formatNumber(r.total.total)}</b>
        {r.total.needsReview > 0 && <span className="tabular-nums">{formatNumber(r.total.needsReview)} review</span>}
      </div>
    </div>
  );

  const shown = rows.slice(0, cap);
  const rest = rows.slice(cap);

  return (
    <div className="wrt-tl">
      <div className="wrt-tl__scroll">
        <div className="wrt-tl__grid" style={style} role="table" aria-label={`Recorded plants by ${rowsBy === "species" ? "species" : "part"} and season`}>
          <div className="wrt-tl__row wrt-tl__row--years" role="row">
            <div className="wrt-tl__name" role="columnheader">{rowsBy === "species" ? "Species" : "Part of site"}</div>
            {years.map((y) => (
              <div key={y.year} className="wrt-tl__year" style={{ gridColumn: `span ${y.span}` }} role="columnheader">
                {y.year}
              </div>
            ))}
            <div className="wrt-tl__total" role="columnheader">Total</div>
          </div>
          <div className="wrt-tl__row wrt-tl__row--seasons" aria-hidden="true">
            <div className="wrt-tl__name" />
            {cols.map((s) => (
              <div key={s.slug} className="wrt-tl__season" data-autumn={s.name === "Autumn" || undefined}>
                {s.name === "Autumn" ? "A" : "S"}
              </div>
            ))}
            <div />
          </div>
          {shown.map(renderRow)}
          {rest.length > 0 && (
            <details className="wrt-tl__more">
              <summary>Show {rest.length} more</summary>
              {rest.map(renderRow)}
            </details>
          )}
        </div>
      </div>
      <p className="wrt-tl__key">
        <span><i className="wrt-tl__k" data-season="autumn" /> Autumn</span>
        <span><i className="wrt-tl__k" data-season="spring" /> Spring</span>
        <span><i className="wrt-tl__k" data-review="some" /> Some need review</span>
        <span><i className="wrt-tl__k" data-review="all" /> All need review</span>
        <span>Bigger dot, more plants. Select a dot for its records.</span>
      </p>
    </div>
  );
}
